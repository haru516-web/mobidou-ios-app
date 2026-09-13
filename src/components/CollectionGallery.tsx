import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SHRINES, STAMP_IMAGES, type Shrine } from '../data/shrines';
import { PILGRIMAGE_IMAGES } from '../data/pilgrimageImages';
import { PILGRIMAGES } from '../data/pilgrimages';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import { WashiArt, WashiPressable } from './Washi';
import { CollectionRoom } from './CollectionRoom';
import type { PassKind, SpecialCollection } from '../services/specialRewards';

const KEYCHAIN = require('../../assets/collection/keychain-asagiri-shrine-transparent-v2.png');
const WALL_HOOK = require('../../assets/collection/collection-wall-hook-v2.png');
const COLLECTION_BACKDROP = require('../../assets/collection/collection-cabinet-washi-backdrop-v1.png');
const SERIF = 'Shippori';
const KEYCHAIN_RAIL_Y = 0.14;
const GOSHUIN_SHELF_Y = 0.60;

export const COLLECTION_SHRINES: Shrine[] = Array.from(new Set(PILGRIMAGES.flatMap(route => route.ids.map(id => id.split('~')[0]))))
  .map(id => SHRINES.find(shrine => shrine.id === id))
  .filter((shrine): shrine is Shrine => !!shrine);

export type CollectionZoom = 'overview' | 'standard' | 'close';
const OVERVIEW_COLUMNS = 8;
const COLLECTION_ZOOM_ORDER: readonly CollectionZoom[] = ['overview', 'standard', 'close'];

type CollectionTouchPoint = { pageX?: number; pageY?: number; locationX?: number; locationY?: number };

function touchDistance(touches: readonly CollectionTouchPoint[]) {
  if (touches.length < 2) return 0;
  const [first, second] = touches;
  const firstX = first.pageX ?? first.locationX ?? 0;
  const firstY = first.pageY ?? first.locationY ?? 0;
  const secondX = second.pageX ?? second.locationX ?? 0;
  const secondY = second.pageY ?? second.locationY ?? 0;
  return Math.hypot(secondX - firstX, secondY - firstY);
}

function collectionCellWidth(viewportWidth: number, _itemCount: number, zoom: CollectionZoom) {
  if (zoom === 'overview') return viewportWidth / OVERVIEW_COLUMNS;
  if (zoom === 'close') return viewportWidth;
  return viewportWidth / 3;
}

function collectionTrackWidth(viewportWidth: number, itemCount: number, zoom: CollectionZoom) {
  if (zoom === 'overview') return viewportWidth;
  return collectionCellWidth(viewportWidth, itemCount, zoom) * Math.max(3, itemCount);
}

function routeForShrine(shrineId: string) {
  return PILGRIMAGES.find(route => (route.ids as readonly string[]).includes(shrineId));
}

