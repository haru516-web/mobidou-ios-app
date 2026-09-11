import React from 'react';
import { Pressable as NativePressable, View, StyleSheet, type PressableProps } from 'react-native';
import { Image } from 'expo-image';

export function WashiArt({ button = false }: { button?: boolean }) {
  return <Image pointerEvents="none" accessible={false} source={button ? require('../../assets/pilgrimage-v2/button-washi.png') : require('../../assets/pilgrimage-v2/card-washi.png')} contentFit="cover" style={[StyleSheet.absoluteFillObject, { opacity: button ? .38 : .64, borderRadius: 12 }]} />;
}
export function WashiPressable({ children, style, artwork = true, ...props }: PressableProps & { artwork?: boolean }) {
  return <NativePressable {...props} style={state => [{ position: 'relative', overflow: 'hidden' }, typeof style === 'function' ? style(state) : style]}>{state => <>{artwork && <WashiArt button />}{typeof children === 'function' ? children(state) : children}</>}</NativePressable>;
}
export function PaperCard({ children }: { children: React.ReactNode }) {
  return <View style={{ padding: 20, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: '#DACCB5', backgroundColor: '#F8F2E5', marginVertical: 12 }}><WashiArt />{children}</View>;
}
