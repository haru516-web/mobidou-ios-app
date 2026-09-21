import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import type { PetId } from '../petCatalog';
import { PILGRIMAGE_WALK_ATLAS_HEIGHT, PILGRIMAGE_WALK_FRAME_COUNT, PILGRIMAGE_WALK_FRAME_WIDTH, PILGRIMAGE_WALK_ATLASES } from '../data/pilgrimageWalkAtlases';
import { PILGRIMAGE_MAP_IMAGE } from '../data/pilgrimageMapImages';

function CardBackground({ source, shade = '#FFF9EFA8' }: { source: ImageSourcePropType; shade?: string }) {
  return <>
    <Image accessible={false} source={source} contentFit="cover" style={S.cardBackground} />
    <View pointerEvents="none" style={[S.cardBackgroundShade, { backgroundColor: shade }]} />
  </>;
}

export function HomeGoshuinArtwork({ source, background }: { source: ImageSourcePropType; background: ImageSourcePropType }) {
  return <View pointerEvents="none" style={S.artworkStage}>
    <CardBackground source={background} />
    <Image accessible={false} source={source} contentFit="contain" style={S.artworkImage} />
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

function WalkSprite({ source, frame, targetHeight = 80 }: { source: ImageSourcePropType; frame: number; targetHeight?: number }) {
  // Use an integer-sized source cell so the viewport edge never lands between
  // source pixels. This avoids the texture filter pulling a sliver of the
  // previous/next walk cut into the current frame.
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

export function HomeStepsArtwork({ petId, petImage, progress, steps, todaySteps = steps, totalSteps = steps, previousPointSteps = 0, nextPointSteps, background, horizontal = false, compact = false }: { petId: PetId; petImage: ImageSourcePropType; progress: number; steps: number; todaySteps?: number; totalSteps?: number; previousPointSteps?: number; nextPointSteps: number | null; background: ImageSourcePropType; horizontal?: boolean; compact?: boolean }) {
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

  return <View pointerEvents="none" style={[S.stepsStage, horizontal && S.stepsStageHorizontal, compact && S.stepsStageCompact]}>
    <CardBackground source={background} />
    {horizontal ? compact ? <View style={S.stepsCompactContent}>
      <View style={S.stepsCompactHeader}>
        <Text style={S.stepsCompactHeaderText}>
          今日の歩数 <Text style={S.stepsCompactHeaderValue}>{todaySteps.toLocaleString('ja-JP')}歩</Text>
          <Text style={S.stepsCompactHeaderSlash}>/</Text>
          次の寺社まで <Text style={S.stepsCompactHeaderValue}>{nextPointSteps === null ? '結願' : `${nextPointSteps.toLocaleString('ja-JP')}歩`}</Text>
        </Text>
      </View>
      <View style={S.stepsCompactTrack}>
        <View style={S.stepsCompactLine} />
        <View style={[S.stepsCompactLineFill, { width: `${ratio * 100}%` }]} />
        <View style={[S.stepsCompactPoint, { left: `${ratio * 100}%` }]} />
        <View style={[S.stepsCompactSpriteAnchor, { left: `${spriteRatio * 100}%` }]}>
          {walkSource ? <WalkSprite source={walkSource} frame={frame} targetHeight={54} /> : <NeutralWalkingSprite source={petImage} />}
        </View>
      </View>
    </View> : <View style={S.stepsHorizontalContent}>
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
  artworkImage: { ...StyleSheet.absoluteFillObject },
  cardBackground: { ...StyleSheet.absoluteFillObject },
  cardBackgroundShade: { ...StyleSheet.absoluteFillObject },
  mapStage: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#E7E0CC' },
  stepsStage: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden' },
  stepsStageHorizontal: { minHeight: 126 },
  stepsStageCompact: { minHeight: 0 },
  stepsCompactContent: { flex: 1, position: 'relative', zIndex: 1 },
  stepsCompactHeader: { position: 'absolute', left: 8, right: 8, top: 10, alignItems: 'center', justifyContent: 'center' },
  stepsCompactHeaderText: { flexShrink: 1, color: '#766452', fontFamily: 'ShipporiBold', fontSize: 12.6, letterSpacing: .15 },
  stepsCompactHeaderSlash: { marginHorizontal: 4, color: '#A54E42', fontFamily: 'ShipporiBold', fontSize: 14 },
  stepsCompactHeaderValue: { color: '#3A3127', fontFamily: 'ShipporiBold', fontSize: 18.2, letterSpacing: .1 },
  stepsCompactTrack: { position: 'absolute', left: 14, right: 14, bottom: 9, height: 45 },
  stepsCompactLine: { position: 'absolute', left: 0, right: 0, top: 25, height: 4, borderRadius: 3, backgroundColor: '#D7C8B6' },
  stepsCompactLineFill: { position: 'absolute', left: 0, top: 25, height: 4, borderRadius: 3, backgroundColor: '#A54E42' },
  stepsCompactPoint: { position: 'absolute', top: 18, width: 18, height: 18, marginLeft: -9, borderRadius: 9, borderWidth: 3, borderColor: '#A54E42', backgroundColor: '#FFF9EF', zIndex: 2 },
  stepsCompactSpriteAnchor: { position: 'absolute', top: -2, width: 42, height: 54, marginLeft: -21, alignItems: 'center', justifyContent: 'flex-end', zIndex: 3 },
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
