import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { C, Icon, useReducedMotion } from '../components';
import { POP_BUTTON_IMAGES, type PopButtonId } from '../data/popButtonImages';

const FLOAT_DISTANCE = 5;
const FLOAT_HALF_PERIOD = 1400;

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
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A chunky round button that bobs gently in place, with a ground shadow that
 * breathes with it. Drawn as a simple placeholder until dedicated artwork is
 * registered in POP_BUTTON_IMAGES, at which point the image replaces the
 * drawn disc and everything else (float, press, badge, label) stays the same.
 */
export function PopButton({ id, label, icon, onPress, badge = 0, size = 60, phase = 0, accessibilityHint, style }: PopButtonProps) {
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

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={badge > 0 ? `${label}、${badge}件` : label}
    accessibilityHint={accessibilityHint}
    onPress={onPress}
    onPressIn={() => pressTo(.88)}
    onPressOut={() => pressTo(1)}
    hitSlop={6}
    style={[S.root, { minWidth: size + 22 }, style]}
  >
    <View style={{ width: size, height: size + FLOAT_DISTANCE }}>
      <Animated.View pointerEvents="none" style={[S.groundShadow, { width: size * .62, left: size * .19, opacity: float.interpolate({ inputRange: [0, 1], outputRange: [.34, .2] }), transform: [{ scaleX: float.interpolate({ inputRange: [0, 1], outputRange: [1, .82] }) }] }]} />
      <Animated.View style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -FLOAT_DISTANCE] }) }, { scale: press }] }}>
        {artwork
          ? <Image source={artwork} contentFit="contain" style={{ width: size, height: size }} />
          : <View style={[S.disc, { width: size, height: size, borderRadius: size / 2 }]}>
            <View pointerEvents="none" style={[S.discShine, { width: size * .52, height: size * .2, borderRadius: size * .1, top: size * .12 }]} />
            <Icon name={icon} size={Math.round(size * .44)} color={C.red} />
          </View>}
        {badge > 0 && <View style={S.badge}><Text style={S.badgeText}>{badge > 99 ? '99+' : badge}</Text></View>}
      </Animated.View>
    </View>
    <Text numberOfLines={1} style={S.label}>{label}</Text>
  </Pressable>;
}

const S = StyleSheet.create({
  root: { alignItems: 'center' },
  groundShadow: { position: 'absolute', bottom: -1, height: 8, borderRadius: 8, backgroundColor: '#2A1D14' },
  disc: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8EA', borderWidth: 2.5, borderColor: '#A87552', shadowColor: '#5B3A26', shadowOpacity: .28, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  discShine: { position: 'absolute', backgroundColor: '#FFFFFFB3' },
  badge: { position: 'absolute', top: -3, right: -5, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red, borderWidth: 2, borderColor: '#FFF8EA' },
  badgeText: { color: '#FFF9EF', fontSize: 11, fontWeight: '800' },
  label: { marginTop: 5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFF8EAEB', color: C.ink, fontFamily: 'ShipporiBold', fontSize: 12.5, letterSpacing: .3 },
});
