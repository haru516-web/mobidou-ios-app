import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { Image } from './AppImage';
import { BRUSH, Icon } from '../components';
import { SHRINES, STAMP_IMAGES, type Shrine } from '../data/shrines';
import { PILGRIMAGE_IMAGES } from '../data/pilgrimageImages';
import { PILGRIMAGES } from '../data/pilgrimages';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import { WashiArt, WashiPressable } from './Washi';
import { CollectionRoom } from './CollectionRoom';
import { ScrollPopup } from './ScrollPopup';
import type { SpecialCollection } from '../services/specialRewards';
import { PagedShrineGrid } from './GoshuinBook';
import { attachSnapScroll } from './webSnapScroll';
import { ROOM_WALL_LEFT, ROOM_WALL_RIGHT, roomArtGeometry } from './collectionRoomArt';

const KEYCHAIN = require('../../assets/collection/keychain-asagiri-shrine-transparent-v2.webp');
const WALL_HOOK = require('../../assets/ui-round3/collection/collection-wall-hook-v2.webp');
const SERIF = 'Shippori';
/** Colour of the dark shape shown for what the player does not own yet. */
const SILHOUETTE = '#3A2A22';
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

function KeychainArtwork({ shrine, locked, impulse, onPress, large = false, top, size, compact = false }: { shrine: Shrine; locked: boolean; impulse: number; onPress?: () => void; large?: boolean; top?: number; size?: number; compact?: boolean }) {
  const sway = useRef(new Animated.Value(0)).current;
  const swing = () => {
    sway.stopAnimation();
    // Pushed to one side, then let go: it swings back and forth around the hook and dies down.
    sway.setValue(1);
    Animated.spring(sway, { toValue: 0, friction: 2, tension: 20, useNativeDriver: true }).start();
  };
  useEffect(() => { if (impulse > 0) swing(); }, [impulse]);
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
  // The keychain swings around the hook it hangs from, a little below the top of its box.
  const swingPivot = renderHeight / 2 - (hookTop + hookHeight * .5);
  const hookContactTop = hookTop + hookHeight * .38;
  const hookContactHeight = hookHeight * .55;
  const hookLeft = (renderWidth - hookWidth) / 2 + (compact ? 0 : renderWidth <= 130 ? 3 : 0);
  return <Animated.View style={[large ? S.detailKeychainWrap : S.keychainWrap, { width: renderWidth, height: renderHeight }, top !== undefined && { top }]}>
    <Pressable disabled={locked || !onPress} accessibilityState={{ disabled: locked || !onPress }} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={locked ? '未取得のミニチュア' : onPress ? `${shrine.name}のキーホルダーを詳しく見る` : undefined} onPress={locked ? undefined : () => { swing(); onPress?.(); }} style={S.keychainButton}>
      {!large && <View pointerEvents="none" style={[S.hookContactClip, { left: hookLeft, top: hookContactTop, width: hookWidth, height: hookContactHeight }]}><Image source={WALL_HOOK} contentFit="fill" style={{ position: 'absolute', left: 0, top: -hookHeight * .38, width: hookWidth, height: hookHeight }} /></View>}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 1, top: large ? 0 : Math.round(renderWidth * .09), transform: [{ translateY: -swingPivot }, { rotate: sway.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] }) }, { translateY: swingPivot }] }]}>
        <Image source={artwork} contentFit="contain" tintColor={locked ? SILHOUETTE : undefined} style={locked ? S.keychainSilhouette : S.keychain} />
      </Animated.View>
      {!locked && !dedicatedArtwork && <View pointerEvents="none" style={[S.shrineCharm, large && S.shrineCharmLarge, { width: charmSize, height: charmSize, borderRadius: charmSize / 2, left: large ? 99 : 70 * scale, bottom: large ? 73 : 49 * scale, borderColor: shrine.color }]}><Image source={STAMP_IMAGES[shrine.id]} contentFit="contain" style={S.shrineCharmImage} /></View>}
    </Pressable>
  </Animated.View>;
}

