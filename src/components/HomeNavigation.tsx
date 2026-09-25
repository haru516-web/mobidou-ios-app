import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, PanResponder, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { C, Icon, Meter, Stamp, useReducedMotion } from '../components';
import { PET_CHARACTERS, type PetId } from '../petCatalog';
import { PET_BACKGROUNDS } from '../data/petBackgrounds';
import { OMIKUJI_FORTUNES } from '../data/omikuji';
import { STAMP_IMAGES, type Shrine } from '../data/shrines';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import { CUSTOM_HOME_WIDGET_IDS, setHomeWidgetSlot, type CustomHomeWidgetId, type HomeWidgetId, type HomeWidgetItems, type HomeWidgetOrder } from '../services/homePreferences';
import { WashiArt, WashiPressable as Pressable } from './Washi';
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
const NAV_BACKGROUND = require('../../assets/home-bottom-nav-washi-v1.png');

export type PrimaryTab = 'home' | 'book' | 'walk' | 'collection';

const PRIMARY_NAV_ITEMS = [
  { id: 'home', title: 'ホーム', icon: 'home-outline' },
  { id: 'book', title: '御朱印帳', icon: 'book-outline' },
  { id: 'walk', title: 'おでかけ', icon: 'footsteps-outline' },
  { id: 'collection', title: 'コレクション', icon: 'albums-outline' },
] as const;

type HomeBottomNavigationProps = {
  tab: PrimaryTab;
  onNavigate: (tab: PrimaryTab) => void;
  onOpenCustom: () => void;
  onOpenMoby: () => void;
  disabled?: boolean;
  menuActions?: readonly NavigationMenuAction[];
};

export type NavigationMenuAction = {
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  onPress: () => void;
};

function MenuGlyph({ open }: { open: boolean }) {
  return <View style={[S.menuGlyph, open && S.menuGlyphOpen]} accessibilityElementsHidden>
    {Array.from({ length: 4 }, (_, index) => <View key={index} style={[S.menuSquare, open && S.menuSquareOpen]} />)}
  </View>;
}

