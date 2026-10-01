import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { BRUSH, Button, SERIF, useReducedMotion } from '../components';
import { GACHA_ART, type GachaArtPart } from '../data/gachaArt';
import { getPetCharacter, isPetId } from '../petCatalog';
import { GachaShop } from './GachaShop';
import type { ShopProduct } from '../data/shop';
import type { PullResult } from '../services/gacha';
import { AFTER_OPEN_MS, canOpen, glowAfterOpen, glowWhileLifting, mobbyAfterOpen, phaseOf, resolveRelease, rollAt, ROLL_MS, SETTLED_AT_MS, settleAt } from './gachaTimeline';

const PULL_TO_DRAW = 64;
const MAX_PULL = 110;
const OPEN_TWEEN_MS = 260;
/** The idle cord bobs down this far and back, once per BOB_MS. */
const BOB_PX = 14;
const BOB_MS = 1700;

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
  /** Show the shop tab. Leave off in builds where purchases are not offered. */
  showShop?: boolean;
  /** Start a purchase from the shop tab; without it the shop's buttons are inactive. */
  onBuy?: (product: ShopProduct) => void;
};

/** Render supplied artwork without stretching its canvas. */
function Part({ part, style }: { part: GachaArtPart; style: StyleProp<ViewStyle> }) {
  return <Image accessible={false} pointerEvents="none" source={GACHA_ART[part]} contentFit={part === 'stage' ? 'cover' : 'contain'} transition={0} style={style as never} />;
}

