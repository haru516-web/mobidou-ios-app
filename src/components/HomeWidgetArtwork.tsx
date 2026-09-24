import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import type { PetId } from '../petCatalog';
import { categoriesForFortune, type OmikujiFortune } from '../data/omikuji';
import { useOmikujiBrushFont } from '../fonts/useOmikujiBrushFont';
import { PILGRIMAGE_WALK_ATLAS_HEIGHT, PILGRIMAGE_WALK_FRAME_COUNT, PILGRIMAGE_WALK_FRAME_WIDTH, PILGRIMAGE_WALK_ATLASES } from '../data/pilgrimageWalkAtlases';
import { PILGRIMAGE_MAP_IMAGE } from '../data/pilgrimageMapImages';

const OMIKUJI_RESULT_BACKGROUND = require('../../assets/omikuji/omikuji-result-washi-v1.png');

function CardBackground({ source, shade = '#FFF9EFA8' }: { source: ImageSourcePropType; shade?: string }) {
  return <>
    <Image accessible={false} source={source} contentFit="cover" style={S.cardBackground} />
    <View pointerEvents="none" style={[S.cardBackgroundShade, { backgroundColor: shade }]} />
  </>;
}

export function HomeGoshuinArtwork({ source }: { source: ImageSourcePropType; background?: ImageSourcePropType }) {
  return <View pointerEvents="none" style={S.artworkStage}>
    <Image accessible={false} source={source} contentFit="contain" style={S.goshuinOnly} />
  </View>;
}

export function HomeOmikujiArtwork({ fortune, petName }: { fortune: OmikujiFortune | null; petName: string }) {
  const categories = fortune ? categoriesForFortune(fortune) : null;
  const brushTextStyle = useOmikujiBrushFont();
  return <View pointerEvents="none" style={S.omikujiStage}>
    <Image accessible={false} source={OMIKUJI_RESULT_BACKGROUND} contentFit="cover" style={S.omikujiBackground} />
    <View style={S.omikujiBackgroundShade} />
    <View style={S.omikujiContent}>
      <Text style={[S.omikujiKicker, brushTextStyle]}>本日のご縁みくじ</Text>
      <Text style={[S.omikujiRank, !fortune && S.omikujiUndrawnRank, brushTextStyle]}>{fortune?.rank ?? '未'}</Text>
      <Text numberOfLines={1} style={[S.omikujiTitle, brushTextStyle]}>{fortune?.title ?? '今日のご縁を、迎えにいこう'}</Text>
      <Text numberOfLines={2} style={[S.omikujiMessage, brushTextStyle]}>{fortune?.message ?? petName + 'がおみくじを引いてくれます'}</Text>
      <View style={S.omikujiRule} />
      <View style={S.omikujiCategories}>
        {categories
          ? categories.map(item => <View key={item.label} style={S.omikujiCategoryRow}><Text style={[S.omikujiCategoryLabel, brushTextStyle]}>{item.label}</Text><Text numberOfLines={1} style={[S.omikujiCategoryValue, brushTextStyle]}>{item.text}</Text></View>)
          : <Text style={[S.omikujiPendingCategories, brushTextStyle]}>学問・願い事・健康・恋愛</Text>}
      </View>
      <View style={S.omikujiActionPanel}>
        <Text style={[S.omikujiActionLabel, brushTextStyle]}>今日の小さな開運</Text>
        <Text numberOfLines={2} style={[S.omikujiAction, brushTextStyle]}>{fortune?.action ?? 'タップして今日の一枚を引く'}</Text>
        {fortune && <Text numberOfLines={1} style={[S.omikujiLucky, brushTextStyle]}>吉もの　{fortune.lucky}</Text>}
      </View>
      <Text style={[S.omikujiFooter, brushTextStyle]}>{fortune ? 'また明日、違うご縁が待っています。' : 'タップして今日のおみくじを引きましょう'}</Text>
    </View>
  </View>;
}