function KeychainArtwork({ shrine, locked, count, impulse, onPress, large = false, top, size, compact = false }: { shrine: Shrine; locked: boolean; count: number; impulse: number; onPress?: () => void; large?: boolean; top?: number; size?: number; compact?: boolean }) {
  const sway = useRef(new Animated.Value(0)).current;
  const swing = () => {
    sway.stopAnimation();
    sway.setValue(0);
    Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(sway, { toValue: -0.65, duration: 180, useNativeDriver: true }),
      Animated.spring(sway, { toValue: 0, friction: 4.2, tension: 46, useNativeDriver: true }),
    ]).start();
  };
  useEffect(() => { if (impulse > 0) swing(); }, [impulse]);
  const lift = sway.interpolate({ inputRange: [-1, 0, 1], outputRange: [2, 0, -2] });
  const dedicatedArtwork = COLLECTION_KEYCHAINS[shrine.id as keyof typeof COLLECTION_KEYCHAINS];
  const artwork = dedicatedArtwork ?? KEYCHAIN;
  const baseWidth = large ? 260 : 186;
  const baseHeight = large ? 390 : 255;
  const renderWidth = size ?? baseWidth;
  const scale = renderWidth / baseWidth;
  const renderHeight = baseHeight * scale;
  const charmSize = large ? 62 : 46 * scale;
  const hookWidth = compact ? renderWidth : Math.min(65, renderWidth * .5);
  const hookHeight = hookWidth * (1145 / 1374);
  const hookTop = -hookHeight * .25;
  const hookContactTop = hookTop + hookHeight * .38;
  const hookContactHeight = hookHeight * .55;
  const hookLeft = (renderWidth - hookWidth) / 2 + (compact ? 0 : renderWidth <= 130 ? 3 : 0);
  return <Animated.View style={[large ? S.detailKeychainWrap : S.keychainWrap, { width: renderWidth, height: renderHeight }, top !== undefined && { top }, { transform: [{ translateY: lift }] }]}>
    <Pressable disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={onPress ? `${shrine.name}のキーホルダーを詳しく見る` : undefined} onPress={() => { swing(); onPress?.(); }} style={S.keychainButton}>
      <Image source={artwork} resizeMode="contain" style={[S.keychain, locked && S.keychainLocked]} />
      {!large && <View pointerEvents="none" style={[S.hookContactClip, { left: hookLeft, top: hookContactTop, width: hookWidth, height: hookContactHeight }]}><Image source={WALL_HOOK} resizeMode="stretch" style={{ position: 'absolute', left: 0, top: -hookHeight * .38, width: hookWidth, height: hookHeight }} /></View>}
      {!dedicatedArtwork && <View pointerEvents="none" style={[S.shrineCharm, large && S.shrineCharmLarge, { width: charmSize, height: charmSize, borderRadius: charmSize / 2, left: large ? 99 : 70 * scale, bottom: large ? 73 : 49 * scale, borderColor: shrine.color }]}><Image source={STAMP_IMAGES[shrine.id]} resizeMode="contain" style={S.shrineCharmImage} /></View>}
      {!large && !compact && (locked ? <View style={[S.lock, { right: 7 * scale, bottom: 28 * scale, width: 30 * scale, height: 30 * scale, borderRadius: 15 * scale }]}><Icon name="lock-closed" size={Math.max(11, 14 * scale)} color="#fff8eb" /></View> : <View style={[S.quantity, { right: 5 * scale, bottom: 27 * scale, borderRadius: 12 * scale, paddingHorizontal: 7 * scale, paddingVertical: 4 * scale }]}><Text style={[S.quantityText, { fontSize: Math.max(8, 11 * scale) }]}>×{count}</Text></View>)}
    </Pressable>
  </Animated.View>;
}

function DisplayedStamp({ shrine, owned, sparkleCount, width, bottom, compact = false }: { shrine: Shrine; owned: boolean; sparkleCount: number; width?: number; bottom?: number; compact?: boolean }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const renderWidth = width ?? 96;
  const renderHeight = renderWidth * 1.25;
  useEffect(() => {
    if (compact || sparkleCount <= 0) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 1150, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 1150, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [compact, shimmer, sparkleCount]);
  return <View style={[S.stampStand, { width: renderWidth, height: renderHeight }, bottom !== undefined && { bottom }]}>
    {!compact && sparkleCount > 0 && <Animated.View style={[S.sparkleGlow, { opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [.35, .88] }), transform: [{ scale: shimmer.interpolate({ inputRange: [0, 1], outputRange: [.97, 1.06] }) }] }]} />}
    <Image source={STAMP_IMAGES[shrine.id]} resizeMode="contain" style={[S.stamp, !owned && S.keychainLocked]} />
    {!compact && sparkleCount > 0 && <><Animated.View pointerEvents="none" style={[S.sparkleSweep, { opacity: shimmer, transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-renderWidth * .56, renderWidth * .7] }) }, { rotate: '18deg' }] }]} /><View style={S.sparkleBadge}><Icon name="sparkles" size={12} color="#8b5920" /><Text style={S.sparkleText}>×{sparkleCount}</Text></View></>}
  </View>;
}

