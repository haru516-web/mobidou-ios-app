import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { BRUSH, Button, SERIF, useReducedMotion } from '../components';
import { GACHA_ART, type GachaArtPart } from '../data/gachaArt';
import { getPetCharacter, isPetId } from '../petCatalog';
import type { PullResult } from '../services/gacha';
import { flapAt, glowAt, lidAt, mobbyAt, phaseAt, rollAt, settleAt, T, TOTAL_MS } from './gachaTimeline';

const PULL_TO_DRAW = 64;
const MAX_PULL = 110;
/** Front, right, back, left: the rotation that turns "below the box" into each side. */
const FLAP_ANGLES = [0, -90, 180, 90] as const;

type Props = {
  /** Free pulls the player can still use. */
  freePulls: number;
  /** Results already drawn and waiting to be shown (persisted by the caller). */
  unrevealed: readonly PullResult[];
  haptics: boolean;
  /** Draw one free pull. The new result arrives through `unrevealed`. */
  onDraw: () => void;
  /** Every waiting result has been shown. */
  onFinished: () => void;
  onClose: () => void;
};

/** A part with its art, or a plain stand-in shape while the art has not been added. */
function Part({ part, style, fallback }: { part: GachaArtPart; style: StyleProp<ViewStyle>; fallback: StyleProp<ViewStyle> }) {
  const source = GACHA_ART[part] as ImageSourcePropType | null;
  return source
    ? <Image accessible={false} source={source} contentFit="fill" transition={0} style={style as never} />
    : <View style={[style, fallback]} />;
}

