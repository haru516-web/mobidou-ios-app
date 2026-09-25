import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { OmikujiFortune } from '../data/omikuji';
import { OMIKUJI_ATLASES } from '../data/omikujiAtlases';
import type { PetCharacter } from '../petCatalog';
import { useOmikujiBrushFont } from '../fonts/useOmikujiBrushFont';
import { WashiPressable as Pressable } from './Washi';
import { OmikujiResultCard } from './OmikujiResultCard';
import { TutorialTarget, type TutorialRect } from './TutorialSpotlight';

const OMIKUJI_RESULT_BACKGROUND = require('../../assets/omikuji/omikuji-result-paper-v2.png');
// Frames 0–4 keep the paper inside the tube; repeat them three times before frames 5–7 reveal it.
const DRAW_FRAME_SEQUENCE = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5, 6, 7];

const REVEAL_EFFECTS = {
  '大吉': { color: '#C68A19', glow: '#FFE08A', symbol: '✦', sparkles: 12, haloScale: 2.15, glowStrength: 0.72, sparkleSize: 34, duration: 1320 },
  '中吉': { color: '#B87534', glow: '#F5D49A', symbol: '✧', sparkles: 10, haloScale: 1.8, glowStrength: 0.52, sparkleSize: 30, duration: 1120 },
  '小吉': { color: '#B96E82', glow: '#F7D2DB', symbol: '❀', sparkles: 8, haloScale: 1.55, glowStrength: 0.38, sparkleSize: 27, duration: 940 },
  '吉': { color: '#AF6544', glow: '#F4D9B0', symbol: '✦', sparkles: 6, haloScale: 1.32, glowStrength: 0.28, sparkleSize: 24, duration: 800 },
  '末吉': { color: '#718F9D', glow: '#DFEDF0', symbol: '✧', sparkles: 4, haloScale: 1.12, glowStrength: 0.2, sparkleSize: 21, duration: 680 },
} as const;

const SPARKLE_POSITIONS: ViewStyle[] = [
  { top: '8%', left: '9%' }, { top: '13%', right: '11%' },
  { top: '32%', left: '3%' }, { top: '29%', right: '3%' },
  { top: '51%', left: '8%' }, { top: '49%', right: '9%' },
  { top: '70%', left: '4%' }, { top: '72%', right: '4%' },
  { top: '88%', left: '17%' }, { top: '86%', right: '18%' },
  { top: '19%', left: '28%' }, { top: '18%', right: '27%' },
];

