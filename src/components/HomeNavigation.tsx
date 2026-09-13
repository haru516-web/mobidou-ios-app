import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C, Icon, Meter, Stamp, useReducedMotion } from '../components';
import { PET_CHARACTERS, type PetId } from '../petCatalog';
import { PET_BACKGROUNDS } from '../data/petBackgrounds';
import type { Shrine } from '../data/shrines';
import { HOME_WIDGET_IDS, setHomeWidgetSlot, swapHomeWidgets, type HomeWidgetId, type HomeWidgetOrder } from '../services/homePreferences';
import { WashiArt, WashiPressable as Pressable } from './Washi';

// `borderCurve` is only supported by iOS. Keeping it out of the web/Android
// style object avoids platform warnings while preserving the same smooth
// silhouette with the shared border radii everywhere else.
const CONTINUOUS_CORNER = Platform.OS === 'ios' ? ({ borderCurve: 'continuous' } as any) : undefined;
const FIXED_POPUP_ROOT = Platform.OS === 'web' ? ({ position: 'fixed' } as any) : undefined;
const FULL_POPUP_BOUNDS = { top: 0, bottom: 0 };

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
};

function MenuGlyph({ open }: { open: boolean }) {
  return <View style={[S.menuGlyph, open && S.menuGlyphOpen]} accessibilityElementsHidden>
    {Array.from({ length: 4 }, (_, index) => <View key={index} style={[S.menuSquare, open && S.menuSquareOpen]} />)}
  </View>;
}

export function HomeBottomNavigation({ tab, onNavigate, onOpenCustom, onOpenMoby, disabled = false }: HomeBottomNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';

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

  const menuActionStyle = (side: 'left' | 'right') => ({
    opacity: progress,
    transform: [
      { translateY: reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
      { rotate: side === 'left' ? '-4deg' : '4deg' },
    ],
  });

  return <View style={S.navShell} pointerEvents={disabled ? 'none' : 'auto'} accessibilityElementsHidden={disabled} aria-hidden={disabled ? true : undefined} importantForAccessibility={disabled ? 'no-hide-descendants' : 'auto'}>
    {menuVisible && <Animated.View pointerEvents={menuOpen ? 'box-none' : 'none'} accessibilityElementsHidden={!menuOpen} importantForAccessibility={menuOpen ? 'auto' : 'no-hide-descendants'} style={S.actionArc}>
      <Animated.View style={[S.actionSlot, S.actionSlotLeft, menuActionStyle('left')]}>
        <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="ホーム画面カスタム" accessibilityHint="ホームに表示する2項目を選びます" onPress={() => chooseAction(onOpenCustom)} style={[S.actionButton, CONTINUOUS_CORNER]}>
          <Icon name="grid-outline" size={18} color={C.red} /><Text style={S.actionText}>ホーム画面カスタム</Text>
        </Pressable>
      </Animated.View>
      <Animated.View style={[S.actionSlot, S.actionSlotRight, menuActionStyle('right')]}>
        <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="モビーを選ぶ" accessibilityHint="いっしょに歩く相棒を選びます" onPress={() => chooseAction(onOpenMoby)} style={[S.actionButton, CONTINUOUS_CORNER]}>
          <Icon name="paw-outline" size={18} color={C.red} /><Text style={S.actionText}>モビーを選ぶ</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>}
    <View style={S.navRow}>
      <Animated.View style={[S.primaryNavFrame, CONTINUOUS_CORNER, menuOpen && S.primaryNavFrameOpen]}>
      <View style={S.primaryNav}>
        {PRIMARY_NAV_ITEMS.map(item => <Pressable key={item.id} artwork={false} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{ selected: tab === item.id }} onPress={() => { setMenuOpen(false); onNavigate(item.id); }} style={S.navItem}>
          <Icon name={item.icon} size={22} color={tab === item.id ? C.red : '#81796D'} />
          <Text style={[S.navText, tab === item.id && S.navTextActive]}>{item.title}</Text>
          <View style={[S.navIndicator, { opacity: tab === item.id ? 1 : 0 }]} />
        </Pressable>)}
      </View>
      </Animated.View>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="メニュー" accessibilityState={{ expanded: menuOpen }} accessibilityHint={menuOpen ? 'メニューを閉じます' : 'ホーム画面カスタムとモビーを選ぶを表示します'} onPress={() => setMenuOpen(open => !open)} style={[S.menuButton, CONTINUOUS_CORNER, menuOpen && S.menuButtonOpen]}>
        <MenuGlyph open={menuOpen} /><Text style={[S.menuText, menuOpen && S.menuTextOpen]}>メニュー</Text>
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
  miniature: { title: '巡礼ミニチュア', note: '旅の景色', icon: 'cube-outline' },
  map: { title: '巡礼マップ', note: '次の場所へ', icon: 'map-outline' },
  steps: { title: '歩数count', note: '今日のあしあと', icon: 'footsteps-outline' },
};