export function GachaScreen({ freePulls, unrevealed, haptics, onDraw, onFinished, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const size = Math.round(Math.min(220, width * .52));
  const centerY = Math.round(height * .47);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(unrevealed.length > 0);
  const [ms, setMs] = useState(0);
  const [pull, setPull] = useState(0);
  const startedAt = useRef<number | null>(null);
  const drawRequested = useRef(false);
  const lastPhase = useRef<string>('');

  const result = unrevealed[index];
  const phase = phaseAt(ms);
  const done = playing && phase === 'revealed';

  // A pull the player just asked for arrives as a waiting result; start showing it.
  useEffect(() => {
    if (!playing && drawRequested.current && unrevealed.length > 0) {
      drawRequested.current = false;
      setIndex(0);
      setMs(0);
      startedAt.current = null;
      setPlaying(true);
    }
  }, [playing, unrevealed.length]);

  // The clock for one opening.
  useEffect(() => {
    if (!playing || !result) return;
    if (reduced) { setMs(TOTAL_MS); return; }
    let frame = 0;
    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = Math.min(TOTAL_MS, now - startedAt.current);
      setMs(elapsed);
      if (elapsed < TOTAL_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, result, index, reduced]);

  // A small touch when the box lands, when it opens and when the sides fall.
  useEffect(() => {
    if (!haptics || !playing || phase === lastPhase.current) return;
    lastPhase.current = phase;
    const style = phase === 'settle' ? Haptics.ImpactFeedbackStyle.Heavy : phase === 'lid' || phase === 'flaps' ? Haptics.ImpactFeedbackStyle.Medium : null;
    if (style) void Haptics.impactAsync(style).catch(() => {});
    if (phase === 'revealed') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [haptics, playing, phase]);

  const requestDraw = useCallback(() => {
    if (playing || freePulls <= 0 || drawRequested.current) return;
    drawRequested.current = true;
    onDraw();
  }, [playing, freePulls, onDraw]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !playing && freePulls > 0,
    onMoveShouldSetPanResponder: () => !playing && freePulls > 0,
    onPanResponderMove: (_, gesture) => setPull(Math.max(0, Math.min(MAX_PULL, gesture.dy))),
    onPanResponderRelease: (_, gesture) => { setPull(0); if (gesture.dy >= PULL_TO_DRAW) requestDraw(); },
    onPanResponderTerminate: () => setPull(0),
  }), [playing, freePulls, requestDraw]);

  const next = () => {
    if (index + 1 < unrevealed.length) {
      setIndex(index + 1);
      setMs(0);
      startedAt.current = null;
      lastPhase.current = '';
      return;
    }
    setPlaying(false);
    setIndex(0);
    setMs(0);
    startedAt.current = null;
    lastPhase.current = '';
    onFinished();
  };

  const roll = rollAt(ms);
  const glow = glowAt(ms);
  const lid = lidAt(ms);
  const settle = settleAt(ms);
  const rolling = ms < T.roll;
  const pet = result && isPetId(result.petId) ? getPetCharacter(result.petId) : null;
  const boxShown = playing;
  const remaining = unrevealed.length;

  const flapHeight = size / 2;
  return <View style={S.page}>
    <Part part="stage" style={StyleSheet.absoluteFillObject} fallback={S.stageFallback} />

    {/* Light behind the box. */}
    {boxShown && <>
      <Part part="glowRays" style={[S.center, { width: size * 3.4, height: size * 3.4, left: width / 2 - size * 1.7, top: centerY - size * 1.7, opacity: glow * .85, transform: [{ rotate: `${ms * .02}deg` }] }]} fallback={S.raysFallback} />
      <Part part="glowCore" style={[S.center, { width: size * 2.4, height: size * 2.4, left: width / 2 - size * 1.2, top: centerY - size * 1.2, opacity: glow }]} fallback={S.coreFallback} />
    </>}

    {/* The box. */}
    {boxShown && <>
      <Part part="shadow" style={[S.center, { width: size * 1.1, height: size * 1.1, left: width / 2 - size * .55 + roll.x * size, top: centerY - size * .5 + size * .12, opacity: rolling ? .6 : .8 }]} fallback={S.shadowFallback} />
      <View pointerEvents="none" style={[S.center, { width: size, height: size, left: width / 2 - size / 2, top: centerY - size / 2, transform: [{ translateX: roll.x * size }, { translateY: -roll.hop * size }, { rotate: `${roll.rotate}deg` }, { scale: settle }] }]}>
        <Part part="base" style={StyleSheet.absoluteFillObject} fallback={S.baseFallback} />
        <View style={[StyleSheet.absoluteFillObject, S.wash, { opacity: glow }]} />
        {pet && <Image accessible={false} source={pet.image} contentFit="contain" style={[S.mobby, { width: size * .82, height: size * .82, left: size * .09, top: size * .09, opacity: mobbyAt(ms) }]} />}
        {FLAP_ANGLES.map((angle, flapIndex) => {
          const fall = flapAt(ms, flapIndex);
          return <View key={angle} style={[S.flapPivot, { width: size, height: size, transform: [{ rotate: `${angle}deg` }] }]}>
            <Part part="flap" style={[S.flap, { width: size, height: flapHeight, top: size, transform: [{ scaleY: .1 + .9 * fall }] }]} fallback={S.flapFallback} />
            <View style={[S.flapShade, { width: size, height: flapHeight, top: size, opacity: (1 - fall) * .35, transform: [{ scaleY: .1 + .9 * fall }] }]} />
          </View>;
        })}
        <Part part="lid" style={[StyleSheet.absoluteFillObject, { transformOrigin: 'left center', transform: [{ scaleX: Math.cos(lid * Math.PI * .88) }], opacity: lid >= 1 ? .0 : 1 }]} fallback={S.lidFallback} />
      </View>
    </>}

    {/* The cord to pull. */}
    {!playing && <View {...panResponder.panHandlers} accessible accessibilityRole="button" accessibilityLabel="ひもを引いてモビーに出会う" accessibilityState={{ disabled: freePulls <= 0 }} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={requestDraw} style={[S.ropeArea, { left: width / 2 - 40, height: 250 + MAX_PULL }]}>
      <Part part="rope" style={[S.rope, { transform: [{ translateY: pull }] }]} fallback={S.ropeFallback} />
      {freePulls > 0 && <View style={[S.tassel, { transform: [{ translateY: pull }] }]} />}
    </View>}

    <View style={S.top}>
      <Text accessibilityRole="header" style={S.title}>{playing ? (done ? 'ご縁が結ばれました' : phase === 'roll' ? '箱が転がってきました' : phase === 'settle' ? '箱が止まりました' : '箱が開きます') : 'ご縁を結ぶ'}</Text>
      {remaining > 1 && playing && <Text style={S.count}>{index + 1} / {remaining}</Text>}
    </View>

    {!playing && <View style={S.bottom}>
      {freePulls > 0
        ? <>
          <Text style={S.prompt}>ひもを下へ引いてください</Text>
          <Text style={S.small}>無料で引ける回数 {freePulls}回</Text>
          <Button title="ひもを引く" onPress={requestDraw} style={S.wide} />
        </>
        : <Text style={S.prompt}>いま引けるご縁はありません。{'\n'}巡礼を結願すると、ひとつ引けます。</Text>}
      <Button title="とじる" secondary onPress={onClose} style={S.wide} />
    </View>}

    {playing && !done && <View style={S.bottom}><Button title="演出を省略" secondary onPress={() => { setMs(TOTAL_MS); }} style={S.wide} /></View>}

    {done && result && pet && <View style={S.bottom}>
      <Text style={S.name}>{pet.name}</Text>
      <Text style={S.badge}>{result.isNew ? 'はじめまして！' : 'また会えたね。小さなモビーがそばに来るよ'}</Text>
      <Text style={S.small} numberOfLines={2}>{pet.catchphrase}</Text>
      <Button title={index + 1 < remaining ? 'つぎへ' : 'おわる'} onPress={next} style={S.wide} />
    </View>}
  </View>;
}

const S = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#302D25', overflow: 'hidden' },
  stageFallback: { backgroundColor: '#2A251E' },
  center: { position: 'absolute' },
  raysFallback: { borderRadius: 9999, borderWidth: 0, backgroundColor: 'transparent' },
  coreFallback: { borderRadius: 9999, backgroundColor: '#FFE7A0', shadowColor: '#FFF3C4', shadowOpacity: 1, shadowRadius: 60, shadowOffset: { width: 0, height: 0 } },
  shadowFallback: { borderRadius: 9999, backgroundColor: '#00000055' },
  baseFallback: { backgroundColor: '#3A2B1F', borderWidth: 6, borderColor: '#B98F5B', borderRadius: 6 },
  wash: { backgroundColor: '#FFF3C8' },
  mobby: { position: 'absolute' },
  flapPivot: { position: 'absolute', left: 0, top: 0 },
  flap: { position: 'absolute', left: 0, transformOrigin: 'center top' },
  flapFallback: { backgroundColor: '#C9A374', borderWidth: 3, borderColor: '#8B6135', borderRadius: 4 },
  flapShade: { position: 'absolute', left: 0, backgroundColor: '#1A120A', transformOrigin: 'center top' },
  lidFallback: { backgroundColor: '#D3AE7C', borderWidth: 6, borderColor: '#8B6135', borderRadius: 6 },
  ropeArea: { position: 'absolute', top: 0, width: 80, alignItems: 'center' },
  rope: { position: 'absolute', top: -20, width: 34, height: 270 },
  ropeFallback: { width: 6, backgroundColor: '#B23B2E', borderRadius: 3, left: 14 },
  tassel: { position: 'absolute', top: 236, width: 26, height: 26, borderRadius: 13, backgroundColor: '#B23B2E', borderWidth: 3, borderColor: '#E7C58C' },
  top: { position: 'absolute', left: 0, right: 0, top: 58, alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  title: { color: '#FFF8E9', fontFamily: BRUSH, fontSize: 23, textAlign: 'center' },
  count: { color: '#D5BD98', fontSize: 12, letterSpacing: 1.5 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 34, alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  prompt: { color: '#FFF8E9', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  small: { color: '#D5BD98', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  name: { color: '#FFF5E2', fontFamily: BRUSH, fontSize: 25, textAlign: 'center' },
  badge: { color: '#F6D9A3', fontFamily: SERIF, fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  wide: { width: '100%', maxWidth: 350 },
});