export function OmikujiExperience({ pet, fortune, drawn, visible, onDraw, onReset, onAnimationStateChange, guidedDraw = false, onGuidedTargetRectChange }: { pet: PetCharacter; fortune: OmikujiFortune; drawn: boolean; visible: boolean; onDraw: () => void; onReset: () => void; onAnimationStateChange: (animating: boolean) => void; guidedDraw?: boolean; onGuidedTargetRectChange?: (rect: TutorialRect | null) => void }) {
  const [revealing, setRevealing] = useState(false);
  const [frame, setFrame] = useState<number | null>(null);
  const paperProgress = useRef(new Animated.Value(0)).current;
  const effectProgress = useRef(new Animated.Value(0)).current;
  const autoPlayedOnOpen = useRef(false);
  const onDrawRef = useRef(onDraw);
  onDrawRef.current = onDraw;
  const playRevealRef = useRef<() => void>(() => {});
  const effect = REVEAL_EFFECTS[fortune.rank];
  const pulling = frame !== null;
  const atlas = OMIKUJI_ATLASES[pet.id] ?? pet.image;
  const brushTextStyle = useOmikujiBrushFont(visible);

  useEffect(() => () => {
    paperProgress.stopAnimation();
    effectProgress.stopAnimation();
  }, [paperProgress, effectProgress]);

  const playReveal = () => {
    paperProgress.stopAnimation();
    effectProgress.stopAnimation();
    paperProgress.setValue(0);
    effectProgress.setValue(0);
    setRevealing(true);

    Animated.sequence([
      Animated.timing(paperProgress, { toValue: 1, duration: 740, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(170),
      Animated.timing(effectProgress, { toValue: 1, duration: effect.duration, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(150),
    ]).start(({ finished }) => {
      setRevealing(false);
      if (finished) onAnimationStateChange(false);
    });
  };
  playRevealRef.current = playReveal;

  const start = () => {
    if (revealing || pulling) return;
    onAnimationStateChange(true);
    paperProgress.stopAnimation();
    effectProgress.stopAnimation();
    setFrame(0);
  };

  useEffect(() => {
    if (!pulling) return;
    let sequenceIndex = 0;
    const timer = setInterval(() => {
      sequenceIndex += 1;
      if (sequenceIndex >= DRAW_FRAME_SEQUENCE.length) {
        clearInterval(timer);
        setFrame(null);
        if (!drawn) onDrawRef.current();
        playRevealRef.current();
        return;
      }
      setFrame(DRAW_FRAME_SEQUENCE[sequenceIndex]);
    }, 130);
    return () => clearInterval(timer);
  }, [pulling, drawn]);

  useEffect(() => {
    if (!visible) {
      autoPlayedOnOpen.current = false;
      onAnimationStateChange(false);
      return;
    }
    if (autoPlayedOnOpen.current) return;
    autoPlayedOnOpen.current = true;
    if (drawn) start();
  }, [visible, drawn, onAnimationStateChange]);

  const paperOpacity = paperProgress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 1, 1] });
  const paperScale = paperProgress.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] });
  const paperY = paperProgress.interpolate({ inputRange: [0, 1], outputRange: [112, 0] });
  const paperRotation = paperProgress.interpolate({ inputRange: [0, 1], outputRange: ['11deg', '0deg'] });
  const glowOpacity = effectProgress.interpolate({ inputRange: [0, 0.22, 0.58, 1], outputRange: [0, effect.glowStrength, effect.glowStrength * 0.72, 0] });
  const glowScale = effectProgress.interpolate({ inputRange: [0, 1], outputRange: [0.62, effect.haloScale] });
  const ringOpacity = effectProgress.interpolate({ inputRange: [0, 0.2, 0.76, 1], outputRange: [0, 0.72, 0.25, 0] });
  const ringScale = effectProgress.interpolate({ inputRange: [0, 1], outputRange: [0.72, effect.haloScale] });
  const raysRotation = effectProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '22deg'] });
  const rankOpacity = effectProgress.interpolate({ inputRange: [0, 0.16, 0.42, 1], outputRange: [0, 0.12, 1, 1] });
  const rankScale = effectProgress.interpolate({ inputRange: [0, 0.42, 0.62, 1], outputRange: [0.74, 1.12, 1, 1] });
  const shineOpacity = effectProgress.interpolate({ inputRange: [0, 0.08, 0.38, 0.62, 1], outputRange: [0, 0, 0.8, 0, 0] });
  const shineX = effectProgress.interpolate({ inputRange: [0, 1], outputRange: [-390, 390] });
  const drawButton = <Pressable accessibilityRole="button" accessibilityLabel="今日のおみくじを引く" onPress={start} style={[S.drawButton, guidedDraw && S.guidedDrawButton]}><Text style={[S.drawButtonText, brushTextStyle]}>今日のおみくじを引く</Text></Pressable>;

  return <View style={S.wrap}>
    {pulling && <View style={S.stage}>
      <View style={S.spriteViewport}><Image source={atlas} contentFit="fill" style={[S.characterAtlas, { left: -210 * (frame ?? 0) }]} /></View>
      <Text style={[S.petLine, brushTextStyle]}>{pet.name}が、心をこめて引いています…</Text>
    </View>}
    {revealing && <View accessible accessibilityLabel="おみくじの紙を引き寄せ、運勢をひらいています" style={S.revealStage}>
      <Animated.View pointerEvents="none" style={[S.revealGlow, { backgroundColor: effect.glow, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View pointerEvents="none" style={[S.revealRing, { borderColor: effect.color, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      {[0, 45, 90, 135].map(angle => <Animated.View key={angle} pointerEvents="none" style={[S.lightRay, { backgroundColor: effect.glow, opacity: glowOpacity, transform: [{ rotate: `${angle}deg` }, { rotate: raysRotation }, { scaleY: glowScale }] }]} />)}
      <Animated.View style={[S.revealPaper, { opacity: paperOpacity, transform: [{ translateY: paperY }, { scale: paperScale }, { rotate: paperRotation }] }]}>
        <ImageBackground source={OMIKUJI_RESULT_BACKGROUND} resizeMode="cover" imageStyle={S.revealPaperImage} style={S.revealPaperBody}>
          <Text style={[S.date, brushTextStyle]}>本日のご縁みくじ</Text>
          <Animated.View style={[S.revealSeal, { borderColor: effect.color, transform: [{ scale: rankScale }] }]}>
            <Text style={[S.revealSealLabel, brushTextStyle]}>運勢</Text>
            <Animated.Text style={[S.revealRank, brushTextStyle, { color: effect.color, opacity: rankOpacity, textShadowColor: effect.glow, textShadowRadius: effect.sparkleSize / 2, transform: [{ scale: rankScale }] }]}>{fortune.rank}</Animated.Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[S.paperShine, { opacity: shineOpacity, transform: [{ translateX: shineX }, { rotate: '18deg' }] }]} />
        </ImageBackground>
      </Animated.View>
      {SPARKLE_POSITIONS.slice(0, effect.sparkles).map((position, index) => {
        const startAt = 0.06 + (index % 5) * 0.075;
        const peakAt = Math.min(startAt + 0.38, 0.86);
        const opacity = effectProgress.interpolate({ inputRange: [0, startAt, peakAt, 1], outputRange: [0, 0, 1, 0], extrapolate: 'clamp' });
        const scale = effectProgress.interpolate({ inputRange: [0, startAt, peakAt, 1], outputRange: [0.3, 0.3, 1.2 + (index % 3) * 0.2, 0.55], extrapolate: 'clamp' });
        const drift = effectProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -18 - (index % 3) * 8] });
        return <Animated.Text key={index} pointerEvents="none" style={[S.sparkle, position, { color: effect.color, fontSize: effect.sparkleSize, opacity, textShadowColor: effect.glow, transform: [{ translateY: drift }, { scale }] }]}>{effect.symbol}</Animated.Text>;
      })}
    </View>}

    {!drawn && !pulling && !revealing && <>
      <View style={S.petPrompt}>
        <Text style={[S.fortuneHeading, brushTextStyle]}>今日の運勢</Text>
        <Image source={pet.image} contentFit="contain" accessibilityLabel={pet.name} style={S.petImage} />
      </View>
      <Text style={[S.prompt, brushTextStyle]}>今日の一枚を引いて、運勢をたしかめましょう。</Text>
      {guidedDraw
        ? <TutorialTarget onRectChange={onGuidedTargetRectChange ?? (() => {})} style={S.guidedDrawTarget}>{drawButton}</TutorialTarget>
        : drawButton}
    </>}

    {drawn && !pulling && !revealing && <>
      <OmikujiResultCard fortune={fortune} brushTextStyle={brushTextStyle} />
      <Pressable accessibilityRole="button" accessibilityLabel="おみくじの演出をもう一度見る" onPress={start} style={S.replayButton}><Text style={[S.replayButtonText, brushTextStyle, S.resultTextEmphasis]}>演出をもう一度見る</Text></Pressable>
      {__DEV__ && <Pressable accessibilityRole="button" accessibilityLabel="おみくじを引く前の状態に戻す" onPress={onReset} style={S.replayButton}><Text style={[S.replayButtonText, brushTextStyle]}>引く前の状態に戻す（開発用）</Text></Pressable>}
    </>}
  </View>;
}

const S = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 18 },
  stage: { minHeight: 258, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 },
  spriteViewport: { position: 'absolute', top: 5, width: 210, height: 210, overflow: 'hidden' },
  characterAtlas: { position: 'absolute', top: 0, width: 1680, height: 210 },
  petLine: { fontFamily: 'Shippori', color: '#5B4030', fontSize: 12, backgroundColor: '#FFF9EEDD', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 7, overflow: 'hidden' },
  petPrompt: { alignItems: 'center', gap: 2, paddingTop: 2 },
  fortuneHeading: { color: '#A54E42', fontFamily: 'ShipporiBold', fontSize: 28, lineHeight: 38, letterSpacing: 2, textAlign: 'center', marginBottom: 3 },
  petImage: { width: 126, height: 126 },
  prompt: { color: '#5B4030', fontFamily: 'Shippori', fontSize: 13, lineHeight: 22, textAlign: 'center', backgroundColor: '#FFF9EEDD', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12 },
  revealStage: { minHeight: 400, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  revealGlow: { position: 'absolute', top: 40, alignSelf: 'center', width: 320, height: 320, borderRadius: 160 },
  revealRing: { position: 'absolute', top: 20, alignSelf: 'center', width: 360, height: 360, borderRadius: 180, borderWidth: 2 },
  lightRay: { position: 'absolute', top: 0, left: '50%', marginLeft: -3, width: 6, height: 400, borderRadius: 3 },
  sparkle: { position: 'absolute', fontSize: 24, textShadowColor: '#FFF7DC', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  revealPaper: { width: '82%', height: 360, borderRadius: 6, overflow: 'hidden', shadowColor: '#5E3C28', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  revealPaperImage: { borderRadius: 6, opacity: 0.72 },
  revealPaperBody: { flex: 1, alignItems: 'center', justifyContent: 'space-around', paddingVertical: 20, overflow: 'hidden' },
  revealSeal: { width: 148, height: 148, borderRadius: 74, borderWidth: 1, borderColor: '#B88D5B88', backgroundColor: '#FFF9EF66', alignItems: 'center', justifyContent: 'center' },
  revealSealLabel: { color: '#8B6B51', fontSize: 11, letterSpacing: 3 },
  revealRank: { fontFamily: 'ShipporiBold', fontSize: 44, marginTop: 2 },
  paperShine: { position: 'absolute', top: -34, bottom: -34, left: '48%', width: 48, borderRadius: 40, backgroundColor: '#FFFFFF88' },
  drawButton: { alignSelf: 'center', minHeight: 48, minWidth: 240, backgroundColor: '#A54E42', borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  guidedDrawTarget: { alignSelf: 'center', padding: 7 },
  guidedDrawButton: { borderWidth: 3, borderColor: '#E6C171', shadowColor: '#8B6135', shadowOpacity: .38, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 7 },
  drawButtonText: { color: '#FFF9EF', fontFamily: 'ShipporiBold', letterSpacing: 1 },
  replayButton: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
  replayButtonText: { color: '#A54E42', fontFamily: 'ShipporiBold', fontSize: 12, letterSpacing: 0.5, textDecorationLine: 'underline' },
  resultTextEmphasis: { fontWeight: '700' },
  date: { textAlign: 'center', color: '#8B6B51', fontSize: 10, letterSpacing: 2 },
});