function CollectionBackdrop({ trackWidth, viewportWidth, roomHeight }: { trackWidth: number; viewportWidth: number; roomHeight: number }) {
  const tileWidth = Math.max(1, Math.round(roomHeight * (1024 / 1536)));
  const initialInset = Math.max(0, Math.floor((tileWidth - viewportWidth) / 2));
  const backgroundWidth = trackWidth + viewportWidth + initialInset;
  const tileCount = Math.ceil(backgroundWidth / tileWidth) + 1;
  return <View pointerEvents="none" style={[S.collectionBackdropLayer, { left: -initialInset, width: tileCount * tileWidth, height: roomHeight }]}>
    <View style={[S.collectionBackdropTrack, { width: tileCount * tileWidth, height: roomHeight }]}>
      {Array.from({ length: tileCount }, (_, index) => <Image key={index} source={COLLECTION_BACKDROP} resizeMode="cover" style={[{ width: tileWidth, height: roomHeight, flexShrink: 0 }, index % 2 === 1 && { transform: [{ scaleX: -1 }] }]} />)}
    </View>
  </View>;
}

export function CollectionGallery({ shrines, rewardIds, rewardDates = {}, special, onPurchasePass, zoom, onZoomChange }: { shrines: readonly Shrine[]; rewardIds: readonly string[]; rewardDates?: Record<string, string>; special: SpecialCollection; onPurchasePass: (kind: PassKind) => void; zoom: CollectionZoom; onZoomChange: (zoom: CollectionZoom) => void }) {
  const { width, height } = useWindowDimensions();
  const viewportWidth = Math.min(480, Math.max(1, width));
  const roomHeight = Math.max(470, Math.min(720, height - 220));
  const [swayImpulse, setSwayImpulse] = useState(0);
  const [detail, setDetail] = useState<Shrine | null>(null);
  const [purchaseNotice, setPurchaseNotice] = useState('');
  const [pinching, setPinching] = useState(false);
  const displayScroll = useRef<ScrollView>(null);
  const pinchState = useRef({ active: false, startDistance: 0, startZoom: zoom });
  const showcase = shrines.length ? shrines : SHRINES.slice(0, 6);
  const trackCount = Math.max(3, showcase.length);
  const pageWidth = collectionCellWidth(viewportWidth, trackCount, zoom);
  const trackWidth = collectionTrackWidth(viewportWidth, trackCount, zoom);
  const compact = zoom === 'overview';
  const displayCellHeight = compact ? roomHeight / Math.ceil(trackCount / OVERVIEW_COLUMNS) : roomHeight;
  const rewarded = useMemo(() => new Set(rewardIds), [rewardIds]);

  const selectZoom = (next: CollectionZoom) => {
    displayScroll.current?.scrollTo({ x: 0, animated: false });
    if (next !== zoom) onZoomChange(next);
  };

  const handleTouchStart = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches as unknown as readonly CollectionTouchPoint[];
    const distance = touchDistance(touches);
    if (distance <= 0) return;
    pinchState.current = { active: true, startDistance: distance, startZoom: zoom };
    setPinching(true);
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    if (!pinchState.current.active) return;
    const touches = event.nativeEvent.touches as unknown as readonly CollectionTouchPoint[];
    const distance = touchDistance(touches);
    if (distance <= 0 || pinchState.current.startDistance <= 0) return;
    const ratio = distance / pinchState.current.startDistance;
    const startIndex = COLLECTION_ZOOM_ORDER.indexOf(pinchState.current.startZoom);
    const nextIndex = ratio >= 1.22 ? Math.min(COLLECTION_ZOOM_ORDER.length - 1, startIndex + 1) : ratio <= 0.78 ? Math.max(0, startIndex - 1) : startIndex;
    const nextZoom = COLLECTION_ZOOM_ORDER[nextIndex];
    if (nextZoom !== pinchState.current.startZoom) {
      selectZoom(nextZoom);
      pinchState.current = { active: true, startDistance: distance, startZoom: nextZoom };
    }
  };

  const handleTouchEnd = () => {
    pinchState.current = { active: false, startDistance: 0, startZoom: zoom };
    setPinching(false);
  };

  const buy = (kind: PassKind, label: string) => {
    onPurchasePass(kind);
    setPurchaseNotice(`${label}を仮購入しました`);
  };

  return (
    <View>
      <View onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} style={[S.roomStage, { width: viewportWidth, height: roomHeight, marginHorizontal: -24 }]}>
        <ScrollView
          ref={displayScroll}
          horizontal
          decelerationRate="fast"
          snapToInterval={pageWidth}
          snapToAlignment="start"
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="コレクション展示室。横にスワイプして地点を巡る"
          accessibilityHint="キーホルダーと御朱印、背景の棚が一緒に移動します"
          scrollEnabled={!pinching}
          style={[S.displayScroller, { height: roomHeight, zIndex: 1 }]}
          contentContainerStyle={[S.rail, { width: trackWidth, height: roomHeight }]}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => setSwayImpulse(value => value + 1)}
          onMomentumScrollEnd={() => setSwayImpulse(value => value + 1)}
        >
          <View style={[S.roomTrack, { width: trackWidth, height: roomHeight }]}>
            <CollectionBackdrop trackWidth={trackWidth} viewportWidth={viewportWidth} roomHeight={roomHeight} />
            <CollectionRoom itemCount={trackCount} zoom={zoom} viewportWidth={viewportWidth} roomHeight={roomHeight} contentWidth={trackWidth} />
            <View style={[S.displayRow, compact && S.overviewRow, { width: trackWidth, height: roomHeight }]}>
              {showcase.map((shrine, index) => {
                const keychainCount = special.keychains[shrine.id] ?? 0;
                const sparkleCount = special.sparkles[shrine.id] ?? 0;
                const stampOwned = rewarded.has(shrine.id);
                const keychainSize = compact ? Math.max(9, Math.min(24, pageWidth * .46)) : zoom === 'close' ? 142 : Math.max(42, Math.min(170, pageWidth * .86));
                const stampWidth = compact ? Math.max(6, Math.min(14, pageWidth * .27)) : zoom === 'close' ? 96 : Math.max(34, Math.min(112, pageWidth * .56));
                return <View key={shrine.id} style={[S.displayCell, { width: pageWidth, height: displayCellHeight }]}>
                  {!compact && <View style={S.roomLabel}><Text style={S.roomNumber}>{String(index + 1).padStart(2, '0')}</Text><Text numberOfLines={1} style={S.roomName}>{shrine.name}</Text></View>}
                  <KeychainArtwork shrine={shrine} locked={keychainCount === 0} count={keychainCount} impulse={swayImpulse} onPress={() => setDetail(shrine)} size={keychainSize} top={compact ? 2 : roomHeight * KEYCHAIN_RAIL_Y} compact={compact} />
                  <DisplayedStamp shrine={shrine} owned={stampOwned} sparkleCount={sparkleCount} width={stampWidth} bottom={compact ? 2 : roomHeight * (zoom === 'close' ? .238 : 1 - GOSHUIN_SHELF_Y)} compact={compact} />
                </View>;
              })}
            </View>
          </View>
        </ScrollView>
      </View>
      <View style={S.passWallet}>
        <WashiArt />
        <View style={S.passHeader}><View><Text style={S.passEyebrow}>交換パス</Text><Text style={S.passTitle}>所持パス</Text></View><Icon name="ticket-outline" size={25} color="#9b443c" /></View>
        <View style={S.passBalances}>
          <Text style={S.passBalance}>10回券 残り {special.passes.ten}回</Text>
          <Text style={S.passBalance}>50回券 残り {special.passes.fifty}回</Text>
          <Text style={S.passBalance}>サブスク {special.passes.subscription ? '有効' : '未所持'}</Text>
        </View>
        <View style={S.passButtons}>
          <WashiPressable accessibilityRole="button" onPress={() => buy('ten', '10回券')} style={S.passButton}><Text style={S.passButtonText}>10回券を仮購入</Text></WashiPressable>
          <WashiPressable accessibilityRole="button" onPress={() => buy('fifty', '50回券')} style={S.passButton}><Text style={S.passButtonText}>50回券を仮購入</Text></WashiPressable>
          <WashiPressable accessibilityRole="button" onPress={() => buy('subscription', 'サブスク型')} style={S.passButton}><Text style={S.passButtonText}>サブスクを仮購入</Text></WashiPressable>
        </View>
        {!!purchaseNotice && <Text accessibilityLiveRegion="polite" style={S.purchaseNotice}>{purchaseNotice}</Text>}
        <Text style={S.passNote}>仮購入のため決済は発生しません</Text>
      </View>

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={S.backdrop}>
          <View style={S.detailCard}>
            <Image source={PILGRIMAGE_IMAGES[routeForShrine(detail?.id ?? '')?.id ?? 'sanctuary']} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={S.detailWash} /><WashiArt />
            <WashiPressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={() => setDetail(null)} style={S.close}><Icon name="close" size={20} color="#7f302d" /></WashiPressable>
            {detail && <>
              <KeychainArtwork shrine={detail} locked={(special.keychains[detail.id] ?? 0) === 0} count={special.keychains[detail.id] ?? 0} impulse={0} large />
              <Text style={S.detailReading}>{detail.reading}</Text>
              <Text style={S.detailName}>{detail.name}</Text>
              <Text style={S.detailRoute}>{routeForShrine(detail.id)?.name ?? 'もび道の巡礼'}</Text>
              <Text style={S.detailTheme}>{detail.theme}</Text>
              <Text style={S.detailOwned}>キーホルダー ×{special.keychains[detail.id] ?? 0}　キラキラ御朱印 ×{special.sparkles[detail.id] ?? 0}</Text>
              <Text style={S.detailDate}>{rewardDates[detail.id] ? `${rewardDates[detail.id]} に御朱印を授かりました` : 'まだ御朱印を授かっていません'}</Text>
              <WashiPressable accessibilityRole="button" onPress={() => setDetail(null)} style={S.returnButton}><Text style={S.returnText}>展示にもどる</Text></WashiPressable>
            </>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  rail: { paddingRight: 0 }, displayScroller: { width: '100%', backgroundColor: 'transparent' }, roomTrack: { position: 'relative' }, collectionBackdropLayer: { position: 'absolute', top: 0, overflow: 'hidden' }, collectionBackdropTrack: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' }, displayRow: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', zIndex: 2 }, overviewRow: { flexWrap: 'wrap', alignContent: 'flex-start' }, displayCell: { position: 'relative', flexShrink: 0 },
  passWallet: { borderWidth: 1, borderColor: '#dcc6a8', borderRadius: 18, backgroundColor: '#fff8e9', padding: 14, marginTop: 22, marginBottom: 8, overflow: 'hidden' }, passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, passEyebrow: { color: '#a1604f', fontSize: 9, letterSpacing: 1.5 }, passTitle: { color: '#3c3026', fontFamily: SERIF, fontSize: 18, marginTop: 2 }, passBalances: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, passBalance: { color: '#6f6252', fontSize: 9, backgroundColor: '#f0e4d1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 }, passButtons: { flexDirection: 'row', gap: 6, marginTop: 11 }, passButton: { flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: '#c8a982', backgroundColor: '#f6ead5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }, passButtonText: { color: '#873d36', fontFamily: SERIF, fontSize: 9, textAlign: 'center' }, purchaseNotice: { color: '#7d4939', fontSize: 10, textAlign: 'center', marginTop: 9 }, passNote: { color: '#9a8b77', fontSize: 8, textAlign: 'center', marginTop: 6 },
  roomStage: { position: 'relative', overflow: 'hidden', backgroundColor: 'transparent' },
  roomLabel: { position: 'absolute', top: 17, left: 4, right: 4, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 5, zIndex: 2 }, roomNumber: { color: '#f2c681', fontSize: 8, letterSpacing: 1 }, roomName: { color: '#fff1d8', fontFamily: SERIF, fontSize: 11, flexShrink: 1 },
  keychainWrap: { position: 'absolute', alignSelf: 'center', width: 186, height: 255, zIndex: 1 }, detailKeychainWrap: { width: 260, height: 390, marginTop: 6 }, keychainButton: { flex: 1 }, keychain: { width: '100%', height: '100%' }, keychainLocked: { opacity: .28 }, hookContactClip: { position: 'absolute', overflow: 'hidden', zIndex: 3 }, shrineCharm: { position: 'absolute', width: 46, height: 46, borderRadius: 23, left: 70, bottom: 49, borderWidth: 2, backgroundColor: '#fff9ed', overflow: 'hidden', padding: 4 }, shrineCharmLarge: { width: 62, height: 62, borderRadius: 31, left: 99, bottom: 73 }, shrineCharmImage: { width: '100%', height: '100%' }, lock: { position: 'absolute', right: 7, bottom: 28, width: 30, height: 30, borderRadius: 15, backgroundColor: '#6f5540cc', alignItems: 'center', justifyContent: 'center' }, quantity: { position: 'absolute', right: 5, bottom: 27, borderRadius: 12, backgroundColor: '#fff7e8e8', borderWidth: 1, borderColor: '#b38b58', paddingHorizontal: 7, paddingVertical: 4 }, quantityText: { color: '#70462f', fontFamily: SERIF, fontSize: 11 },
  stampStand: { position: 'absolute', bottom: 14, alignSelf: 'center', width: 96, height: 120, overflow: 'hidden' }, stamp: { width: '100%', height: '100%' }, sparkleGlow: { position: 'absolute', inset: -8, borderRadius: 18, backgroundColor: '#ffd87578', shadowColor: '#ffd15a', shadowOpacity: .8, shadowRadius: 14 }, sparkleSweep: { position: 'absolute', top: -12, bottom: -12, width: 23, backgroundColor: '#FFFDF2B8' }, sparkleBadge: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 12, backgroundColor: '#fff0bce8', borderWidth: 1, borderColor: '#d0a343', paddingHorizontal: 5, paddingVertical: 3 }, sparkleText: { color: '#7a531e', fontSize: 9, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: '#241b15b8', justifyContent: 'center', padding: 20 }, detailCard: { minHeight: 650, maxHeight: '92%', overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: '#ead6ba', alignItems: 'center', padding: 24 }, detailWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff7e480' }, close: { position: 'absolute', top: 14, right: 14, zIndex: 4, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fffaf0e8', alignItems: 'center', justifyContent: 'center' },
  detailReading: { color: '#897866', fontSize: 10, letterSpacing: 2 }, detailName: { color: '#362b22', fontFamily: SERIF, fontSize: 25, marginTop: 5 }, detailRoute: { color: '#6f6252', fontSize: 10, marginTop: 4 }, detailTheme: { color: '#8d3f39', fontFamily: SERIF, fontSize: 14, marginTop: 10, textAlign: 'center' }, detailOwned: { color: '#685d4e', fontSize: 10, marginTop: 12, backgroundColor: '#fff8e4b8', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }, detailDate: { color: '#756958', fontSize: 9, marginTop: 8 }, returnButton: { marginTop: 20, minHeight: 46, paddingHorizontal: 30, borderRadius: 23, backgroundColor: '#9b443c', alignItems: 'center', justifyContent: 'center' }, returnText: { color: '#fffaf0', fontFamily: SERIF, fontSize: 14, letterSpacing: 1 },
});
