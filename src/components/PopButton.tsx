import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { C, Icon, useReducedMotion } from '../components';
import { WashiArt } from './Washi';
import { POP_BUTTON_IMAGES, type PopButtonId } from '../data/popButtonImages';

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
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}><WashiArt /></View>
          <View pointerEvents="none" style={[S.sealInner, { top: ring + 2, left: ring + 2, right: ring + 2, bottom: ring + 2, borderRadius: size / 2 }]} />
          <Icon name={icon} size={Math.round(size * .44)} color={C.red} />
        </View>}
      {badge > 0 && <View style={S.badge}><Text style={S.badgeText}>{badge > 99 ? '99+' : badge}</Text></View>}
    </Animated.View>
    <View style={[S.labelTab, selected && S.labelTabSelected]}>
      <WashiArt button />
      <Text numberOfLines={1} style={[S.label, selected && S.labelSelected]}>{label}</Text>
    </View>
  </Pressable>;
}

const S = StyleSheet.create({
  root: { alignItems: 'center' },
  seal: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF4E4', borderColor: C.red, overflow: 'hidden' },
  sealSelected: { backgroundColor: '#F6E3CF' },
  sealInner: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: '#C9A46A' },
  badge: { position: 'absolute', top: -4, right: -5, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red, borderWidth: 2, borderColor: '#FBF4E4' },
  badgeText: { color: '#FFF9EF', fontSize: 11, fontWeight: '800' },
  labelTab: { marginTop: 6, minWidth: 54, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 7, overflow: 'hidden', alignItems: 'center', backgroundColor: '#FBF4E4', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: '#B98D67' },
  labelTabSelected: { borderColor: C.red },
  label: { color: C.ink, fontFamily: 'ShipporiBold', fontSize: 12.5, letterSpacing: .4 },
  labelSelected: { color: C.red },
});