export function HomeMiniatureArtwork({ source, background }: { source: ImageSourcePropType; background: ImageSourcePropType }) {
  return <View pointerEvents="none" style={S.artworkStage}>
    <CardBackground source={background} shade="#FFF9EF32" />
    <Image accessible={false} source={source} contentFit="contain" style={S.artworkImage} />
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

export function HomeStepsArtwork({ petId, petImage, progress, steps, todaySteps = steps, totalSteps = steps, previousPointSteps = 0, nextPointSteps, background, horizontal = false }: { petId: PetId; petImage: ImageSourcePropType; progress: number; steps: number; todaySteps?: number; totalSteps?: number; previousPointSteps?: number; nextPointSteps: number | null; background: ImageSourcePropType; horizontal?: boolean }) {
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
    <CardBackground source={background} />
    {horizontal ? <View style={S.stepsHorizontalContent}>
      <View style={S.stepsTrack}>
        <View style={S.stepsLine} />
        <View style={[S.stepsLineFill, { width: `${ratio * 100}%` }]} />
        <View style={[S.stepsPoint, { left: `${ratio * 100}%` }]} />
        <Text style={S.stepsPreviousLabel}>前回地点</Text>
        <Text style={S.stepsPreviousValue}>{previousPointSteps.toLocaleString('ja-JP')}歩</Text>
        {nextPointSteps !== null && <><Text style={S.stepsNextLabel}>次回地点</Text><Text style={S.stepsNextValue}>{nextPointSteps.toLocaleString('ja-JP')}歩</Text></>}
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
        <View style={S.stepsLine} />
        <View style={[S.stepsLineFill, { width: `${ratio * 100}%` }]} />
        <View style={[S.stepsPoint, { left: `${ratio * 100}%` }]} />
        <View style={[S.stepsSpriteAnchor, { left: `${spriteRatio * 100}%` }]}>
          {walkSource ? <WalkSprite source={walkSource} frame={frame} /> : <NeutralWalkingSprite source={petImage} />}
        </View>
      </View>
    </View>}
  </View>;
}

const S = StyleSheet.create({
  artworkStage: { flex: 1, width: '100%', position: 'relative' },
  goshuinOnly: { width: '88%', height: '92%', alignSelf: 'center', marginTop: '4%' },
  omikujiStage: { flex: 1, minHeight: 0, margin: 5, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#CDAF82', backgroundColor: '#FFF9EA', borderRadius: 5 },
  omikujiBackground: { ...StyleSheet.absoluteFillObject },
  omikujiBackgroundShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF9EFA8' },
  omikujiContent: { flex: 1, alignItems: 'center', paddingHorizontal: 7, paddingTop: 5, paddingBottom: 4 },
  omikujiKicker: { color: '#8B6B51', fontFamily: 'ShipporiBold', fontSize: 7, lineHeight: 9, letterSpacing: 1.1 },
  omikujiRank: { color: '#A54E42', fontFamily: 'ShipporiBold', fontSize: 30, lineHeight: 34, marginTop: 1 },
  omikujiUndrawnRank: { fontSize: 24 },
  omikujiTitle: { width: '100%', color: '#3D3028', fontFamily: 'ShipporiBold', textAlign: 'center', fontSize: 8.5, lineHeight: 12 },
  omikujiMessage: { width: '100%', color: '#5E5045', fontFamily: 'Shippori', textAlign: 'center', fontSize: 7, lineHeight: 9.5, marginTop: 2 },
  omikujiRule: { width: '82%', height: 1, backgroundColor: '#D8C3A6', marginTop: 3, marginBottom: 3 },
  omikujiCategories: { width: '100%', gap: 1 },
  omikujiCategoryRow: { minHeight: 12.5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  omikujiCategoryLabel: { width: 28, color: '#A54E42', fontFamily: 'ShipporiBold', fontSize: 7, lineHeight: 9 },
  omikujiCategoryValue: { flex: 1, color: '#5E5045', fontSize: 7, lineHeight: 9 },
  omikujiPendingCategories: { color: '#8B6B51', fontFamily: 'Shippori', textAlign: 'center', fontSize: 7, lineHeight: 11 },
  omikujiActionPanel: { alignSelf: 'stretch', marginTop: 'auto', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F2E6D3D9' },
  omikujiActionLabel: { color: '#8A5A3B', fontSize: 6, lineHeight: 8 },
  omikujiAction: { color: '#3D3028', fontFamily: 'ShipporiBold', fontSize: 8, lineHeight: 10, marginTop: 1 },
  omikujiLucky: { color: '#79685A', fontSize: 6, lineHeight: 8, marginTop: 1 },
  omikujiFooter: { color: '#8A7564', textAlign: 'center', fontSize: 6, lineHeight: 8, marginTop: 3 },
  artworkImage: { ...StyleSheet.absoluteFillObject },
  cardBackground: { ...StyleSheet.absoluteFillObject },
  cardBackgroundShade: { ...StyleSheet.absoluteFillObject },
  mapStage: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#E7E0CC' },
  stepsStage: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden' },
  stepsStageHorizontal: { minHeight: 126 },
  stepsHorizontalContent: { flex: 1, position: 'relative', zIndex: 1 },
  stepsTrack: { position: 'absolute', left: 18, right: 18, top: 42, height: 62 },
  stepsPreviousLabel: { position: 'absolute', left: 0, top: 8, color: '#5D493B', fontFamily: 'ShipporiBold', fontSize: 9 },
  stepsPreviousValue: { position: 'absolute', left: 0, top: 38, color: '#766452', fontSize: 8 },
  stepsNextLabel: { position: 'absolute', right: 0, top: 8, color: '#5D493B', fontFamily: 'ShipporiBold', fontSize: 9, textAlign: 'right' },
  stepsNextValue: { position: 'absolute', right: 0, top: 38, color: '#766452', fontSize: 8, textAlign: 'right' },
  stepsCurrent: { position: 'absolute', left: 0, right: 0, top: 2, alignItems: 'center' },
  stepsCurrentLabel: { color: '#766452', fontFamily: 'ShipporiBold', fontSize: 8, letterSpacing: .8 },
  stepsCurrentValue: { color: '#3A3127', fontSize: 23, fontWeight: '300', letterSpacing: .5, marginTop: 1 },
  stepsTotal: { position: 'absolute', left: 0, right: 0, top: 82, alignItems: 'center' },
  stepsTotalLabel: { color: '#766452', fontFamily: 'ShipporiBold', fontSize: 8, letterSpacing: .6 },
  stepsTotalValue: { color: '#3A3127', fontSize: 15, fontWeight: '300', letterSpacing: .4, marginTop: 1 },
  stepsContent: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, zIndex: 1 },
  stepsCopy: { alignItems: 'center' },
  stepsValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 1 },
  stepsValue: { color: '#3A3127', fontSize: 32, fontWeight: '300', letterSpacing: .5 },
  stepsUnit: { color: '#766452', fontFamily: 'ShipporiBold', fontSize: 13 },
  stepsRail: { position: 'relative', width: '86%', height: 112 },
  stepsLine: { position: 'absolute', left: 0, right: 0, top: 28, height: 4, borderRadius: 3, backgroundColor: '#D7C8B6' },
  stepsLineFill: { position: 'absolute', left: 0, top: 28, height: 4, borderRadius: 3, backgroundColor: '#A54E42' },
  stepsPoint: { position: 'absolute', top: 21, width: 18, height: 18, marginLeft: -9, borderRadius: 9, borderWidth: 3, borderColor: '#A54E42', backgroundColor: '#FFF9EF', zIndex: 2 },
  stepsSpriteAnchor: { position: 'absolute', top: -7, width: 42, height: 84, marginLeft: -21, alignItems: 'center', justifyContent: 'flex-end', zIndex: 3 },
});
