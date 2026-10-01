import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, PanResponder, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { BRUSH, C, Icon, useReducedMotion } from '../components';
import { PET_CHARACTERS, type PetId } from '../petCatalog';
import { PET_BACKGROUNDS } from '../data/petBackgrounds';
import { STAMP_IMAGES, type Shrine } from '../data/shrines';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import { CUSTOM_HOME_WIDGET_IDS, setHomeWidgetSlot, type CustomHomeWidgetId, type HomeWidgetId, type HomeWidgetItems, type HomeWidgetOrder } from '../services/homePreferences';
import { LockTag } from './LockTag';
import { WashiArt, WashiPressable as Pressable } from './Washi';
import { CroppedArt } from './CroppedArt';
import { SlicedArt } from './SlicedArt';
import { HomeGoshuinArtwork, HomeMapArtwork, HomeOmikujiArtwork } from './HomeWidgetArtwork';
import { TutorialSpotlightOverlay, TutorialTarget, type TutorialRect } from './TutorialSpotlight';

// `borderCurve` is only supported by iOS. Keeping it out of the web/Android
// style object avoids platform warnings while preserving the same smooth
// silhouette with the shared border radii everywhere else.
const CONTINUOUS_CORNER = Platform.OS === 'ios' ? ({ borderCurve: 'continuous' } as any) : undefined;
const FIXED_POPUP_ROOT = Platform.OS === 'web' ? ({ position: 'fixed' } as any) : undefined;
const FULL_POPUP_BOUNDS = { top: 0, bottom: 0 };
const HOME_WIDGET_CARD_HEIGHT = 244;
const CUSTOM_WIDGET_PREVIEW_SCALE = 0.42;
const NAV_BACKGROUND = require('../../assets/ui-washi/home/nav-bar.webp');
const NAV_BOUNDS = { x0: 0, x1: .999, y0: .322, y1: .997 };
const NAV_TAB_ACTIVE = require('../../assets/ui-washi/home/nav-tab-active.webp');
const NAV_UNDERLINE = require('../../assets/ui-washi/common/underline-brush.webp');
export type PrimaryTab = 'home' | 'book' | 'walk' | 'collection';

const PRIMARY_NAV_ITEMS = [
  { id: 'home', title: 'ホーム', icon: 'home-outline' },
  { id: 'book', title: '御朱印帳', icon: 'book-outline' },
  { id: 'walk', title: 'おでかけ', icon: 'footsteps-outline' },
  { id: 'collection', title: 'コレクション', icon: 'albums-outline' },
] as const;

/** The gacha is not a screen of its own: its tab opens the box-opening scene over the current one. */
const GACHA_NAV_ITEM = { title: 'ガチャ', icon: 'gift-outline' } as const;

type HomeBottomNavigationProps = {
  tab: PrimaryTab;
  onNavigate: (tab: PrimaryTab) => void;
  disabled?: boolean;
  /** Opens the gacha. Its tab sits in the middle of the bar and is shown only when this is given. */
  onGacha?: () => void;
  /** Free pulls waiting; shown as a small count on the gacha tab. */
  freePulls?: number;
};

// The washi tab frame. The separate menu button that used to sit to its right
// is gone (every screen is reachable from the tabs and segmented controls), so
// the frame now spans the full width.
export function HomeBottomNavigation({ tab, onNavigate, disabled = false, onGacha, freePulls = 0 }: HomeBottomNavigationProps) {
  const gacha = <NavTab key="gacha" item={GACHA_NAV_ITEM} selected={false} badge={freePulls} onPress={() => onGacha?.()} />;
  const items = PRIMARY_NAV_ITEMS.map(item => <NavTab key={item.id} item={item} selected={tab === item.id} onPress={() => onNavigate(item.id)} />);
  return <View style={S.navShell} pointerEvents={disabled ? 'none' : 'auto'} accessibilityElementsHidden={disabled} aria-hidden={disabled ? true : undefined} importantForAccessibility={disabled ? 'no-hide-descendants' : 'auto'}>
    <View style={[S.primaryNavFrame, CONTINUOUS_CORNER]}>
      <CroppedArt source={NAV_BACKGROUND} bounds={NAV_BOUNDS} />
      <View style={S.primaryNav} accessibilityRole="tablist">
        {onGacha ? [...items.slice(0, 2), gacha, ...items.slice(2)] : items}
      </View>
    </View>
  </View>;
}

