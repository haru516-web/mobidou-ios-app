import React from 'react';
import { Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { BRUSH, C } from '../components';
import { CroppedArt } from './CroppedArt';
import { WashiPressable as Pressable } from './Washi';

const SCROLL_ART = require('../../assets/ui-washi/goshuin/index-popup.webp');
const WIDE_SCROLL_ART = require('../../assets/ui-washi/walk/map-popup.webp');
const UNDERLINE_BRUSH = require('../../assets/ui-washi/common/underline-brush.webp');
// The narrow scroll keeps transparent margins; only this part of the picture is the scroll itself.
const SCROLL_LEFT = 0.165;
const SCROLL_WIDTH = 0.669;
const SCROLL_ASPECT = (0.669 * 1024) / (0.973 * 1400);
// The wide scroll is drawn in three slices (rope and top roller, plain paper, bottom roller)
// so it can be as tall as the screen without stretching the rollers.
const WIDE = { x0: 0.013, x1: 0.986, y0: 0.016, y1: 0.979, topEnd: 0.145, bottomStart: 0.915 };

export type ScrollPaper = { width: number; height: number };

type ScrollPopupProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onShow?: () => void;
  /** `wide` is a tall, full-width scroll for busy content; it draws no heading or close button of its own. */
  variant?: 'narrow' | 'wide';
  children: (paper: ScrollPaper) => React.ReactNode;
};

/**
 * A hanging scroll that opens over the screen: the popup used for the book's
 * table of contents, the collection's lists and the route picker. Children
 * draw on the paper.
 */
export function ScrollPopup({ visible, title, subtitle, onClose, onShow, variant = 'narrow', children }: ScrollPopupProps) {
  const { width, height } = useWindowDimensions();
  if (variant === 'wide') return <WideScroll visible={visible} title={title} onClose={onClose} onShow={onShow} width={width} height={height}>{children}</WideScroll>;
  const scrollWidth = Math.min(width - 24, (height - 96) * SCROLL_ASPECT, 380);
  const scrollHeight = scrollWidth / SCROLL_ASPECT;
  const artWidth = scrollWidth / SCROLL_WIDTH;
  const artHeight = artWidth * 1400 / 1024;
  const paperWidth = scrollWidth * .76;
  const paperHeight = scrollHeight * .745;
  // Room for the heading above the content and the close button below it.
  const headingHeight = subtitle ? 62 : 42;
  const closeHeight = 48;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={onShow}>
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

function WideScroll({ visible, title, onClose, onShow, width, height, children }: { visible: boolean; title: string; onClose: () => void; onShow?: () => void; width: number; height: number; children: (paper: ScrollPaper) => React.ReactNode }) {
  const scrollWidth = Math.min(width - 12, 440);
  const scale = scrollWidth / ((WIDE.x1 - WIDE.x0) * 1024);
  const sliceHeight = (from: number, to: number) => (to - from) * 1400 * scale;
  const topHeight = sliceHeight(WIDE.y0, WIDE.topEnd);
  const bottomHeight = sliceHeight(WIDE.bottomStart, WIDE.y1);
  const scrollHeight = Math.min(height - 56, 780);
  const middleHeight = scrollHeight - topHeight - bottomHeight;
  const sideInset = scrollWidth * .085;
  const paperTop = topHeight + 4;
  const paperBottom = bottomHeight * .8;
  const across = { x0: WIDE.x0, x1: WIDE.x1 };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={onShow}>
    <View style={S.scrim}>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel={`${title}を閉じる`} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal accessibilityLabel={title} style={{ width: scrollWidth, height: scrollHeight }}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: topHeight }}><CroppedArt source={WIDE_SCROLL_ART} bounds={{ ...across, y0: WIDE.y0, y1: WIDE.topEnd }} /></View>
          <View style={{ position: 'absolute', left: 0, right: 0, top: topHeight - 0.5, height: middleHeight + 1 }}><CroppedArt source={WIDE_SCROLL_ART} bounds={{ ...across, y0: WIDE.topEnd, y1: WIDE.bottomStart }} /></View>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bottomHeight }}><CroppedArt source={WIDE_SCROLL_ART} bounds={{ ...across, y0: WIDE.bottomStart, y1: WIDE.y1 }} /></View>
        </View>
        <View style={{ position: 'absolute', left: sideInset, right: sideInset, top: paperTop, bottom: paperBottom }}>
          {children({ width: scrollWidth - sideInset * 2, height: scrollHeight - paperTop - paperBottom })}
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
