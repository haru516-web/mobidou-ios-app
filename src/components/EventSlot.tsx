import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { EVENTS, type PilgrimageEvent } from '../data/events';
import { BRUSH, C } from '../components';
import { LockTag } from './LockTag';
import { WashiArt, WashiPressable as Pressable } from './Washi';

const useNativeDriver = Platform.OS !== 'web';

export function EventSlot({ event = EVENTS[0] }: { event?: PilgrimageEvent }) {
  const nudge = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const locked = event.status === 'locked';

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const onPress = () => {
    if (!locked || reduceMotion) return;
    nudge.stopAnimation();
    nudge.setValue(0);
    Animated.sequence([
      Animated.timing(nudge, { toValue: 1, duration: 65, easing: Easing.out(Easing.quad), useNativeDriver }),
      Animated.timing(nudge, { toValue: -1, duration: 95, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      Animated.timing(nudge, { toValue: .45, duration: 80, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      Animated.timing(nudge, { toValue: 0, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver }),
    ]).start();
  };

  const title = event.status === 'ended' ? '旅を終えた道' : event.name;
  const statusLabel = event.status === 'locked' ? '未開放' : event.status === 'ended' ? '終了' : '開催中';
  const accessibilityLabel = `イベント巡礼「${title}」。${statusLabel}`;

  return <Animated.View style={{ transform: [{ translateX: nudge.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) }] }}>
    <Pressable
      artwork={false}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={locked ? 'タップすると鍵札が小さく揺れます。現在は出発できません' : undefined}
      accessibilityState={{ disabled: !locked }}
      disabled={!locked}
      onPress={onPress}
      style={S.card}
    >
      <WashiArt />
      <View style={S.layout}>
        <View style={S.copy}>
          <View style={S.topline}>
            <Text style={S.eyebrow}>EVENT PILGRIMAGE</Text>
            <View style={S.status}><Text style={S.statusText}>{statusLabel}</Text><LockTag size={21} /></View>
          </View>
          <Text numberOfLines={2} style={S.title}>{title}</Text>
          <Text style={S.detail}>日付や旅の内容は、まだ決まっていません。</Text>
        </View>
        <View accessible={false} style={S.scene}>
          <Svg width="100%" height="100%" viewBox="0 0 112 82" preserveAspectRatio="xMidYMid meet">
            <Circle cx="82" cy="19" r="9" fill="#D6A65B" opacity=".82" />
            <Path d="M4 46 Q24 26 43 45 T81 43 T110 41" fill="none" stroke="#82917A" strokeWidth="2.5" strokeLinecap="round" />
            <Path d="M5 55 Q28 41 49 54 T91 51 T111 52 L111 80 L5 80Z" fill="#D8D2B8" opacity=".7" />
            <Path d="M8 74 C30 71 36 57 52 57 C66 57 67 67 79 62 C89 58 90 49 103 45" fill="none" stroke="#9A6B4C" strokeWidth="2.5" strokeDasharray="2 5" strokeLinecap="round" />
            <Circle cx="14" cy="69" r="3" fill="#9A6B4C" />
            <Circle cx="102" cy="46" r="3.5" fill="#9A6B4C" />
            <Path d="M20 34 C15 26 21 21 26 24 C27 18 35 20 35 26 C40 21 45 26 41 32 C36 37 27 38 20 34Z" fill="#B98176" opacity=".76" />
          </Svg>
          <View pointerEvents="none" style={S.sceneLock}><LockTag size={28} /></View>
        </View>
      </View>
    </Pressable>
  </Animated.View>;
}

const S = StyleSheet.create({
  card: { minHeight: 142, padding: 14, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#D9C8A7', backgroundColor: '#F5EBD7' },
  layout: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 112 },
  copy: { flex: 1, minWidth: 0, justifyContent: 'center' },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  eyebrow: { color: '#947750', fontSize: 9, fontWeight: '700', letterSpacing: 1.05 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusText: { color: '#8D5847', fontFamily: BRUSH, fontSize: 11 },
  title: { color: C.ink, fontFamily: BRUSH, fontSize: 18, lineHeight: 25, marginTop: 8 },
  detail: { color: '#776A58', fontSize: 10, lineHeight: 16, marginTop: 4 },
  scene: { width: 102, height: 82, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E0D3BC', backgroundColor: '#F0E5CE' },
  sceneLock: { position: 'absolute', left: 37, top: 27, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