/**
 * One tab. The chosen tab is stamped: a vermilion ink seal blooms behind its
 * icon, the icon lifts a little, and the name is underlined with a brush stroke.
 */
function NavTab({ item, selected, onPress, badge = 0 }: { item: { title: string; icon: React.ComponentProps<typeof Icon>['name'] }; selected: boolean; onPress: () => void; badge?: number }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const useNativeDriver = Platform.OS !== 'web';
  useEffect(() => {
    if (reduced) { progress.setValue(selected ? 1 : 0); return undefined; }
    const animation = selected
      ? Animated.spring(progress, { toValue: 1, damping: 9, stiffness: 190, mass: .7, useNativeDriver })
      : Animated.timing(progress, { toValue: 0, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, selected, useNativeDriver]);
  const lift = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const sealScale = progress.interpolate({ inputRange: [0, 1], outputRange: [.5, 1] });
  const sealTurn = progress.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '-6deg'] });
  return <Pressable artwork={false} accessibilityRole="tab" accessibilityLabel={badge > 0 ? `${item.title}。無料で引けるのは${badge}回` : item.title} accessibilityState={{ selected }} onPress={onPress} style={S.navItem}>
    <Animated.View style={[S.navIconWrap, { transform: [{ translateY: lift }] }]}>
      <Animated.Image accessible={false} source={NAV_TAB_ACTIVE} resizeMode="contain" style={[S.navInk, { opacity: progress, transform: [{ scale: sealScale }, { rotate: sealTurn }] }]} />
      <Icon name={item.icon} size={22} color={selected ? '#FFF9EF' : '#6F675B'} />
      {badge > 0 && <View style={S.navBadge}><Text style={S.navBadgeText}>{badge > 9 ? '9+' : badge}</Text></View>}
    </Animated.View>
    <View style={S.navLabelWrap}>
      <Text numberOfLines={1} style={[S.navLabel, selected && S.navLabelSelected]}>{item.title}</Text>
      <Animated.Image accessible={false} source={NAV_UNDERLINE} resizeMode="stretch" style={[S.navUnderline, { opacity: progress }]} />
    </View>
  </Pressable>;
}

type PopupAnimation = {
  opacity: Animated.Value;
  translateY: number | Animated.AnimatedInterpolation<string | number> | Animated.Value;
  scale: Animated.AnimatedInterpolation<string | number> | Animated.Value;
};

function usePopupAnimation(reduced: boolean): [PopupAnimation, (onDone?: () => void) => void] {
  const progress = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: reduced ? 160 : 240, easing: Easing.out(Easing.cubic), useNativeDriver });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, useNativeDriver]);
  const close = useCallback((onDone?: () => void) => {
    Animated.timing(progress, { toValue: 0, duration: reduced ? 160 : 220, easing: Easing.in(Easing.cubic), useNativeDriver }).start(({ finished }) => { if (finished) onDone?.(); });
  }, [progress, reduced, useNativeDriver]);
  return [{ opacity: progress, translateY: reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }), scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }, close];
}

function PopupClose({ onPress }: { onPress: () => void }) {
  return <Pressable plate="round" artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={onPress} style={S.popupClose}><Text style={S.popupCloseText}>×</Text></Pressable>;
}

function PopupRoot({ children, style, modalLabel }: { children: React.ReactNode; style?: object; modalLabel?: string }) {
  return <View style={[S.popupRoot, style]} accessible={!!modalLabel} accessibilityLabel={modalLabel} accessibilityViewIsModal={!!modalLabel} role={modalLabel ? 'dialog' : undefined} aria-modal={modalLabel ? true : undefined}>
    <View pointerEvents="auto" style={S.popupScrim} />
    {children}
  </View>;
}

function usePopupBackHandler(onBack: () => void) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    if (Platform.OS !== 'web' || typeof window === 'undefined') return () => subscription.remove();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onBack();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      subscription.remove();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onBack]);
}

