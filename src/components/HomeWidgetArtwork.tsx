import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from './AppImage';
import { BRUSH } from '../components';
import type { PetId } from '../petCatalog';
import type { OmikujiFortune } from '../data/omikuji';
import { PILGRIMAGE_WALK_ATLAS_HEIGHT, PILGRIMAGE_WALK_FRAME_COUNT, PILGRIMAGE_WALK_FRAME_WIDTH, PILGRIMAGE_WALK_ATLASES } from '../data/pilgrimageWalkAtlases';
import { PILGRIMAGE_MAP_IMAGE } from '../data/pilgrimageMapImages';
import { CroppedArt } from './CroppedArt';
import { SlicedArt } from './SlicedArt';
import { LockTag } from './LockTag';
import { UI_ART } from '../data/uiArt';

// Hand-torn washi plates the home cards sit on (bounds are the paper's share of each picture).
const PLATE_STEPS = require('../../assets/ui-washi/home/plate-steps-wide.webp');
const PLATE_STEPS_BOUNDS = { x0: .008, x1: .991, y0: .031, y1: .967 };
const PLATE_GOSHUIN = require('../../assets/ui-washi/home/plate-portrait-goshuin.webp');
const PLATE_GOSHUIN_BOUNDS = { x0: .022, x1: .973, y0: .012, y1: .985 };
const PLATE_OMIKUJI = require('../../assets/ui-washi/home/plate-portrait-omikuji.webp');
const PLATE_OMIKUJI_BOUNDS = { x0: .02, x1: .975, y0: .013, y1: .986 };

const OMIKUJI_DRAW_CYLINDER = require('../../assets/ui-round3/omikuji/omikuji-draw-cylinder-v1.webp');

export function HomeGoshuinArtwork({ source, owned = true }: { source: ImageSourcePropType; owned?: boolean; background?: ImageSourcePropType }) {
  return <View pointerEvents="none" style={S.artworkStage}>
    <CroppedArt source={PLATE_GOSHUIN} bounds={PLATE_GOSHUIN_BOUNDS} />
    <View style={S.goshuinOnPlate}><Image accessible={false} source={source} contentFit="contain" style={[S.goshuinStamp, !owned && S.goshuinLocked]} /></View>
    {!owned && <LockTag size={40} style={S.goshuinLock} />}
  </View>;
}

export function HomeOmikujiArtwork({ fortune }: { fortune: OmikujiFortune | null; petName: string }) {
  return <View pointerEvents="none" style={S.omikujiStage}>
    <CroppedArt source={PLATE_OMIKUJI} bounds={PLATE_OMIKUJI_BOUNDS} />
    <View style={S.omikujiContent}>
      <Text style={S.omikujiMessage}>{fortune ? '本日のご縁みくじ' : 'おみくじを引けるよ'}</Text>
      <View style={S.omikujiPreDrawHero}>
        <Image accessible={false} source={OMIKUJI_DRAW_CYLINDER} contentFit="contain" style={S.omikujiDrawCylinder} />
      </View>
      {fortune && <View style={S.omikujiRankBox}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={S.omikujiRank}>{fortune.rank}</Text>
        <Text numberOfLines={1} style={S.omikujiRankTitle}>{fortune.title}</Text>
      </View>}
    </View>
  </View>;
}

export function HomeMapArtwork() {
  return <View pointerEvents="none" style={S.mapStage}>
    <Image accessible={false} source={PILGRIMAGE_MAP_IMAGE} contentFit="cover" style={S.artworkImage} />
  </View>;
}

function WalkSprite({ source, frame }: { source: ImageSourcePropType; frame: number }) {
  // Use an integer-sized source cell so the viewport edge never lands between
  // source pixels. This avoids the texture filter pulling a sliver of the
  // previous/next walk cut into the current frame.
  const targetHeight = 80;
  const targetScale = targetHeight / PILGRIMAGE_WALK_ATLAS_HEIGHT;
  const frameWidth = Math.max(1, Math.round(PILGRIMAGE_WALK_FRAME_WIDTH * targetScale));
  const scale = frameWidth / PILGRIMAGE_WALK_FRAME_WIDTH;
  const height = PILGRIMAGE_WALK_ATLAS_HEIGHT * scale;
  const atlasWidth = frameWidth * PILGRIMAGE_WALK_FRAME_COUNT;
  return <View style={{ width: frameWidth, height, overflow: 'hidden' }}>
    <Image
      accessible={false}
      source={source}
      contentFit="fill"
      style={{ position: 'absolute', left: -frameWidth * frame, top: 0, width: atlasWidth, height }}
    />
  </View>;
}

