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
import { AFTER_OPEN_MS, CONFETTI_COLORS, MAX_DIM, bloomAt, confettiAt, blossomsAt, burstAt, fallAt, lightTintAt, motesAt, seasonRateAt, canOpen, dimAt, dustAt, flashAt, gatherAt, glowAfterOpen, glowWhileLifting, HAPTIC_BEATS, landingShake, mobbyAfterOpen, phaseOf, pillarAt, popAt, resolveRelease, rollAt, ROLL_MS, rumbleAt, seamGlow, SETTLED_AT_MS, settleAt, shimmerAt, silhouetteAt, sparklesAt, tempoAt } from './gachaTimeline';

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
function Part({ part, style, tint }: { part: GachaArtPart; style: StyleProp<ViewStyle>; tint?: string }) {
  return <Image accessible={false} tintColor={tint} pointerEvents="none" source={GACHA_ART[part]} contentFit={part === 'stage' ? 'cover' : 'contain'} transition={0} style={style as never} />;
}

export function GachaScreen({ freePulls, unrevealed, haptics, onDraw, onFinished, onClose, showShop = false, onBuy }: Props) {
  const [tab, setTab] = useState<'draw' | 'shop'>('draw');
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const measureScene = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height });
  }, []);
  // The OS "reduce motion" setting skips the whole show. In development it is ignored so the show can be checked on a machine that has it on.
  const reduced = useReducedMotion() && !__DEV__;
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
  // The large Mobby fills the space between the title and the result panel.
  const bigSize = Math.max(0, Math.round(Math.min(width * .92, height - 300)));
  const bigTop = Math.round(76 + Math.max(0, height - 76 - 220 - bigSize) / 2);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(unrevealed.length > 0);
  const [ms, setMs] = useState(0);
  /** How far the front board has been lifted, 0..1. */
  const [open, setOpen] = useState(0);
  const [opened, setOpened] = useState(false);
  const [openedFor, setOpenedFor] = useState(0);
  const [pull, setPull] = useState(0);
  /** The revealed Mobby is shown large (tap to toggle), and how far that has grown, 0..1. */
  const [zoomed, setZoomed] = useState(false);
  const [zoomT, setZoomT] = useState(0);
  const zoomRef = useRef(0);
  /** The name and the 終わる button wait until the Mobby has been shown large. */
  const [panelReady, setPanelReady] = useState(false);
  const autoZoomed = useRef(false);
  const [bob, setBob] = useState(0);
  /** A free-running clock (ms) for motion that does not follow the opening's own timeline, such as the trembling. */
  const [clock, setClock] = useState(0);
  /** Scene time: the same clock, but its speed follows the opening's tempo (see tempoAt). Drives everything that moves by itself. */
  const [fx, setFx] = useState(0);
  /** Where the year is: 0 spring, 1 summer, 2 autumn, 3 winter. It stays at spring until the burst, then a whole year passes. */
  const [season, setSeason] = useState(0);
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
    setZoomed(false);
    zoomRef.current = 0;
    setZoomT(0);
    autoZoomed.current = false;
    setPanelReady(false);
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
    if (phase === 'revealed') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [haptics, playing, phase]);

  useEffect(() => {
    if (!playing || reduced) return;
    let frame = 0;
    let begun: number | null = null;
    let last = 0;
    let scene = 0;
    let seasons = 0;
    const tick = (now: number) => {
      if (begun === null) { begun = now; last = now; }
      // Scene time runs at the tempo of the moment: slow while waiting, faster and faster, near still before the burst.
      const openedForNow = openedAt.current === null ? null : Math.min(AFTER_OPEN_MS, now - openedAt.current);
      scene += Math.min(100, now - last) * tempoAt(openedForNow, openRef.current);
      seasons += Math.min(100, now - last) * seasonRateAt(openedForNow);
      last = now;
      setClock(now - begun);
      setFx(scene);
      setSeason(seasons);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced, index]);

  // The large view grows and shrinks smoothly toward where the last tap left it.
  useEffect(() => {
    if (reduced) { zoomRef.current = zoomed ? 1 : 0; setZoomT(zoomRef.current); return; }
    let frame = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      const dt = last === null ? 0 : now - last;
      last = now;
      zoomRef.current = zoomed ? Math.min(1, zoomRef.current + dt / 420) : Math.max(0, zoomRef.current - dt / 260);
      setZoomT(zoomRef.current);
      if (zoomRef.current !== (zoomed ? 1 : 0)) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [zoomed, reduced]);

  // Once the board is up, the phone beats along with the light: a tap per heartbeat, then a heavy one at the burst.
  useEffect(() => {
    if (!opened || !haptics) return;
    const styles = { light: Haptics.ImpactFeedbackStyle.Light, medium: Haptics.ImpactFeedbackStyle.Medium, heavy: Haptics.ImpactFeedbackStyle.Heavy };
    const timers = HAPTIC_BEATS.map(beat => setTimeout(() => { void Haptics.impactAsync(styles[beat.strength]).catch(() => {}); }, beat.at));
    return () => timers.forEach(clearTimeout);
  }, [opened, haptics]);

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
  // The large view is open to a tap as soon as the Mobby has mostly appeared, without waiting for the light to finish.
  const canZoom = playing && !!pet && opened && (done || showMobby > .6);
  // The Mobby comes forward by itself the moment it has appeared; only after that do the name and button show.
  useEffect(() => {
    if (canZoom && !autoZoomed.current) { autoZoomed.current = true; setZoomed(true); }
  }, [canZoom]);
  useEffect(() => {
    if (zoomT >= .95 && !panelReady) setPanelReady(true);
  }, [zoomT, panelReady]);
  // Once the box has landed the room already dims a little, so the waiting light shows.
  const dim = playing ? Math.max(dimAt(open, opened ? openedFor : null), opened ? 0 : MAX_DIM * .4 * Math.min(1, Math.max(0, (clock - SETTLED_AT_MS) / 800))) : 0;
  const bloom = playing ? bloomAt(opened ? openedFor : null, open) : 0;
  const flash = opened ? flashAt(openedFor) : 0;
  const burst = opened ? burstAt(openedFor) : { scale: 0, opacity: 0 };
  const rumble = rumbleAt(open, opened, fx, opened ? openedFor : 0);
  const gather = opened ? gatherAt(openedFor) : [];
  const pillar = opened ? pillarAt(openedFor) : { height: 0, opacity: 0 };
  const dust = opened ? dustAt(openedFor) : [];
  const seam = playing && !opened ? seamGlow(ms, fx) : 0;
  const sparkles = opened ? sparklesAt(openedFor) : [];
  const shake = playing ? landingShake(ms) : 0;
  const white = opened ? silhouetteAt(openedFor) : 0;
  const pop = opened ? popAt(openedFor) : .62;
  // The light never sits still: it wavers like a candle and gold flecks lift off the box, on scene time, touched or not.
  const shimmer = shimmerAt(fx);
  const openedForNow = opened ? openedFor : null;
  const motes = playing ? motesAt(fx, Math.max(glow, seam * 2, opened ? .16 * showMobby : 0)) : [];
  const tint = lightTintAt(openedForNow, season);
  const tintCss = `rgb(${tint[0]}, ${tint[1]}, ${tint[2]})`;
  const cx = boxLeft + boxW / 2;
  const confetti = playing && width && height && opened && openedFor < AFTER_OPEN_MS ? confettiAt(openedFor, { x: (boxLeft + boxW / 2) / width, y: (boxTop + boxH / 2) / height }) : [];
  const blossoms = playing && width && height && opened && openedFor < AFTER_OPEN_MS ? blossomsAt(openedFor, { x: (boxLeft + boxW / 2) / width, y: (boxTop + boxH / 2) / height }) : [];
  const fall = playing && width && height ? fallAt(fx, season, seasonRateAt(openedForNow) / Math.max(.3, tempoAt(openedForNow, open))) : [];
  const cy = boxTop + boxH / 2;
  const ropeLength = Math.min(300, height * .48);
  const shopOpen = showShop && !playing && tab === 'shop';
  return <View style={S.page} onLayout={measureScene}>
    <Part part="stage" style={StyleSheet.absoluteFillObject} />

    {playing && <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: shake }] }]}>
      {/* The room goes dark so the light has something to shine against. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: '#05030A', opacity: dim }]} />

      {/* Backlight: rays burst out and a halo swells behind the box. Added to the scene, not laid over it. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, S.additive]}>
        <Part part="glowCore" tint={tintCss} style={[S.abs, { width: boxW * 3.4, height: boxW * 3.4, left: cx - boxW * 1.7, top: cy - boxW * 1.7, opacity: Math.min(1, glow * .5 * shimmer) * Math.min(1, bloom), transform: [{ scale: (.85 + .3 * bloom) * shimmer }] }]} />
        <Part part="glowRays" tint={tintCss} style={[S.abs, { width: boxW * 5, height: boxW * 5, left: cx - boxW * 2.5, top: cy - boxW * 2.5, opacity: glow * .2 * shimmer, transform: [{ rotate: `${fx * .012 + open * 40}deg` }, { scale: (.7 + .25 * bloom) * shimmer }] }]} />
        {motes.map((mote, i) => <Part key={`o${i}`} part="glowCore" tint="rgb(255, 228, 164)" style={[S.abs, { width: boxW * mote.size * 1.6, height: boxW * mote.size * 1.6, left: cx + mote.x * boxW - boxW * mote.size * .8, top: cy + mote.y * boxW - boxW * mote.size * .8, opacity: mote.opacity }]} />)}
        <Part part="glowRays" tint={tintCss} style={[S.abs, { width: boxW * 5, height: boxW * 5, left: cx - boxW * 2.5, top: cy - boxW * 2.5, opacity: burst.opacity * .35, transform: [{ rotate: `${-(openedFor) * .02 + 20}deg` }, { scale: burst.scale }] }]} />
      </View>

      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, S.additive]}>
        {pillar.opacity > 0 && <Part part="glowCore" tint={tintCss} style={[S.abs, { width: boxW * .4, height: (cy + 60) * 1.6 * pillar.height, left: cx - boxW * .2, top: cy - (cy + 60) * 1.6 * pillar.height + boxW * .35, opacity: pillar.opacity * .5 }]} />}
      </View>

      <Part part="shadow" style={[S.abs, { width: boxW * 1.3, height: boxW * 1.3 * 300 / 1024, left: boxLeft - boxW * .15 + roll.x * boxW, top: boxTop + boxH * .94 - boxW * .19, opacity: .85 * (1 - dim * .5) }]} />

      {/* The box: body, the opening with its light, the Mobby, and the front board. */}
      <View pointerEvents="box-none" style={[S.abs, { width: boxW, height: boxH, left: boxLeft, top: boxTop, transform: [{ translateX: roll.x * boxW + rumble.x }, { translateY: -roll.hop * boxW + rumble.y }, { rotate: `${roll.rotate}deg` }, { scale: settle }] }]}>
        <Part part="body" style={StyleSheet.absoluteFillObject} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, S.additive]}>
          <Part part="glowCore" tint={tintCss} style={[S.abs, { width: boxW * 1.5, height: boxW * 1.5, left: -boxW * .25, top: boxH / 2 - boxW * .75, opacity: Math.min(1, Math.max(glow * .85, white * .8) + seam * .7), transform: [{ scale: .9 + .2 * bloom }] }]} />
        </View>
        {pet && <>
          <Image accessible={false} pointerEvents="none" source={pet.image} contentFit="contain" style={[S.mobby, { width: boxW * .78, height: boxW * .78, left: boxW * .11, top: boxH / 2 - boxW * .39 - (1 - showMobby) * 10, opacity: showMobby, transform: [{ scale: pop }] }]} />
          <Image accessible={false} pointerEvents="none" source={pet.image} contentFit="contain" tintColor="#FFFFFF" style={[S.mobby, { width: boxW * .78, height: boxW * .78, left: boxW * .11, top: boxH / 2 - boxW * .39 - white * boxW * .1, opacity: white, transform: [{ scale: .8 + .2 * white }] }]} />
        </>}
        {/* The whole front board: lifted by hand. */}
        <View {...boardPan.panHandlers} accessible={boardEnabled} accessibilityRole="button" accessibilityLabel="箱の前の板を上へ引き上げる" accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => settleBoard(1)} style={[S.abs, { left: boardLeft, top: boardTop, width: boardW, height: boardH, transform: [{ translateY: -lift * open }] }]}>
          <Part part="front" style={StyleSheet.absoluteFillObject} />
        </View>
      </View>

      {/* Light washing over everything, gold specks flying out of the opening, and the flash at the moment it opens. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, S.additive]}>
        <Part part="glowCore" tint={tintCss} style={[S.abs, { width: width * 2.4, height: width * 2.4, left: cx - width * 1.2, top: cy - width * 1.2, opacity: glow * .1 }]} />
        {gather.map((speck, i) => <Part key={`g${i}`} part="glowCore" tint={tintCss} style={[S.abs, { width: boxW * speck.size * 2.2, height: boxW * speck.size * 2.2, left: cx + speck.x * boxW - boxW * speck.size * 1.1, top: cy + speck.y * boxW - boxW * speck.size * 1.1, opacity: speck.opacity * .8 }]} />)}
        {dust.map((flake, i) => <Part key={`d${i}`} part="glowCore" tint={tintCss} style={[S.abs, { width: width * flake.size * 2.2, height: width * flake.size * 2.2, left: flake.x * width - width * flake.size * 1.1, top: flake.y * height, opacity: flake.opacity * .55 }]} />)}
        {sparkles.map((spark, i) => <Part key={i} part="glowCore" tint={tintCss} style={[S.abs, { width: boxW * spark.size * 2, height: boxW * spark.size * 2, left: cx + spark.x * boxW - boxW * spark.size, top: cy + spark.y * boxW - boxW * spark.size, opacity: spark.opacity * .7 }]} />)}
        {fall.filter(f => f.kind === 1).map((fly, i) => <Part key={`f${i}`} part="glowCore" tint="rgb(214, 236, 150)" style={[S.abs, { width: width * fly.size * 4, height: width * fly.size * 4, left: fly.x * width - width * fly.size * 2, top: fly.y * height, opacity: fly.opacity * .8 }]} />)}
      </View>
      {/* Seasons seep into one another: cherry petals, fireflies, maple leaves, snow. Petals also blow out of the opening at the burst. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {[...blossoms, ...fall.filter(f => f.kind !== 1)].map((item, i) => {
          const w = width * item.size;
          const kind = 'kind' in item ? item.kind : 0;
          // Petals take on the warm light of the opening while it is bright.
          const lit = Math.min(1, glow * .5);
          const mix = (a: number, b: number) => Math.round(a * (1 - lit) + b * lit);
          const base = { position: 'absolute', opacity: item.opacity, left: item.x * width - w / 2, top: item.y * height, transform: [{ rotate: `${item.rotate}deg` }, { scaleX: item.flip }] } as const;
          if (kind === 3) return <View key={`s${i}`} style={[base, { width: w, height: w, borderRadius: w, backgroundColor: `rgb(${mix(244, 255)}, ${mix(248, 246)}, ${mix(255, 232)})` }]} />;
          if (kind === 2) return <View key={`m${i}`} style={[base, { width: w, height: w * .86, backgroundColor: `rgb(${mix(Math.round(190 + 42 * item.tone), 250)}, ${mix(Math.round(58 + 56 * item.tone), 200)}, ${mix(42, 140)})`, borderTopLeftRadius: w * .5, borderBottomRightRadius: w * .5, borderTopRightRadius: w * .12, borderBottomLeftRadius: w * .12 }]} />;
          return <View key={`p${i}`} style={[base, { width: w, height: w * .62, backgroundColor: `rgb(${mix(Math.round(255 - 9 * item.tone), 255)}, ${mix(Math.round(222 - 62 * item.tone), 244)}, ${mix(Math.round(230 - 46 * item.tone), 214)})`, borderTopLeftRadius: w * .62, borderBottomRightRadius: w * .62, borderTopRightRadius: w * .08, borderBottomLeftRadius: w * .08 }]} />;
        })}
      </View>
      {/* Kamifubuki: coloured paper slips thrown up at the burst, flashing wide and thin as they tumble. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {confetti.map((slip, i) => {
          const w = width * slip.size;
          return <View key={`c${i}`} style={{ position: 'absolute', width: w * 2.2, height: w, left: slip.x * width - w, top: slip.y * height, opacity: slip.opacity, backgroundColor: CONFETTI_COLORS[Math.floor(slip.tone * CONFETTI_COLORS.length)], transform: [{ rotate: `${slip.rotate}deg` }, { scaleY: slip.flip }] }} />;
        })}
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: tintCss, opacity: flash * .3 }]} />
    </View>}

    {/* The cord to pull. */}
    {!playing && !shopOpen && <View {...ropePan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="ひもを引いてモビーに出会う" accessibilityState={{ disabled: freePulls <= 0 }} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={requestDraw} style={[S.ropeArea, { left: width / 2 - 52, height: Math.min(300, height * .48) + MAX_PULL }]}>
      <Part part="rope" style={[S.rope, { width: (Math.min(300, height * .48) + MAX_PULL) / 4, height: Math.min(300, height * .48) + MAX_PULL, top: -MAX_PULL + (pull > 0 ? pull : bob) }]} />
    </View>}
    {!playing && !shopOpen && freePulls > 0 && <Text pointerEvents="none" style={[S.ropeHint, { top: ropeLength + BOB_PX + 14, opacity: Math.max(0, 1 - pull / PULL_TO_DRAW) }]}>下にひっぱってね</Text>}

    <View style={S.top}>
      <Text accessibilityRole="header" style={[S.title, !playing && !shopOpen && S.titleHidden]}>{shopOpen ? '購入' : !playing ? 'ご縁を結ぶ' : done ? 'ご縁が結ばれました' : phase === 'roll' ? '箱が転がってきました' : phase === 'settle' ? '箱が止まりました' : phase === 'ready' ? '前の板を、上へ引き上げて' : phase === 'charge' ? '光が集まっています' : '光があふれています'}</Text>
      {remaining > 1 && playing && <Text style={S.count}>{index + 1} / {remaining}</Text>}
    </View>

    {showShop && !playing && <View style={S.tabs} accessibilityRole="tablist">
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: !shopOpen }} onPress={() => setTab('draw')} style={[S.tab, !shopOpen && S.tabOn]}><Text style={[S.tabText, !shopOpen && S.tabTextOn]}>ひく</Text></Pressable>
      <View style={S.tabGap} />
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: shopOpen }} onPress={() => setTab('shop')} style={[S.tab, shopOpen && S.tabOn]}><Text style={[S.tabText, shopOpen && S.tabTextOn]}>購入</Text></Pressable>
    </View>}

    {/* Once the Mobby has been revealed, one tap shows it large and another tap puts it back. */}
    {canZoom && <Pressable accessibilityRole="button" accessibilityLabel={zoomed ? 'モビーを小さく戻す' : 'モビーを大きく見る'} onPress={() => setZoomed(value => !value)} style={StyleSheet.absoluteFillObject}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: '#05030A', opacity: .78 * zoomT }]} />
      {zoomT > 0 && <Image accessible={false} source={pet.image} contentFit="contain" style={{ position: 'absolute', width: bigSize, height: bigSize, left: (width - bigSize) / 2, top: bigTop, opacity: Math.min(1, zoomT * 1.6), transform: [{ scale: .55 + .45 * zoomT + .08 * Math.sin(Math.min(1, zoomT) * Math.PI) }] }} />}
    </Pressable>}

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

    {playing && !(done && panelReady) && <View style={S.bottom}>
      {phase === 'ready' && <Text style={S.small}>板の上を、指で上へなぞってください</Text>}
      <Button title="演出を省略" secondary onPress={skip} style={S.wide} />
    </View>}

    {done && panelReady && result && pet && <View style={S.bottom}>
      <Text style={S.hint}>{zoomed ? 'タップで元に戻る' : 'タップで大きく見る'}</Text>
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
  // Added to what is behind it (like real light) instead of covering it. Needs the new architecture / a browser.
  additive: { mixBlendMode: 'screen' } as object,
  mobby: { position: 'absolute' },
  petal: { position: 'absolute' },
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
  hint: { color: '#BFA982', fontSize: 11, letterSpacing: 1.5, textAlign: 'center' },
  badge: { color: '#F6D9A3', fontFamily: SERIF, fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  wide: { width: '100%', maxWidth: 350 },
});