const HOME_WIDGET_META: Record<HomeWidgetId, { title: string; note: string; icon: React.ComponentProps<typeof Icon>['name'] }> = {
  goshuin: { title: '御朱印', note: 'ご縁の記録', icon: 'flower-outline' },
  miniature: { title: '毎日おみくじ', note: '一日一度のご縁', icon: 'document-text-outline' },
  map: { title: '巡礼マップ', note: '次の場所へ', icon: 'map-outline' },
  steps: { title: '歩数', note: '今日のあしあと', icon: 'footsteps-outline' },
};

type HomeCustomizationPopupProps = {
  order: HomeWidgetOrder;
  items: HomeWidgetItems;
  shrines: Shrine[];
  ownedGoshuinIds: string[];
  ownedMiniatureIds: string[];
  latest: Shrine;
  background: ImageSourcePropType;
  onSave: (order: HomeWidgetOrder) => void;
  onSaveItems: (items: HomeWidgetItems) => void;
  onDragTarget: (slot: 0 | 1 | null) => void;
  onClose: () => void;
};

export function HomeCustomizationPopup({ order, items, shrines, ownedGoshuinIds, ownedMiniatureIds, latest, background, onSave, onSaveItems, onDragTarget, onClose }: HomeCustomizationPopupProps) {
  const reduced = useReducedMotion();
  const [animation, closeAnimation] = usePopupAnimation(reduced);
  const [draft, setDraft] = useState<HomeWidgetOrder>([...order] as HomeWidgetOrder);
  const [draftItems, setDraftItems] = useState<HomeWidgetItems>([...items]);
  const [pendingItem, setPendingItem] = useState<HomeWidgetItems>([...items]);
  const [pickerSlot, setPickerSlot] = useState<0 | 1 | null>(null);
  const { width: viewportWidth } = useWindowDimensions();
  const openItemPicker = (slot: 0 | 1) => {
    setPendingItem([...draftItems] as HomeWidgetItems);
    setPickerSlot(slot);
  };
  const placeWidget = (widget: CustomHomeWidgetId, slot: 0 | 1) => {
    if (widget === 'goshuin') openItemPicker(slot);
    setDraft(current => {
      const next = setHomeWidgetSlot(current, slot, widget);
      onSave(next);
      return next;
    });
  };
  const closePopup = useCallback(() => closeAnimation(onClose), [closeAnimation, onClose]);
  const chooseItem = (slot: 0 | 1, shrineId: string) => {
    const next: HomeWidgetItems = [...draftItems] as HomeWidgetItems;
    next[slot] = shrineId;
    setDraftItems(next); setPendingItem(next); onSaveItems(next); onDragTarget(null);
  };
  usePopupBackHandler(closePopup);
  const renderWidgetArtwork = (id: CustomHomeWidgetId) => {
    if (id === 'goshuin') return <HomeGoshuinArtwork source={STAMP_IMAGES[latest.id]} background={background} />;
    if (id === 'miniature') return <HomeOmikujiArtwork fortune={null} petName="選んだモビー" />;
    return <HomeMapArtwork />;
  };

  return <PopupRoot style={[S.customRoot, FULL_POPUP_BOUNDS, FIXED_POPUP_ROOT]}>
    <Animated.View style={[S.popupCard, S.customCard, { opacity: animation.opacity, transform: [{ translateY: animation.translateY }, { scale: animation.scale }] }]}>
      <WashiArt />
      <View style={S.popupHeader}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={S.popupTitle}>ホーム画面カスタム</Text></View><PopupClose onPress={closePopup} /></View>
      <Text style={S.popupHelp}>{pickerSlot === null ? 'カードを下へドラッグしてホームに配置' : `${pickerSlot === 0 ? '左' : '右'}カードに表示する寺社を選択`}</Text>
      {pickerSlot !== null ? <ScrollView horizontal style={S.customScroll} contentContainerStyle={S.customScrollContent} showsHorizontalScrollIndicator={false}>
        {draft[pickerSlot] === 'goshuin' && ownedGoshuinIds.length === 0 && <View style={S.emptyMiniatures}><Icon name="lock-closed-outline" size={20} color={C.muted} /><Text style={S.emptyMiniaturesText}>所持している御朱印はまだありません</Text></View>}
        {draft[pickerSlot] === 'miniature' && ownedMiniatureIds.length === 0 && <View style={S.emptyMiniatures}><Icon name="lock-closed-outline" size={20} color={C.muted} /><Text style={S.emptyMiniaturesText}>所持しているミニチュアはまだありません</Text></View>}
        {shrines.map(shrine => {
          const widget = draft[pickerSlot];
          const source = widget === 'goshuin' ? STAMP_IMAGES[shrine.id] : COLLECTION_KEYCHAINS[shrine.id as keyof typeof COLLECTION_KEYCHAINS];
          if (!source || (widget === 'goshuin' && !ownedGoshuinIds.includes(shrine.id)) || (widget === 'miniature' && !ownedMiniatureIds.includes(shrine.id))) return null;
          const selected = (pendingItem[pickerSlot] ?? draftItems[pickerSlot]) === shrine.id;
          const itemDrag = new Animated.ValueXY();
          const itemResponder = PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 7 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
            onPanResponderMove: (_, gesture) => { itemDrag.setValue({ x: gesture.dx, y: gesture.dy }); onDragTarget(pickerSlot); },
            onPanResponderRelease: (_, gesture) => { if (gesture.dy > 60) chooseItem(pickerSlot, shrine.id); else onDragTarget(null); Animated.spring(itemDrag, { toValue: { x: 0, y: 0 }, useNativeDriver: Platform.OS !== 'web' }).start(); },
            onPanResponderTerminate: () => { onDragTarget(null); Animated.spring(itemDrag, { toValue: { x: 0, y: 0 }, useNativeDriver: Platform.OS !== 'web' }).start(); },
          });
          return <Animated.View key={shrine.id} {...itemResponder.panHandlers} style={{ transform: itemDrag.getTranslateTransform() }}><Pressable artwork={false} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${shrine.name}を選択`} accessibilityHint="タップでホームカードに反映します。下へドラッグでも反映できます" onPress={() => chooseItem(pickerSlot, shrine.id)} style={[S.itemChoice, selected && S.widgetTileSelected]}><Image source={source} contentFit="contain" style={S.itemChoiceImage} /><Text numberOfLines={1} style={S.itemChoiceName}>{shrine.name}</Text></Pressable></Animated.View>;
        })}
      </ScrollView> : <View style={S.widgetGridFixed}>
          {CUSTOM_HOME_WIDGET_IDS.map(id => {
            const meta = HOME_WIDGET_META[id];
            const selectedIndex = draft.indexOf(id);
            const selected = selectedIndex >= 0;
            const drag = new Animated.ValueXY();
            const responder = PanResponder.create({
              onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 7 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
              onPanResponderMove: (_, gesture) => { drag.setValue({ x: gesture.dx, y: gesture.dy }); onDragTarget(gesture.moveX < viewportWidth / 2 ? 0 : 1); },
              onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > 60) placeWidget(id, gesture.moveX < viewportWidth / 2 ? 0 : 1);
                onDragTarget(null);
                Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: Platform.OS !== 'web' }).start();
              },
              onPanResponderTerminate: () => { onDragTarget(null); Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: Platform.OS !== 'web' }).start(); },
            });
            return <Animated.View key={id} {...responder.panHandlers} style={[S.widgetTile, selected && S.widgetTileSelected, { transform: drag.getTranslateTransform() }]}>
              <Pressable artwork={false} accessibilityRole="button" accessibilityLabel={`${meta.title}${selected ? `。ホームの${selectedIndex === 0 ? '左' : '右'}に表示中` : ''}`} accessibilityHint="下へドラッグしてホームに配置します" onPress={() => { if (selected && id === 'goshuin') openItemPicker(selectedIndex as 0 | 1); }} style={S.widgetTilePressable}>
              <View pointerEvents="none" style={S.widgetTileArtwork}>
                <View style={[S.widgetTileCanvas, {
                  width: `${100 / CUSTOM_WIDGET_PREVIEW_SCALE}%`,
                  left: `${-((1 - CUSTOM_WIDGET_PREVIEW_SCALE) / (2 * CUSTOM_WIDGET_PREVIEW_SCALE)) * 100}%`,
                  top: -(HOME_WIDGET_CARD_HEIGHT * (1 - CUSTOM_WIDGET_PREVIEW_SCALE) / 2),
                  height: HOME_WIDGET_CARD_HEIGHT,
                  transform: [{ scale: CUSTOM_WIDGET_PREVIEW_SCALE }],
                }]}>
                  {renderWidgetArtwork(id)}
                </View>
              </View>
              {selected && <SlicedArt name="focusFrame" corner={14} />}
              {selected && <View style={S.widgetCheck}><Icon name="checkmark" size={12} color="#FFF" /></View>}
              </Pressable>
            </Animated.View>;
          })}
      </View>}
      <View style={S.popupFooter}><Pressable plate="primary" artwork={false} accessibilityRole="button" accessibilityLabel="完了" onPress={closePopup} style={[S.popupFooterButton, S.popupFooterPrimary]}><Text style={S.popupFooterPrimaryText}>完了</Text></Pressable></View>
    </Animated.View>
  </PopupRoot>;
}

type MobyPickerPopupProps = {
  selectedPet: PetId;
  /** When given, a Mobby the player has not met yet is shown locked and cannot be chosen. */
  isOwned?: (pet: PetId) => boolean;
  /** Opens the box-opening screen. Hidden during the first pick. */
  onGacha?: () => void;
  freePulls?: number;
  onConfirm: (pet: PetId) => void;
  onClose: () => void;
  guided?: boolean;
};

export function MobyPickerPopup({ selectedPet, isOwned, onGacha, freePulls = 0, onConfirm, onClose, guided = false }: MobyPickerPopupProps) {
  const reduced = useReducedMotion();
  const [animation, closeAnimation] = usePopupAnimation(reduced);
  const [draftPet, setDraftPet] = useState<PetId>(selectedPet);
  const [guideStage, setGuideStage] = useState<'choose' | 'confirm'>('choose');
  const [tutorialRect, setTutorialRect] = useState<TutorialRect | null>(null);
  const closePopup = useCallback(() => { if (!guided) closeAnimation(onClose); }, [closeAnimation, guided, onClose]);
  usePopupBackHandler(closePopup);

  return <PopupRoot style={[S.mobyRoot, FULL_POPUP_BOUNDS, FIXED_POPUP_ROOT]}>
    <Animated.View style={[S.popupCard, S.mobyCard, guided && S.guidedMobyCard, !!onGacha && !guided && S.mobyCardWithGacha, { opacity: animation.opacity, transform: [{ translateY: animation.translateY }, { scale: animation.scale }] }]}>
      <WashiArt />
      <View style={S.popupHeader}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={S.popupTitle}>モビーを選ぶ</Text><Text style={S.popupSubtitle}>いっしょに歩く相棒を選択</Text></View>{!guided && !!onGacha && <Pressable plate="secondary" artwork={false} accessibilityRole="button" accessibilityLabel={freePulls > 0 ? `ガチャでモビーに出会う。無料で引けるのは${freePulls}回` : 'ガチャでモビーに出会う'} onPress={() => closeAnimation(onGacha)} style={S.gachaPill}><Text style={S.gachaPillText}>ガチャ{freePulls > 0 ? ` · 無料${freePulls}` : ''}</Text></Pressable>}{!guided && <PopupClose onPress={closePopup} />}</View>
      <TutorialTarget active={guided && guideStage === 'choose'} onRectChange={setTutorialRect} style={[S.mobyScroll, guided && guideStage === 'choose' && S.guidedMobyTarget]}>
        <ScrollView horizontal contentContainerStyle={S.mobyGrid} showsHorizontalScrollIndicator={false} directionalLockEnabled>
          {PET_CHARACTERS.map(pet => {
            const selected = draftPet === pet.id;
            const locked = !!isOwned && !isOwned(pet.id);
            return <Pressable key={pet.id} artwork={false} disabled={locked} accessibilityRole="radio" accessibilityLabel={`${pet.name}。${locked ? 'まだ出会っていません' : pet.catchphrase}`} accessibilityState={{ selected, disabled: locked }} onPress={() => { setDraftPet(pet.id); if (guided) { setTutorialRect(null); setGuideStage('confirm'); } }} style={[S.mobyCardOption, selected && S.mobyCardOptionActive, locked && S.mobyCardOptionLocked]}>
              <Image source={PET_BACKGROUNDS[pet.id]} style={S.mobyCardBackdrop} contentFit="cover" pointerEvents="none" /><View pointerEvents="none" style={S.mobyCardWash} /><View pointerEvents="none" style={[S.mobyCardTint, { backgroundColor: pet.accent + '35' }]} />
              <Image source={pet.image} style={S.mobyThumb} contentFit="contain" /><Text style={S.mobyName}>{pet.name}</Text><Text numberOfLines={1} style={S.mobyCatchphrase}>{pet.catchphrase}</Text>{selected && <SlicedArt name="focusFrame" corner={14} />}{selected && <View style={S.mobyCheck}><Icon name="checkmark" size={12} color="#FFF" /></View>}
              {locked && <LockTag size={38} style={S.mobyLockTag} />}
            </Pressable>;
          })}
        </ScrollView>
      </TutorialTarget>
      <View style={S.popupFooter}>
        {!guided && <Pressable plate="secondary" artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={closePopup} style={[S.popupFooterButton, S.popupFooterSecondary]}><Text style={S.popupFooterSecondaryText}>閉じる</Text></Pressable>}
        <TutorialTarget active={guided && guideStage === 'confirm'} onRectChange={setTutorialRect} style={guided && S.guidedMobyConfirmTarget}>
          <Pressable plate="primary" artwork={false} accessibilityRole="button" accessibilityLabel="決定" onPress={() => closeAnimation(() => onConfirm(draftPet))} style={[S.popupFooterButton, S.popupFooterPrimary, guided && S.guidedMobyConfirmButton]}><Text style={S.popupFooterPrimaryText}>決定</Text></Pressable>
        </TutorialTarget>
      </View>
    </Animated.View>
    {guided && <TutorialSpotlightOverlay targetRect={tutorialRect} step={guideStage === 'choose' ? '3 / 9' : '4 / 9'} title={guideStage === 'choose' ? '相棒にしたいモビーを選ぼう' : '選んだモビーを決定しよう'} detail={guideStage === 'choose' ? '好きな子のカードをタップ。左右にスワイプできます' : '画面右下の「決定」ボタンをタップ'} />}
  </PopupRoot>;
}

const S = StyleSheet.create({
  navShell: { position: 'relative', zIndex: 40, marginHorizontal: 12, marginBottom: 8 },
  primaryNavFrame: { paddingTop: 12, paddingBottom: 5, overflow: 'hidden' },
  primaryNav: { flexDirection: 'row' },
  navItem: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  navIconWrap: { width: 42, height: 40, alignItems: 'center', justifyContent: 'center' },
  navBadge: { position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red },
  navBadgeText: { color: '#FFF9EF', fontSize: 10, fontWeight: '700', lineHeight: 12 },
  navInk: { position: 'absolute', width: 42, height: 42 },
  navLabelWrap: { alignItems: 'center', marginTop: 1 },
  navLabel: { fontFamily: BRUSH, fontSize: 11, letterSpacing: .4, color: '#6F675B' },
  navLabelSelected: { color: C.red },
  navUnderline: { width: 34, height: 6, marginTop: -1 },
  popupRoot: { position: 'absolute', left: 0, right: 0, top: 86, bottom: 77, zIndex: 30, alignItems: 'center' },
  customRoot: { justifyContent: 'flex-start', zIndex: 90 },
  mobyCardOptionLocked: { opacity: .55 },
  gachaPill: { minHeight: 42, paddingHorizontal: 14, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1E6D8', borderWidth: 1, borderColor: '#C7A98A' },
  gachaPillText: { color: C.red, fontFamily: BRUSH, fontSize: 14 },
  mobyLockTag: { position: 'absolute', right: 8, bottom: 40 },
  mobyRoot: { justifyContent: 'flex-start', zIndex: 90 },
  popupScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2B241A10' },
  popupCard: { width: '94%', maxWidth: 440, overflow: 'hidden' },
  customCard: { position: 'absolute', height: 310, top: 92, padding: 16, overflow: 'visible' },
  mobyCard: { position: 'absolute', height: 252, bottom: 86, padding: 16 },
  guidedMobyCard: { height: 320 },
  // The gacha button narrows the heading, so its subtitle wraps to a second line.
  mobyCardWithGacha: { height: 280 },
  guidedMobyTarget: { borderWidth: 2, borderColor: '#D3A752', borderRadius: 17, padding: 5 },
  guidedMobyConfirmTarget: { padding: 5, borderRadius: 16 },
  guidedMobyConfirmButton: { borderWidth: 3, borderColor: '#E6C171', shadowColor: '#8B6135', shadowOpacity: .46, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 8 },
  popupHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  popupTitle: { color: C.ink, fontFamily: BRUSH, fontSize: 21, letterSpacing: 1 },
  popupSubtitle: { color: C.muted, fontSize: 12, letterSpacing: .8, marginTop: 5 },
  popupHelp: { color: C.red, fontSize: 12, letterSpacing: 1, marginTop: 17, marginBottom: 9 },
  popupClose: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1E6D8', borderWidth: 1, borderColor: '#DECDBA' },
  popupCloseText: { fontSize: 28, lineHeight: 29, color: C.red, fontFamily: 'Shippori', fontWeight: '400' },
  customScroll: { flexGrow: 0, minHeight: 0, overflow: 'visible' },
  customScrollContent: { gap: 10, paddingHorizontal: 1, paddingVertical: 3, overflow: 'visible' },
  widgetGridFixed: { width: '100%', flexDirection: 'row', gap: 6, overflow: 'visible' },
  widgetTile: { flex: 1, aspectRatio: .78, minWidth: 0, maxHeight: 132, borderRadius: 15, padding: 0, alignItems: 'stretch', justifyContent: 'flex-start', overflow: 'visible', borderWidth: 1, borderColor: '#DCCBB9', backgroundColor: '#F6EDDF', zIndex: 3 },
  widgetTilePressable: { flex: 1, overflow: 'hidden', borderRadius: 14 },
  itemChoice: { width: 104, height: 116, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#DCCBB9', backgroundColor: '#FFF9EF', alignItems: 'center', padding: 5 },
  itemChoiceImage: { width: 84, height: 86 },
  itemChoiceName: { color: C.ink, fontFamily: BRUSH, fontSize: 11, maxWidth: 92 },
  emptyMiniatures: { width: 270, height: 116, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F3EBDD', borderWidth: 1, borderColor: '#DCCBB9' },
  emptyMiniaturesText: { color: C.muted, fontFamily: 'Shippori', fontSize: 12 },
  widgetTileSelected: { backgroundColor: '#FFF4E8' },
  widgetTileArtwork: { flex: 1, width: '100%', minHeight: 0, overflow: 'hidden' },
  widgetTileCanvas: { position: 'absolute' },
  widgetCheck: { position: 'absolute', right: 6, top: 6, backgroundColor: C.red, borderRadius: 9, width: 19, height: 19, alignItems: 'center', justifyContent: 'center' },
  popupFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 17 },
  popupFooterButton: { minWidth: 98, minHeight: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  popupFooterSecondary: { borderWidth: 1, borderColor: '#D6BFB0', backgroundColor: '#FFF9EF' },
  popupFooterPrimary: { backgroundColor: C.red },
  popupFooterSecondaryText: { color: C.red, fontFamily: BRUSH, fontSize: 14 },
  popupFooterPrimaryText: { color: '#FFF9EF', fontFamily: BRUSH, fontSize: 14 },
  mobyScroll: { flexGrow: 0, marginTop: 10 },
  mobyGrid: { flexDirection: 'row', gap: 9, paddingVertical: 3 },
  mobyCardOption: { width: 112, height: 116, alignItems: 'center', justifyContent: 'flex-end', paddingVertical: 6, paddingHorizontal: 3, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2DACC', backgroundColor: '#FFF9F0' },
  mobyCardOptionActive: { backgroundColor: '#F3E5D7', transform: [{ translateY: -3 }] },
  mobyCardBackdrop: { ...StyleSheet.absoluteFillObject, opacity: .72 },
  mobyCardWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF9E9A8' },
  mobyCardTint: { ...StyleSheet.absoluteFillObject },
  mobyThumb: { width: 74, height: 79 },
  mobyName: { color: '#675B4D', fontFamily: BRUSH, fontSize: 12, marginTop: 1, textAlign: 'center' },
  mobyCatchphrase: { color: C.muted, fontSize: 11, marginTop: 2, maxWidth: '96%', textAlign: 'center' },
  mobyCheck: { position: 'absolute', right: 6, top: 6, backgroundColor: C.red, borderRadius: 9, width: 19, height: 19, alignItems: 'center', justifyContent: 'center' },
});
