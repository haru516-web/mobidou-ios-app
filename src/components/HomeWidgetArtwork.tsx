import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import type { PetId } from '../petCatalog';
import { PILGRIMAGE_WALK_ATLAS_HEIGHT, PILGRIMAGE_WALK_ATLAS_WIDTH, PILGRIMAGE_WALK_FRAME_COUNT, PILGRIMAGE_WALK_FRAME_WIDTH, PILGRIMAGE_WALK_ATLASES } from '../data/pilgrimageWalkAtlases';
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

function WalkSprite({ source, frame }: { source: ImageSourcePropType; frame: number }) {
  const height = 82;
  const scale = height / PILGRIMAGE_WALK_ATLAS_HEIGHT;
  const frameWidth = PILGRIMAGE_WALK_FRAME_WIDTH * scale;
  return <View style={{ width: frameWidth, height, overflow: 'hidden' }}>
    <Image
      accessible={false}
      source={source}
      contentFit="fill"
      style={{ position: 'absolute', left: -frameWidth * frame, top: 0, width: PILGRIMAGE_WALK_ATLAS_WIDTH * scale, height }}
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

export function HomeStepsArtwork({ petId, petImage, progress, steps, nextPointSteps, background }: { petId: PetId; petImage: ImageSourcePropType; progress: number; steps: number; nextPointSteps: number | null; background: ImageSourcePropType }) {
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

  return <View pointerEvents="none" style={S.stepsStage}>
    <CardBackground source={background} />
    <View style={S.stepsContent}>
      <View style={S.stepsCopy}>
        <Text style={S.stepsLabel}>歩数count</Text>
        <View style={S.stepsValueRow}><Text style={S.stepsValue}>{steps.toLocaleString('ja-JP')}</Text><Text style={S.stepsUnit}>歩</Text></View>
        <Text style={S.stepsNext}>{nextPointSteps === null ? '今日のポイントはすべて達成' : `次のポイントまで ${nextPointSteps.toLocaleString('ja-JP')}歩`}</Text>
      </View>
      <View style={S.stepsRail}>
        <View style={S.stepsLine} />
        <View style={[S.stepsLineFill, { width: `${ratio * 100}%` }]} />
        <View style={[S.stepsPoint, { left: `${ratio * 100}%` }]} />
        <View style={[S.stepsSpriteAnchor, { left: `${spriteRatio * 100}%` }]}>
          {walkSource ? <WalkSprite source={walkSource} frame={frame} /> : <NeutralWalkingSprite source={petImage} />}
        </View>
      </View>
    </View>
  </View>;
}

const S = StyleSheet.create({
  artworkStage: { flex: 1, width: '100%', position: 'relative' },
  artworkImage: { ...StyleSheet.absoluteFillObject },
  cardBackground: { ...StyleSheet.absoluteFillObject },
  cardBackgroundShade: { ...StyleSheet.absoluteFillObject },
  mapStage: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#E7E0CC' },
  stepsStage: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden' },
  stepsContent: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, zIndex: 1 },
  stepsCopy: { alignItems: 'center' },
  stepsLabel: { color: '#766452', fontSize: 10, letterSpacing: 1.3 },
  stepsValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 1 },
  stepsValue: { color: '#3A3127', fontSize: 32, fontWeight: '300', letterSpacing: .5 },
  stepsUnit: { color: '#766452', fontFamily: 'ShipporiBold', fontSize: 13 },
  stepsNext: { color: '#766452', fontSize: 9, marginTop: 2 },
  stepsRail: { position: 'relative', width: '86%', height: 112 },
  stepsLine: { position: 'absolute', left: 0, right: 0, bottom: 25, height: 4, borderRadius: 3, backgroundColor: '#D7C8B6' },
  stepsLineFill: { position: 'absolute', left: 0, bottom: 25, height: 4, borderRadius: 3, backgroundColor: '#A54E42' },
  stepsPoint: { position: 'absolute', bottom: 18, width: 18, height: 18, marginLeft: -9, borderRadius: 9, borderWidth: 3, borderColor: '#A54E42', backgroundColor: '#FFF9EF', zIndex: 2 },
  stepsSpriteAnchor: { position: 'absolute', bottom: 9, width: 42, height: 84, marginLeft: -21, alignItems: 'center', justifyContent: 'flex-end', zIndex: 3 },
});
