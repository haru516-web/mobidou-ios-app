import React from 'react';
import { Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { BRUSH, C } from '../components';
import { WashiPressable as Pressable } from './Washi';

const SCROLL_ART = require('../../assets/ui-washi/goshuin/index-popup.webp');
const UNDERLINE_BRUSH = require('../../assets/ui-washi/common/underline-brush.webp');
// The scroll art keeps transparent margins; only this part of the picture is the scroll itself.
const SCROLL_LEFT = 0.165;
const SCROLL_WIDTH = 0.669;
const SCROLL_ASPECT = (0.669 * 1024) / (0.973 * 1400);

export type ScrollPaper = { width: number; height: number };

/**
 * A hanging scroll that opens over the screen: the popup used for the book's
 * table of contents and for the collection's lists. Children draw on the paper.
 */
export function ScrollPopup({ visible, title, subtitle, onClose, children }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: (paper: ScrollPaper) => React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const scrollWidth = Math.min(width - 24, (height - 96) * SCROLL_ASPECT, 380);
  const scrollHeight = scrollWidth / SCROLL_ASPECT;
  const artWidth = scrollWidth / SCROLL_WIDTH;
  const artHeight = artWidth * 1400 / 1024;
  const paperWidth = scrollWidth * .76;
  const paperHeight = scrollHeight * .745;
  // Room for the heading above the content and the close button below it.
  const headingHeight = subtitle ? 62 : 42;
  const closeHeight = 48;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={S.scrim}>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel={`${title}を閉じる`} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={{ width: scrollWidth, height: scrollHeight, overflow: 'hidden' }}>
        <Image accessible={false} source={SCROLL_ART} contentFit="fill" pointerEvents="none" style={{ position: 'absolute', left: -SCROLL_LEFT * artWidth, top: 0, width: artWidth, height: artHeight }} />
        <View style={[S.content, { left: scrollWidth * .12, right: scrollWidth * .12, top: scrollHeight * .165, height: paperHeight }]}>
          <Text accessibilityRole="header" style={S.title}>{title}</Text>
          {!!subtitle && <Text numberOfLines={1} style={S.subtitle}>{subtitle}</Text>}
          <View style={{ flex: 1, minHeight: 0 }}>{children({ width: paperWidth, height: paperHeight - headingHeight - closeHeight })}</View>
          <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={S.close}>
            <Text style={S.closeText}>とじる</Text>
            <Image accessible={false} source={UNDERLINE_BRUSH} contentFit="fill" style={S.closeLine} />
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const S = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#241B14B3', alignItems: 'center', justifyContent: 'center' },
  content: { position: 'absolute', alignItems: 'stretch' },
  title: { fontFamily: BRUSH, fontSize: 24, color: C.ink, textAlign: 'center', letterSpacing: 4 },
  subtitle: { fontFamily: BRUSH, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 2, marginBottom: 8 },
  close: { alignSelf: 'center', alignItems: 'center', minHeight: 44, minWidth: 88, justifyContent: 'center', marginTop: 4 },
  closeText: { fontFamily: BRUSH, fontSize: 15, color: C.red, letterSpacing: 2 },
  closeLine: { width: 72, height: 8, marginTop: -1 },
});