function DisplayedStamp({ shrine, owned, width, bottom, onPress }: { shrine: Shrine; owned: boolean; width?: number; bottom?: number; compact?: boolean; onPress?: () => void }) {
  const renderWidth = width ?? 96;
  const renderHeight = renderWidth * 1.5;
  return <Pressable disabled={!owned || !onPress} accessibilityRole={owned && onPress ? 'button' : undefined} accessibilityLabel={owned ? `${shrine.name}の御朱印を詳しく見る` : '未取得の御朱印'} accessibilityState={{ disabled: !owned }} onPress={owned ? onPress : undefined} style={[S.stampStand, { width: renderWidth, height: renderHeight }, bottom !== undefined && { bottom }]}>
    {owned ? <Image accessible={false} source={STAMP_IMAGES[shrine.id]} contentFit="contain" style={S.stamp} /> : <Image accessible={false} source={STAMP_IMAGES[shrine.id]} contentFit="contain" tintColor={SILHOUETTE} style={S.stampSilhouette} />}
  </Pressable>;
}

/** The 3D wooden cabinet (shelves, pillars, hooks, stands) behind the collection. Off for now; set to true to bring it back. */
const SHOW_CABINET = false;

export type CollectionPage = 'room' | 'goshuin' | 'miniatures';

/** The collection room and its paged goshuin / miniature lists. */
export function CollectionGallery({ scrollX: scrollXValue, shrines, rewardIds, rewardDates = {}, special, zoom, onZoomChange, page, onSelectGoshuin, onClosePage }: { scrollX: Animated.Value; shrines: readonly Shrine[]; rewardIds: readonly string[]; rewardDates?: Record<string, string>; special: SpecialCollection; zoom: CollectionZoom; onZoomChange: (zoom: CollectionZoom) => void; page: CollectionPage; onSelectGoshuin: (shrine: Shrine) => void; onClosePage: () => void }) {
  const { width, height: windowHeight } = useWindowDimensions();
  const viewportWidth = Math.min(480, Math.max(1, width));
  // Nothing scrolls vertically: the page fills the space under the pop buttons.
  const [areaHeight, setAreaHeight] = useState(0);
  const roomHeight = areaHeight > 0 ? Math.max(260, areaHeight) : 470;
  const [swayImpulse, setSwayImpulse] = useState(0);
  const [detail, setDetail] = useState<Shrine | null>(null);
  const [pinching, setPinching] = useState(false);
  const [scrollX, setScrollX] = useState(0);
  const displayScroll = useRef<ScrollView>(null);
  const pinchState = useRef({ active: false, startDistance: 0, startZoom: zoom });
  const showcase = shrines.length ? shrines : SHRINES.slice(0, 6);
  const trackCount = Math.max(3, showcase.length);
  const pageWidth = collectionCellWidth(viewportWidth, trackCount, zoom);
  const trackWidth = collectionTrackWidth(viewportWidth, trackCount, zoom);
  // The web ScrollView ignores snapToInterval and scrolls on its own thread: take the scrolling over so the picture and the displays move in the same step.
  const pageStep = zoom === 'close' ? pageWidth : pageWidth * 3;
  const webScrollLimits = useRef({ page: pageStep, max: 0 });
  webScrollLimits.current = { page: pageStep, max: Math.max(0, trackWidth - viewportWidth) };
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const node = (displayScroll.current as any)?.getScrollableNode?.() as HTMLElement | undefined;
    if (!node?.addEventListener) return undefined;
    return attachSnapScroll(node, { page: () => webScrollLimits.current.page, max: () => webScrollLimits.current.max, onMove: x => scrollXValue.setValue(x), onSettle: () => setSwayImpulse(value => value + 1) });
  }, [scrollXValue]);
  const displayCellHeight = roomHeight;
  const roomLabelFontSize = Math.max(8, Math.min(11, (pageWidth - 24) / 8));
  const roomLabelHeight = roomLabelFontSize + 3;
  // The picture fills the window, so the rail and the shelf are placed by their window position minus where this room starts.
  const [roomTopInWindow, setRoomTopInWindow] = useState(0);
  const root = useRef<View>(null);
  const art = roomArtGeometry(viewportWidth, windowHeight);
  const railY = art.railY - roomTopInWindow;
  const roomLabelTop = Math.max(0, railY - roomLabelHeight - 36);
  const goshuinBottom = roomHeight - (art.shelfY - roomTopInWindow);
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
    <View ref={root} style={{ flex: 1 }} onLayout={({ nativeEvent }) => { setAreaHeight(previous => Math.abs(previous - nativeEvent.layout.height) < 1 ? previous : nativeEvent.layout.height); root.current?.measureInWindow((_x, y) => setRoomTopInWindow(previous => Math.abs(previous - y) < 1 ? previous : y)); }}>
      {<View onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} style={[S.roomStage, { width: viewportWidth, height: roomHeight, marginHorizontal: -24 }]}>
        <Animated.ScrollView
          ref={displayScroll}
          horizontal
          decelerationRate="fast"
          snapToInterval={zoom === 'close' ? pageWidth : pageWidth * 3}
          disableIntervalMomentum
          snapToAlignment="start"
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="コレクション展示室。横にスワイプして地点を巡る"
          accessibilityHint="キーホルダーと御朱印、背景の棚が一緒に移動します"
          scrollEnabled={!pinching}
          style={[S.displayScroller, { height: roomHeight, zIndex: 1 }]}
          contentContainerStyle={[S.rail, { width: trackWidth, height: roomHeight }]}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollXValue } } }], { useNativeDriver: Platform.OS !== 'web', listener: (event: any) => { const step = Math.max(1, viewportWidth / 2); const next = Math.floor(event.nativeEvent.contentOffset.x / step) * step; setScrollX(previous => previous === next ? previous : next); } })}
          onMomentumScrollEnd={() => setSwayImpulse(value => value + 1)}
        >
          <View style={[S.roomTrack, { width: trackWidth, height: roomHeight }]}>
            {SHOW_CABINET && <CollectionRoom key={`${zoom}:${trackWidth}:${pageWidth}`} itemCount={trackCount} zoom={zoom} viewportWidth={viewportWidth} roomHeight={roomHeight} contentWidth={trackWidth} cellWidth={pageWidth} scrollX={scrollX} />}
            <View style={[S.displayRow, { width: trackWidth, height: roomHeight }]}>
              {showcase.map((shrine, index) => {
                const keychainCount = special.keychains[shrine.id] ?? 0;
                const stampOwned = rewarded.has(shrine.id);
                // As large as the cell allows, and small enough that the hanging keychain (1.37x its width tall) and the standing goshuin (1.5x) never meet between the rail and the shelf.
                const fit = Math.max(40, (art.shelfY - art.railY - 24) / (1.37 + 1.5 * .95));
                // The pillars take the sides of each tile: the cells share the wall between them.
                const perPage = zoom === 'close' ? 1 : 3;
                const slot = index % perPage;
                const wallLeft = art.left + ROOM_WALL_LEFT * art.width;
                const wallWidth = (ROOM_WALL_RIGHT - ROOM_WALL_LEFT) * art.width;
                const slotWidth = wallWidth / perPage;
                const shiftX = wallLeft + (slot + .5) * slotWidth - (slot + .5) * pageWidth;
                const keychainSize = Math.min(slotWidth * 1.4, fit, 260); // the artwork fills only about two thirds of its box
                const stampWidth = Math.min(slotWidth * .92, fit * .95);
                const hookHeightEstimate = Math.min(65, keychainSize * .5) * (1145 / 1374);
                return <View key={shrine.id} style={[S.displayCell, { width: pageWidth, height: displayCellHeight, left: shiftX }]}>
                  <View style={[S.roomLabel, { top: roomLabelTop, height: roomLabelHeight, columnGap: Math.max(2, roomLabelFontSize * 0.35) }]}><Text style={[S.roomNumber, { fontSize: Math.max(6, roomLabelFontSize * 0.72) }]}>{String(index + 1).padStart(2, '0')}</Text><Text numberOfLines={1} style={[S.roomName, { fontSize: roomLabelFontSize }]}>{stampOwned ? shrine.name : 'まだ見ぬご縁'}</Text></View>
                  <KeychainArtwork shrine={shrine} locked={keychainCount === 0} impulse={swayImpulse} onPress={() => setDetail(shrine)} size={keychainSize} top={railY - hookHeightEstimate * .405} />
                  <DisplayedStamp shrine={shrine} owned={stampOwned} width={stampWidth} bottom={goshuinBottom} onPress={() => onSelectGoshuin(shrine)} />
                </View>;
              })}
            </View>
          </View>
        </Animated.ScrollView>
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
              <KeychainArtwork shrine={detail} locked={(special.keychains[detail.id] ?? 0) === 0} impulse={0} large />
              <Text style={S.detailReading}>{detail.reading}</Text>
              <Text style={S.detailName}>{detail.name}</Text>
              <Text style={S.detailRoute}>{routeForShrine(detail.id)?.name ?? 'もび道の巡礼'}</Text>
              <Text style={S.detailTheme}>{detail.theme}</Text>
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
  roomLabel: { position: 'absolute', left: 4, right: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 2 }, roomNumber: { color: '#A63A2C', letterSpacing: 0.75, flexShrink: 0 }, roomName: { color: '#5A3426', fontFamily: BRUSH, flexShrink: 1, minWidth: 0 },
  keychainWrap: { position: 'absolute', alignSelf: 'center', width: 186, height: 255, zIndex: 1 }, detailKeychainWrap: { width: 260, height: 390, marginTop: 6 }, keychainButton: { flex: 1 }, keychain: { width: '100%', height: '100%', zIndex: 1 }, keychainSilhouette: { width: '100%', height: '100%', zIndex: 1, opacity: .5 }, stampSilhouette: { width: '100%', height: '100%', opacity: .5 }, keychainLocked: { opacity: .28 }, hookContactClip: { position: 'absolute', overflow: 'hidden', zIndex: 0 }, shrineCharm: { position: 'absolute', width: 46, height: 46, borderRadius: 23, left: 70, bottom: 49, borderWidth: 2, backgroundColor: '#fff9ed', overflow: 'hidden', padding: 4 }, shrineCharmLarge: { width: 62, height: 62, borderRadius: 31, left: 99, bottom: 73 }, shrineCharmImage: { width: '100%', height: '100%' }, lock: { position: 'absolute', right: 7, bottom: 28, width: 30, height: 30, borderRadius: 15, backgroundColor: '#6f5540cc', alignItems: 'center', justifyContent: 'center' }, quantity: { position: 'absolute', right: 5, bottom: 27, borderRadius: 12, backgroundColor: '#fff7e8e8', borderWidth: 1, borderColor: '#b38b58', paddingHorizontal: 7, paddingVertical: 4 }, quantityText: { color: '#70462f', fontFamily: SERIF, fontSize: 11 },
  stampStand: { position: 'absolute', bottom: 14, alignSelf: 'center', width: 96, height: 120, overflow: 'hidden' }, stamp: { width: '100%', height: '100%' }, sparkleGlow: { position: 'absolute', inset: -8, borderRadius: 18, backgroundColor: '#ffd87578', shadowColor: '#ffd15a', shadowOpacity: .8, shadowRadius: 14 }, sparkleSweep: { position: 'absolute', top: -12, bottom: -12, width: 23, backgroundColor: '#FFFDF2B8' }, sparkleBadge: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 12, backgroundColor: '#fff0bce8', borderWidth: 1, borderColor: '#d0a343', paddingHorizontal: 5, paddingVertical: 3 }, sparkleText: { color: '#7a531e', fontSize: 11, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: '#241b15b8', justifyContent: 'center', padding: 20 }, detailCard: { minHeight: 650, maxHeight: '92%', overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: '#ead6ba', alignItems: 'center', padding: 24 }, detailWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff7e480' }, close: { position: 'absolute', top: 14, right: 14, zIndex: 4, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fffaf0e8', alignItems: 'center', justifyContent: 'center' },
  detailReading: { color: '#897866', fontSize: 12, letterSpacing: 2 }, detailName: { color: '#362b22', fontFamily: BRUSH, fontSize: 25, marginTop: 5 }, detailRoute: { color: '#6f6252', fontSize: 12, marginTop: 4 }, detailTheme: { color: '#8d3f39', fontFamily: BRUSH, fontSize: 14, marginTop: 10, textAlign: 'center' }, detailOwned: { color: '#685d4e', fontSize: 12, marginTop: 12, backgroundColor: '#fff8e4b8', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }, detailDate: { color: '#756958', fontSize: 12, marginTop: 8 }, returnButton: { marginTop: 20, minHeight: 46, paddingHorizontal: 30, borderRadius: 23, backgroundColor: '#9b443c', alignItems: 'center', justifyContent: 'center' }, returnText: { color: '#fffaf0', fontFamily: BRUSH, fontSize: 14, letterSpacing: 1 },
});
