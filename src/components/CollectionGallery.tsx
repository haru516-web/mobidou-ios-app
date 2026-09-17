import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent, type ImageSourcePropType } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SHRINES, STAMP_IMAGES, type Shrine } from '../data/shrines';
import { PILGRIMAGE_IMAGES } from '../data/pilgrimageImages';
import { PILGRIMAGES, type Pilgrimage } from '../data/pilgrimages';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import { GOSHUIN_BOOK_COVERS, getGoshuinBookCover } from '../data/goshuinBookCovers';
import { WashiArt, WashiPressable } from './Washi';
import { CollectionRoom } from './CollectionRoom';
import type { PassKind, SpecialCollection } from '../services/specialRewards';

const KEYCHAIN = require('../../assets/collection/keychain-asagiri-shrine-transparent-v2.png');
const WALL_HOOK = require('../../assets/collection/collection-wall-hook-v2.png');
const COLLECTION_BACKDROP = require('../../assets/collection/collection-cabinet-washi-backdrop-v1.png');
const COVER_CHANGE_TICKET = require('../../assets/tickets/ticket-cover-change-v1.png');
const KEYCHAIN_DROP_TICKET = require('../../assets/tickets/ticket-keychain-drop-v1.png');
const SERIF = 'Shippori';
const KEYCHAIN_RAIL_Y = 0.14;
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
  // Every tile is one viewport wide, keeping the background aligned with the
  // room in both the three-item and one-item layouts.
  const tileWidth = Math.max(1, viewportWidth);
  const tileCount = Math.ceil(trackWidth / tileWidth) + 1;
  const tileStripWidth = tileCount * tileWidth;
  return <View pointerEvents="none" style={[S.collectionBackdropLayer, { left: 0, width: trackWidth, height: roomHeight }]}>
    <View style={[S.collectionBackdropTrack, { width: tileStripWidth, height: roomHeight }]}>
      {Array.from({ length: tileCount }, (_, index) => <Image key={index} source={COLLECTION_BACKDROP} resizeMode="stretch" style={[{ width: tileWidth, height: roomHeight, flexShrink: 0 }, index % 2 === 1 && { transform: [{ scaleX: -1 }] }]} />)}
    </View>
  </View>;
}