export function HomeBottomNavigation({ tab, onNavigate, onOpenCustom, onOpenMoby, disabled = false, menuActions }: HomeBottomNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';
  const actions: readonly NavigationMenuAction[] = menuActions ?? [
    { label: 'ホーム画面カスタム', hint: 'ホームに表示する2項目を選びます', icon: 'grid-outline', onPress: onOpenCustom },
    { label: 'モビーを選ぶ', hint: 'いっしょに歩く相棒を選びます', icon: 'paw-outline', onPress: onOpenMoby },
  ];

  useEffect(() => { setMenuOpen(false); }, [tab, disabled]);

  useEffect(() => {
    if (menuOpen) setMenuVisible(true);
    const animation = Animated.timing(progress, {
      toValue: menuOpen ? 1 : 0,
      duration: reduced ? 160 : 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    });
    animation.start(({ finished }) => { if (finished && !menuOpen) setMenuVisible(false); });
    return () => animation.stop();
  }, [menuOpen, progress, reduced, useNativeDriver]);

  const chooseAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const menuActionStyle = () => ({
    opacity: progress,
    transform: [
      { translateX: reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
    ],
  });

  return <View style={S.navShell} pointerEvents={disabled ? 'none' : 'auto'} accessibilityElementsHidden={disabled} aria-hidden={disabled ? true : undefined} importantForAccessibility={disabled ? 'no-hide-descendants' : 'auto'}>
    {menuVisible && <Animated.View pointerEvents={menuOpen ? 'auto' : 'none'} accessibilityElementsHidden={!menuOpen} importantForAccessibility={menuOpen ? 'auto' : 'no-hide-descendants'} style={[S.actionArc, actions.length > 2 && S.actionArcFour, menuActionStyle()]}>
      {actions.map(action => <View key={action.label} style={[S.actionSlot, actions.length > 2 && S.actionSlotFour]}>
        <Pressable artwork={false} accessibilityRole="button" accessibilityLabel={action.label} accessibilityHint={action.hint} onPress={() => chooseAction(action.onPress)} style={[S.actionButton, actions.length > 2 && S.actionButtonFour, CONTINUOUS_CORNER]}>
          <Icon name={action.icon} size={18} color={C.red} /><Text style={S.actionText}>{action.label}</Text>
        </Pressable>
      </View>)}
    </Animated.View>}
    <View style={S.navRow}>
      <Animated.View style={[S.primaryNavFrame, CONTINUOUS_CORNER, menuOpen && S.primaryNavFrameOpen]}>
      <Image source={NAV_BACKGROUND} contentFit="cover" style={S.navBackground} pointerEvents="none" />
      <View style={S.primaryNav}>
        {PRIMARY_NAV_ITEMS.map(item => <Pressable key={item.id} artwork={false} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{ selected: tab === item.id }} onPress={() => { setMenuOpen(false); onNavigate(item.id); }} style={S.navItem}>
          <Icon name={item.icon} size={22} color={tab === item.id ? C.red : '#81796D'} />
          <View style={[S.navIndicator, { opacity: tab === item.id ? 1 : 0 }]} />
        </Pressable>)}
      </View>
      </Animated.View>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="メニュー" accessibilityState={{ expanded: menuOpen }} accessibilityHint={menuOpen ? 'メニューを閉じます' : `${actions.map(action => action.label).join('、')}を表示します`} onPress={() => setMenuOpen(open => !open)} style={[S.menuButton, CONTINUOUS_CORNER, menuOpen && S.menuButtonOpen]}>
        <MenuGlyph open={menuOpen} />
      </Pressable>
    </View>
  </View>;
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
  return <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={onPress} style={S.popupClose}><Text style={S.popupCloseText}>×</Text></Pressable>;
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
  selectedPetId: PetId;
  selectedPetImage: ImageSourcePropType;
  background: ImageSourcePropType;
  routeSteps: number;
  progress: number;
  nextPointSteps: number | null;
  onSave: (order: HomeWidgetOrder) => void;
  onSaveItems: (items: HomeWidgetItems) => void;
  onDragTarget: (slot: 0 | 1 | null) => void;
  onClose: () => void;
};

export function HomeCustomizationPopup({ order, items, shrines, ownedGoshuinIds, ownedMiniatureIds, latest, selectedPetId, selectedPetImage, background, routeSteps, progress, nextPointSteps, onSave, onSaveItems, onDragTarget, onClose }: HomeCustomizationPopupProps) {
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
    if (id === 'miniature') return <HomeOmikujiArtwork fortune={OMIKUJI_FORTUNES[0]} petName="選んだモビー" />;
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
              {selected && <View style={S.widgetCheck}><Icon name="checkmark" size={12} color="#FFF" /></View>}
              </Pressable>
            </Animated.View>;
          })}
      </View>}
      <View style={S.popupFooter}><Pressable artwork={false} accessibilityRole="button" accessibilityLabel="完了" onPress={closePopup} style={[S.popupFooterButton, S.popupFooterPrimary]}><Text style={S.popupFooterPrimaryText}>完了</Text></Pressable></View>
    </Animated.View>
  </PopupRoot>;
}

type MobyPickerPopupProps = {
  selectedPet: PetId;
  onConfirm: (pet: PetId) => void;
  onClose: () => void;
  guided?: boolean;
};

