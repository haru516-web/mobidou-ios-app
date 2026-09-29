import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { BRUSH, C, Icon, useReducedMotion } from '../components';
import { WashiArt } from './Washi';
import { CroppedArt } from './CroppedArt';
import { UI_ART } from '../data/uiArt';
import { POP_BUTTON_IMAGES, type PopButtonId } from '../data/popButtonImages';

const PLAQUE = require('../../assets/ui-washi/collection/tab-plaque.webp');
const PLAQUE_ACTIVE = require('../../assets/ui-washi/collection/tab-plaque-active.webp');
const PLAQUE_BOUNDS = { x0: .031, x1: .967, y0: .224, y1: .771 };
const PLAQUE_ACTIVE_BOUNDS = { x0: .031, x1: .969, y0: .208, y1: .776 };
const FLOAT_DISTANCE = 3;
const FLOAT_HALF_PERIOD = 1500;

type PopButtonProps = {
  id: PopButtonId;
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  onPress: () => void;
  /** Unread count shown as a badge; 0 hides it. */
  badge?: number;
  size?: number;
  /** Staggers the bob so neighbouring buttons don't move in lockstep (0–1). */
  phase?: number;
  selected?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A round washi-paper seal button with a vermilion ring, bobbing gently in
 * place. It uses the same paper texture and vermilion as the tab bar and cards.
 * When dedicated artwork is registered in POP_BUTTON_IMAGES it replaces the
 * drawn seal; the bob, press, badge and label stay the same.
 */
export function PopButton({ id, label, icon, onPress, badge = 0, size = 60, phase = 0, selected = false, accessibilityHint, style }: PopButtonProps) {
  const reduced = useReducedMotion();
  const float = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const useNativeDriver = Platform.OS !== 'web';
  const artwork = POP_BUTTON_IMAGES[id];

  useEffect(() => {
    if (reduced) { float.setValue(0); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: FLOAT_HALF_PERIOD, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      Animated.timing(float, { toValue: 0, duration: FLOAT_HALF_PERIOD, easing: Easing.inOut(Easing.sin), useNativeDriver }),
    ]));
    const timer = setTimeout(() => loop.start(), Math.round(phase * FLOAT_HALF_PERIOD * 2));
    return () => { clearTimeout(timer); loop.stop(); };
  }, [float, phase, reduced, useNativeDriver]);

  const pressTo = (value: number) => Animated.spring(press, { toValue: value, damping: 12, stiffness: 320, mass: .6, useNativeDriver }).start();
  const ring = Math.max(2, Math.round(size * .045));

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={badge > 0 ? `${label}、${badge}件` : label}
    accessibilityHint={accessibilityHint}
    accessibilityState={{ selected }}
    onPress={onPress}
    onPressIn={() => pressTo(.9)}
    onPressOut={() => pressTo(1)}
    hitSlop={6}
    style={[S.root, { minWidth: size + 14 }, style]}
  >
    <Animated.View style={{ width: size, height: size, transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -FLOAT_DISTANCE] }) }, { scale: press }] }}>
      {artwork
        ? <Image source={artwork} contentFit="contain" style={{ width: size, height: size }} />
        : <View style={[S.seal, { width: size, height: size, borderRadius: size / 2, borderWidth: ring }, selected && S.sealSelected]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}><WashiArt legacy /></View>
          <View pointerEvents="none" style={[S.sealInner, { top: ring + 2, left: ring + 2, right: ring + 2, bottom: ring + 2, borderRadius: size / 2 }]} />
          <Icon name={icon} size={Math.round(size * .44)} color={C.red} />
        </View>}
      {badge > 0 && <View style={S.badge}><Image accessible={false} source={UI_ART.badgeCount.source} contentFit="fill" style={StyleSheet.absoluteFill} /><Text style={S.badgeText}>{badge > 99 ? '99+' : badge}</Text></View>}
    </Animated.View>
    <View style={[S.labelTab, selected && S.labelTabSelected]}>
      <CroppedArt source={selected ? PLAQUE_ACTIVE : PLAQUE} bounds={selected ? PLAQUE_ACTIVE_BOUNDS : PLAQUE_BOUNDS} />
      <Text numberOfLines={1} style={[S.label, selected && S.labelSelected]}>{label}</Text>
    </View>
  </Pressable>;
}

const S = StyleSheet.create({
  root: { alignItems: 'center' },
  seal: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF4E4', borderColor: C.red, overflow: 'hidden' },
  sealSelected: { backgroundColor: '#F6E3CF' },
  sealInner: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: '#C9A46A' },
  badge: { position: 'absolute', top: -5, right: -6, minWidth: 24, height: 24, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF9EF', fontSize: 11, fontWeight: '800' },
  labelTab: { marginTop: 6, minWidth: 66, minHeight: 28, paddingHorizontal: 17, paddingVertical: 5, justifyContent: 'center', alignItems: 'center' },
  labelTabSelected: {},
  label: { color: '#3B2A1B', fontFamily: BRUSH, fontSize: 12.5, letterSpacing: .4 },
  labelSelected: { color: '#3B2A1B' },
});
