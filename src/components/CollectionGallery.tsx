import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { Image } from './AppImage';
import { BRUSH, Icon } from '../components';
import { SHRINES, STAMP_IMAGES, type Shrine } from '../data/shrines';
import { PILGRIMAGE_IMAGES } from '../data/pilgrimageImages';
import { PILGRIMAGES } from '../data/pilgrimages';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import { WashiArt, WashiPressable } from './Washi';
import { LockTag } from './LockTag';
import { CollectionRoom } from './CollectionRoom';
import { ScrollPopup } from './ScrollPopup';
import type { SpecialCollection } from '../services/specialRewards';
import { PagedShrineGrid } from './GoshuinBook';

const KEYCHAIN = require('../../assets/collection/keychain-asagiri-shrine-transparent-v2.webp');
const WALL_HOOK = require('../../assets/ui-round3/collection/collection-wall-hook-v2.webp');
const COLLECTION_BACKDROP = require('../../assets/ui-round3/collection/collection-room-home-harmony-v1.webp');
const SERIF = 'Shippori';
const KEYCHAIN_RAIL_Y = 0.14;
// CabinetWorld's upper beam is centered at y=0.445, or 5.5% down from the top.
const ROOM_LABEL_RAIL_CENTER_Y = 0.5 - 0.445;
const GOSHUIN_STANDARD_BASE_BOTTOM = 0.33;
const GOSHUIN_CLOSE_BASE_BOTTOM = 0.30;
const GOSHUIN_DROP_PX = 18;
const GOSHUIN_STANDARD_LIFT_PX = 2;
const GOSHUIN_CLOSE_LIFT_PX = 14;

export const COLLECTION_SHRINES: Shrine[] = Array.from(new Set(PILGRIMAGES.flatMap(route => route.ids.map(id => id.split('~')[0]))))
  .map(id => SHRINES.find(shrine => shrine.id === id))
  .filter((shrine): shrine is Shrine => !!shrine);

export type CollectionZoom = 'standard' | 'close';
const COLLECTION_ZOOM_ORDER: readonly CollectionZoom[] = ['standard', 'close'];

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
  if (zoom === 'close') return viewportWidth;
  return viewportWidth / 3;
}

function collectionTrackWidth(viewportWidth: number, itemCount: number, zoom: CollectionZoom) {
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
      <Image source={artwork} contentFit="contain" style={[S.keychain, locked && S.keychainLocked]} />
      {!large && <View pointerEvents="none" style={[S.hookContactClip, { left: hookLeft, top: hookContactTop, width: hookWidth, height: hookContactHeight }]}><Image source={WALL_HOOK} contentFit="fill" style={{ position: 'absolute', left: 0, top: -hookHeight * .38, width: hookWidth, height: hookHeight }} /></View>}
      {!dedicatedArtwork && <View pointerEvents="none" style={[S.shrineCharm, large && S.shrineCharmLarge, { width: charmSize, height: charmSize, borderRadius: charmSize / 2, left: large ? 99 : 70 * scale, bottom: large ? 73 : 49 * scale, borderColor: shrine.color }]}><Image source={STAMP_IMAGES[shrine.id]} contentFit="contain" style={S.shrineCharmImage} /></View>}
      {!large && !compact && (locked ? <LockTag size={Math.max(24, 36 * scale)} style={{ position: 'absolute', right: 4 * scale, bottom: 24 * scale }} /> : <View style={[S.quantity, { right: 5 * scale, bottom: 27 * scale, borderRadius: 12 * scale, paddingHorizontal: 7 * scale, paddingVertical: 4 * scale }]}><Text style={[S.quantityText, { fontSize: Math.max(8, 11 * scale) }]}>×{count}</Text></View>)}
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
    <Image source={STAMP_IMAGES[shrine.id]} contentFit="contain" style={[S.stamp, !owned && S.keychainLocked]} />
    {!compact && sparkleCount > 0 && <><Animated.View pointerEvents="none" style={[S.sparkleSweep, { opacity: shimmer, transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-renderWidth * .56, renderWidth * .7] }) }, { rotate: '18deg' }] }]} /><View style={S.sparkleBadge}><Icon name="sparkles" size={12} color="#8b5920" /><Text style={S.sparkleText}>×{sparkleCount}</Text></View></>}
  </View>;
}

