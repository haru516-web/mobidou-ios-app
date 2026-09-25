import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export function TutorialTapHint({ step, label, detail }: { step: string; label: string; detail: string }) {
  return <View pointerEvents="none" style={S.hint}>
    <View style={S.stepBadge}><Text style={S.step}>{step}</Text></View>
    <View style={S.copy}>
      <Text style={S.title}>{label}</Text>
      <Text style={S.detail}>{detail}</Text>
    </View>
    <Ionicons name="hand-left-outline" size={21} color="#9D6540" />
  </View>;
}

const S = StyleSheet.create({
  hint: { width: '100%', minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16, backgroundColor: '#FFFDF6', borderWidth: 1.5, borderColor: '#D3A752', shadowColor: '#35271C', shadowOpacity: .27, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 9 },
  stepBadge: { minWidth: 54, height: 44, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#815C3B' },
  step: { color: '#FFF8E9', fontSize: 11, fontWeight: '700', letterSpacing: .25 },
  copy: { flex: 1, gap: 2 },
  title: { color: '#3D3328', fontFamily: 'ShipporiBold', fontSize: 14, lineHeight: 19 },
  detail: { color: '#786853', fontSize: 11, lineHeight: 16 },
});