export function MobyPickerPopup({ selectedPet, onConfirm, onClose, guided = false }: MobyPickerPopupProps) {
  const reduced = useReducedMotion();
  const [animation, closeAnimation] = usePopupAnimation(reduced);
  const [draftPet, setDraftPet] = useState<PetId>(selectedPet);
  const [guideStage, setGuideStage] = useState<'choose' | 'confirm'>('choose');
  const [tutorialRect, setTutorialRect] = useState<TutorialRect | null>(null);
  const closePopup = useCallback(() => { if (!guided) closeAnimation(onClose); }, [closeAnimation, guided, onClose]);
  usePopupBackHandler(closePopup);

  return <PopupRoot style={[S.mobyRoot, FULL_POPUP_BOUNDS, FIXED_POPUP_ROOT]}>
    <Animated.View style={[S.popupCard, S.mobyCard, guided && S.guidedMobyCard, { opacity: animation.opacity, transform: [{ translateY: animation.translateY }, { scale: animation.scale }] }]}>
      <WashiArt />
      <View style={S.popupHeader}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={S.popupTitle}>モビーを選ぶ</Text><Text style={S.popupSubtitle}>いっしょに歩く相棒を選択</Text></View>{!guided && <PopupClose onPress={closePopup} />}</View>
      <TutorialTarget active={guided && guideStage === 'choose'} onRectChange={setTutorialRect} style={[S.mobyScroll, guided && guideStage === 'choose' && S.guidedMobyTarget]}>
        <ScrollView horizontal contentContainerStyle={S.mobyGrid} showsHorizontalScrollIndicator={false} directionalLockEnabled>
          {PET_CHARACTERS.map(pet => {
            const selected = draftPet === pet.id;
            return <Pressable key={pet.id} artwork={false} accessibilityRole="radio" accessibilityLabel={`${pet.name}。${pet.catchphrase}`} accessibilityState={{ selected }} onPress={() => { setDraftPet(pet.id); if (guided) { setTutorialRect(null); setGuideStage('confirm'); } }} style={[S.mobyCardOption, selected && S.mobyCardOptionActive]}>
              <Image source={PET_BACKGROUNDS[pet.id]} style={S.mobyCardBackdrop} contentFit="cover" pointerEvents="none" /><View pointerEvents="none" style={S.mobyCardWash} /><View pointerEvents="none" style={[S.mobyCardTint, { backgroundColor: pet.accent + '35' }]} />
              <Image source={pet.image} style={S.mobyThumb} contentFit="contain" /><Text style={S.mobyName}>{pet.name}</Text><Text numberOfLines={1} style={S.mobyCatchphrase}>{pet.catchphrase}</Text>{selected && <View style={S.mobyCheck}><Icon name="checkmark" size={12} color="#FFF" /></View>}
            </Pressable>;
          })}
        </ScrollView>
      </TutorialTarget>
      <View style={S.popupFooter}>
        {!guided && <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={closePopup} style={[S.popupFooterButton, S.popupFooterSecondary]}><Text style={S.popupFooterSecondaryText}>閉じる</Text></Pressable>}
        <TutorialTarget active={guided && guideStage === 'confirm'} onRectChange={setTutorialRect} style={guided && S.guidedMobyConfirmTarget}>
          <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="決定" onPress={() => closeAnimation(() => onConfirm(draftPet))} style={[S.popupFooterButton, S.popupFooterPrimary, guided && S.guidedMobyConfirmButton]}><Text style={S.popupFooterPrimaryText}>決定</Text></Pressable>
        </TutorialTarget>
      </View>
    </Animated.View>
    {guided && <TutorialSpotlightOverlay targetRect={tutorialRect} step={guideStage === 'choose' ? '3 / 6' : '4 / 6'} title={guideStage === 'choose' ? '相棒にしたいモビーを選ぼう' : '選んだモビーを決定しよう'} detail={guideStage === 'choose' ? '好きな子のカードをタップ。左右にスワイプできます' : '画面右下の「決定」ボタンをタップ'} />}
  </PopupRoot>;
}

type HomeWidgetPopupProps = {
  widget: HomeWidgetId;
  latest: Shrine;
  latestReward?: boolean;
  routeImage: React.ComponentProps<typeof Image>['source'];
  routeName?: string;
  routeSubtitle?: string;
  routeSteps: number;
  nextTarget: number;
  nextName?: string;
  rewardCount: number;
  routeTotal: number;
  completed: boolean;
  onOpenGoshuinDetail: () => void;
  onOpenGoshuinBook: () => void;
  onOpenRoutePicker: () => void;
  onOpenMap: () => void;
  onOpenSteps: () => void;
  onClose: () => void;
};

