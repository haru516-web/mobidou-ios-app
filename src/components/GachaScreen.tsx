import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { BRUSH, Button, SERIF, useReducedMotion } from '../components';
import { GACHA_ART, type GachaArtPart } from '../data/gachaArt';
import { getPetCharacter, isPetId } from '../petCatalog';
import type { PullResult } from '../services/gacha';
import { AFTER_OPEN_MS, canOpen, glowAfterOpen, glowWhileLifting, mobbyAfterOpen, phaseOf, resolveRelease, rollAt, ROLL_MS, SETTLED_AT_MS, settleAt } from './gachaTimeline';

const PULL_TO_DRAW = 64;
const MAX_PULL = 110;
const OPEN_TWEEN_MS = 260;

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
  // A tall box, like a blind box: about one and a half times as high as it is wide. Sized so that the
  // whole front board, once slid up, still fits on screen above the box.
  const boxW = Math.round(Math.min(190, width * .5, (height * .34) / 1.45));
  const boxH = Math.round(boxW * 1.45);
  // The front board is the whole front of the box, and the whole board slides up.
  const boardW = boxW;
  const boardH = boxH;
  const boardLeft = 0;
  const boardTop = 0;
  const lift = boxH * .9;
  const centerY = Math.round(height * .58);
  const boxLeft = Math.round(width / 2 - boxW / 2);
  const boxTop = Math.round(centerY - boxH / 2);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(unrevealed.length > 0);
  const [ms, setMs] = useState(0);
  /** How far the front board has been lifted, 0..1. */
  const [open, setOpen] = useState(0);
  const [opened, setOpened] = useState(false);
  const [openedFor, setOpenedFor] = useState(0);
  const [pull, setPull] = useState(0);
  const startedAt = useRef<number | null>(null);
  const openedAt = useRef<number | null>(null);
  const drawRequested = useRef(false);
  const lastPhase = useRef<string>('');
  const dragStart = useRef(0);
  const openRef = useRef(0);
  const tween = useRef<number>(0);

  const result = unrevealed[index];
  const phase = phaseOf(ms, opened ? openedFor : null);
  const done = playing && phase === 'revealed';

  const resetScene = useCallback(() => {
    cancelAnimationFrame(tween.current);
    startedAt.current = null;
    openedAt.current = null;
    lastPhase.current = '';
    openRef.current = 0;
    setMs(0);
    setOpen(0);
    setOpened(false);
    setOpenedFor(0);
  }, []);

  // A pull the player just asked for arrives as a waiting result; start showing it.
  useEffect(() => {
    if (!playing && drawRequested.current && unrevealed.length > 0) {
      drawRequested.current = false;
      setIndex(0);
      resetScene();
      setPlaying(true);
    }
  }, [playing, unrevealed.length, resetScene]);

  // The box rolls in and settles by itself.
  useEffect(() => {
    if (!playing || !result) return;
    if (reduced) { setMs(SETTLED_AT_MS); return; }
    let frame = 0;
    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = Math.min(SETTLED_AT_MS, now - startedAt.current);
      setMs(elapsed);
      if (elapsed < SETTLED_AT_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, result, index, reduced]);

  // Once the board is fully up, the light holds and fades.
  useEffect(() => {
    if (!opened) return;
    if (reduced) { setOpenedFor(AFTER_OPEN_MS); return; }
    let frame = 0;
    const tick = (now: number) => {
      if (openedAt.current === null) openedAt.current = now;
      const elapsed = Math.min(AFTER_OPEN_MS, now - openedAt.current);
      setOpenedFor(elapsed);
      if (elapsed < AFTER_OPEN_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [opened, reduced]);

  // A small touch when the box lands and when the board comes up.
  useEffect(() => {
    if (!haptics || !playing || phase === lastPhase.current) return;
    lastPhase.current = phase;
    if (phase === 'settle') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (phase === 'hold') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (phase === 'revealed') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [haptics, playing, phase]);

  /** Move the board to `to` over a short time, then act on where it ended up. */
  const settleBoard = useCallback((to: 0 | 1) => {
    cancelAnimationFrame(tween.current);
    const from = openRef.current;
    let begun: number | null = null;
    const step = (now: number) => {
      if (begun === null) begun = now;
      const t = Math.min(1, (now - begun) / OPEN_TWEEN_MS);
      const value = from + (to - from) * t;
      openRef.current = value;
      setOpen(value);
      if (t < 1) tween.current = requestAnimationFrame(step);
      else if (to === 1) setOpened(true);
    };
    tween.current = requestAnimationFrame(step);
  }, []);

  const boardEnabled = playing && !opened && canOpen(ms);
  const boardPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => boardEnabled,
    onMoveShouldSetPanResponder: () => boardEnabled,
    // Once the board is in hand nothing else may take the drag away.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { cancelAnimationFrame(tween.current); dragStart.current = openRef.current; },
    onPanResponderMove: (_, gesture) => {
      const value = Math.max(0, Math.min(1, dragStart.current - gesture.dy / lift));
      openRef.current = value;
      setOpen(value);
    },
    onPanResponderRelease: () => settleBoard(resolveRelease(openRef.current) === 'open' ? 1 : 0),
    onPanResponderTerminate: () => settleBoard(0),
  }), [boardEnabled, lift, settleBoard]);

  const requestDraw = useCallback(() => {
    if (playing || freePulls <= 0 || drawRequested.current) return;
    drawRequested.current = true;
    onDraw();
  }, [playing, freePulls, onDraw]);

  const ropePan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !playing && freePulls > 0,
    onMoveShouldSetPanResponder: () => !playing && freePulls > 0,
    onPanResponderMove: (_, gesture) => setPull(Math.max(0, Math.min(MAX_PULL, gesture.dy))),
    onPanResponderRelease: (_, gesture) => { setPull(0); if (gesture.dy >= PULL_TO_DRAW) requestDraw(); },
    onPanResponderTerminate: () => setPull(0),
  }), [playing, freePulls, requestDraw]);

  const next = () => {
    if (index + 1 < unrevealed.length) {
      setIndex(index + 1);
      resetScene();
      return;
    }
    setPlaying(false);
    setIndex(0);
    resetScene();
    onFinished();
  };

  const skip = () => { cancelAnimationFrame(tween.current); openRef.current = 1; setMs(SETTLED_AT_MS); setOpen(1); setOpened(true); setOpenedFor(AFTER_OPEN_MS); };

  const roll = rollAt(Math.min(ms, ROLL_MS));
  const settle = settleAt(ms);
  const glow = opened ? glowAfterOpen(openedFor) : glowWhileLifting(open);
  const showMobby = opened ? mobbyAfterOpen(openedFor) : 0;
  const pet = result && isPetId(result.petId) ? getPetCharacter(result.petId) : null;
  const remaining = unrevealed.length;
  // The inside of the box, seen once the front is up: the walls leave a thin frame.
  const cavityLeft = Math.round(boxW * .05);
  const cavityTop = Math.round(boxH * .035);
  const cavityW = boxW - 2 * cavityLeft;
  const cavityH = boxH - 2 * cavityTop;

  return <View style={S.page}>
    <Part part="stage" style={StyleSheet.absoluteFillObject} fallback={S.stageFallback} />

    {playing && <>
      {/* Light behind the box, centred on the opening. */}
      <Part part="glowRays" style={[S.abs, { width: boxW * 3.4, height: boxW * 3.4, left: width / 2 - boxW * 1.7, top: boxTop + cavityTop + cavityH / 2 - boxW * 1.7, opacity: glow * .85, transform: [{ rotate: `${(opened ? openedFor : 0) * .02}deg` }] }]} fallback={S.raysFallback} />
      <Part part="glowCore" style={[S.abs, { width: boxW * 2.4, height: boxW * 2.4, left: width / 2 - boxW * 1.2, top: boxTop + cavityTop + cavityH / 2 - boxW * 1.2, opacity: glow }]} fallback={S.coreFallback} />
      <Part part="shadow" style={[S.abs, { width: boxW * 1.2, height: boxW * .35, left: boxLeft - boxW * .1 + roll.x * boxW, top: boxTop + boxH - boxW * .12, opacity: .7 }]} fallback={S.shadowFallback} />

      {/* The box: body, the opening with its light, the Mobby, and the front board. */}
      <View pointerEvents="box-none" style={[S.abs, { width: boxW, height: boxH, left: boxLeft, top: boxTop, transform: [{ translateX: roll.x * boxW }, { translateY: -roll.hop * boxW }, { rotate: `${roll.rotate}deg` }, { scale: settle }] }]}>
        <Part part="body" style={StyleSheet.absoluteFillObject} fallback={S.bodyFallback} />
        <View pointerEvents="none" style={[S.cavity, { left: cavityLeft, top: cavityTop, width: cavityW, height: cavityH }]}>
          <View style={[StyleSheet.absoluteFillObject, S.wash, { opacity: glow }]} />
        </View>
        {pet && <Image accessible={false} source={pet.image} contentFit="contain" style={[S.mobby, { width: boxW * .78, height: boxW * .78, left: boxW * .11, top: cavityTop + cavityH / 2 - boxW * .39 - (1 - showMobby) * 8, opacity: showMobby }]} />}
        {/* The whole front board: lifted by hand. */}
        <View {...boardPan.panHandlers} accessible={boardEnabled} accessibilityRole="button" accessibilityLabel="箱の前の板を上へ引き上げる" accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => settleBoard(1)} style={[S.abs, { left: boardLeft, top: boardTop, width: boardW, height: boardH, transform: [{ translateY: -lift * open }] }]}>
          <Part part="front" style={StyleSheet.absoluteFillObject} fallback={S.boardFallback} />
          {boardEnabled && <View pointerEvents="none" style={S.grip} />}
        </View>
      </View>
    </>}

    {/* The cord to pull. */}
    {!playing && <View {...ropePan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="ひもを引いてモビーに出会う" accessibilityState={{ disabled: freePulls <= 0 }} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={requestDraw} style={[S.ropeArea, { left: width / 2 - 40, height: 250 + MAX_PULL }]}>
      <Part part="rope" style={[S.rope, { transform: [{ translateY: pull }] }]} fallback={S.ropeFallback} />
      {freePulls > 0 && <View style={[S.tassel, { transform: [{ translateY: pull }] }]} />}
    </View>}

    <View style={S.top}>
      <Text accessibilityRole="header" style={S.title}>{!playing ? 'ご縁を結ぶ' : done ? 'ご縁が結ばれました' : phase === 'roll' ? '箱が転がってきました' : phase === 'settle' ? '箱が止まりました' : phase === 'ready' ? '前の板を、上へ引き上げて' : '光があふれています'}</Text>
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

    {playing && !done && <View style={S.bottom}>
      {phase === 'ready' && <Text style={S.small}>板の上を、指で上へなぞってください</Text>}
      <Button title="演出を省略" secondary onPress={skip} style={S.wide} />
    </View>}

    {done && result && pet && <View style={S.bottom}>
      <Text style={S.name}>{pet.name}</Text>
      <Text style={S.badge}>{result.isNew ? 'はじめまして！' : 'また会えたね。小さなモビーがそばに来るよ'}</Text>
      <Text style={S.small} numberOfLines={2}>{pet.catchphrase}</Text>
      <Button title={index + 1 < remaining ? 'つぎへ' : 'おわる'} onPress={next} style={S.wide} />
    </View>}
  </View>;
}

const S = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#302D25', overflow: 'hidden', userSelect: 'none' },
  stageFallback: { backgroundColor: '#2A251E' },
  abs: { position: 'absolute' },
  raysFallback: { borderRadius: 9999, backgroundColor: 'transparent' },
  coreFallback: { borderRadius: 9999, backgroundColor: '#FFE7A0', shadowColor: '#FFF3C4', shadowOpacity: 1, shadowRadius: 60, shadowOffset: { width: 0, height: 0 } },
  shadowFallback: { borderRadius: 9999, backgroundColor: '#00000066' },
  bodyFallback: { backgroundColor: '#C9A374', borderWidth: 6, borderColor: '#8B6135', borderRadius: 8 },
  cavity: { position: 'absolute', backgroundColor: '#2B1E14', borderRadius: 4, overflow: 'hidden' },
  wash: { backgroundColor: '#FFF3C8' },
  mobby: { position: 'absolute' },
  boardFallback: { backgroundColor: '#D8B884', borderWidth: 4, borderColor: '#8B6135', borderRadius: 6 },
  grip: { position: 'absolute', left: '50%', marginLeft: -26, top: 10, width: 52, height: 8, borderRadius: 4, backgroundColor: '#8B6135' },
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