export function GachaScreen({ freePulls, unrevealed, haptics, onDraw, onFinished, onClose, showShop = false, onBuy }: Props) {
  const [tab, setTab] = useState<'draw' | 'shop'>('draw');
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const measureScene = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height });
  }, []);
  const reduced = useReducedMotion();
  // Use the measured modal space, reserving room for the title, lifted panel and result controls.
  const boxW = Math.round(Math.max(0, Math.min(190, width * .5, (height - 330) / (1280 / 880 * 1.9))));
  const boxH = Math.round(boxW * 1280 / 880);
  // The front board is the whole front of the box, and the whole board slides up.
  const boardW = boxW;
  const boardH = boxH;
  const boardLeft = 0;
  const boardTop = 0;
  const lift = boxH * .9;
  const centerY = Math.round(130 + boxH * 1.4);
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
  const [bob, setBob] = useState(0);
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

  // While waiting, the cord bobs up and down to invite a pull. It stops once the player takes hold of it.
  const idle = !playing && tab === 'draw' && freePulls > 0 && pull === 0;
  useEffect(() => {
    if (!idle || reduced) { setBob(0); return; }
    let frame = 0;
    let begun: number | null = null;
    const tick = (now: number) => {
      if (begun === null) begun = now;
      setBob(BOB_PX * (1 - Math.cos(((now - begun) / BOB_MS) * 2 * Math.PI)) / 2);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [idle, reduced]);

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
  const ropeLength = Math.min(300, height * .48);
  const shopOpen = showShop && !playing && tab === 'shop';
  return <View style={S.page} onLayout={measureScene}>
    <Part part="stage" style={StyleSheet.absoluteFillObject} />

    {playing && <>
      <Part part="shadow" style={[S.abs, { width: boxW * 1.3, height: boxW * 1.3 * 300 / 1024, left: boxLeft - boxW * .15 + roll.x * boxW, top: boxTop + boxH * .94 - boxW * .19, opacity: .85 }]} />

      {/* The box: body, the opening with its light, the Mobby, and the front board. */}
      <View pointerEvents="box-none" style={[S.abs, { width: boxW, height: boxH, left: boxLeft, top: boxTop, transform: [{ translateX: roll.x * boxW }, { translateY: -roll.hop * boxW }, { rotate: `${roll.rotate}deg` }, { scale: settle }] }]}>
        <Part part="body" style={StyleSheet.absoluteFillObject} />
        <Part part="glowRays" style={[S.abs, { width: boxW * 2.4, height: boxW * 2.4, left: -boxW * .7, top: boxH / 2 - boxW * 1.2, opacity: glow * .85, transform: [{ rotate: `${(opened ? openedFor : 0) * .02}deg` }] }]} />
        <Part part="glowCore" style={[S.abs, { width: boxW * 1.8, height: boxW * 1.8, left: -boxW * .4, top: boxH / 2 - boxW * .9, opacity: glow }]} />
        {pet && <Image accessible={false} pointerEvents="none" source={pet.image} contentFit="contain" style={[S.mobby, { width: boxW * .78, height: boxW * .78, left: boxW * .11, top: boxH / 2 - boxW * .39 - (1 - showMobby) * 8, opacity: showMobby }]} />}
        {/* The whole front board: lifted by hand. */}
        <View {...boardPan.panHandlers} accessible={boardEnabled} accessibilityRole="button" accessibilityLabel="箱の前の板を上へ引き上げる" accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => settleBoard(1)} style={[S.abs, { left: boardLeft, top: boardTop, width: boardW, height: boardH, transform: [{ translateY: -lift * open }] }]}>
          <Part part="front" style={StyleSheet.absoluteFillObject} />
        </View>
      </View>
    </>}

    {/* The cord to pull. */}
    {!playing && !shopOpen && <View {...ropePan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="ひもを引いてモビーに出会う" accessibilityState={{ disabled: freePulls <= 0 }} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={requestDraw} style={[S.ropeArea, { left: width / 2 - 52, height: Math.min(300, height * .48) + MAX_PULL }]}>
      <Part part="rope" style={[S.rope, { width: (Math.min(300, height * .48) + MAX_PULL) / 4, height: Math.min(300, height * .48) + MAX_PULL, top: -MAX_PULL + (pull > 0 ? pull : bob) }]} />
    </View>}
    {!playing && !shopOpen && freePulls > 0 && <Text pointerEvents="none" style={[S.ropeHint, { top: ropeLength + BOB_PX + 14, opacity: Math.max(0, 1 - pull / PULL_TO_DRAW) }]}>下にひっぱってね</Text>}

    <View style={S.top}>
      <Text accessibilityRole="header" style={[S.title, !playing && !shopOpen && S.titleHidden]}>{shopOpen ? '購入' : !playing ? 'ご縁を結ぶ' : done ? 'ご縁が結ばれました' : phase === 'roll' ? '箱が転がってきました' : phase === 'settle' ? '箱が止まりました' : phase === 'ready' ? '前の板を、上へ引き上げて' : '光があふれています'}</Text>
      {remaining > 1 && playing && <Text style={S.count}>{index + 1} / {remaining}</Text>}
    </View>

    {showShop && !playing && <View style={S.tabs} accessibilityRole="tablist">
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: !shopOpen }} onPress={() => setTab('draw')} style={[S.tab, !shopOpen && S.tabOn]}><Text style={[S.tabText, !shopOpen && S.tabTextOn]}>ひく</Text></Pressable>
      <View style={S.tabGap} />
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: shopOpen }} onPress={() => setTab('shop')} style={[S.tab, shopOpen && S.tabOn]}><Text style={[S.tabText, shopOpen && S.tabTextOn]}>購入</Text></Pressable>
    </View>}

    {shopOpen && <View style={S.shop}><GachaShop onBuy={onBuy} /></View>}

    {shopOpen && <View style={S.bottom}><Button title="とじる" secondary onPress={onClose} style={S.wide} /></View>}

    {!playing && !shopOpen && <View style={S.bottom}>
      {freePulls > 0
        ? <>
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
  abs: { position: 'absolute' },
  mobby: { position: 'absolute' },
  ropeArea: { position: 'absolute', top: 0, width: 104, alignItems: 'center' },
  rope: { position: 'absolute', top: -20, width: 34, height: 270 },
  ropeHint: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#FFF8E9', fontFamily: BRUSH, fontSize: 18, letterSpacing: 1, textShadowColor: '#000000AA', textShadowRadius: 6 },
  tabs: { position: 'absolute', left: 0, right: 0, top: 76, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  tabGap: { width: 56 },
  tab: { minWidth: 84, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211A13B3', borderWidth: 1, borderColor: '#6B5A3F' },
  tabOn: { backgroundColor: '#F1E6D8', borderColor: '#C7A98A' },
  tabText: { color: '#D5BD98', fontFamily: BRUSH, fontSize: 15 },
  tabTextOn: { color: '#A54E42' },
  shop: { position: 'absolute', left: 16, right: 16, top: 128, bottom: 84, justifyContent: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 32, alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  // On the draw tab the cord hangs through the title, so the tabs act as the heading and the title is kept for screen readers only.
  titleHidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  title: { color: '#FFF8E9', fontFamily: BRUSH, fontSize: 23, textAlign: 'center' },
  count: { color: '#D5BD98', fontSize: 12, letterSpacing: 1.5 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 16, backgroundColor: '#211A13D9' },
  prompt: { color: '#FFF8E9', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  small: { color: '#D5BD98', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  name: { color: '#FFF5E2', fontFamily: BRUSH, fontSize: 25, textAlign: 'center' },
  badge: { color: '#F6D9A3', fontFamily: SERIF, fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  wide: { width: '100%', maxWidth: 350 },
});