function NeutralWalkingSprite({ source }: { source: ImageSourcePropType }) {
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(motion, { toValue: -1, duration: 180, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(motion, { toValue: 0, duration: 180, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [motion]);
  return <Animated.View style={{ width: 64, height: 64, transform: [{ translateY: motion.interpolate({ inputRange: [-1, 0, 1], outputRange: [-12, -14, -16] }) }, { rotate: motion.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-3deg', '0deg', '3deg'] }) }] }}>
    <Image accessible={false} source={source} contentFit="contain" style={StyleSheet.absoluteFillObject} />
  </Animated.View>;
}

export function HomeStepsArtwork({ petId, petImage, progress, steps, todaySteps = steps, totalSteps = steps, previousPointSteps = 0, previousPointName = '出発', nextPointSteps, horizontal = false }: { previousPointName?: string; petId: PetId; petImage: ImageSourcePropType; progress: number; steps: number; todaySteps?: number; totalSteps?: number; previousPointSteps?: number; nextPointSteps: number | null; horizontal?: boolean }) {
  const [frame, setFrame] = useState(0);
  const walkSource = PILGRIMAGE_WALK_ATLASES[petId];
  const ratio = Math.max(0, Math.min(1, progress));
  const spriteRatio = Math.max(0.06, Math.min(0.94, ratio));

  useEffect(() => {
    setFrame(0);
    if (!walkSource) return undefined;
    const timer = setInterval(() => setFrame(value => (value + 1) % PILGRIMAGE_WALK_FRAME_COUNT), 150);
    return () => clearInterval(timer);
  }, [walkSource]);

  return <View pointerEvents="none" style={[S.stepsStage, horizontal && S.stepsStageHorizontal]}>
    <CroppedArt source={PLATE_STEPS} bounds={PLATE_STEPS_BOUNDS} />
    {horizontal ? <View style={S.stepsHorizontalContent}>
      <View style={S.stepsTrack}>
        <View style={S.stepsLine}><SlicedArt name="progressTrack" /></View>
        <View style={[S.stepsLineFill, { width: `${ratio * 100}%` }]}><SlicedArt name="progressFill" /></View>
        <Image accessible={false} source={UI_ART.progressPoint.source} contentFit="contain" style={[S.stepsPoint, { left: `${ratio * 100}%` }]} />
        <Text numberOfLines={1} style={S.stepsPreviousLabel}>{previousPointName} {previousPointSteps.toLocaleString('ja-JP')}歩</Text>
        {nextPointSteps !== null && <Text style={S.stepsNextLabel}>次まで あと{nextPointSteps.toLocaleString('ja-JP')}歩</Text>}
        <View style={[S.stepsSpriteAnchor, { left: `${spriteRatio * 100}%` }]}>
          {walkSource ? <WalkSprite source={walkSource} frame={frame} /> : <NeutralWalkingSprite source={petImage} />}
        </View>
      </View>
      <View style={S.stepsCurrent}><Text style={S.stepsCurrentLabel}>今日の歩数</Text><Text style={S.stepsCurrentValue}>{todaySteps.toLocaleString('ja-JP')}歩</Text></View>
      <View style={S.stepsTotal}><Text style={S.stepsTotalLabel}>累計歩数</Text><Text style={S.stepsTotalValue}>{totalSteps.toLocaleString('ja-JP')}歩</Text></View>
    </View> : <View style={S.stepsContent}>
      <View style={S.stepsCopy}>
        <View style={S.stepsValueRow}><Text style={S.stepsValue}>{steps.toLocaleString('ja-JP')}</Text><Text style={S.stepsUnit}>歩</Text></View>
      </View>
      <View style={S.stepsRail}>
        <View style={S.stepsLine}><SlicedArt name="progressTrack" /></View>
        <View style={[S.stepsLineFill, { width: `${ratio * 100}%` }]}><SlicedArt name="progressFill" /></View>
        <Image accessible={false} source={UI_ART.progressPoint.source} contentFit="contain" style={[S.stepsPoint, { left: `${ratio * 100}%` }]} />
        <View style={[S.stepsSpriteAnchor, { left: `${spriteRatio * 100}%` }]}>
          {walkSource ? <WalkSprite source={walkSource} frame={frame} /> : <NeutralWalkingSprite source={petImage} />}
        </View>
      </View>
    </View>}
  </View>;
}

const S = StyleSheet.create({
  artworkStage: { flex: 1, width: '100%', position: 'relative' },
  goshuinOnPlate: { flex: 1, paddingHorizontal: '13%', paddingVertical: '9%' },
  goshuinStamp: { width: '100%', height: '100%' },
  goshuinLocked: { opacity: .28 },
  goshuinLock: { position: 'absolute', right: '14%', bottom: '10%' },
  omikujiStage: { flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', paddingHorizontal: '5%', paddingVertical: '3%' },
  omikujiResultContentViewport: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  omikujiResultContentScale: { width: '189%', transform: [{ scale: 0.53 }] },
  omikujiContent: { flex: 1, minHeight: 0, alignItems: 'center', paddingHorizontal: 7, paddingTop: 7, paddingBottom: 10 },
  omikujiPreDrawHero: { flex: 1, minHeight: 0, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  omikujiDrawCylinder: { width: '100%', height: '100%' },
  omikujiMessage: { width: '100%', color: '#5E5045', fontFamily: BRUSH, textAlign: 'center', fontSize: 11, lineHeight: 15, marginTop: 2 },
  omikujiRankBox: { alignItems: 'center', width: '100%', paddingBottom: 2 },
  omikujiRank: { color: '#A54E42', fontFamily: BRUSH, fontSize: 34, lineHeight: 40 },
  omikujiRankTitle: { color: '#3D3028', fontFamily: BRUSH, fontSize: 11, marginTop: 1 },
  omikujiLucky: { color: '#79685A', fontSize: 9, lineHeight: 8, marginTop: 1 },
  artworkImage: { ...StyleSheet.absoluteFillObject },
  cardBackground: { ...StyleSheet.absoluteFillObject },
  cardBackgroundShade: { ...StyleSheet.absoluteFillObject },
  mapStage: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#E7E0CC' },
  stepsStage: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden' },
  stepsStageHorizontal: { minHeight: 126 },
  stepsHorizontalContent: { flex: 1, position: 'relative', zIndex: 1 },
  stepsTrack: { position: 'absolute', left: 22, right: 22, top: 58, height: 62 },
  stepsPreviousLabel: { position: 'absolute', left: 0, top: -6, maxWidth: '48%', color: '#5D493B', fontFamily: 'ShipporiBold', fontSize: 10 },
  stepsPreviousValue: { position: 'absolute', left: 0, top: 38, color: '#766452', fontSize: 10 },
  stepsNextLabel: { position: 'absolute', right: 0, top: -6, color: '#5D493B', fontFamily: 'ShipporiBold', fontSize: 10, textAlign: 'right' },
  stepsNextValue: { position: 'absolute', right: 0, top: 38, color: '#766452', fontSize: 10, textAlign: 'right' },
  stepsCurrent: { position: 'absolute', left: 0, right: 0, top: 10, alignItems: 'center' },
  stepsCurrentLabel: { color: '#766452', fontFamily: 'ShipporiBold', fontSize: 10, letterSpacing: .8 },
  stepsCurrentValue: { color: '#3A3127', fontSize: 23, fontWeight: '300', letterSpacing: .5, marginTop: 1 },
  stepsTotal: { position: 'absolute', left: 0, right: 0, top: 106, flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 8 },
  stepsTotalLabel: { color: '#766452', fontFamily: 'ShipporiBold', fontSize: 10, letterSpacing: .6 },
  stepsTotalValue: { color: '#3A3127', fontSize: 15, fontWeight: '300', letterSpacing: .4, marginTop: 1 },
  stepsContent: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, zIndex: 1 },
  stepsCopy: { alignItems: 'center' },
  stepsValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 1 },
  stepsValue: { color: '#3A3127', fontSize: 32, fontWeight: '300', letterSpacing: .5 },
  stepsUnit: { color: '#766452', fontFamily: BRUSH, fontSize: 13 },
  stepsRail: { position: 'relative', width: '86%', height: 112 },
  stepsLine: { position: 'absolute', left: 0, right: 0, top: 24, height: 12 },
  stepsLineFill: { position: 'absolute', left: 0, top: 24, height: 12 },
  stepsPoint: { position: 'absolute', top: 17, width: 26, height: 26, marginLeft: -13, zIndex: 2 },
  stepsSpriteAnchor: { position: 'absolute', top: -7, width: 42, height: 84, marginLeft: -21, alignItems: 'center', justifyContent: 'flex-end', zIndex: 3 },
});
