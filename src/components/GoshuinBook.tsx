import React, { useEffect } from 'react';
import { BackHandler, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C, Icon } from '../components';
import { STAMP_IMAGES, type Shrine } from '../data/shrines';
import type { Pilgrimage } from '../data/pilgrimages';
import { getGoshuinBookCover } from '../data/goshuinBookCovers';
import { WashiArt, WashiPressable as Pressable } from './Washi';

export function GoshuinBookCover({ route, onOpen }: { route: Pilgrimage; onOpen: () => void }) {
  return <View style={S.coverStage}>
    <Pressable artwork={false} accessibilityRole="button" accessibilityLabel={`${route.name}の御朱印帳をひらく`} accessibilityHint="御朱印帳の見開きを表示します" onPress={onOpen} style={[S.cover, { borderColor: route.color }]}>
      <Image source={getGoshuinBookCover(route.id)} contentFit="cover" style={S.coverImage} />
      <View pointerEvents="none" style={S.coverShade} />
      <View pointerEvents="none" style={S.coverFrame} />
      <View pointerEvents="none" style={S.coverCopy}><Text style={S.coverKicker}>MOBIDOU</Text><Text style={S.coverTitle}>御朱印帳</Text><View style={S.coverRule} /><Text numberOfLines={2} style={S.coverRoute}>{route.name}</Text></View>
    </Pressable>
  </View>;
}

export function GoshuinImageListModal({ visible, route, shrines, acquiredCount, onClose, onSelect }: { visible: boolean; route?: Pilgrimage; shrines: Shrine[]; acquiredCount: number; onClose: () => void; onSelect: (shrine: Shrine, index: number) => void }) {
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    if (Platform.OS !== 'web' || typeof window === 'undefined') return () => subscription.remove();
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
    window.addEventListener('keydown', keydown);
    return () => { subscription.remove(); window.removeEventListener('keydown', keydown); };
  }, [onClose, visible]);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={S.modalRoot} accessibilityViewIsModal role="dialog" aria-modal accessibilityLabel={`${route?.name ?? ''}の御朱印画像一覧`}>
      <View style={S.scrim} />
      <View style={S.modalCard}>
        <WashiArt />
        <View style={S.modalHeader}><View><Text style={S.modalEyebrow}>御朱印画像一覧</Text><Text numberOfLines={1} style={S.modalTitle}>{route?.name}</Text></View><Pressable artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={S.close}><Icon name="close" size={23} color={C.red} /></Pressable></View>
        <ScrollView contentContainerStyle={S.grid} showsVerticalScrollIndicator={false}>
          {shrines.map((shrine, index) => {
            const acquired = index < acquiredCount;
            return <Pressable artwork={false} key={`${shrine.id}-${index}`} accessibilityRole="button" accessibilityLabel={`${shrine.name}の御朱印、${acquired ? '取得済み' : '未取得'}`} onPress={() => onSelect(shrine, index)} style={[S.tile, !acquired && S.tileUnacquired]}>
              <Image source={STAMP_IMAGES[shrine.id]} contentFit="contain" style={S.stamp} />
            </Pressable>;
          })}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const S = StyleSheet.create({
  coverStage: { minHeight: 500, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  cover: { width: '68%', maxWidth: 288, aspectRatio: .7, borderRadius: 11, overflow: 'hidden', borderWidth: 2, backgroundColor: '#7E3932', shadowColor: '#493125', shadowOffset: { width: 8, height: 10 }, shadowOpacity: .28, shadowRadius: 12, elevation: 8 },
  coverImage: { ...StyleSheet.absoluteFillObject }, coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#271B1254' },
  coverFrame: { position: 'absolute', top: 15, right: 15, bottom: 15, left: 15, borderWidth: 1, borderColor: '#F5E5C0B8', borderRadius: 4 },
  coverCopy: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 26 }, coverKicker: { color: '#FFF3D8', fontSize: 9, letterSpacing: 3 }, coverTitle: { color: '#FFF8E9', fontFamily: 'ShipporiBold', fontSize: 34, letterSpacing: 5, marginTop: 12, textShadowColor: '#2A1C18AA', textShadowRadius: 4 }, coverRule: { width: 38, height: 1, backgroundColor: '#F5E5C0', marginVertical: 18 }, coverRoute: { color: '#FFF3D8', fontFamily: 'Shippori', fontSize: 15, lineHeight: 25, textAlign: 'center' },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#271E18AA' }, modalCard: { width: '100%', maxWidth: 440, maxHeight: '82%', borderRadius: 22, backgroundColor: '#FFF9EF', padding: 17, overflow: 'hidden' }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, modalEyebrow: { color: C.red, fontSize: 10, letterSpacing: 1.2 }, modalTitle: { color: C.ink, fontFamily: 'Shippori', fontSize: 20, marginTop: 4, maxWidth: 310 }, close: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F0E5D7', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 }, tile: { width: '31%', aspectRatio: .82, borderRadius: 10, borderWidth: 1, borderColor: '#DED0BD', backgroundColor: '#FFFDF7', padding: 5, overflow: 'hidden' }, tileUnacquired: { opacity: .28, backgroundColor: '#E9E2D7' }, stamp: { width: '100%', height: '100%' },
});