/**
 * A non-navigating, enlarged presentation of one of the two home cards.
 * The full-screen root intentionally has no scrim press handler: tapping the
 * background is inert, while the explicit close button and back/escape are
 * the only dismissal paths.
 */
export function HomeWidgetPopup({
  widget,
  latest,
  latestReward = false,
  routeImage,
  routeName,
  routeSubtitle,
  routeSteps,
  nextTarget,
  nextName,
  rewardCount,
  routeTotal,
  completed,
  onOpenGoshuinDetail,
  onOpenGoshuinBook,
  onOpenRoutePicker,
  onOpenMap,
  onOpenSteps,
  onClose,
}: HomeWidgetPopupProps) {
  const reduced = useReducedMotion();
  const [animation, closeAnimation] = usePopupAnimation(reduced);
  const closePopup = useCallback(() => closeAnimation(onClose), [closeAnimation, onClose]);
  usePopupBackHandler(closePopup);

  const runAction = useCallback((action: () => void) => {
    closeAnimation(() => {
      onClose();
      action();
    });
  }, [closeAnimation, onClose]);

  const meta = HOME_WIDGET_META[widget];
  const routeLabel = routeName ?? '巡礼の道';
  const routeCount = `${rewardCount}/${Math.max(1, routeTotal)}`;
  const progressRatio = routeSteps / Math.max(1, nextTarget);

  const content = widget === 'goshuin' ? <>
    <Text style={S.widgetPopupEyebrow}>{latestReward ? '最近授かった御朱印' : 'はじめてのご縁'}</Text>
    <View style={S.widgetPopupStampWrap}><Stamp shrine={latest} style={S.widgetPopupStamp} /></View>
    <Text style={S.widgetPopupReading}>{latest.reading}</Text>
    <Text style={S.widgetPopupName}>{latest.name}</Text>
    <Text style={S.widgetPopupTheme}>{latest.theme}</Text>
    <Text style={S.widgetPopupDescription}>{latest.description}</Text>
    <View style={S.widgetPopupMeta}><Icon name="location-outline" size={18} color={C.gold} /><Text style={S.widgetPopupMetaText}>{latest.place}</Text></View>
    <View style={S.widgetPopupMeta}><Icon name="leaf-outline" size={18} color={C.gold} /><Text style={S.widgetPopupMetaText}>{latest.blessing}</Text></View>
  </> : widget === 'miniature' ? <>
    <View style={S.widgetPopupImageFrame}>
      <Image source={routeImage} contentFit="cover" style={S.widgetPopupImage} />
      <View pointerEvents="none" style={S.widgetPopupImageWash} />
      <View pointerEvents="none" style={S.widgetPopupImageCopy}><Text style={S.widgetPopupImageRoute}>{routeLabel}</Text><Text style={S.widgetPopupImageNote}>{routeCount} · {routeSubtitle ?? '一緒に歩く旅の景色を選択'}</Text></View>
    </View>
    <Text style={S.widgetPopupLead}>今の旅を、景色ごと選び直せます。</Text>
    <Text style={S.widgetPopupDescription}>巡礼の型や道の長さを変えても、これまでの歩みはそれぞれの旅に残ります。</Text>
  </> : widget === 'map' ? <>
    <View style={S.widgetPopupImageFrame}>
      <Image source={routeImage} contentFit="cover" style={S.widgetPopupImage} />
      <View pointerEvents="none" style={[S.widgetPopupImageWash, S.widgetPopupMapWash]} />
      <View pointerEvents="none" style={S.widgetPopupImageCopy}><Text style={S.widgetPopupImageRoute}>{routeLabel}</Text><Text style={S.widgetPopupImageNote}>{routeCount} · 歩いた場所と次のご縁</Text></View>
    </View>
    <View style={S.widgetPopupMeta}><Icon name="map-outline" size={19} color={C.gold} /><Text style={S.widgetPopupMetaText}>{nextName ? `次は ${nextName}` : '次のご縁をマップで探す'}</Text></View>
    <Text style={S.widgetPopupDescription}>巡礼マップでは、道のりと御朱印の順番をひとつの景色として確認できます。</Text>
  </> : <>
    <Text style={S.widgetPopupEyebrow}>今日のあしあと</Text>
    <View style={S.widgetPopupStepValueRow}><Text style={S.widgetPopupStepValue}>{routeSteps.toLocaleString('ja-JP')}</Text><Text style={S.widgetPopupStepUnit}>歩</Text></View>
    <Meter value={progressRatio} />
    <Text style={S.widgetPopupStepCaption}>{nextName ? `次のご縁「${nextName}」まで ${Math.max(0, nextTarget - routeSteps).toLocaleString('ja-JP')}歩` : completed ? 'この巡礼を結願しました。' : '今日のご縁が、すべて結ばれました。'}</Text>
    <View style={S.widgetPopupRouteSummary}><Icon name="map-outline" size={19} color={C.gold} /><View style={{ flex: 1 }}><Text style={S.widgetPopupRouteName}>{routeLabel}</Text><Text style={S.widgetPopupRouteNote}>{routeSubtitle ?? '一緒に歩く旅の景色'}</Text></View></View>
    <Text style={S.widgetPopupDescription}>おでかけ画面では、歩数の連携・更新と、次の御朱印までの目安を確認できます。</Text>
  </>;

  return <PopupRoot modalLabel={widget === 'steps' ? '歩数の拡大表示' : `${meta.title}の拡大表示`} style={[S.widgetPopupRoot, FIXED_POPUP_ROOT]}>
    <Animated.View style={[S.popupCard, S.widgetPopupCard, CONTINUOUS_CORNER, { opacity: animation.opacity, transform: [{ translateY: animation.translateY }, { scale: animation.scale }] }]}>
      <WashiArt />
      <View style={S.popupHeader}><View style={{ flex: 1 }}>{widget !== 'steps' && <Text accessibilityRole="header" style={S.popupTitle}>{meta.title}</Text>}<Text style={S.popupSubtitle}>{widget === 'steps' ? '今日のあしあと' : 'ホームカードを大きく表示'}</Text></View><PopupClose onPress={closePopup} /></View>
      <ScrollView style={S.widgetPopupScroll} contentContainerStyle={S.widgetPopupBody} showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
      <View style={S.widgetPopupFooter}>
        <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={closePopup} style={[S.popupFooterButton, S.popupFooterSecondary]}><Text style={S.popupFooterSecondaryText}>閉じる</Text></Pressable>
        {widget === 'goshuin' ? <>
          <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="御朱印詳細をひらく" onPress={() => runAction(onOpenGoshuinDetail)} style={[S.popupFooterButton, S.popupFooterSecondary]}><Text style={S.popupFooterSecondaryText}>御朱印詳細</Text></Pressable>
          <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="御朱印帳へ移動" onPress={() => runAction(onOpenGoshuinBook)} style={[S.popupFooterButton, S.popupFooterPrimary]}><Text style={S.popupFooterPrimaryText}>御朱印帳へ</Text></Pressable>
        </> : widget === 'miniature' ? <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="巡礼選択をひらく" onPress={() => runAction(onOpenRoutePicker)} style={[S.popupFooterButton, S.popupFooterPrimary]}><Text style={S.popupFooterPrimaryText}>巡礼を選び直す</Text></Pressable>
          : widget === 'map' ? <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="巡礼マップをひらく" onPress={() => runAction(onOpenMap)} style={[S.popupFooterButton, S.popupFooterPrimary]}><Text style={S.popupFooterPrimaryText}>巡礼マップへ</Text></Pressable>
            : <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="おでかけ歩数をひらく" onPress={() => runAction(onOpenSteps)} style={[S.popupFooterButton, S.popupFooterPrimary]}><Text style={S.popupFooterPrimaryText}>おでかけ歩数へ</Text></Pressable>}
      </View>
    </Animated.View>
  </PopupRoot>;
}