function CollectionBackdrop({ trackWidth, viewportWidth, roomHeight }: { trackWidth: number; viewportWidth: number; roomHeight: number }) {
  // Every tile is one viewport wide, keeping the background aligned with the
  // room in both the three-item and one-item layouts.
  const tileWidth = Math.max(1, viewportWidth);
  const tileCount = Math.ceil(trackWidth / tileWidth) + 1;
  const tileStripWidth = tileCount * tileWidth;
  return <View pointerEvents="none" style={[S.collectionBackdropLayer, { left: 0, width: trackWidth, height: roomHeight }]}>
    <View style={[S.collectionBackdropTrack, { width: tileStripWidth, height: roomHeight }]}>
      {Array.from({ length: tileCount }, (_, index) => <Image key={index} source={COLLECTION_BACKDROP} contentFit="fill" style={[{ width: tileWidth, height: roomHeight, flexShrink: 0 }, index % 2 === 1 && { transform: [{ scaleX: -1 }] }]} />)}
    </View>
  </View>;
}

export type CollectionPage = 'room' | 'goshuin' | 'miniatures';

/** The collection room and its paged goshuin / miniature lists. */
export function CollectionGallery({ shrines, rewardIds, rewardDates = {}, special, zoom, onZoomChange, page, onSelectGoshuin, onClosePage }: { shrines: readonly Shrine[]; rewardIds: readonly string[]; rewardDates?: Record<string, string>; special: SpecialCollection; zoom: CollectionZoom; onZoomChange: (zoom: CollectionZoom) => void; page: CollectionPage; onSelectGoshuin: (shrine: Shrine) => void; onClosePage: () => void }) {
  const { width } = useWindowDimensions();
  const viewportWidth = Math.min(480, Math.max(1, width));
  // Nothing scrolls vertically: the page fills the space under the pop buttons.
  const [areaHeight, setAreaHeight] = useState(0);
  const roomHeight = areaHeight > 0 ? Math.max(260, areaHeight) : 470;
  const [swayImpulse, setSwayImpulse] = useState(0);
  const [detail, setDetail] = useState<Shrine | null>(null);
  const [pinching, setPinching] = useState(false);
  const displayScroll = useRef<ScrollView>(null);
  const pinchState = useRef({ active: false, startDistance: 0, startZoom: zoom });
  const showcase = shrines.length ? shrines : SHRINES.slice(0, 6);
  const trackCount = Math.max(3, showcase.length);
  const pageWidth = collectionCellWidth(viewportWidth, trackCount, zoom);
  const trackWidth = collectionTrackWidth(viewportWidth, trackCount, zoom);
  const displayCellHeight = roomHeight;
  const roomLabelFontSize = Math.max(8, Math.min(11, (pageWidth - 24) / 8));
  const roomLabelHeight = roomLabelFontSize + 3;
  const roomLabelTop = Math.max(0, roomHeight * ROOM_LABEL_RAIL_CENTER_Y - roomLabelHeight / 2);
  const goshuinBottom = roomHeight * (zoom === 'close' ? GOSHUIN_CLOSE_BASE_BOTTOM : GOSHUIN_STANDARD_BASE_BOTTOM) - GOSHUIN_DROP_PX + (zoom === 'close' ? GOSHUIN_CLOSE_LIFT_PX : GOSHUIN_STANDARD_LIFT_PX);
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

  return (
    <View style={{ flex: 1 }} onLayout={({ nativeEvent }) => setAreaHeight(previous => Math.abs(previous - nativeEvent.layout.height) < 1 ? previous : nativeEvent.layout.height)}>
      {<View onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} style={[S.roomStage, { width: viewportWidth, height: roomHeight, marginHorizontal: -24 }]}>
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
            <CollectionRoom key={`${zoom}:${trackWidth}:${pageWidth}`} itemCount={trackCount} zoom={zoom} viewportWidth={viewportWidth} roomHeight={roomHeight} contentWidth={trackWidth} cellWidth={pageWidth} />
            <View style={[S.displayRow, { width: trackWidth, height: roomHeight }]}>
              {showcase.map((shrine, index) => {
                const keychainCount = special.keychains[shrine.id] ?? 0;
                const sparkleCount = special.sparkles[shrine.id] ?? 0;
                const stampOwned = rewarded.has(shrine.id);
                const keychainSize = zoom === 'close' ? 142 : Math.max(42, Math.min(170, pageWidth * .86));
                const stampWidth = zoom === 'close' ? 96 : Math.max(34, Math.min(112, pageWidth * .56));
                return <View key={shrine.id} style={[S.displayCell, { width: pageWidth, height: displayCellHeight }]}>
                  <View style={[S.roomLabel, { top: roomLabelTop, height: roomLabelHeight, columnGap: Math.max(2, roomLabelFontSize * 0.35) }]}><Text style={[S.roomNumber, { fontSize: Math.max(6, roomLabelFontSize * 0.72) }]}>{String(index + 1).padStart(2, '0')}</Text><Text numberOfLines={1} style={[S.roomName, { fontSize: roomLabelFontSize }]}>{shrine.name}</Text></View>
                  <KeychainArtwork shrine={shrine} locked={keychainCount === 0} count={keychainCount} impulse={swayImpulse} onPress={() => setDetail(shrine)} size={keychainSize} top={roomHeight * KEYCHAIN_RAIL_Y} />
                  <DisplayedStamp shrine={shrine} owned={stampOwned} sparkleCount={sparkleCount} width={stampWidth} bottom={goshuinBottom} />
                </View>;
              })}
            </View>
          </View>
        </ScrollView>
      </View>}
      <ScrollPopup visible={page === 'goshuin'} title="御朱印" onClose={onClosePage}>
        {paper => <PagedShrineGrid bare kind="goshuin" title="" shrines={showcase} ownedIds={[...rewarded]} onSelect={onSelectGoshuin} height={paper.height} />}
      </ScrollPopup>
      <ScrollPopup visible={page === 'miniatures'} title="ミニチュア" onClose={onClosePage}>
        {paper => <PagedShrineGrid bare kind="miniature" title="" shrines={showcase} ownedIds={showcase.filter(shrine => (special.keychains[shrine.id] ?? 0) > 0).map(shrine => shrine.id)} onSelect={shrine => setDetail(shrine)} height={paper.height} />}
      </ScrollPopup>
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={S.backdrop}>
          <View style={S.detailCard}>
            <Image source={PILGRIMAGE_IMAGES[routeForShrine(detail?.id ?? '')?.id ?? 'sanctuary']} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={S.detailWash} /><WashiArt />
            <WashiPressable plate="round" accessibilityRole="button" accessibilityLabel="閉じる" onPress={() => setDetail(null)} style={S.close}><Icon name="close" size={20} color="#7f302d" /></WashiPressable>
            {detail && <>
              <KeychainArtwork shrine={detail} locked={(special.keychains[detail.id] ?? 0) === 0} count={special.keychains[detail.id] ?? 0} impulse={0} large />
              <Text style={S.detailReading}>{detail.reading}</Text>
              <Text style={S.detailName}>{detail.name}</Text>
              <Text style={S.detailRoute}>{routeForShrine(detail.id)?.name ?? 'もび道の巡礼'}</Text>
              <Text style={S.detailTheme}>{detail.theme}</Text>
              <Text style={S.detailOwned}>キーホルダー ×{special.keychains[detail.id] ?? 0}　キラキラ御朱印 ×{special.sparkles[detail.id] ?? 0}</Text>
              <Text style={S.detailDate}>{rewardDates[detail.id] ? `${rewardDates[detail.id]} に御朱印を授かりました` : 'まだ御朱印を授かっていません'}</Text>
              <WashiPressable accessibilityRole="button" onPress={() => setDetail(null)} style={S.returnButton}><Text style={S.returnText}>とじる</Text></WashiPressable>
            </>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  section: { marginTop: 26 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: BRUSH, fontSize: 21, color: '#3C3026', letterSpacing: 1 },
  sectionNote: { color: '#786A58', fontSize: 13 },
  rail: { paddingRight: 0 }, displayScroller: { width: '100%', backgroundColor: 'transparent' }, roomTrack: { position: 'relative' }, collectionBackdropLayer: { position: 'absolute', top: 0, overflow: 'hidden' }, collectionBackdropTrack: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' }, displayRow: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', zIndex: 2 }, displayCell: { position: 'relative', flexShrink: 0 },
  roomStage: { position: 'relative', overflow: 'hidden', backgroundColor: 'transparent' },
  roomLabel: { position: 'absolute', left: 4, right: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 2 }, roomNumber: { color: '#f2c681', letterSpacing: 0.75, flexShrink: 0 }, roomName: { color: '#fff1d8', fontFamily: BRUSH, flexShrink: 1, minWidth: 0 },
  keychainWrap: { position: 'absolute', alignSelf: 'center', width: 186, height: 255, zIndex: 1 }, detailKeychainWrap: { width: 260, height: 390, marginTop: 6 }, keychainButton: { flex: 1 }, keychain: { width: '100%', height: '100%' }, keychainLocked: { opacity: .28 }, hookContactClip: { position: 'absolute', overflow: 'hidden', zIndex: 3 }, shrineCharm: { position: 'absolute', width: 46, height: 46, borderRadius: 23, left: 70, bottom: 49, borderWidth: 2, backgroundColor: '#fff9ed', overflow: 'hidden', padding: 4 }, shrineCharmLarge: { width: 62, height: 62, borderRadius: 31, left: 99, bottom: 73 }, shrineCharmImage: { width: '100%', height: '100%' }, lock: { position: 'absolute', right: 7, bottom: 28, width: 30, height: 30, borderRadius: 15, backgroundColor: '#6f5540cc', alignItems: 'center', justifyContent: 'center' }, quantity: { position: 'absolute', right: 5, bottom: 27, borderRadius: 12, backgroundColor: '#fff7e8e8', borderWidth: 1, borderColor: '#b38b58', paddingHorizontal: 7, paddingVertical: 4 }, quantityText: { color: '#70462f', fontFamily: SERIF, fontSize: 11 },
  stampStand: { position: 'absolute', bottom: 14, alignSelf: 'center', width: 96, height: 120, overflow: 'hidden' }, stamp: { width: '100%', height: '100%' }, sparkleGlow: { position: 'absolute', inset: -8, borderRadius: 18, backgroundColor: '#ffd87578', shadowColor: '#ffd15a', shadowOpacity: .8, shadowRadius: 14 }, sparkleSweep: { position: 'absolute', top: -12, bottom: -12, width: 23, backgroundColor: '#FFFDF2B8' }, sparkleBadge: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 12, backgroundColor: '#fff0bce8', borderWidth: 1, borderColor: '#d0a343', paddingHorizontal: 5, paddingVertical: 3 }, sparkleText: { color: '#7a531e', fontSize: 11, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: '#241b15b8', justifyContent: 'center', padding: 20 }, detailCard: { minHeight: 650, maxHeight: '92%', overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: '#ead6ba', alignItems: 'center', padding: 24 }, detailWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff7e480' }, close: { position: 'absolute', top: 14, right: 14, zIndex: 4, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fffaf0e8', alignItems: 'center', justifyContent: 'center' },
  detailReading: { color: '#897866', fontSize: 12, letterSpacing: 2 }, detailName: { color: '#362b22', fontFamily: BRUSH, fontSize: 25, marginTop: 5 }, detailRoute: { color: '#6f6252', fontSize: 12, marginTop: 4 }, detailTheme: { color: '#8d3f39', fontFamily: BRUSH, fontSize: 14, marginTop: 10, textAlign: 'center' }, detailOwned: { color: '#685d4e', fontSize: 12, marginTop: 12, backgroundColor: '#fff8e4b8', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }, detailDate: { color: '#756958', fontSize: 12, marginTop: 8 }, returnButton: { marginTop: 20, minHeight: 46, paddingHorizontal: 30, borderRadius: 23, backgroundColor: '#9b443c', alignItems: 'center', justifyContent: 'center' }, returnText: { color: '#fffaf0', fontFamily: BRUSH, fontSize: 14, letterSpacing: 1 },
});
