import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BRUSH } from '../components';
import { SlicedArt } from './SlicedArt';

export function TutorialTapHint({ step, label, detail }: { step: string; label: string; detail: string }) {
  return <View pointerEvents="none" style={S.hint}>
    <SlicedArt name="hintFrame" corner={18} />
    <View style={S.stepBadge}><Text style={S.step}>{step}</Text></View>
    <View style={S.copy}>
      <Text style={S.title}>{label}</Text>
      <Text style={S.detail}>{detail}</Text>
    </View>
    <Ionicons name="hand-left-outline" size={21} color="#9D6540" />
  </View>;
}

const S = StyleSheet.create({
  hint: { width: '100%', minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 20, paddingVertical: 14 },
  stepBadge: { minWidth: 54, height: 44, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#815C3B' },
  step: { color: '#FFF8E9', fontSize: 11, fontWeight: '700', letterSpacing: .25 },
  copy: { flex: 1, gap: 2 },
  title: { color: '#3D3328', fontFamily: BRUSH, fontSize: 14, lineHeight: 19 },
  detail: { color: '#786853', fontSize: 11, lineHeight: 16 },
});