const S = StyleSheet.create({
  navShell: { position: 'relative', zIndex: 40, marginHorizontal: 12, marginBottom: 8 },
  navRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  primaryNavFrame: { flex: 1, backgroundColor: '#FCF9F1', borderWidth: 1, borderColor: '#A87552', borderRadius: 24, paddingTop: 10, paddingBottom: 3, overflow: 'hidden' },
  primaryNavFrameOpen: { opacity: 0 },
  navBackground: { ...StyleSheet.absoluteFillObject, opacity: .88 },
  primaryNav: { flex: 1, flexDirection: 'row' },
  navItem: { flex: 1, minHeight: 55, alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 2 },
  navIndicator: { width: 17, height: 3, backgroundColor: C.red, borderRadius: 4, marginTop: 1 },
  menuButton: { width: 76, minHeight: 75, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 1, borderColor: '#A87552', backgroundColor: '#FCF9F1' },
  menuButtonOpen: { backgroundColor: '#F1E1D7', borderColor: C.red },
  menuGlyph: { width: 29, height: 29, flexDirection: 'row', flexWrap: 'wrap', gap: 3, alignContent: 'center', justifyContent: 'center', backgroundColor: 'transparent', transform: [{ rotate: '0deg' }] },
  menuGlyphOpen: { transform: [{ rotate: '45deg' }] },
  menuSquare: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5, borderColor: '#766A5D', backgroundColor: '#FFF9EF' },
  menuSquareOpen: { borderColor: C.red, backgroundColor: '#FFF1EA' },
  actionArc: { position: 'absolute', right: 84, bottom: 0, width: 158, height: 75, zIndex: 5, flexDirection: 'row', gap: 6 },
  actionArcFour: { width: 298, height: 75 },
  actionSlot: { width: 76, height: 75 },
  actionSlotFour: { width: 70 },
  actionButton: { width: 76, height: 75, minHeight: 0, borderRadius: 24, borderWidth: 1, borderColor: '#A87552', backgroundColor: '#FFF9EFD9', paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionButtonFour: { width: 70 },
  actionText: { color: C.red, fontFamily: 'Shippori', fontSize: 10, lineHeight: 14, maxWidth: 78, textAlign: 'center' },
  popupRoot: { position: 'absolute', left: 0, right: 0, top: 86, bottom: 77, zIndex: 30, alignItems: 'center' },
  customRoot: { justifyContent: 'flex-start', zIndex: 90 },
  mobyRoot: { justifyContent: 'flex-start', zIndex: 90 },
  popupScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2B241A10' },
  popupCard: { width: '94%', maxWidth: 440, borderRadius: 22, borderWidth: 1, borderColor: '#D5BDA8', backgroundColor: '#FFF9EF', overflow: 'hidden', shadowColor: '#5D4634', shadowOffset: { width: 0, height: 8 }, shadowOpacity: .22, shadowRadius: 17, elevation: 8 },
  customCard: { position: 'absolute', height: 310, top: 92, padding: 16, overflow: 'visible' },
  mobyCard: { position: 'absolute', height: 252, bottom: 86, padding: 16 },
  guidedMobyCard: { height: 320 },
  guidedMobyTarget: { borderWidth: 2, borderColor: '#D3A752', borderRadius: 17, padding: 5 },
  guidedMobyConfirmTarget: { padding: 5, borderRadius: 16 },
  guidedMobyConfirmButton: { borderWidth: 3, borderColor: '#E6C171', shadowColor: '#8B6135', shadowOpacity: .46, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 8 },
  popupHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  popupTitle: { color: C.ink, fontFamily: 'Shippori', fontSize: 21, letterSpacing: 1 },
  popupSubtitle: { color: C.muted, fontSize: 10, letterSpacing: .8, marginTop: 5 },
  popupHelp: { color: C.red, fontSize: 10, letterSpacing: 1, marginTop: 17, marginBottom: 9 },
  popupClose: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1E6D8', borderWidth: 1, borderColor: '#DECDBA' },
  popupCloseText: { fontSize: 28, lineHeight: 29, color: C.red, fontFamily: 'Shippori', fontWeight: '400' },
  customScroll: { flexGrow: 0, minHeight: 0, overflow: 'visible' },
  customScrollContent: { gap: 10, paddingHorizontal: 1, paddingVertical: 3, overflow: 'visible' },
  widgetGridFixed: { width: '100%', flexDirection: 'row', gap: 6, overflow: 'visible' },
  widgetTile: { flex: 1, aspectRatio: .78, minWidth: 0, maxHeight: 132, borderRadius: 15, padding: 0, alignItems: 'stretch', justifyContent: 'flex-start', overflow: 'visible', borderWidth: 1, borderColor: '#DCCBB9', backgroundColor: '#F6EDDF', zIndex: 3 },
  widgetTilePressable: { flex: 1, overflow: 'hidden', borderRadius: 14 },
  itemChoice: { width: 104, height: 116, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#DCCBB9', backgroundColor: '#FFF9EF', alignItems: 'center', padding: 5 },
  itemChoiceImage: { width: 84, height: 86 },
  itemChoiceName: { color: C.ink, fontFamily: 'Shippori', fontSize: 9, maxWidth: 92 },
  emptyMiniatures: { width: 270, height: 116, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F3EBDD', borderWidth: 1, borderColor: '#DCCBB9' },
  emptyMiniaturesText: { color: C.muted, fontFamily: 'Shippori', fontSize: 11 },
  widgetTileSelected: { borderWidth: 2, borderColor: C.red, backgroundColor: '#FFF4E8' },
  widgetTileArtwork: { flex: 1, width: '100%', minHeight: 0, overflow: 'hidden' },
  widgetTileCanvas: { position: 'absolute' },
  widgetIcon: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF9EF', marginBottom: 4 },
  widgetTitle: { color: C.ink, fontFamily: 'Shippori', fontSize: 10, textAlign: 'center', lineHeight: 15 },
  widgetNote: { color: C.muted, fontSize: 8, textAlign: 'center', marginTop: 2 },
  widgetCheck: { position: 'absolute', right: 6, top: 6, backgroundColor: C.red, borderRadius: 9, width: 19, height: 19, alignItems: 'center', justifyContent: 'center' },
  popupFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 17 },
  popupFooterButton: { minWidth: 98, minHeight: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  popupFooterSecondary: { borderWidth: 1, borderColor: '#D6BFB0', backgroundColor: '#FFF9EF' },
  popupFooterPrimary: { backgroundColor: C.red },
  popupFooterSecondaryText: { color: C.red, fontFamily: 'Shippori', fontSize: 12 },
  popupFooterPrimaryText: { color: '#FFF9EF', fontFamily: 'Shippori', fontSize: 12 },
  mobyScroll: { flexGrow: 0, marginTop: 10 },
  mobyGrid: { flexDirection: 'row', gap: 9, paddingVertical: 3 },
  mobyCardOption: { width: 112, height: 116, alignItems: 'center', justifyContent: 'flex-end', paddingVertical: 6, paddingHorizontal: 3, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2DACC', backgroundColor: '#FFF9F0' },
  mobyCardOptionActive: { borderColor: C.red, borderWidth: 2, backgroundColor: '#F3E5D7', transform: [{ translateY: -3 }] },
  mobyCardBackdrop: { ...StyleSheet.absoluteFillObject, opacity: .72 },
  mobyCardWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF9E9A8' },
  mobyCardTint: { ...StyleSheet.absoluteFillObject },
  mobyThumb: { width: 74, height: 79 },
  mobyName: { color: '#675B4D', fontFamily: 'Shippori', fontSize: 10, marginTop: 1, textAlign: 'center' },
  mobyCatchphrase: { color: C.muted, fontSize: 7, marginTop: 2, maxWidth: '96%', textAlign: 'center' },
  mobyCheck: { position: 'absolute', right: 6, top: 6, backgroundColor: C.red, borderRadius: 9, width: 19, height: 19, alignItems: 'center', justifyContent: 'center' },
  widgetPopupRoot: { top: 0, bottom: 0, zIndex: 90, justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 12 },
  widgetPopupCard: { width: '100%', maxWidth: 440, maxHeight: '96%', padding: 18, borderRadius: 24 },
  widgetPopupScroll: { flexGrow: 0, marginTop: 12 },
  widgetPopupBody: { paddingBottom: 4, gap: 9 },
  widgetPopupEyebrow: { color: C.red, fontSize: 10, letterSpacing: 1.2, textAlign: 'center', marginTop: 3 },
  widgetPopupStampWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 7 },
  widgetPopupStamp: { width: 190, height: 210, maxWidth: '70%' },
  widgetPopupReading: { color: C.muted, fontSize: 10, letterSpacing: 2, textAlign: 'center', marginTop: 3 },
  widgetPopupName: { color: C.ink, fontFamily: 'Shippori', fontSize: 25, letterSpacing: 1.2, textAlign: 'center' },
  widgetPopupTheme: { color: C.red, fontFamily: 'Shippori', fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 2 },
  widgetPopupLead: { color: C.ink, fontFamily: 'Shippori', fontSize: 16, lineHeight: 26, textAlign: 'center', marginTop: 5 },
  widgetPopupDescription: { color: '#6D6354', fontFamily: 'Shippori', fontSize: 11, lineHeight: 20, textAlign: 'center', marginTop: 2 },
  widgetPopupMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F3EBDD', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, marginTop: 2 },
  widgetPopupMetaText: { color: '#776B59', fontSize: 11, lineHeight: 19, flex: 1 },
  widgetPopupImageFrame: { height: 252, borderRadius: 20, overflow: 'hidden', marginTop: 4, borderWidth: 1, borderColor: '#D9C7AE', backgroundColor: '#EEE3D2' },
  widgetPopupImage: { ...StyleSheet.absoluteFillObject },
  widgetPopupImageWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2B241A45' },
  widgetPopupMapWash: { backgroundColor: '#31433655' },
  widgetPopupImageCopy: { position: 'absolute', left: 16, right: 16, bottom: 15 },
  widgetPopupImageRoute: { color: '#FFF9EF', fontFamily: 'Shippori', fontSize: 23, lineHeight: 31, textShadowColor: '#2B241A99', textShadowRadius: 4 },
  widgetPopupImageNote: { color: '#FFF9EFD9', fontSize: 10, lineHeight: 17, marginTop: 4, textShadowColor: '#2B241A99', textShadowRadius: 3 },
  widgetPopupStepValueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 7, marginTop: 7 },
  widgetPopupStepValue: { color: C.ink, fontSize: 62, fontWeight: '300', letterSpacing: 1 },
  widgetPopupStepUnit: { color: C.muted, fontFamily: 'Shippori', fontSize: 18 },
  widgetPopupStepCaption: { color: '#746959', fontSize: 12, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  widgetPopupRouteSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F3EBDD', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, marginTop: 6 },
  widgetPopupRouteName: { color: C.ink, fontFamily: 'Shippori', fontSize: 14, lineHeight: 21 },
  widgetPopupRouteNote: { color: C.muted, fontSize: 9, lineHeight: 15, marginTop: 2 },
  widgetPopupFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
});