type HomeCustomizationPopupProps = {
  order: HomeWidgetOrder;
  onSave: (order: HomeWidgetOrder) => void;
  onClose: () => void;
};

export function HomeCustomizationPopup({ order, onSave, onClose }: HomeCustomizationPopupProps) {
  const reduced = useReducedMotion();
  const [animation, closeAnimation] = usePopupAnimation(reduced);
  const [draft, setDraft] = useState<HomeWidgetOrder>([...order] as HomeWidgetOrder);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const chooseWidget = (widget: HomeWidgetId) => {
    setDraft(current => setHomeWidgetSlot(current, activeSlot, widget));
  };
  const closePopup = useCallback(() => closeAnimation(onClose), [closeAnimation, onClose]);
  usePopupBackHandler(closePopup);

  return <PopupRoot style={[S.customRoot, FULL_POPUP_BOUNDS, FIXED_POPUP_ROOT]}>
    <Animated.View style={[S.popupCard, S.customCard, { opacity: animation.opacity, transform: [{ translateY: animation.translateY }, { scale: animation.scale }] }]}>
      <WashiArt />
      <View style={S.popupHeader}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={S.popupTitle}>ホーム画面カスタム</Text><Text style={S.popupSubtitle}>表示する2つを左右に選択</Text></View><PopupClose onPress={closePopup} /></View>
      <Text style={S.popupHelp}>表示する2つを選ぶ</Text>
      <View style={S.slotRow} accessibilityRole="radiogroup" accessibilityLabel="ホームの左右カード">
        {draft.map((id, index) => {
          const meta = HOME_WIDGET_META[id];
          const selected = activeSlot === index;
          return <Pressable key={`${id}-${index}`} artwork={false} accessibilityRole="radio" accessibilityLabel={`${index === 0 ? '左枠' : '右枠'}に${meta.title}を表示`} accessibilityState={{ selected }} accessibilityHint="この枠を選んでから、下の候補をタップします" onPress={() => setActiveSlot(index as 0 | 1)} style={[S.selectionSlot, selected && S.selectionSlotActive]}>
            <Text style={S.selectionSlotLabel}>{index === 0 ? '左枠' : '右枠'}</Text><Icon name={meta.icon} size={20} color={C.red} /><Text numberOfLines={1} style={S.selectionSlotTitle}>{meta.title}</Text>
          </Pressable>;
        })}
      </View>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="左右の枠を入れ替え" onPress={() => { setDraft(current => swapHomeWidgets(current)); setActiveSlot(slot => slot === 0 ? 1 : 0); }} style={S.swapButton}><Icon name="swap-horizontal-outline" size={16} color={C.red} /><Text style={S.swapButtonText}>左右を入れ替え</Text></Pressable>
      <Text style={S.candidateHeading}>候補（4つから選択）</Text>
      <View style={S.widgetGrid}>
        {HOME_WIDGET_IDS.map(id => {
          const meta = HOME_WIDGET_META[id];
          const selectedIndex = draft.indexOf(id);
          const selected = selectedIndex >= 0;
          return <Pressable key={id} artwork={false} accessibilityRole="radio" accessibilityLabel={`${meta.title}${selected ? `。${selectedIndex === 0 ? '左枠' : '右枠'}に選択中` : '。候補'}`} accessibilityState={{ selected }} accessibilityHint={`${selected ? 'この枠を選びます' : '現在選択中の枠に表示します'}`} onPress={() => chooseWidget(id)} style={[S.widgetTile, selected && S.widgetTileSelected]}>
            <View style={S.widgetIcon}><Icon name={meta.icon} size={21} color={C.red} /></View><Text numberOfLines={1} style={S.widgetTitle}>{meta.title}</Text><Text style={S.widgetNote}>{selected ? `${selectedIndex === 0 ? '左' : '右'}に表示中` : meta.note}</Text>{selected && <View style={S.widgetCheck}><Icon name="checkmark" size={12} color="#FFF" /></View>}
          </Pressable>;
        })}
      </View>
      <View style={S.popupFooter}><Pressable artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={closePopup} style={[S.popupFooterButton, S.popupFooterSecondary]}><Text style={S.popupFooterSecondaryText}>閉じる</Text></Pressable><Pressable artwork={false} accessibilityRole="button" accessibilityLabel="完了" onPress={() => closeAnimation(() => onSave(draft))} style={[S.popupFooterButton, S.popupFooterPrimary]}><Text style={S.popupFooterPrimaryText}>完了</Text></Pressable></View>
    </Animated.View>
  </PopupRoot>;
}

