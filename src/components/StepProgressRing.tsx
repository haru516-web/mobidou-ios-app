import React, { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, Image as SvgImage, Mask, RadialGradient, Stop } from 'react-native-svg';
import { BRUSH, C } from '../components';

const ENSO_TRACK = require('../../assets/ui-washi/walk/enso-track.webp');
const ENSO_STROKE = require('../../assets/ui-washi/walk/enso-stroke.webp');

// Geometry of the brush ring inside its 1024px art: where its center sits, the
// radius along the middle of the stroke, and how far round it runs (it starts at
// twelve o'clock and stops just short of closing).
const ART = 1024;
const RING_CENTER = { x: 520, y: 524 };
const RING_RADIUS = 405;
const REVEAL_BAND = 260;
const RING_SWEEP = 345 / 360;

type StepProgressRingProps = {
  steps: number;
  goal: number;
  size?: number;
  compact?: boolean;
};

/**
 * The day's walk as an ink circle (enso): the brush stroke is drawn a little
 * further round the more you walk, over a faint under-drawing of the whole ring.
 */
export function StepProgressRing({ steps, goal, size = 248, compact = false }: StepProgressRingProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const progress = Math.min(1, Math.max(0, steps / Math.max(1, goal)));
  const circumference = 2 * Math.PI * RING_RADIUS;
  // Even a first step shows the head of the stroke.
  const drawn = progress > 0 ? Math.max(0.04, progress) : 0;

  return <View style={[S.wrap, { width: size, height: size, marginTop: size >= 240 ? 3 : 0 }]}>
    <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`} style={S.svg}>
      <Defs>
        {/* A soft paper glow behind the numbers keeps them legible over photo backgrounds. */}
        <RadialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF9EF" stopOpacity={0.9} />
          <Stop offset="0.72" stopColor="#FFF9EF" stopOpacity={0.78} />
          <Stop offset="1" stopColor="#FFF9EF" stopOpacity={0} />
        </RadialGradient>
        <Mask id={`reveal-${id}`} x="0" y="0" width={ART} height={ART} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
          <Circle cx={RING_CENTER.x} cy={RING_CENTER.y} r={RING_RADIUS} stroke="#FFFFFF" strokeWidth={REVEAL_BAND} fill="none" strokeDasharray={`${circumference * RING_SWEEP * drawn} ${circumference}`} rotation={-90} origin={`${RING_CENTER.x}, ${RING_CENTER.y}`} />
        </Mask>
      </Defs>
      <Circle cx={RING_CENTER.x} cy={RING_CENTER.y} r={RING_RADIUS * 0.94} fill={`url(#glow-${id})`} />
    </Svg>
    <Image accessible={false} source={ENSO_TRACK} contentFit="fill" style={S.art} pointerEvents="none" />
    <Svg width={size} height={size} viewBox={`0 0 ${ART} ${ART}`} style={S.svg} pointerEvents="none">
      <SvgImage href={ENSO_STROKE} x="0" y="0" width={ART} height={ART} preserveAspectRatio="none" mask={`url(#reveal-${id})`} />
    </Svg>
    <View style={S.center}>
      <Text style={[S.count, compact && S.compactCount, { fontSize: size * (compact ? .18 : .198) }]}>{steps.toLocaleString('ja-JP')}</Text>
      {!compact && <><Text style={S.unit}>歩</Text><Text style={S.goal}>目標 {goal.toLocaleString('ja-JP')}歩</Text></>}
    </View>
  </View>;
}

const S = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute' },
  art: { ...StyleSheet.absoluteFillObject },
  center: { alignItems: 'center', justifyContent: 'center' },
  count: { fontWeight: '400', color: C.ink, letterSpacing: 1 },
  compactCount: { fontWeight: '500', color: '#201812' },
  unit: { fontFamily: BRUSH, fontSize: 16, color: C.muted, marginTop: -2 },
  goal: { fontSize: 13, color: '#6F6356', marginTop: 9, letterSpacing: 1 },
});
