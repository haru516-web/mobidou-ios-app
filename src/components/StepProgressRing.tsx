import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C, SERIF } from '../components';

type StepProgressRingProps = {
  steps: number;
  goal: number;
  size?: number;
  compact?: boolean;
};

export function StepProgressRing({ steps, goal, size = 248, compact = false }: StepProgressRingProps) {
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, steps / Math.max(1, goal)));

  return <View style={[S.wrap, { width: size, height: size, marginTop: size >= 240 ? 3 : 0 }]}>
    <Svg width={size} height={size} style={S.svg}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#D8D0C4" strokeWidth={stroke} fill="none" strokeLinecap="round" />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.red} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - progress)} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
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
  center: { alignItems: 'center', justifyContent: 'center' },
  count: { fontWeight: '300', color: C.ink, letterSpacing: 1 },
  compactCount: { fontWeight: '500', color: '#201812' },
  unit: { fontFamily: SERIF, fontSize: 16, color: C.muted, marginTop: -2 },
  goal: { fontSize: 10, color: C.muted, marginTop: 9, letterSpacing: 1 },
});