type MobyPickerPopupProps = {
  selectedPet: PetId;
  onConfirm: (pet: PetId) => void;
  onClose: () => void;
};

export function MobyPickerPopup({ selectedPet, onConfirm, onClose }: MobyPickerPopupProps) {
  const reduced = useReducedMotion();
  const [animation, closeAnimation] = usePopupAnimation(reduced);
  const [draftPet, setDraftPet] = useState<PetId>(selectedPet);
  const closePopup = useCallback(() => closeAnimation(onClose), [closeAnimation, onClose]);
  usePopupBackHandler(closePopup);

  return <PopupRoot style={[S.mobyRoot, FULL_POPUP_BOUNDS, FIXED_POPUP_ROOT]}>
    <Animated.View style={[S.popupCard, S.mobyCard, { opacity: animation.opacity, transform: [{ translateY: animation.translateY }, { scale: animation.scale }] }]}>
      <WashiArt />
      <View style={S.popupHeader}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={S.popupTitle}>モビーを選ぶ</Text><Text style={S.popupSubtitle}>いっしょに歩く相棒を選択</Text></View><PopupClose onPress={closePopup} /></View>
      <ScrollView style={S.mobyScroll} contentContainerStyle={S.mobyGrid} showsVerticalScrollIndicator={false}>
        {PET_CHARACTERS.map(pet => {
          const selected = draftPet === pet.id;
          return <Pressable key={pet.id} artwork={false} accessibilityRole="radio" accessibilityLabel={`${pet.name}。${pet.catchphrase}`} accessibilityState={{ selected }} onPress={() => setDraftPet(pet.id)} style={[S.mobyCardOption, selected && S.mobyCardOptionActive]}>
            <Image source={PET_BACKGROUNDS[pet.id]} style={S.mobyCardBackdrop} contentFit="cover" pointerEvents="none" /><View pointerEvents="none" style={S.mobyCardWash} /><View pointerEvents="none" style={[S.mobyCardTint, { backgroundColor: pet.accent + '35' }]} />
            <Image source={pet.image} style={S.mobyThumb} contentFit="contain" /><Text style={S.mobyName}>{pet.name}</Text><Text numberOfLines={1} style={S.mobyCatchphrase}>{pet.catchphrase}</Text>{selected && <View style={S.mobyCheck}><Icon name="checkmark" size={12} color="#FFF" /></View>}
          </Pressable>;
        })}
      </ScrollView>
      <View style={S.popupFooter}><Pressable artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={closePopup} style={[S.popupFooterButton, S.popupFooterSecondary]}><Text style={S.popupFooterSecondaryText}>閉じる</Text></Pressable><Pressable artwork={false} accessibilityRole="button" accessibilityLabel="決定" onPress={() => closeAnimation(() => onConfirm(draftPet))} style={[S.popupFooterButton, S.popupFooterPrimary]}><Text style={S.popupFooterPrimaryText}>決定</Text></Pressable></View>
    </Animated.View>
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

  return <PopupRoot modalLabel={`${meta.title}の拡大表示`} style={[S.widgetPopupRoot, FIXED_POPUP_ROOT]}>
    <Animated.View style={[S.popupCard, S.widgetPopupCard, CONTINUOUS_CORNER, { opacity: animation.opacity, transform: [{ translateY: animation.translateY }, { scale: animation.scale }] }]}>
      <WashiArt />
      <View style={S.popupHeader}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={S.popupTitle}>{meta.title}</Text><Text style={S.popupSubtitle}>ホームカードを大きく表示</Text></View><PopupClose onPress={closePopup} /></View>
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
  primaryNavFrame: { flex: 1, backgroundColor: '#FCF9F1', borderWidth: 1, borderColor: '#E3DACB', borderRadius: 24, paddingTop: 10, paddingBottom: 3, overflow: 'hidden' },
  primaryNavFrameOpen: { transform: [{ scaleX: 0.94 }, { scaleY: 0.9 }], opacity: 0.92 },
  primaryNav: { flex: 1, flexDirection: 'row' },
  navItem: { flex: 1, minHeight: 55, alignItems: 'center', justifyContent: 'flex-start', gap: 5, paddingHorizontal: 2 },
  navText: { color: '#81796D', fontSize: 9, letterSpacing: .3, textAlign: 'center' },
  navTextActive: { color: C.red },
  navIndicator: { width: 17, height: 3, backgroundColor: C.red, borderRadius: 4, marginTop: 1 },
  menuButton: { width: 84, minHeight: 75, alignItems: 'center', justifyContent: 'flex-start', gap: 4, paddingTop: 10, borderRadius: 24, borderWidth: 1, borderColor: '#E3DACB', backgroundColor: '#FCF9F1' },
  menuButtonOpen: { backgroundColor: '#F1E1D7', borderColor: C.red },
  menuText: { color: '#766A5D', fontFamily: 'Shippori', fontSize: 9, letterSpacing: .4 },
  menuTextOpen: { color: C.red },
  menuGlyph: { width: 29, height: 29, flexDirection: 'row', flexWrap: 'wrap', gap: 3, alignContent: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#A89480', borderRadius: 9, backgroundColor: '#FFF9EF', transform: [{ rotate: '0deg' }] },
  menuGlyphOpen: { transform: [{ rotate: '45deg' }] },
  menuSquare: { width: 10, height: 10, borderRadius: 3, borderWidth: 1.5, borderColor: '#766A5D', backgroundColor: '#FFF9EF' },
  menuSquareOpen: { borderColor: C.red, backgroundColor: '#FFF1EA' },
  actionArc: { position: 'absolute', left: 0, right: 0, bottom: 70, height: 140, zIndex: 5 },
  actionSlot: { position: 'absolute', width: 92, height: 92 },
  actionSlotLeft: { right: 102, bottom: 4 },
  actionSlotRight: { right: 0, bottom: 23 },
  actionButton: { width: 92, height: 92, minHeight: 0, borderRadius: 22, borderWidth: 1, borderColor: '#D3BBAA', backgroundColor: '#FFF9EF', paddingHorizontal: 6, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 5, shadowColor: '#6B4938', shadowOffset: { width: 0, height: 4 }, shadowOpacity: .16, shadowRadius: 7, elevation: 4 },
  actionText: { color: C.red, fontFamily: 'Shippori', fontSize: 10, lineHeight: 14, maxWidth: 78, textAlign: 'center' },
  popupRoot: { position: 'absolute', left: 0, right: 0, top: 86, bottom: 77, zIndex: 30, alignItems: 'center' },
  customRoot: { justifyContent: 'flex-start', zIndex: 90 },
  mobyRoot: { justifyContent: 'flex-start', zIndex: 90 },
  popupScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2B241A10' },
  popupCard: { width: '94%', maxWidth: 440, borderRadius: 22, borderWidth: 1, borderColor: '#D5BDA8', backgroundColor: '#FFF9EF', overflow: 'hidden', shadowColor: '#5D4634', shadowOffset: { width: 0, height: 8 }, shadowOpacity: .22, shadowRadius: 17, elevation: 8 },
  customCard: { marginTop: 18, padding: 16 },
  mobyCard: { position: 'absolute', top: 312, bottom: 5, padding: 16 },
  popupHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  popupTitle: { color: C.ink, fontFamily: 'Shippori', fontSize: 21, letterSpacing: 1 },
  popupSubtitle: { color: C.muted, fontSize: 10, letterSpacing: .8, marginTop: 5 },
  popupHelp: { color: C.red, fontSize: 10, letterSpacing: 1, marginTop: 17, marginBottom: 9 },
  popupClose: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1E6D8', borderWidth: 1, borderColor: '#DECDBA' },
  popupCloseText: { fontSize: 28, lineHeight: 29, color: C.red, fontFamily: 'Shippori', fontWeight: '400' },
  slotRow: { flexDirection: 'row', gap: 9 },
  selectionSlot: { flex: 1, minHeight: 70, borderRadius: 14, borderWidth: 1, borderColor: '#DCCBB9', backgroundColor: '#F6EDDF', padding: 8, alignItems: 'center', justifyContent: 'center', gap: 3 },
  selectionSlotActive: { borderWidth: 2, borderColor: C.red, backgroundColor: '#FFF4E8' },
  selectionSlotLabel: { color: C.red, fontSize: 9, letterSpacing: 1 },
  selectionSlotTitle: { color: C.ink, fontFamily: 'Shippori', fontSize: 10, maxWidth: '100%' },
  swapButton: { alignSelf: 'center', minHeight: 35, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12 },
  swapButtonText: { color: C.red, fontFamily: 'Shippori', fontSize: 10 },
  candidateHeading: { color: C.muted, fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  widgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'space-between' },
  widgetTile: { width: '48%', minHeight: 96, borderRadius: 15, padding: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DCCBB9', backgroundColor: '#F6EDDF' },
  widgetTileSelected: { borderWidth: 2, borderColor: C.red, backgroundColor: '#FFF4E8' },
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
  mobyScroll: { flex: 1, marginTop: 15 },
  mobyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingBottom: 4 },
  mobyCardOption: { width: '30%', minHeight: 128, alignItems: 'center', justifyContent: 'flex-end', paddingVertical: 7, paddingHorizontal: 3, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2DACC', backgroundColor: '#FFF9F0' },
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