export function CollectionGallery({ shrines, rewardIds, rewardDates = {}, special, onPurchasePass, activeRoute, coverOwned = false, selectedCover = 'normal', onRedeemCoverChange, onSelectCover, zoom, onZoomChange }: { shrines: readonly Shrine[]; rewardIds: readonly string[]; rewardDates?: Record<string, string>; special: SpecialCollection; onPurchasePass: (kind: PassKind) => void; activeRoute?: Pilgrimage; coverOwned?: boolean; selectedCover?: 'normal' | 'route'; onRedeemCoverChange?: (routeId: string) => void; onSelectCover?: (routeId: string, design: 'normal' | 'route') => void; zoom: CollectionZoom; onZoomChange: (zoom: CollectionZoom) => void }) {
  const { width, height } = useWindowDimensions();
  const viewportWidth = Math.min(480, Math.max(1, width));
  const roomHeight = Math.max(470, Math.min(720, height - 220));
  const [swayImpulse, setSwayImpulse] = useState(0);
  const [detail, setDetail] = useState<Shrine | null>(null);
  const [purchaseNotice, setPurchaseNotice] = useState('');
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [coverNotice, setCoverNotice] = useState('');
  const [pinching, setPinching] = useState(false);
  const displayScroll = useRef<ScrollView>(null);
  const pinchState = useRef({ active: false, startDistance: 0, startZoom: zoom });
  const showcase = shrines.length ? shrines : SHRINES.slice(0, 6);
  const trackCount = Math.max(3, showcase.length);
  const pageWidth = collectionCellWidth(viewportWidth, trackCount, zoom);
  const trackWidth = collectionTrackWidth(viewportWidth, trackCount, zoom);
  const displayCellHeight = roomHeight;
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

  const buy = (kind: PassKind, label: string) => {
    onPurchasePass(kind);
    setPurchaseNotice(`${label}を仮購入しました`);
  };

  const showCoverPicker = () => {
    setCoverNotice('');
    setCoverPickerOpen(true);
  };

  const chooseCover = (design: 'normal' | 'route') => {
    if (!activeRoute) return;
    onSelectCover?.(activeRoute.id, design);
    setCoverNotice(design === 'route' ? '巡礼の表紙を選びました' : '通常表紙を選びました');
  };

  const unlockCover = () => {
    if (!activeRoute || coverOwned || !GOSHUIN_BOOK_COVERS[activeRoute.id] || special.passes.coverChange <= 0) return;
    onRedeemCoverChange?.(activeRoute.id);
    setCoverNotice('表紙を解放しました。巡礼の表紙を選べます');
  };

  // Keep the ticket usable from the wallet itself.  Before a cover is
  // unlocked, the same action first provides the local/mock ticket; after
  // that it opens the picker so the user can spend it deliberately.
  const coverNeedsTicket = !!activeRoute && !coverOwned && !!GOSHUIN_BOOK_COVERS[activeRoute.id] && special.passes.coverChange <= 0;
  const handleCoverAction = () => {
    if (!activeRoute) return;
    if (coverNeedsTicket) {
      buy('coverChange', '御朱印帳表紙着せ替え券');
      return;
    }
    showCoverPicker();
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
            <CollectionRoom key={`${zoom}:${trackWidth}:${pageWidth}`} itemCount={trackCount} zoom={zoom} viewportWidth={viewportWidth} roomHeight={roomHeight} contentWidth={trackWidth} cellWidth={pageWidth} />
            <View style={[S.displayRow, { width: trackWidth, height: roomHeight }]}>
              {showcase.map((shrine, index) => {
                const keychainCount = special.keychains[shrine.id] ?? 0;
                const sparkleCount = special.sparkles[shrine.id] ?? 0;
                const stampOwned = rewarded.has(shrine.id);
                const keychainSize = zoom === 'close' ? 142 : Math.max(42, Math.min(170, pageWidth * .86));
                const stampWidth = zoom === 'close' ? 96 : Math.max(34, Math.min(112, pageWidth * .56));
                return <View key={shrine.id} style={[S.displayCell, { width: pageWidth, height: displayCellHeight }]}>
                  <View style={S.roomLabel}><Text style={S.roomNumber}>{String(index + 1).padStart(2, '0')}</Text><Text numberOfLines={1} style={S.roomName}>{shrine.name}</Text></View>
                  <KeychainArtwork shrine={shrine} locked={keychainCount === 0} count={keychainCount} impulse={swayImpulse} onPress={() => setDetail(shrine)} size={keychainSize} top={roomHeight * KEYCHAIN_RAIL_Y} />
                  <DisplayedStamp shrine={shrine} owned={stampOwned} sparkleCount={sparkleCount} width={stampWidth} bottom={goshuinBottom} />
                </View>;
              })}
            </View>
          </View>
        </ScrollView>
      </View>
      <View style={S.passWallet}>
        <WashiArt />
        <View style={S.passHeader}><View><Text style={S.passEyebrow}>旅の授与品</Text><Text style={S.passTitle}>集めたパス</Text></View><Icon name="ticket-outline" size={25} color="#9b443c" /></View>
        <Text style={S.passIntro}>小さな一歩を、次の特別な出会いへ。</Text>
        <View style={S.ticketGrid}>
          <View style={[S.ticketCard, S.ticketCardVermilion]}>
            <Image source={COVER_CHANGE_TICKET} resizeMode="stretch" style={S.ticketArt} />
            <View pointerEvents="none" style={S.ticketCopy}>
              <Text style={S.ticketKicker}>MOBIDOU · PASS</Text>
              <Text style={S.ticketTitle}>御朱印帳表紙{ '\n' }着せ替え券</Text>
              <Text style={S.ticketBody}>お気に入りの旅の表紙に。</Text>
              <Text style={S.ticketCount}>所持 {special.passes.coverChange}枚</Text>
            </View>
            <WashiPressable accessibilityRole="button" accessibilityLabel={!activeRoute ? '巡礼を選んでから表紙を選ぶ' : coverNeedsTicket ? '御朱印帳表紙着せ替え券を仮取得' : '御朱印帳の表紙を選ぶ'} accessibilityState={{ disabled: !activeRoute }} disabled={!activeRoute} artwork={false} onPress={handleCoverAction} style={S.ticketButton}><Text style={S.ticketButtonText}>{!activeRoute ? '巡礼を選ぶ' : coverNeedsTicket ? '着せ替え券を仮取得' : '表紙を選ぶ'}</Text></WashiPressable>
          </View>
          <View style={[S.ticketCard, S.ticketCardMoss]}>
            <Image source={KEYCHAIN_DROP_TICKET} resizeMode="stretch" style={S.ticketArt} />
            <View pointerEvents="none" style={S.ticketCopy}>
              <Text style={S.ticketKicker}>MOBIDOU · PASS</Text>
              <Text style={S.ticketTitle}>ミニチュアキーホルダー{ '\n' }ドロップ券</Text>
              <Text style={S.ticketBody}>ドロップなしでも確実に。</Text>
              <Text style={S.ticketCount}>所持 {special.passes.keychainDrop}枚</Text>
            </View>
            <WashiPressable accessibilityRole="button" accessibilityLabel="ミニチュアキーホルダードロップ券を仮取得" onPress={() => buy('keychainDrop', 'ミニチュアキーホルダードロップ券')} artwork={false} style={S.ticketButton}><Text style={S.ticketButtonText}>1枚を仮取得</Text></WashiPressable>
          </View>
        </View>
        {!!purchaseNotice && <Text accessibilityLiveRegion="polite" style={S.purchaseNotice}>{purchaseNotice}</Text>}
        {!!coverNotice && <Text accessibilityLiveRegion="polite" style={S.purchaseNotice}>{coverNotice}</Text>}
        <Text style={S.passNote}>仮取得はテスト用です。決済は発生しません</Text>
      </View>

      <Modal visible={coverPickerOpen} transparent animationType="fade" onRequestClose={() => setCoverPickerOpen(false)}>
        <View style={S.backdrop}>
          <View style={S.coverPickerCard}>
            <WashiArt />
            <WashiPressable accessibilityRole="button" accessibilityLabel="表紙選択を閉じる" onPress={() => setCoverPickerOpen(false)} artwork={false} style={S.close}><Icon name="close" size={20} color="#7f302d" /></WashiPressable>
            <Text style={S.coverPickerEyebrow}>御朱印帳 · COVER</Text>
            <Text style={S.coverPickerTitle}>旅の表紙を選ぶ</Text>
            {!activeRoute ? <Text style={S.coverPickerMessage}>巡礼を選ぶと、専用表紙を選択できます。</Text> : <>
              <Text style={S.coverPickerRoute}>{activeRoute.name}</Text>
              <View style={S.coverPreview}><Image source={getGoshuinBookCover(activeRoute.id) as ImageSourcePropType} resizeMode="contain" style={S.coverPreviewImage} /></View>
              <View style={S.coverChoices}>
                <WashiPressable accessibilityRole="button" accessibilityState={{ selected: selectedCover === 'normal' }} onPress={() => chooseCover('normal')} artwork={false} style={[S.coverChoice, selectedCover === 'normal' && S.coverChoiceActive]}><Text style={S.coverChoiceTitle}>通常表紙</Text><Text style={S.coverChoiceMeta}>いつもの赤い表紙</Text></WashiPressable>
                <WashiPressable accessibilityRole="button" accessibilityState={{ selected: selectedCover === 'route', disabled: !coverOwned }} disabled={!coverOwned} onPress={() => chooseCover('route')} artwork={false} style={[S.coverChoice, selectedCover === 'route' && S.coverChoiceActive, !coverOwned && S.coverChoiceDisabled]}><Text style={S.coverChoiceTitle}>巡礼の表紙</Text><Text style={S.coverChoiceMeta}>{coverOwned ? '解放済み · 選択できます' : '着せ替え券で解放'}</Text></WashiPressable>
              </View>
              {!coverOwned && <View style={S.coverUnlockBox}>
                {GOSHUIN_BOOK_COVERS[activeRoute.id] ? <>
                  <Text style={S.coverUnlockTitle}>専用表紙はまだ未解放</Text>
                  <Text style={S.coverUnlockText}>{special.passes.coverChange > 0 ? '所持している券を1枚使って、専用表紙を解放します。' : '御朱印帳表紙着せ替え券がありません。下の券を仮取得できます。'}</Text>
                  <WashiPressable accessibilityRole="button" accessibilityLabel="御朱印帳表紙着せ替え券を使って専用表紙を解放" accessibilityState={{ disabled: special.passes.coverChange <= 0 }} disabled={special.passes.coverChange <= 0} onPress={unlockCover} artwork={false} style={[S.unlockButton, special.passes.coverChange <= 0 && S.unlockButtonDisabled]}><Text style={S.unlockButtonText}>{special.passes.coverChange > 0 ? '券を使って解放する' : '着せ替え券が必要です'}</Text></WashiPressable>
                </> : <>
                  <Text style={S.coverUnlockTitle}>専用表紙は準備中</Text>
                  <Text style={S.coverUnlockText}>この巡礼には専用デザインがまだありません。券は消費されません。</Text>
                </>}
              </View>}
            </>}
            {!!coverNotice && <Text accessibilityLiveRegion="polite" style={S.coverModalNotice}>{coverNotice}</Text>}
            <WashiPressable accessibilityRole="button" onPress={() => setCoverPickerOpen(false)} artwork={false} style={S.coverCloseButton}><Text style={S.coverCloseText}>閉じる</Text></WashiPressable>
          </View>
        </View>
      </Modal>

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
  rail: { paddingRight: 0 }, displayScroller: { width: '100%', backgroundColor: 'transparent' }, roomTrack: { position: 'relative' }, collectionBackdropLayer: { position: 'absolute', top: 0, overflow: 'hidden' }, collectionBackdropTrack: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' }, displayRow: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', zIndex: 2 }, displayCell: { position: 'relative', flexShrink: 0 },
  passWallet: { borderWidth: 1, borderColor: '#dcc6a8', borderRadius: 18, backgroundColor: '#fff8e9', padding: 14, marginTop: 22, marginBottom: 8, overflow: 'hidden' }, passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, passEyebrow: { color: '#a1604f', fontSize: 9, letterSpacing: 1.5 }, passTitle: { color: '#3c3026', fontFamily: SERIF, fontSize: 18, marginTop: 2 }, passIntro: { color: '#786a58', fontFamily: SERIF, fontSize: 10, marginTop: 9 }, ticketGrid: { flexDirection: 'row', gap: 9, marginTop: 12 }, ticketCard: { flex: 1, minHeight: 258, aspectRatio: .68, position: 'relative', overflow: 'hidden', borderRadius: 12, alignItems: 'center', justifyContent: 'flex-end', padding: 9 }, ticketCardVermilion: { backgroundColor: '#a94a3e' }, ticketCardMoss: { backgroundColor: '#6b7d62' }, ticketArt: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 0 }, ticketCopy: { position: 'absolute', left: 13, right: 13, top: 24, alignItems: 'center', zIndex: 1 }, ticketKicker: { color: '#5e392f', fontSize: 7, letterSpacing: 1.4, textAlign: 'center' }, ticketTitle: { color: '#2e241d', fontFamily: SERIF, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 }, ticketBody: { color: '#6c5b4b', fontSize: 8, lineHeight: 12, textAlign: 'center', marginTop: 9 }, ticketCount: { color: '#7f352f', fontFamily: SERIF, fontSize: 11, textAlign: 'center', marginTop: 13 }, ticketButton: { minHeight: 31, minWidth: '88%', borderRadius: 9, borderWidth: 1, borderColor: '#a97a4c', backgroundColor: '#fff7e8e8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 2 }, ticketButtonText: { color: '#7b322d', fontFamily: SERIF, fontSize: 10, textAlign: 'center' }, purchaseNotice: { color: '#7d4939', fontSize: 10, textAlign: 'center', marginTop: 9 }, passNote: { color: '#9a8b77', fontSize: 8, textAlign: 'center', marginTop: 6 }, coverPickerCard: { width: '100%', maxWidth: 390, maxHeight: '94%', overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: '#ead6ba', backgroundColor: '#fff8e9', padding: 22, alignItems: 'center' }, coverPickerEyebrow: { color: '#9a6851', fontSize: 9, letterSpacing: 1.4 }, coverPickerTitle: { color: '#362b22', fontFamily: SERIF, fontSize: 22, marginTop: 4 }, coverPickerMessage: { color: '#766956', fontSize: 11, textAlign: 'center', lineHeight: 18, marginTop: 24, marginBottom: 18 }, coverPickerRoute: { color: '#8d3f39', fontFamily: SERIF, fontSize: 14, marginTop: 9 }, coverPreview: { width: 118, height: 122, marginTop: 10, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f1e4cf', alignItems: 'center', justifyContent: 'center' }, coverPreviewImage: { width: '100%', height: '100%' }, coverChoices: { width: '100%', flexDirection: 'row', gap: 8, marginTop: 14 }, coverChoice: { flex: 1, minHeight: 60, borderRadius: 10, borderWidth: 1, borderColor: '#d6b78e', backgroundColor: '#f7ecd9', paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }, coverChoiceActive: { borderColor: '#a6453d', backgroundColor: '#f4d8c3' }, coverChoiceDisabled: { opacity: .55 }, coverChoiceTitle: { color: '#6f382f', fontFamily: SERIF, fontSize: 11 }, coverChoiceMeta: { color: '#887764', fontSize: 8, textAlign: 'center', marginTop: 4 }, coverUnlockBox: { width: '100%', marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#dbc5a8', backgroundColor: '#fffaf1', padding: 11, alignItems: 'center' }, coverUnlockTitle: { color: '#554333', fontFamily: SERIF, fontSize: 12 }, coverUnlockText: { color: '#7a6a59', fontSize: 9, lineHeight: 15, textAlign: 'center', marginTop: 5 }, unlockButton: { minHeight: 40, minWidth: '82%', borderRadius: 20, backgroundColor: '#9b443c', alignItems: 'center', justifyContent: 'center', marginTop: 9, paddingHorizontal: 12 }, unlockButtonDisabled: { backgroundColor: '#b9a998' }, unlockButtonText: { color: '#fffaf0', fontFamily: SERIF, fontSize: 11, textAlign: 'center' }, coverModalNotice: { color: '#7d4939', fontSize: 10, textAlign: 'center', marginTop: 9 }, coverCloseButton: { minHeight: 40, minWidth: 118, borderRadius: 20, backgroundColor: '#f1dfc4', alignItems: 'center', justifyContent: 'center', marginTop: 14 }, coverCloseText: { color: '#7f302d', fontFamily: SERIF, fontSize: 12 },
  roomStage: { position: 'relative', overflow: 'hidden', backgroundColor: 'transparent' },
  roomLabel: { position: 'absolute', top: 17, left: 4, right: 4, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 5, zIndex: 2 }, roomNumber: { color: '#f2c681', fontSize: 8, letterSpacing: 1 }, roomName: { color: '#fff1d8', fontFamily: SERIF, fontSize: 11, flexShrink: 1 },
  keychainWrap: { position: 'absolute', alignSelf: 'center', width: 186, height: 255, zIndex: 1 }, detailKeychainWrap: { width: 260, height: 390, marginTop: 6 }, keychainButton: { flex: 1 }, keychain: { width: '100%', height: '100%' }, keychainLocked: { opacity: .28 }, hookContactClip: { position: 'absolute', overflow: 'hidden', zIndex: 3 }, shrineCharm: { position: 'absolute', width: 46, height: 46, borderRadius: 23, left: 70, bottom: 49, borderWidth: 2, backgroundColor: '#fff9ed', overflow: 'hidden', padding: 4 }, shrineCharmLarge: { width: 62, height: 62, borderRadius: 31, left: 99, bottom: 73 }, shrineCharmImage: { width: '100%', height: '100%' }, lock: { position: 'absolute', right: 7, bottom: 28, width: 30, height: 30, borderRadius: 15, backgroundColor: '#6f5540cc', alignItems: 'center', justifyContent: 'center' }, quantity: { position: 'absolute', right: 5, bottom: 27, borderRadius: 12, backgroundColor: '#fff7e8e8', borderWidth: 1, borderColor: '#b38b58', paddingHorizontal: 7, paddingVertical: 4 }, quantityText: { color: '#70462f', fontFamily: SERIF, fontSize: 11 },
  stampStand: { position: 'absolute', bottom: 14, alignSelf: 'center', width: 96, height: 120, overflow: 'hidden' }, stamp: { width: '100%', height: '100%' }, sparkleGlow: { position: 'absolute', inset: -8, borderRadius: 18, backgroundColor: '#ffd87578', shadowColor: '#ffd15a', shadowOpacity: .8, shadowRadius: 14 }, sparkleSweep: { position: 'absolute', top: -12, bottom: -12, width: 23, backgroundColor: '#FFFDF2B8' }, sparkleBadge: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 12, backgroundColor: '#fff0bce8', borderWidth: 1, borderColor: '#d0a343', paddingHorizontal: 5, paddingVertical: 3 }, sparkleText: { color: '#7a531e', fontSize: 9, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: '#241b15b8', justifyContent: 'center', padding: 20 }, detailCard: { minHeight: 650, maxHeight: '92%', overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: '#ead6ba', alignItems: 'center', padding: 24 }, detailWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff7e480' }, close: { position: 'absolute', top: 14, right: 14, zIndex: 4, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fffaf0e8', alignItems: 'center', justifyContent: 'center' },
  detailReading: { color: '#897866', fontSize: 10, letterSpacing: 2 }, detailName: { color: '#362b22', fontFamily: SERIF, fontSize: 25, marginTop: 5 }, detailRoute: { color: '#6f6252', fontSize: 10, marginTop: 4 }, detailTheme: { color: '#8d3f39', fontFamily: SERIF, fontSize: 14, marginTop: 10, textAlign: 'center' }, detailOwned: { color: '#685d4e', fontSize: 10, marginTop: 12, backgroundColor: '#fff8e4b8', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }, detailDate: { color: '#756958', fontSize: 9, marginTop: 8 }, returnButton: { marginTop: 20, minHeight: 46, paddingHorizontal: 30, borderRadius: 23, backgroundColor: '#9b443c', alignItems: 'center', justifyContent: 'center' }, returnText: { color: '#fffaf0', fontFamily: SERIF, fontSize: 14, letterSpacing: 1 },
});
