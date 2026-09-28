import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';
import type { PetCharacter } from './petCatalog';
import { PullableCompanion } from './components/PullableCompanion';
import { STAMP_IMAGES, type Shrine } from './data/shrines';
import { WashiPressable as Pressable } from './components/Washi';
export const C = { paper: '#F8F4EB', ink: '#322F29', red: '#A54E42', muted: '#8A8174', line: '#E3DACE', pale: '#EFE8DD', gold: '#AF9368' };
export const SERIF = 'Shippori';
export function Icon({ name, size = 21, color = C.ink }: { name: React.ComponentProps<typeof Ionicons>['name']; size?: number; color?: string }) { return <Ionicons name={name} size={size} color={color} />; }
export function Torii({ size = 30, color = C.red }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40"><Path d="M3 7 Q20 12 37 7 M6 13 H34 M8 21 H32 M12 13 L10 36 M28 13 L30 36 M20 14 V20" stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none" /></Svg>;
}
export function Clouds() { return <Svg pointerEvents="none" width="100%" height="150" viewBox="0 0 420 150" style={{ position: 'absolute', top: 45 }}><Path d="M-28 70 H35 Q66 70 66 51 Q66 35 48 35 Q31 35 31 49 H10 Q-4 49 -4 65 M341 115 H451 M359 99 H428 Q444 99 444 84 Q444 65 425 65 Q410 65 410 81 H386 Q371 81 371 99" stroke="#D9CBBB" strokeWidth="9" strokeLinecap="round" fill="none" opacity=".35" /></Svg>; }
export function Button({ title, onPress, secondary, disabled, icon, style, textStyle }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name']; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [S.button, secondary && S.secondary, { opacity: disabled ? .45 : pressed ? .75 : 1 }, style]}>{icon && <Icon name={icon} color={secondary ? C.red : '#FFF9EF'} size={18} />}<Text style={[S.buttonText, secondary && { color: C.red }, textStyle]}>{title}</Text></Pressable>;
}
export function Section({ title, subtitle, action, onPress, actionArtwork = true }: { title: string; subtitle?: string; action?: string; onPress?: () => void; actionArtwork?: boolean }) { return <View style={S.section}><View><Text style={S.sectionTitle}>{title}</Text>{subtitle && <Text style={S.eyebrow}>{subtitle}</Text>}</View>{action && <Pressable artwork={actionArtwork} accessibilityRole="button" onPress={onPress} style={S.link}><Text style={S.linkText}>{action}</Text><Icon name="chevron-forward" size={14} color={C.red} /></Pressable>}</View>; }
export function Stamp({ shrine, locked, style, imageFit = 'cover' }: { shrine: Shrine; locked?: boolean; style?: StyleProp<ViewStyle>; imageFit?: 'cover' | 'contain' }) {
  return <View style={[S.stamp, style]}><Image accessibilityLabel={`${shrine.name}の御朱印${locked ? '・未取得' : ''}`} source={STAMP_IMAGES[shrine.id]} style={{ width: '100%', height: '100%', opacity: locked ? .2 : 1 }} contentFit={imageFit} />{locked && <View style={S.lock}><Icon name="lock-closed-outline" color={C.muted} size={20} /><Text style={S.lockText}>まだ見ぬご縁</Text></View>}</View>;
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReduced); const s = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced); return () => s.remove(); }, []);
  return reduced;
}

export function Companion({ pet, haptics, onBond, reactionTrigger, onStageLayout }: { pet: PetCharacter; haptics: boolean; onBond: () => void; reactionTrigger?: number; onStageLayout?: (layout: { y: number; height: number }) => void }) {
  return <PullableCompanion pet={pet} haptics={haptics} onBond={onBond} reactionTrigger={reactionTrigger} onStageLayout={onStageLayout} />;
}
const S = StyleSheet.create({
  button: { minHeight: 50, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16, backgroundColor: C.red, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' }, secondary: { backgroundColor: 'transparent', borderColor: '#CBA79A', borderWidth: 1 }, buttonText: { color: '#FFF9EF', fontWeight: '600', fontSize: 14, letterSpacing: 1 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17, marginTop: 26 }, sectionTitle: { fontFamily: SERIF, fontSize: 23, color: C.ink, letterSpacing: 1 }, eyebrow: { color: C.muted, fontSize: 10, letterSpacing: 1.5, marginTop: 5 }, link: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 3 }, linkText: { color: C.red, fontSize: 11 },
  stamp: { width: '100%', aspectRatio: 2 / 3, backgroundColor: '#F5EFDF', borderRadius: 5, overflow: 'hidden' }, lock: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 7 }, lockText: { fontSize: 10, color: '#6B655B', letterSpacing: 1 },
});
