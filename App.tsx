import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Image } from './src/components/AppImage';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { ShipporiMincho_500Medium } from '@expo-google-fonts/shippori-mincho/500Medium';
import { ShipporiMincho_700Bold } from '@expo-google-fonts/shippori-mincho/700Bold';
import { YujiSyuku_400Regular } from '@expo-google-fonts/yuji-syuku/400Regular';
import { BRUSH, Button, C, Clouds, Companion, Icon, SERIF, Stamp, Torii } from './src/components';
import { getPetCharacter, isPetId, type PetId } from './src/petCatalog';
import { SHRINES, STAMP_IMAGES, type Shrine } from './src/data/shrines';
import { DAILY_TARGETS, creditedSteps, expandPointTargets, lapView } from './src/services/progress';
import { useJourney } from './src/services/useJourney';
import { hasStarter, ownsMobby } from './src/services/gacha';
import { DuplicateMobbies } from './src/components/DuplicateMobbies';
import { DEV_UNLOCK_ALL } from './src/services/devUnlock';
import { GachaScreen } from './src/components/GachaScreen';
import { getBackgroundOption } from './src/data/backgrounds';
import { PILGRIMAGES, getNextPilgrimageId, getPilgrimage } from './src/data/pilgrimages';
import { pilgrimageShrines, RouteMap } from './src/components/PilgrimageScreen';
import { PillText, WashiPressable as Pressable } from './src/components/Washi';
import { PilgrimageAward } from './src/components/PilgrimageAward';
import { PILGRIMAGE_WALK_ATLASES } from './src/data/pilgrimageWalkAtlases';
import { PILGRIMAGE_PEEK_IMAGES, PILGRIMAGE_PEEK_METRICS } from './src/data/pilgrimagePeekImages';
import { COLLECTION_SHRINES, CollectionGallery, type CollectionPage, type CollectionZoom } from './src/components/CollectionGallery';
import { BookPageTurn, type BookPageTurnHandle } from './src/components/BookPageTurn';
import { HomeBottomNavigation, HomeCustomizationPopup, MobyPickerPopup, type PrimaryTab } from './src/components/HomeNavigation';
import { BookIndexPopup, GoshuinBookCover } from './src/components/GoshuinBook';
import { CroppedArt } from './src/components/CroppedArt';
import { HomeGoshuinArtwork, HomeMapArtwork, HomeOmikujiArtwork, HomeStepsArtwork } from './src/components/HomeWidgetArtwork';
import { StepProgressRing } from './src/components/StepProgressRing';
import { FloatingMobby, type MobbyMenuItem, type MobbySpot } from './src/components/FloatingMobby';
import { PopButton } from './src/components/PopButton';
import { HomeStatusBar } from './src/components/HomeStatusBar';
import { FeatureTour, TourAnchor } from './src/components/FeatureTour';
import type { TourSelection } from './src/data/featureTour';
import { FitToHeight } from './src/components/PagedBody';
import { countsAsUnread, FriendsSheet, NotificationsSheet, PresentBoxSheet, type AppNotice } from './src/components/SocialSheets';
import { fetchGifts, markGiftReceived, markNoticesRead, readReadNoticeIds, readReceivedGiftIds, type Gift } from './src/services/social';
import type { CustomHomeWidgetId } from './src/services/homePreferences';
import { OmikujiExperience } from './src/components/OmikujiExperience';
import { TutorialSpotlightOverlay, TutorialTarget, type TutorialRect } from './src/components/TutorialSpotlight';
import { fortuneForDay, localOmikujiDay } from './src/data/omikuji';
import { milestoneCount, milestoneLine, milestoneMessage } from './src/services/milestones';
import { AccountCenter, type AccountPage } from './src/components/AccountCenter';
import { Close, M } from './src/components/ModalParts';
import { SettingsModal } from './src/components/SettingsModal';
import { OpeningExperience } from './src/components/OpeningExperience';
import { CollectionBackdrop, getHomeBackgroundMetrics, HomeAnchoredBackground } from './src/components/HomeBackdrops';

type Tab = PrimaryTab;
type HomePopup = 'custom' | 'moby' | null;
// Guide order: tour of the home → omikuji → the present box hands over a 木札 → the first Mobby comes from the gacha.
type FirstRunStage = 'route' | 'homeCompanion' | 'floatingMenu' | 'floatingDrag' | 'homeOmikuji' | 'drawOmikuji' | 'presentBox' | 'gacha' | null;
const TUTORIAL_GIFT: Gift = { id: 'tutorial-first-ticket', title: 'はじめての木札', message: 'ようこそ、もび道へ。この木札で、最初のモビーに出会えます。', from: 'もび道', items: [{ kind: 'gachaTicket', quantity: 1 }], sentAt: '2026-01-01T00:00:00.000Z' };
const FIRST_RUN_ROUTE_ID = 'sanctuary';
const OMIKUJI_PROMPT_KEY = '@mobidou/omikuji-prompt-day';
// 御朱印帳 = the current pilgrimage; コレクション = everything collected so far.
// Each tab is one integrated page; pop buttons jump to a section instead of
// switching views (no segmented tabs).
type ScrollSection = 'walkMap';
const COLLECTION_PAGES: readonly { id: CollectionPage; label: string; icon: React.ComponentProps<typeof Icon>['name'] }[] = [
  { id: 'room', label: '展示室', icon: 'albums' },
  { id: 'goshuin', label: '御朱印', icon: 'flower' },
  { id: 'miniatures', label: 'ミニチュア', icon: 'key' },
];
type SocialSheet = 'notifications' | 'presents' | 'friends' | null;
const TAB_TITLES: Record<Tab, string> = { home: 'ホーム', book: '御朱印帳', walk: 'おでかけ', collection: 'コレクション' };
const fmt = (n: number) => n.toLocaleString('ja-JP');
const OMIKUJI_ANIMATION_BACKGROUND = require('./assets/ui-round3/omikuji/omikuji-animation-washi-v1.webp');
const OMIKUJI_RESULT_BACKGROUND = require('./assets/ui-round3/omikuji/omikuji-result-paper-v2.webp');
const GOSHUIN_BOOK_BACKGROUND = require('./assets/ui-round3/backgrounds/mobidou-goshuin-book-background-v3.webp');
const GOSHUIN_DETAIL_BACKGROUND = require('./assets/ui-round3/backgrounds/goshuin-detail-washi-v1.webp');
const OUTING_BACKGROUND = require('./assets/ui-round3/backgrounds/outing/daily-omikuji-shrine-v1.webp');
// The character PNG has a small transparent lower margin. Keep that margin
// above the image's cushion surface so the visible feet land on the cushion.
const HOME_CHARACTER_CUSHION_FOOT_INSET = 23;
const HOME_CARD_MAX_HEIGHT = 244;
const HOME_CARD_MIN_HEIGHT = 96;
const HOME_CARD_CHROME_HEIGHT = 124;
function displayDate(day: string) { const [y, m, d] = day.split('-'); return `${y}年${Number(m)}月${Number(d)}日`; }

type HomeLayout = { y: number; height: number };

const BOOK_PAGE_LEFT = require('./assets/ui-washi/goshuin/page-left.webp');
const BOOK_PAGE_RIGHT = require('./assets/ui-washi/goshuin/page-right.webp');
const BOOK_CLOTH = require('./assets/ui-washi/goshuin/book-cover.webp');

// The page art has transparent margins; crop each page to its paper so the two
// halves meet at the spine and reach the cover edge.
const BOOK_PAGE_PAPER = { left: { x0: .066, x1: .929, y0: .034, y1: .965 }, right: { x0: .059, x1: .939, y0: .028, y1: .970 } } as const;
function BookPageArt({ side }: { side: 'left' | 'right' }) {
  return <View pointerEvents="none" style={[S.bookPageArt, side === 'left' ? { left: 0 } : { right: 0 }]}>
    <CroppedArt source={side === 'left' ? BOOK_PAGE_LEFT : BOOK_PAGE_RIGHT} bounds={BOOK_PAGE_PAPER[side]} />
  </View>;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Shippori: ShipporiMincho_500Medium, ShipporiBold: ShipporiMincho_700Bold, [BRUSH]: YujiSyuku_400Regular });
  return <SafeAreaProvider><StatusBar style="dark" /><Main fontsReady={fontsLoaded || !!fontError} /></SafeAreaProvider>;
}

function Main({ fontsReady }: { fontsReady: boolean }) {
  const journey = useJourney();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { data, progress } = journey;
  // While a finished route is walked again, the screens draw the current lap; the clear itself is untouched.
  const view = useMemo(() => lapView(progress), [progress]);
  const accountPreview = __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('account-preview') === '1';
  const onboardingPreview = accountPreview || (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('onboarding-preview') === '1');
  const [tutorialPreviewPet, setTutorialPreviewPet] = useState<PetId | null>(null);
  const [tutorialPreviewDrawn, setTutorialPreviewDrawn] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [homePopup, setHomePopup] = useState<HomePopup>(null);
  const [omikujiModal, setOmikujiModal] = useState(false);
  const [omikujiCardFocused, setOmikujiCardFocused] = useState(false);
  const [omikujiAnimating, setOmikujiAnimating] = useState(false);
  const [firstRunStage, setFirstRunStage] = useState<FirstRunStage>(null);
  const [tutorialRect, setTutorialRect] = useState<TutorialRect | null>(null);
  const [homeDropTarget, setHomeDropTarget] = useState<0 | 1 | null>(null);
  const [featured, setFeatured] = useState(0);
  const [detail, setDetail] = useState<Shrine | null>(null);
  const [detailStampPreview, setDetailStampPreview] = useState(false);
  const detailPopupProgress = useRef(new Animated.Value(0)).current;
  const detailStampPreviewProgress = useRef(new Animated.Value(0)).current;
  const openDetailPopup = () => {
    detailPopupProgress.stopAnimation();
    detailPopupProgress.setValue(0);
    requestAnimationFrame(() => Animated.spring(detailPopupProgress, { toValue: 1, damping: 24, stiffness: 190, mass: .9, useNativeDriver: Platform.OS !== 'web' }).start());
  };
  const closeDetailPopup = (afterClose?: () => void) => {
    detailPopupProgress.stopAnimation();
    Animated.timing(detailPopupProgress, { toValue: 0, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (!finished) return;
      detailStampPreviewProgress.stopAnimation();
      detailStampPreviewProgress.setValue(0);
      setDetailStampPreview(false);
      setDetail(null);
      afterClose?.();
    });
  };
  const openDetailStampPreview = () => {
    detailStampPreviewProgress.stopAnimation();
    detailStampPreviewProgress.setValue(0);
    setDetailStampPreview(true);
    requestAnimationFrame(() => Animated.spring(detailStampPreviewProgress, { toValue: 1, damping: 24, stiffness: 190, mass: .9, useNativeDriver: Platform.OS !== 'web' }).start());
  };
  const closeDetailStampPreview = () => {
    detailStampPreviewProgress.stopAnimation();
    Animated.timing(detailStampPreviewProgress, { toValue: 0, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (finished) setDetailStampPreview(false);
    });
  };
  const [settings, setSettings] = useState(false);
  const [tourRequest, setTourRequest] = useState<TourSelection | null>(null);
  const [tour, setTour] = useState<TourSelection | null>(null);
  const [accountPage, setAccountPage] = useState<AccountPage | null>(null);
  const [accountEntryVisible, setAccountEntryVisible] = useState(false);
  const [accountEntryPage, setAccountEntryPage] = useState<AccountPage>('welcome');
  const [overlayBusy, setOverlayBusy] = useState(false);
  const [openingVisible, setOpeningVisible] = useState(true);
  const [openingHomeReady, setOpeningHomeReady] = useState(false);
  const [gachaOpen, setGachaOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookIndexOpen, setBookIndexOpen] = useState(false);
  const [petSelectionReaction, setPetSelectionReaction] = useState(0);
  const [mobbyMenuOpen, setMobbyMenuOpen] = useState(false);
  const [socialSheet, setSocialSheet] = useState<SocialSheet>(null);
  const [readNoticeIds, setReadNoticeIds] = useState<ReadonlySet<string>>(new Set());
  const [gifts, setGifts] = useState<readonly Gift[]>([]);
  const [receivedGiftIds, setReceivedGiftIds] = useState<ReadonlySet<string>>(new Set());
  const [mapOpen, setMapOpen] = useState(false);
  const [collectionPage, setCollectionPage] = useState<CollectionPage>('room');
  const [navHeight, setNavHeight] = useState(60);
  const [collectionZoom, setCollectionZoom] = useState<CollectionZoom>('standard');
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [homeScrollLayout, setHomeScrollLayout] = useState<HomeLayout | null>(null);
  const [homeCardGroupLayout, setHomeCardGroupLayout] = useState<HomeLayout | null>(null);
  const [homeStepsSlotLayout, setHomeStepsSlotLayout] = useState<HomeLayout | null>(null);
  const [homeCompanionLayout, setHomeCompanionLayout] = useState<HomeLayout | null>(null);
  const [homeStageLayout, setHomeStageLayout] = useState<HomeLayout | null>(null);
  const openingHomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const pet = getPetCharacter(tutorialPreviewPet ?? data.pet);
  const nextRoutePeekMetric = PILGRIMAGE_PEEK_METRICS[pet.id];
  const nextRoutePeekScale = Math.min(132 / nextRoutePeekMetric.width, 132 / nextRoutePeekMetric.height);
  const nextRoutePeekWidth = nextRoutePeekMetric.width * nextRoutePeekScale;
  const nextRoutePeekHeight = nextRoutePeekMetric.height * nextRoutePeekScale;
  const nextRoutePeekBottom = nextRoutePeekMetric.bottom * nextRoutePeekHeight;
  const omikujiDay = localOmikujiDay();
  const omikujiDrawn = onboardingPreview ? tutorialPreviewDrawn : data.omikujiDay === omikujiDay;
  const dailyFortune = fortuneForDay(omikujiDay, omikujiDrawn && !onboardingPreview && data.omikujiPetId ? data.omikujiPetId : pet.id);
  const isFirstRunOmikuji = firstRunStage === 'drawOmikuji';
  const firstRunOmikujiComplete = isFirstRunOmikuji && omikujiDrawn && !omikujiAnimating;
  const currentBackground = getBackgroundOption(data.backgroundId);
  const activeRoute = getPilgrimage(progress.routeId);
  const routeSteps = creditedSteps(view);
  const todaySteps = Math.max(0, progress.steps);
  const totalSteps = Math.max(todaySteps, progress.totalSteps ?? todaySteps);
  const activeShrines = pilgrimageShrines(activeRoute);
  // Stable page data for the native page-curl view; rebuilding it on every
  // render re-serialized every page and pushed it across the bridge again.
  const nativeBookPages = useMemo(() => activeShrines.map(shrine => ({ name: shrine.name, reading: shrine.reading, theme: shrine.theme, place: shrine.place, imageSource: STAMP_IMAGES[shrine.id], acquired: progress.rewards.some(reward => reward.id === shrine.id) })), [activeRoute?.id, progress.rewards]);
  const routePrefix = data.demo ? 'trial:' : 'real:';
  const routeRecords = Object.fromEntries(PILGRIMAGES.flatMap(route => {
    const record = activeRoute?.id === route.id ? progress : data.routes?.[`${routePrefix}${route.id}`];
    return record ? [[route.id, record]] : [];
  }));
  const collectionProgresses = PILGRIMAGES.map(route => activeRoute?.id === route.id ? progress : data.routes?.[`${routePrefix}${route.id}`]).filter((record): record is typeof progress => !!record);
  const collectionRewards = collectionProgresses.flatMap(record => record.rewards);
  const collectionRewardIds = collectionRewards.map(reward => reward.id);
  // A goshuin that has not been received yet never opens its detail, wherever it is tapped.
  const openDetail = (shrine: Shrine) => { if (collectionRewardIds.includes(shrine.id) || progress.rewards.some(reward => reward.id === shrine.id)) setDetail(shrine); };
  const ownedMiniatureIds = Object.keys(journey.special.keychains).filter(id => (journey.special.keychains[id] ?? 0) > 0);
  const collectionRewardDates = Object.fromEntries(collectionRewards.map(reward => [reward.id, displayDate(reward.date)]));
  const pointTargets = expandPointTargets(activeShrines.length, activeRoute?.targets ?? DAILY_TARGETS);
  const nextIndex = activeShrines.findIndex((shrine, index) => !view.rewards.some(r => r.id === (activeRoute?.ids[index] ?? shrine.id)));
  const next = nextIndex >= 0 ? activeShrines[nextIndex] : undefined;
  const nextTarget = nextIndex >= 0 ? (pointTargets[nextIndex] ?? 5000) : (pointTargets.at(-1) ?? 5000);
  const collected = activeShrines.filter((_, index) => view.rewards.some(r => r.id === (activeRoute?.ids[index] ?? activeShrines[index].id)));
  const latestIndex = Math.max(0, collected.length - 1);
  const latest = collected[latestIndex] ?? activeShrines[0] ?? SHRINES[0];
  const selectedIndex = activeShrines.length ? featured % activeShrines.length : 0;
  const [turning, setTurning] = useState(false);
  const bookPageTurnRef = useRef<BookPageTurnHandle>(null);
  const pendingIndex = progress.pending[0] ? (activeRoute?.ids.indexOf(progress.pending[0]) ?? -1) : -1;
  const pending = pendingIndex >= 0 ? activeShrines[pendingIndex] : SHRINES.find(s => s.id === progress.pending[0]);
  // Already holding this goshuin (another lap, or the same shrine in another route) makes the visit short.
  const pendingGoshuinOwned = !!pending && (progress.lapBase !== undefined || Object.entries(routeRecords).some(([routeId, record]) => routeId !== activeRoute?.id && record.rewards.some(reward => reward.id === pending.id)));
  // Not while the first-run tutorial is guiding the player: closing the award jumps to the book, which would strand the tutorial on the wrong screen.
  const awardVisible = !!pending && data.onboarded && firstRunStage === null && openingHomeReady && !settings && !detail && !overlayBusy && !openingVisible && !homePopup && !omikujiModal;
  // Like a UITabBarController, each tab keeps the sub-screen it was left on.
  // Local testing: closing the omikuji after a draw makes it drawable again (see devUnlock.ts).
  useEffect(() => { if (firstRunStage === 'presentBox') { setOmikujiModal(false); setMobbyMenuOpen(false); setSocialSheet('presents'); } }, [firstRunStage]);
  const omikujiWasOpen = useRef(false);
  useEffect(() => {
    if (omikujiModal) { omikujiWasOpen.current = true; return; }
    if (!omikujiWasOpen.current) return;
    omikujiWasOpen.current = false;
    if (DEV_UNLOCK_ALL && omikujiDrawn && firstRunStage === null && !onboardingPreview) journey.resetDailyOmikuji();
  }, [omikujiModal]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (value: Tab) => {  setHomePopup(null); setOmikujiModal(false); setMobbyMenuOpen(false); scrollY.setValue(0); setTab(value); };
  const openHomePopup = (kind: Exclude<HomePopup, null>) => { setMobbyMenuOpen(false); setHomePopup(kind); setTab('home'); scrollY.setValue(0); };
  const handleTutorialCompanionBond = () => {
    journey.bond();
    if (firstRunStage === 'homeCompanion') {
      setTutorialRect(null);
      setFirstRunStage('floatingMenu');
    }
  };
  const handleMobbyOpenChange = (open: boolean) => {
    setMobbyMenuOpen(open);
    if (firstRunStage === 'floatingMenu' && open) {
      setTutorialRect(null);
      setFirstRunStage('floatingDrag');
    } else if (firstRunStage === 'floatingDrag' && !open) {
      setTutorialRect(null);
      setFirstRunStage('homeOmikuji');
    }
  };
  const continueIntoApp = (firstRun: boolean) => {
    if (openingHomeTimer.current) clearTimeout(openingHomeTimer.current);
    move('home');
    setOpeningVisible(false);
    setAccountEntryVisible(false);
    setFirstRunStage(null);
    if (firstRun) {
      setOpeningHomeReady(true);
      if (onboardingPreview) {
        setFirstRunStage('homeCompanion');
      } else if (progress.routeId) {
        setFirstRunStage('homeCompanion');
      } else {
        setFirstRunStage('route');
      }
      return;
    }

    setOpeningHomeReady(false);
    openingHomeTimer.current = setTimeout(() => {
      setOpeningHomeReady(true);
      openingHomeTimer.current = null;
    }, 500);
  };
  const beginFirstRun = () => {
    setAccountEntryPage('welcome');
    continueIntoApp(true);
  };
  const enterApp = () => {
    const firstRun = onboardingPreview || !data.onboarded;
    if (openingHomeTimer.current) clearTimeout(openingHomeTimer.current);
    if (firstRun && !onboardingPreview) {
      move('home');
      setOpeningVisible(false);
      setAccountEntryPage('welcome');
      setAccountEntryVisible(true);
      return;
    }
    continueIntoApp(firstRun);
  };
  const finishAccountImport = () => {
    if (accountEntryVisible) {
      setAccountEntryVisible(false);
      setAccountEntryPage('welcome');
      setFirstRunStage(null);
      setSettings(false);
      setAccountPage(null);
      setOpeningVisible(false);
      setOpeningHomeReady(true);
      move('home');
    } else if (journey.data.real.routeId) {
      setAccountPage('manage');
    } else {
      setSettings(false);
      setAccountPage(null);
      setOpeningHomeReady(true);
      move('home');
    }
  };
  const renderBookSpread = (index: number) => {
    const book = activeShrines[index] ?? SHRINES[0];
    const reward = progress.rewards.find(entry => entry.id === book.id);
    return <View style={S.openBook}>
      <BookPageArt side="left" />
      <BookPageArt side="right" />
      <View style={S.bookLeft}><Stamp shrine={book} locked={!reward} /></View>
      <View style={S.bookRight}>
        <Text style={S.bookReading}>{book.reading}</Text><Text style={S.bookName}>{book.name}</Text><View style={S.shortRule} /><Text style={S.bookTheme}>{book.theme}</Text><Text numberOfLines={4} style={S.bookDescription}>{book.description}</Text>
        <View style={S.inline}><Torii size={16} color={C.muted} /><Text style={S.bookLocation}>{book.place}</Text></View>
        {reward && <Pressable plate="primary" accessibilityRole="button" onPress={() => setDetail(book)} style={S.bookDetail}><Text style={S.bookDetailText}>このご縁をみる</Text><Icon name="chevron-forward" color="#FFF9EE" size={13} /></Pressable>}
      </View>
    </View>;
  };
  const homeNextPointSteps = next ? Math.max(0, nextTarget - routeSteps) : null;
  const previousPointSteps = nextIndex >= 0
    ? (nextIndex === 0 ? 0 : (pointTargets[nextIndex - 1] ?? 0))
    : (pointTargets.at(-1) ?? 0);
  const previousPointName = (nextIndex === 0 || activeShrines.length === 0) ? '出発' : (activeShrines[(nextIndex < 0 ? activeShrines.length : nextIndex) - 1]?.name ?? '出発');
  const homeStepProgress = homeNextPointSteps === null
    ? 1
    : (routeSteps - previousPointSteps) / Math.max(1, nextTarget - previousPointSteps);
  const homeNextPointLabel = homeNextPointSteps === null ? '' : `次のポイントまで${fmt(homeNextPointSteps)}歩`;
  const homeFloorContentY = homeCardGroupLayout && homeStepsSlotLayout
    ? homeCardGroupLayout.y + homeStepsSlotLayout.y
    : null;
  const homeFloorY = homeFloorContentY === null || !homeScrollLayout
    ? null
    : homeScrollLayout.y + homeFloorContentY;
  const homeBackgroundMetrics = getHomeBackgroundMetrics(homeFloorY, Math.max(1, windowHeight));
  const homeCushionContentY = homeFloorContentY === null
    ? null
    : homeFloorContentY - homeBackgroundMetrics.cushionOffset;
  // The two home cards take whatever height is left under the companion (up to
  // their designed 244pt), so they never run under the tab bar on shorter
  // iPhones. The chrome is the steps card slot plus the grid margins.
  const homeCardHeight = homeCompanionLayout && scrollViewportHeight > 0
    ? Math.round(Math.max(HOME_CARD_MIN_HEIGHT, Math.min(HOME_CARD_MAX_HEIGHT, scrollViewportHeight - (homeCompanionLayout.y + homeCompanionLayout.height) - HOME_CARD_CHROME_HEIGHT)))
    : HOME_CARD_MAX_HEIGHT;
  const homeCharacterShiftY = homeCushionContentY === null || !homeCompanionLayout || !homeStageLayout
    ? 0
    : homeCushionContentY + HOME_CHARACTER_CUSHION_FOOT_INSET - (homeCompanionLayout.y + homeStageLayout.y + homeStageLayout.height);
  // Mobby rests where it covers the least on each screen; the person can still
  // park it elsewhere, and that is remembered per screen.
  const walkRingSize = Math.max(120, Math.min(248, scrollViewportHeight - 392));
  const mobbySpotKey = tab === 'walk' ? (mapOpen ? 'walk-map' : 'walk') : tab === 'collection' ? `collection-${collectionPage}` : tab;
  const contentTop = homeScrollLayout?.y ?? 64;
  const mobbySpot: MobbySpot = tab === 'home'
    ? (homeCardGroupLayout && homeStepsSlotLayout ? { side: 'right', from: 'top', offset: contentTop + homeCardGroupLayout.y + homeStepsSlotLayout.y - 84 } : { side: 'right', from: 'top', offset: 240 })
    : tab === 'walk'
      ? (mapOpen ? { side: 'left', from: 'bottom', offset: 44 } : { side: 'right', from: 'top', offset: contentTop + 72 + walkRingSize / 2 - 44 })
      : { side: 'right', from: 'bottom', offset: 4 };
  // Routes run in a fixed order: there is no picker, one tap moves on to the next unfinished route.
  const advanceToNextRoute = () => {
    const completedIds = Object.entries(routeRecords).filter(([, record]) => !!record.completedAt).map(([routeId]) => routeId);
    const nextRouteId = activeRoute ? getNextPilgrimageId(activeRoute.id, completedIds) : FIRST_RUN_ROUTE_ID;
    if (nextRouteId) selectPilgrimageRoute(nextRouteId);
  };
  const selectPilgrimageRoute = (routeId: string) => {
    const beginningFirstRun = firstRunStage === 'route';
    if (beginningFirstRun) setFirstRunStage('homeCompanion');
    if (!onboardingPreview) journey.selectRoute(routeId);
    setFeatured(0);
    setBookOpen(false);
    move('home');
  };
  const closeOmikuji = () => {
    if (isFirstRunOmikuji && !firstRunOmikujiComplete) return;
    setOmikujiModal(false);
    if (isFirstRunOmikuji) {
      setTutorialRect(null);
      setFirstRunStage('presentBox');
    }
  };
  const cardInteractionPropsFor = (locked: boolean) => ({
    disabled: locked,
    focusable: !locked,
    accessible: !locked,
    accessibilityElementsHidden: locked,
    importantForAccessibility: locked ? 'no-hide-descendants' as const : 'auto' as const,
    'aria-hidden': locked ? true : undefined,
    pointerEvents: locked ? 'none' as const : 'auto' as const,
  });
  const cardInteractionProps = cardInteractionPropsFor(firstRunStage === 'homeOmikuji');
  const omikujiCardInteractionProps = cardInteractionPropsFor(false);
  // From elsewhere (home card, notice): switch tab, then jump once laid out.
  const openSection = (target: Tab, section?: ScrollSection) => { move(target); if (section === 'walkMap') setMapOpen(true); };
  // Long-pressing a home card edits the cards, like widgets on the Home Screen.
  const editHomeCards = () => { if (firstRunStage === null) openHomePopup('custom'); };
  // Opening a shrine's page in the book from anywhere (detail, list, guide).
  const openBookPage = (index: number) => { setFeatured(index); setBookIndexOpen(false); setBookOpen(true); move('book'); };
  const detailBookIndex = detail ? activeShrines.findIndex(shrine => shrine.id === detail.id) : -1;
  // Home cards are shortcuts: each one opens the real screen directly instead
  // of a second, smaller copy of it.
  const renderHomeWidget = (widget: CustomHomeWidgetId, slot: number) => {
    const selectedShrine = COLLECTION_SHRINES.find(shrine => shrine.id === data.homeWidgetItems[slot]) ?? latest;
    if (widget === 'goshuin') return <Pressable key={`${widget}-${slot}`} nativeID={`home-widget-goshuin-${slot}`} artwork={false} onLongPress={editHomeCards} delayLongPress={450} {...cardInteractionProps} accessibilityRole="button" accessibilityLabel={`${selectedShrine.name}の御朱印。詳しく見る`} onPress={() => openDetail(selectedShrine)} style={[S.homeWidgetCard, { height: homeCardHeight }, S.homeGoshuinOnlyCard, homeDropTarget === slot && S.homeWidgetDropTarget]}>
      <HomeGoshuinArtwork source={STAMP_IMAGES[selectedShrine.id]} owned={collectionRewardIds.includes(selectedShrine.id)} background={currentBackground.image} />
      {homeDropTarget === slot && <View pointerEvents="none" style={S.homeDropOverlay} />}
    </Pressable>;
    if (widget === 'miniature') return <TutorialTarget key={`${widget}-${slot}`} active={firstRunStage === 'homeOmikuji'} onRectChange={setTutorialRect} style={[S.homeOmikujiTargetWrapper, { height: homeCardHeight }]}>
      <Pressable nativeID={`home-widget-miniature-${slot}`} artwork={false} onLongPress={editHomeCards} delayLongPress={450} {...omikujiCardInteractionProps} accessibilityRole="button" accessibilityLabel={omikujiDrawn ? `今日のおみくじは${dailyFortune.rank}。全画面で詳しく見る` : '今日のおみくじを全画面で引く'} onFocus={() => setOmikujiCardFocused(true)} onBlur={() => setOmikujiCardFocused(false)} onPress={() => { if (firstRunStage === 'homeOmikuji') { setTutorialRect(null); setFirstRunStage('drawOmikuji'); } setOmikujiModal(true); }} style={[S.homeWidgetCard, { height: homeCardHeight }, S.homeGoshuinOnlyCard, { width: '100%' }, omikujiCardFocused && S.homeOmikujiCardFocused, firstRunStage === 'homeOmikuji' && S.onboardingHomeTarget, homeDropTarget === slot && S.homeWidgetDropTarget]}>
        <HomeOmikujiArtwork fortune={omikujiDrawn ? dailyFortune : null} petName={pet.name} />
        {homeDropTarget === slot && <View pointerEvents="none" style={S.homeDropOverlay} />}
      </Pressable>
    </TutorialTarget>;
    if (widget === 'map') return <Pressable key={`${widget}-${slot}`} nativeID={`home-widget-map-${slot}`} artwork={false} onLongPress={editHomeCards} delayLongPress={450} {...cardInteractionProps} accessibilityRole="button" accessibilityLabel="巡礼マップをひらく" onPress={() => openSection('walk', 'walkMap')} style={[S.homeWidgetCard, { height: homeCardHeight }, { padding: 0 }, homeDropTarget === slot && S.homeWidgetDropTarget]}>
      <HomeMapArtwork />
      {homeDropTarget === slot && <View pointerEvents="none" style={S.homeDropOverlay} />}
    </Pressable>;
    return null;
  };
  const renderHomeStepsCard = () => <Pressable nativeID="home-widget-steps" artwork={false} onLongPress={editHomeCards} delayLongPress={450} {...cardInteractionProps} accessibilityRole="button" accessibilityLabel={`歩数。今日${fmt(todaySteps)}歩。累計${fmt(totalSteps)}歩。${homeNextPointLabel ? `${homeNextPointLabel}。` : ''}おでかけをひらく`} onPress={() => openSection('walk')} style={S.homeStepsCard}>
    <HomeStepsArtwork horizontal petId={pet.id} petImage={pet.image} progress={homeStepProgress} steps={routeSteps} todaySteps={todaySteps} totalSteps={totalSteps} previousPointSteps={previousPointSteps} previousPointName={previousPointName} nextPointSteps={homeNextPointSteps} />
  </Pressable>;
  useEffect(() => () => { if (openingHomeTimer.current) clearTimeout(openingHomeTimer.current); }, []);
  // 通知: things to do now, where the journey stands, and what happened.
  // Derived from the save, so it needs no server.
  const stepsLeft = next ? Math.max(0, nextTarget - routeSteps) : 0;
  const recordPrefix = data.demo ? 'trial' : 'real';
  const notices: AppNotice[] = [
    ...(activeRoute && progress.completedAt ? [{ id: `todo:complete:${activeRoute.id}:${progress.completedAt}`, kind: 'todo' as const, icon: 'ribbon-outline' as const, title: `${activeRoute.name}を結願しました`, body: '次の巡礼へ出かけましょう。', actionLabel: '次の巡礼へ進む', onAction: advanceToNextRoute }] : []),
    ...(!omikujiDrawn ? [{ id: `todo:omikuji:${omikujiDay}`, kind: 'todo' as const, icon: 'document-text-outline' as const, title: '今日のおみくじを引こう', body: '一日一度のご縁です。', actionLabel: 'おみくじを引く', onAction: () => { move('home'); setOmikujiModal(true); } }] : []),
    ...(hasStarter(data.mobbies) && data.mobbies.freePulls > 0 ? [{ id: `todo:gacha:${data.mobbies.freePulls}`, kind: 'todo' as const, icon: 'gift-outline' as const, title: 'ガチャを引けます', body: `無料で引けるのは${data.mobbies.freePulls}回です。新しいモビーに出会えます。`, actionLabel: 'ガチャをひらく', onAction: () => setGachaOpen(true) }] : []),
    ...(data.source === 'none' && !data.demo ? [{ id: 'todo:steps', kind: 'todo' as const, icon: 'footsteps-outline' as const, title: '歩数を連携しよう', body: '歩いた分だけ、巡礼が進みます。', actionLabel: '歩数を連携する', onAction: () => void journey.connect() }] : []),
    ...(activeRoute && next ? [{ id: 'status:next', kind: 'status' as const, icon: 'navigate-outline' as const, title: `次は${next.name}まで あと${fmt(stepsLeft)}歩`, body: activeRoute.name, actionLabel: '巡礼絵図を見る', onAction: () => openSection('walk', 'walkMap') }] : []),
    ...collected.map((shrine, index) => ({ shrine, index, reward: view.rewards[index] })).reverse().map(({ shrine, index, reward }) => ({ id: `event:reward:${recordPrefix}:${activeRoute?.id ?? ''}:${reward?.id ?? shrine.id}`, kind: 'event' as const, icon: 'flower-outline' as const, title: `${shrine.name}の御朱印を授かりました`, date: reward ? displayDate(reward.date) : undefined, actionLabel: '御朱印を見る', onAction: () => { setFeatured(index); setDetail(shrine); } })),
  ];
  const unreadNotices = notices.filter(notice => countsAsUnread(notice, readNoticeIds)).length;
  const giftsWaiting = gifts.filter(gift => !receivedGiftIds.has(gift.id)).length;
  const openNotifications = () => {
    setSocialSheet('notifications');
    const seen = notices.filter(notice => notice.kind !== 'status').map(notice => notice.id);
    void markNoticesRead(seen).then(() => setReadNoticeIds(previous => new Set([...previous, ...seen])));
  };
  const receiveGift = (gift: Gift) => {
    if (gift.id === TUTORIAL_GIFT.id) {
      // The guide's own present: not saved as received, so an interrupted guide can hand it over again.
      setSocialSheet(null);
      if (onboardingPreview) { setFirstRunStage(null); return; }
      journey.grantWelcomePull();
      setFirstRunStage('gacha');
      setGachaOpen(true);
      return;
    }
    if (receivedGiftIds.has(gift.id)) return;
    gift.items.forEach(item => {
      if (item.kind === 'gachaTicket') journey.grantTickets(item.quantity);
      else for (let count = 0; count < item.quantity; count++) journey.grantPass(item.kind);
    });
    setReceivedGiftIds(previous => new Set([...previous, gift.id]));
    void markGiftReceived(gift.id);
  };
  // Mobby's menu: pops out around the companion wherever it has been dragged.
  const mobbyMenu: MobbyMenuItem[] = [
    { id: 'mobbyCharacter', label: 'キャラ変更', icon: 'paw', onPress: () => openHomePopup('moby') },
    { id: 'mobbyNotifications', label: '通知', icon: 'notifications', badge: unreadNotices, onPress: openNotifications },
    { id: 'mobbyPresents', label: 'プレゼント', icon: 'gift', badge: giftsWaiting, onPress: () => setSocialSheet('presents') },
    { id: 'mobbyFriends', label: 'フレンド', icon: 'people', onPress: () => setSocialSheet('friends') },
  ];
  useEffect(() => { void readReadNoticeIds().then(setReadNoticeIds); void readReceivedGiftIds().then(setReceivedGiftIds); }, []);
  useEffect(() => { let active = true; void fetchGifts({ demo: data.demo }).then(list => { if (active) setGifts(list); }); return () => { active = false; }; }, [data.demo]);
  useEffect(() => {
    if (!accountPreview || !journey.ready) return;
    setOpeningVisible(false);
    setOpeningHomeReady(false);
    setAccountEntryPage('welcome');
    setAccountEntryVisible(true);
  }, [accountPreview, journey.ready]);
  useEffect(() => { if (openingHomeReady && journey.ready && !settings && !accountEntryVisible && !progress.routeId && (firstRunStage === null || firstRunStage === 'route')) selectPilgrimageRoute(FIRST_RUN_ROUTE_ID); }, [openingHomeReady, journey.ready, settings, accountEntryVisible, progress.routeId, data.demo, firstRunStage]);
  // 道しるべ: a marker every 1,000 steps. The last one seen is kept per route, so steps walked while the app was closed are announced too.
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const milestoneKey = `@mobidou/milestone/${routePrefix}${progress.routeId ?? ''}`;
  const currentMilestones = milestoneCount(routeSteps);
  useEffect(() => {
    if (!journey.ready || !progress.routeId || !data.onboarded || firstRunStage !== null) return undefined;
    let active = true;
    void AsyncStorage.getItem(milestoneKey).then(raw => {
      if (!active) return;
      const last = raw === null ? null : Number(raw);
      if (last === currentMilestones) return;
      void AsyncStorage.setItem(milestoneKey, String(currentMilestones)).catch(() => undefined);
      // The first reading, a restart of the route, or a shrine arrival (its own ceremony) is not announced.
      if (last === null || !Number.isFinite(last) || currentMilestones < last || progress.pending.length > 0 || homeNextPointSteps === null) return;
      setMilestoneToast(`${milestoneMessage(currentMilestones, homeNextPointSteps)}\n${pet.name}「${milestoneLine(currentMilestones)}」`);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [journey.ready, milestoneKey, currentMilestones, progress.routeId, progress.pending.length, data.onboarded, firstRunStage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!milestoneToast) return undefined;
    const timer = setTimeout(() => setMilestoneToast(null), 6000);
    return () => clearTimeout(timer);
  }, [milestoneToast]);
  // The first launch on each new day opens the omikuji once; after that it is only drawn from its card or a notice.
  const omikujiDayChecked = useRef(false);
  useEffect(() => {
    if (omikujiDayChecked.current || tab !== 'home' || !openingHomeReady || openingVisible || !journey.ready || !progress.routeId || firstRunStage !== null || !data.onboarded) return;
    omikujiDayChecked.current = true;
    if (omikujiDrawn) return;
    void AsyncStorage.getItem(OMIKUJI_PROMPT_KEY).then(last => {
      if (last === omikujiDay) return;
      void AsyncStorage.setItem(OMIKUJI_PROMPT_KEY, omikujiDay).catch(() => undefined);
      setOmikujiModal(true);
    }).catch(() => undefined);
  }, [tab, openingHomeReady, openingVisible, journey.ready, progress.routeId, omikujiDrawn, omikujiDay, firstRunStage, data.onboarded]);
  // The tour starts once the settings sheet has finished sliding away.
  useEffect(() => {
    if (!tourRequest || settings) return undefined;
    const timer = setTimeout(() => { setTour(tourRequest); setTourRequest(null); }, 450);
    return () => clearTimeout(timer);
  }, [tourRequest, settings]);
  useEffect(() => {
    if (settings || detail || openingVisible || homePopup || omikujiModal) { setOverlayBusy(true); return; }
    const timer = setTimeout(() => setOverlayBusy(false), 380);
    return () => clearTimeout(timer);
  }, [settings, detail, openingVisible, homePopup, omikujiModal]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !detail || typeof document === 'undefined') return;
    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root.style.overflow;
    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    // Let the detail card itself scroll; block everything behind it.
    const preventBackgroundScroll = (event: Event) => { if ((event.target as Element | null)?.closest?.('#detail-popup-scroll')) return; event.preventDefault(); };
    document.addEventListener('wheel', preventBackgroundScroll, { capture: true, passive: false });
    document.addEventListener('touchmove', preventBackgroundScroll, { capture: true, passive: false });
    return () => {
      document.removeEventListener('wheel', preventBackgroundScroll, true);
      document.removeEventListener('touchmove', preventBackgroundScroll, true);
      body.style.overflow = previousBodyOverflow;
      root.style.overflow = previousRootOverflow;
    };
  }, [detail]);

  if (!journey.ready || !fontsReady) return <View style={S.loading}><Text style={S.logo}>もび道</Text><ActivityIndicator color={C.red} /><Text style={S.muted}>ご縁の支度をしています</Text></View>;
  return <View style={S.desktop}><SafeAreaView style={S.app}>
    {tab === 'collection' ? <CollectionBackdrop scrollY={scrollY} viewportWidth={Math.min(480, Math.max(1, windowWidth))} viewportHeight={Math.max(1, windowHeight)} /> : tab === 'home' ? <HomeAnchoredBackground floorY={homeFloorY} viewportHeight={Math.max(1, windowHeight)} /> : <>
      <Animated.View pointerEvents="none" style={S.backgroundScrollLayer}>
        <Animated.View pointerEvents="none" style={[S.backgroundScrollTrack, tab === 'book' && S.bookBackgroundTrack, { transform: [{ translateY: tab === 'book' ? 0 : scrollY.interpolate({ inputRange: [0, 520], outputRange: [0, -260], extrapolate: 'clamp' }) }] }]}>
          <Image source={tab === 'book' ? GOSHUIN_BOOK_BACKGROUND : tab === 'walk' ? OUTING_BACKGROUND : currentBackground.image} contentFit="cover" style={[S.backgroundArt, (tab === 'book' || tab === 'walk') && S.bookBackgroundArt]} />
          <View pointerEvents="none" style={[S.backgroundWash, tab === 'book' && S.bookBackgroundWash]} />
        </Animated.View>
      </Animated.View>
      {tab !== 'book' && <Clouds />}
    </>}
    {/* Home shows the brush wordmark; every other tab gets an iOS-style large
        title. Demo mode and settings share one glass cluster on the right. */}
    <View style={S.header}>
      {tab === 'home'
        ? <Pressable artwork={false} disabled={firstRunStage !== null} accessibilityRole="header" accessibilityLabel="もび道" onPress={() => move('home')} style={S.brand}><Image source={require('./assets/mobidou-wordmark-brush.webp')} style={S.headerLogo} contentFit="contain" /><Image source={require('./assets/mobidou-icon.webp')} style={S.logoMark} contentFit="contain" /></Pressable>
        : <Text accessibilityRole="header" numberOfLines={1} style={S.largeTitle}>{TAB_TITLES[tab]}</Text>}
      <View style={S.headerActions}>
        {tab === 'home' && firstRunStage === null && hasStarter(data.mobbies) && <HomeStatusBar tickets={data.mobbies.freePulls} miniaturePasses={journey.special.passes.keychainDrop} onPressTickets={() => { setMobbyMenuOpen(false); setGachaOpen(true); }} />}
        {data.demo && <Pressable plate="pill" artwork={false} accessibilityRole="button" accessibilityLabel="体験モード中。タップで体験を終えて実記録にもどる" onPress={() => journey.enter(false)} style={S.demoBadge}><View style={S.dot} /><Text style={S.demoBadgeText}>体験中</Text><Icon name="close" size={13} color="#8A6950" /></Pressable>}
        <TourAnchor id="header-settings"><Pressable plate="round" artwork={false} disabled={firstRunStage !== null} accessibilityRole="button" accessibilityLabel="設定を開く" onPress={() => setSettings(true)} style={S.glassButton}><Icon name="settings-outline" size={21} color={C.ink} /></Pressable></TourAnchor>
      </View>
    </View>
    {!!milestoneToast && <Pressable artwork={false} accessibilityRole="alert" accessibilityLabel={milestoneToast.replace('\n', '。')} onPress={() => setMilestoneToast(null)} style={S.milestoneToast}><Text style={S.milestoneTitle}>{milestoneToast.split('\n')[0]}</Text><Text style={S.milestoneLine}>{milestoneToast.split('\n')[1]}</Text></Pressable>}
    {!!journey.error && <View style={M.error}><Text style={M.errorText}>{journey.error}</Text><Pressable accessibilityRole="button" accessibilityLabel="お知らせを閉じる" onPress={journey.dismissError} style={{ padding: 8 }}><Icon name="close" size={18} color={C.red} /></Pressable></View>}
    <View onLayout={({ nativeEvent }) => { const { layout } = nativeEvent; setScrollViewportHeight(previous => previous === layout.height ? previous : layout.height); setHomeScrollLayout(previous => previous && previous.y === layout.y && previous.height === layout.height ? previous : layout); }} style={[S.content, tab === 'home' && S.homeContent]}>
      {tab === 'home' && <>
        {firstRunStage === 'homeOmikuji'
          ? <View style={S.homeTutorialIntro}><Text style={S.chapter}>つぎは、おみくじを引こう。</Text></View>
          : <>
            <TourAnchor id="home-companion" onLayout={({ nativeEvent }) => { const { layout } = nativeEvent; setHomeCompanionLayout(previous => previous && previous.y === layout.y && previous.height === layout.height ? previous : layout); }} style={homeCharacterShiftY === 0 ? undefined : { transform: [{ translateY: homeCharacterShiftY }] }}>
              <TutorialTarget active={firstRunStage === 'homeCompanion'} onRectChange={setTutorialRect}>
                <View>
                  <Companion pet={pet} haptics={data.haptics} onBond={handleTutorialCompanionBond} reactionTrigger={petSelectionReaction} onStageLayout={layout => setHomeStageLayout(previous => previous && previous.y === layout.y && previous.height === layout.height ? previous : layout)} />
                  <DuplicateMobbies collection={data.mobbies} />
                </View>
              </TutorialTarget>
            </TourAnchor>
          </>}
        <View style={S.homeCardGroup} onLayout={({ nativeEvent }) => { const { layout } = nativeEvent; setHomeCardGroupLayout(previous => previous && previous.y === layout.y && previous.height === layout.height ? previous : layout); }}>
          {firstRunStage !== 'homeOmikuji' && <TourAnchor id="home-steps" style={S.homeStepsSlot} onLayout={({ nativeEvent }) => { const { layout } = nativeEvent; setHomeStepsSlotLayout(previous => previous && previous.y === layout.y && previous.height === layout.height ? previous : layout); }}>{renderHomeStepsCard()}</TourAnchor>}
          <View accessibilityElementsHidden={homePopup === 'moby'} aria-hidden={homePopup === 'moby' ? true : undefined} importantForAccessibility={homePopup === 'moby' ? 'no-hide-descendants' : 'auto'} pointerEvents={homePopup === 'moby' ? 'none' : 'auto'} style={homePopup === 'moby' ? S.homeWidgetsHidden : undefined}>
            <TourAnchor id="home-widgets" style={S.homeWidgetGrid}>{data.homeWidgetOrder.map(renderHomeWidget)}</TourAnchor>
          </View>
        </View>
      </>}

      {tab === 'book' && <>
        <View style={S.pageTop}>
          <View style={S.pageTopText}>
            <Text style={S.pageEyebrow}>巡礼中</Text>
            <Text numberOfLines={2} style={S.pageLead}>{activeRoute?.name ?? '巡礼を選びましょう'}</Text>
          </View>
          <TourAnchor id="book-top" style={S.tourPair}>
            <PopButton id="bookIndex" label="目次" icon="list" size={54} phase={0} onPress={() => setBookIndexOpen(true)} />
          </TourAnchor>
        </View>
        {activeRoute && !bookOpen && <GoshuinBookCover route={activeRoute} onOpen={() => setBookOpen(true)} />}
        {bookOpen && <><View style={S.bookWrap}>
          <View pointerEvents="none" style={[S.bookCoverEdge, activeRoute ? { backgroundColor: activeRoute.color } : null]}><Image accessible={false} source={BOOK_CLOTH} contentFit="cover" style={S.bookCloth} /></View>
          <BookPageTurn key={activeRoute?.id ?? 'book'} ref={bookPageTurnRef} selectedIndex={selectedIndex} itemCount={activeShrines.length} contentKey={activeRoute?.id ?? 'book'} renderSpread={renderBookSpread} onCommit={setFeatured} onBusyChange={setTurning} onOpenDetail={index => openDetail(activeShrines[index])} nativePages={nativeBookPages} style={S.bookViewport} />
        </View>
        <View style={S.pager}><Pressable plate="round" accessibilityRole="button" accessibilityLabel="前の御朱印ページ" accessibilityState={{ disabled: turning }} disabled={turning} onPress={() => bookPageTurnRef.current?.turn(-1)} style={[S.pagerButton, turning && { opacity: .45 }]}><Icon name="chevron-back" size={18} /></Pressable><PillText textStyle={S.pageCounterText}>{String(selectedIndex + 1).padStart(2, '0')} / {String(activeShrines.length).padStart(2, '0')}</PillText><Pressable plate="round" accessibilityRole="button" accessibilityLabel="次の御朱印ページ" accessibilityState={{ disabled: turning }} disabled={turning} onPress={() => bookPageTurnRef.current?.turn(1)} style={[S.pagerButton, turning && { opacity: .45 }]}><Icon name="chevron-forward" size={18} /></Pressable></View>
        </>}
      </>}

      {tab === 'walk' && <>
        <View style={S.pageTop}>
          <View style={S.pageTopText}>
            <Text style={S.pageEyebrow}>{mapOpen ? '巡礼絵図' : '今日の歩数'}</Text>
            <Text numberOfLines={2} style={S.pageLead}>{activeRoute?.name ?? '巡礼を選びましょう'}</Text>
          </View>
          {activeRoute && <TourAnchor id="walk-top"><PopButton id="walkMap" label={mapOpen ? '歩数' : '絵図'} icon={mapOpen ? 'footsteps' : 'map'} size={54} phase={0} onPress={() => setMapOpen(open => !open)} /></TourAnchor>}
        </View>
        {mapOpen && activeRoute
          ? <View style={S.walkMinimal}>
            <RouteMap route={activeRoute} count={view.rewards.length} progress={view} pet={pet} showSpeech viewportHeight={Math.max(300, scrollViewportHeight - 72)} onStop={(shrine, index) => { setFeatured(index); openDetail(shrine); }} />
          </View>
          : <View style={S.walkMinimal}>
            <TourAnchor id="walk-ring"><StepProgressRing steps={routeSteps} goal={nextTarget} size={walkRingSize} /></TourAnchor>
            <PillText textStyle={S.walkCaption}>{view.completedAt ? '結願しました。次の巡礼へ出かけましょう。' : next ? `次は ${next.name} · あと ${fmt(stepsLeft)}歩` : 'この巡礼のすべてのご縁を結びました。'}</PillText>
            <View accessibilityLabel={`今日の足あと。${[3000, 5000, 8000].filter(goal => todaySteps >= goal).length}/3`} style={S.footprintRow}>
              {[3000, 5000, 8000].map(goal => <View key={goal} style={[S.footprint, todaySteps >= goal && S.footprintDone]}><Text style={[S.footprintMark, todaySteps >= goal && S.footprintMarkDone]}>{todaySteps >= goal ? '❀' : '○'}</Text><Text style={S.footprintText}>{fmt(goal)}歩</Text></View>)}
            </View>
            {/* The companion peeks over the main action, as on the old steps card. */}
            {activeRoute && <TourAnchor id="walk-action" style={S.nextPilgrimageAction}>
              {view.completedAt
                ? <Button title="次の巡礼へ進む" icon="map-outline" onPress={advanceToNextRoute} style={S.walkActionButton} />
                : data.demo
                  ? <Button title="体験で1,000歩あるく" icon="footsteps-outline" onPress={journey.demoWalk} style={S.walkActionButton} />
                  : <Button title={data.source === 'none' ? '歩数を連携する' : journey.busy ? '歩数を更新しています…' : '今日の歩数を更新'} icon="refresh" disabled={journey.busy} onPress={() => void (data.source === 'none' ? journey.connect() : journey.refresh())} style={S.walkActionButton} />}
              <View pointerEvents="none" accessibilityLabel={`${pet.name}がボタンの上から覗いている`} style={[S.nextPilgrimagePeek, { top: 56 - nextRoutePeekBottom + 6, height: nextRoutePeekHeight }]}>
                <Image source={PILGRIMAGE_PEEK_IMAGES[pet.id]} contentFit="contain" style={[S.nextPilgrimagePeekImage, { width: nextRoutePeekWidth, height: nextRoutePeekHeight, left: (190 - nextRoutePeekWidth) / 2 }]} />
              </View>
            </TourAnchor>}
          </View>}
      </>}

      {tab === 'collection' && <>
        <TourAnchor id="collection-tabs" style={S.jumpRow}>
          {COLLECTION_PAGES.map((entry, index) => <PopButton key={entry.id} id={entry.id === 'room' ? 'collectionRoom' : entry.id === 'goshuin' ? 'collectionGoshuin' : entry.id === 'miniatures' ? 'collectionMiniature' : 'collectionPasses'} label={entry.label} icon={entry.icon} size={48} phase={index / 4} selected={collectionPage === entry.id} onPress={() => setCollectionPage(entry.id)} />)}
        </TourAnchor>
        <CollectionGallery shrines={COLLECTION_SHRINES} rewardIds={collectionRewardIds} rewardDates={collectionRewardDates} special={journey.special} zoom={collectionZoom} onZoomChange={setCollectionZoom} page={collectionPage} onSelectGoshuin={openDetail} onClosePage={() => setCollectionPage('room')} />
      </>}
    </View>
    {homePopup === 'custom' && <HomeCustomizationPopup order={data.homeWidgetOrder} items={data.homeWidgetItems} shrines={COLLECTION_SHRINES} ownedGoshuinIds={collectionRewardIds} ownedMiniatureIds={ownedMiniatureIds} latest={latest} background={currentBackground.image} onSave={journey.saveHomeWidgetOrder} onSaveItems={journey.saveHomeWidgetItems} onDragTarget={setHomeDropTarget} onClose={() => { setHomeDropTarget(null); setHomePopup(null); }} />}
    {homePopup === 'moby' && <MobyPickerPopup selectedPet={tutorialPreviewPet ?? data.pet} isOwned={!hasStarter(data.mobbies) ? undefined : (id => ownsMobby(data.mobbies, id))} onConfirm={selectedPet => { if (onboardingPreview) setTutorialPreviewPet(selectedPet); else journey.choosePet(selectedPet); setPetSelectionReaction(value => value + 1); setHomePopup(null); }} onClose={() => setHomePopup(null)} />}
    <TourAnchor id="nav" onLayout={({ nativeEvent }) => { const height = Math.round(nativeEvent.layout.height); setNavHeight(previous => previous === height ? previous : height); }}>
      <HomeBottomNavigation tab={tab} onNavigate={move} disabled={!!homePopup || firstRunStage !== null} onGacha={hasStarter(data.mobbies) && !onboardingPreview ? () => { setHomePopup(null); setOmikujiModal(false); setMobbyMenuOpen(false); setGachaOpen(true); } : undefined} freePulls={data.mobbies.freePulls} />
    </TourAnchor>
    {/* Keep the floating Mobby mounted through the fortune-card step so closing its menu cannot cancel an active drag. */}
    {(firstRunStage === null || firstRunStage === 'floatingMenu' || firstRunStage === 'floatingDrag' || firstRunStage === 'homeOmikuji') && !homePopup && <>
      {(firstRunStage === 'floatingMenu' || firstRunStage === 'floatingDrag') && <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <TutorialTarget key={firstRunStage} active onRectChange={setTutorialRect} style={{ position: 'absolute', right: 8, top: mobbySpot.offset, width: 88, height: 88 }}><View style={StyleSheet.absoluteFill} /></TutorialTarget>
      </View>}
      <FloatingMobby image={pet.image} name={pet.name} petId={pet.id} items={mobbyMenu} badge={unreadNotices + giftsWaiting} open={mobbyMenuOpen} onOpenChange={handleMobbyOpenChange} bottomInset={navHeight} spotKey={mobbySpotKey} spot={mobbySpot} resetPositionOnMount={onboardingPreview} dragLocked={firstRunStage === 'floatingMenu'} />
    </>}
    <NotificationsSheet visible={socialSheet === 'notifications'} notices={notices} readIds={readNoticeIds} onClose={() => setSocialSheet(null)} />
    <PresentBoxSheet visible={socialSheet === 'presents'} gifts={firstRunStage === 'presentBox' ? [TUTORIAL_GIFT] : gifts} receivedIds={firstRunStage === 'presentBox' ? new Set<string>() : receivedGiftIds} demo={data.demo} guide={firstRunStage === 'presentBox' ? '6 / 7　プレゼントが届いています。木札を受け取りましょう' : undefined} onReceive={receiveGift} onClose={() => { if (firstRunStage !== 'presentBox') setSocialSheet(null); }} />
    <FriendsSheet visible={socialSheet === 'friends'} demo={data.demo} pet={pet} onClose={() => setSocialSheet(null)} />
    <BookIndexPopup visible={bookIndexOpen} title="目次" subtitle={activeRoute?.name} shrines={activeShrines} ownedIds={collected.map(shrine => shrine.id)} onSelect={(_shrine, index) => openBookPage(index)} onClose={() => setBookIndexOpen(false)} />
    {firstRunStage === 'homeCompanion' && <TutorialSpotlightOverlay targetRect={tutorialRect} step="1 / 7" title="ホームのモビーとふれあおう" detail="ほっぺを引っぱると伸びるよ。タップで二礼二拍手一礼。" />}
    {firstRunStage === 'floatingMenu' && <TutorialSpotlightOverlay targetRect={tutorialRect} step="2 / 7" title="画面のモビーをタップ" detail="メニューが開いて、いろいろな機能を使えるよ。" />}
    {firstRunStage === 'floatingDrag' && <TutorialSpotlightOverlay targetRect={tutorialRect} step="3 / 7" title="モビーを好きな場所へ" detail="ドラッグすると、画面内の好きな場所に動かせるよ。" />}
    {firstRunStage === 'homeOmikuji' && <TutorialSpotlightOverlay targetRect={tutorialRect} step="4 / 7" title="おみくじカードを開こう" detail="金色の枠で囲まれたカードをタップ" />}
    {tour && <FeatureTour selection={tour} gacha={hasStarter(data.mobbies) && !onboardingPreview} bottomInset={navHeight} onNavigate={move} onScene={scene => setGachaOpen(scene === 'gacha')} onClose={() => { setTour(null); setGachaOpen(false); }} />}
    <Modal transparent visible={omikujiModal} animationType="fade" presentationStyle="overFullScreen" onRequestClose={() => { if (!isFirstRunOmikuji) closeOmikuji(); }}>
      <SafeAreaView style={S.omikujiModal}>
        <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="おみくじを閉じる" disabled={isFirstRunOmikuji} onPress={closeOmikuji} style={S.omikujiBackdrop} />
        <FitToHeight passThrough><View pointerEvents="box-none" style={S.omikujiModalContent}>
          <View style={S.omikujiModalCard}>
            <Image source={!omikujiDrawn || omikujiAnimating ? OMIKUJI_ANIMATION_BACKGROUND : OMIKUJI_RESULT_BACKGROUND} contentFit="cover" style={[S.omikujiModalBackground, { opacity: !omikujiDrawn || omikujiAnimating ? 0.84 : 0.68 }]} accessible={false} />
            {!isFirstRunOmikuji && <View style={S.omikujiCardClose}><Close onPress={closeOmikuji} /></View>}
            <OmikujiExperience pet={pet} fortune={dailyFortune} drawn={omikujiDrawn} visible={omikujiModal} onDraw={() => onboardingPreview ? setTutorialPreviewDrawn(true) : journey.drawDailyOmikuji()} onReset={() => onboardingPreview ? setTutorialPreviewDrawn(false) : journey.resetDailyOmikuji()} onAnimationStateChange={setOmikujiAnimating} guidedDraw={firstRunStage === 'drawOmikuji'} onGuidedTargetRectChange={setTutorialRect} />
            {firstRunOmikujiComplete && <Button title="ホームへ進む" onPress={closeOmikuji} style={{ width: '90%', maxWidth: 330, alignSelf: 'center', marginTop: 8 }} />}
          </View>
        </View></FitToHeight>
        {firstRunStage === 'drawOmikuji' && !omikujiDrawn && !omikujiAnimating && <TutorialSpotlightOverlay targetRect={tutorialRect} step="5 / 7" title="今日のおみくじを引こう" detail="金色の枠の「今日のおみくじを引く」をタップ" />}
      </SafeAreaView>
    </Modal>



    <Modal visible={!!detail} transparent onShow={() => { setOverlayBusy(true); openDetailPopup(); }} onDismiss={() => { detailPopupProgress.stopAnimation(); detailPopupProgress.setValue(0); detailStampPreviewProgress.stopAnimation(); detailStampPreviewProgress.setValue(0); setDetail(null); setDetailStampPreview(false); setOverlayBusy(false); }} animationType="none" onRequestClose={() => { if (detailStampPreview) closeDetailStampPreview(); else closeDetailPopup(); }} presentationStyle="overFullScreen">
      <SafeAreaView style={[M.modal, { backgroundColor: 'transparent' }]}>
        <Animated.View pointerEvents="none" style={[S.detailModalBackdrop, { opacity: detailPopupProgress }]} />
        <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="御朱印詳細を閉じる" onPress={() => closeDetailPopup()} style={StyleSheet.absoluteFillObject} />
        {detail && <View pointerEvents="box-none" style={S.detailPopupLayout}>
          <Animated.View style={[S.detailPopupCard, { opacity: detailPopupProgress, transform: [{ translateY: detailPopupProgress.interpolate({ inputRange: [0, 1], outputRange: [480, 0] }) }] }]}>
            <Image source={GOSHUIN_DETAIL_BACKGROUND} contentFit="cover" style={StyleSheet.absoluteFillObject} accessible={false} pointerEvents="none" />
            <View style={[S.detailPopupScroll, S.detailPopupContent]}>
              <Text style={S.detailReading}>{detail.reading}</Text>
              <Text style={S.detailName}>{detail.name}</Text>
              <Pressable artwork={false} accessibilityRole="button" accessibilityLabel={`${detail.name}の御朱印を拡大表示`} onPress={openDetailStampPreview} style={S.detailStampTapTarget}>
                <Stamp shrine={detail} style={{ width: '100%', height: '100%' }} />
              </Pressable>
              <Text style={S.detailTheme}>{detail.theme}</Text>
              <Text style={S.detailDescription}>{detail.description}</Text>
              <Text style={S.footerNote}>もびの世界だけに存在する、架空の社・御朱印です。</Text>
              {detailBookIndex >= 0 && tab !== 'book' && <Button title="御朱印帳でこのページをひらく" onPress={() => closeDetailPopup(() => openBookPage(detailBookIndex))} secondary />}
            </View>
            {!detailStampPreview && <View style={S.detailPopupClose}><Close onPress={() => closeDetailPopup()} /></View>}
          </Animated.View>
        </View>}
        {detailStampPreview && detail && <View style={S.stampPreviewOverlay} accessibilityViewIsModal>
          <Animated.View pointerEvents="none" style={[S.stampPreviewBackdrop, { opacity: detailStampPreviewProgress }]} />
          <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="拡大した御朱印を閉じる" onPress={closeDetailStampPreview} style={StyleSheet.absoluteFillObject} />
          <Animated.View style={[S.stampPreviewFrame, { opacity: detailStampPreviewProgress, transform: [{ translateY: detailStampPreviewProgress.interpolate({ inputRange: [0, 1], outputRange: [480, 0] }) }] }]}>
            <View style={S.stampPreviewCard}>
              <Image source={STAMP_IMAGES[detail.id]} contentFit="contain" accessibilityLabel={`${detail.name}の御朱印（拡大表示）`} style={StyleSheet.absoluteFillObject} />
            </View>
            <View style={S.stampPreviewClose}><Close onPress={closeDetailStampPreview} /></View>
          </Animated.View>
        </View>}
      </SafeAreaView>
    </Modal>

    <SettingsModal visible={settings && !accountPage} accountOpen={!!accountPage} journey={journey} onShow={() => setOverlayBusy(true)} onDismiss={() => setOverlayBusy(false)} onClose={() => { setSettings(false); setAccountPage(null); }} onOpenAccount={() => setAccountPage('manage')} onEditHome={() => { setSettings(false); openHomePopup('custom'); }} onToggleDemo={() => { journey.enter(!data.demo); setSettings(false); move('home'); }} gacha={hasStarter(data.mobbies)} onStartTour={selection => { setSettings(false); setTourRequest(selection); }} />



    <Modal
      visible={!!accountPage || accountEntryVisible}
      onShow={() => setOverlayBusy(true)}
      onDismiss={() => setOverlayBusy(false)}
      animationType="slide"
      onRequestClose={() => {
        if (accountEntryVisible) {
          if (accountEntryPage !== 'welcome') setAccountEntryPage('welcome');
        } else {
          setAccountPage(page => page === 'manage' ? null : 'manage');
        }
      }}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={M.modal}>
        <View style={M.modalHeader}>
          {(accountEntryVisible ? accountEntryPage : accountPage) !== 'welcome' && <Pressable
            accessibilityRole="button"
            accessibilityLabel={accountEntryVisible ? 'はじめの画面へ戻る' : accountPage === 'manage' ? '設定に戻る' : 'アカウント画面へ戻る'}
            onPress={() => accountEntryVisible
              ? setAccountEntryPage('welcome')
              : setAccountPage(page => page === 'manage' ? null : 'manage')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          ><Icon name="chevron-back" size={21} color={C.red} /></Pressable>}
          <Text style={[M.modalTitle, (accountEntryVisible ? accountEntryPage : accountPage) !== 'welcome' && { flex: 1 }]}>
            {accountEntryVisible
              ? ({ welcome: 'はじめての方へ', login: 'ログイン', transfer: 'データ引き継ぎ', manage: 'アカウント' } as const)[accountEntryPage]
              : ({ manage: 'アカウント', login: 'ログイン', transfer: 'データ引き継ぎ', welcome: 'はじめての方へ' } as const)[accountPage ?? 'manage']}
          </Text>
          {!accountEntryVisible && <Close onPress={() => setAccountPage(null)} />}
        </View>
        <AccountCenter
          page={accountEntryVisible ? accountEntryPage : accountPage ?? 'manage'}
          isFirstLaunch={accountEntryVisible}
          localSummary={{ petId: data.pet, routeId: data.real.routeId ?? null, rewardCount: data.real.rewards.length, totalSteps: data.real.totalSteps }}
          onNavigate={page => accountEntryVisible ? setAccountEntryPage(page) : setAccountPage(page)}
          onBack={() => accountEntryVisible
            ? setAccountEntryPage('welcome')
            : setAccountPage(page => page === 'manage' ? null : 'manage')}
          onStart={beginFirstRun}
          onExport={journey.exportTransfer}
          onPreviewTransfer={journey.previewTransfer}
          onImportTransfer={journey.importTransfer}
          onFinishImport={finishAccountImport}
        />
      </SafeAreaView>
    </Modal>

    <Modal visible={openingVisible} animationType="fade" onRequestClose={() => {}}><OpeningExperience onEnter={enterApp} error={journey.error} /></Modal>
    <Modal visible={gachaOpen} animationType="fade" onRequestClose={() => { if (firstRunStage !== 'gacha') setGachaOpen(false); }}>{gachaOpen && <GachaScreen freePulls={data.mobbies.freePulls} unrevealed={data.mobbies.unrevealed} nextHint={activeRoute && !view.completedAt ? `${activeRoute.name}を結願すると、ひとつ引けます（あと${Math.max(0, activeShrines.length - view.rewards.length)}か所）。` : '新しい巡礼を結願すると、ひとつ引けます。'} haptics={data.haptics} onDraw={journey.drawFreeMobby} onFinished={() => { if (firstRunStage === 'gacha') { const first = data.mobbies.unrevealed[0]; if (first && isPetId(first.petId)) journey.choosePet(first.petId); journey.enter(false); setGachaOpen(false); setFirstRunStage(null); } journey.acknowledgeMobbyPulls(); }} onClose={() => { if (firstRunStage !== 'gacha') setGachaOpen(false); }} guided={firstRunStage === 'gacha'} onGoPilgrimage={() => { setGachaOpen(false); move('walk'); }} showShop={__DEV__ && firstRunStage !== 'gacha'} />}</Modal>
    <Modal visible={awardVisible} animationType="fade" onRequestClose={() => {}}>{awardVisible && pending && <PilgrimageAward key={`${data.demo}-${progress.routeId}-${progress.pending[0]}`} shrine={pending} pet={pet} walkSource={PILGRIMAGE_WALK_ATLASES[pet.id]} demo={data.demo} haptics={data.haptics} route={activeRoute} stopIndex={pendingIndex} special={journey.special} goshuinOwned={pendingGoshuinOwned} onArrive={journey.rollKeychain} onRedeemKeychainTicket={journey.redeemKeychainTicket} onClose={() => { const index = progress.lapBase !== undefined ? Math.max(0, pendingIndex) : Math.max(0, collected.length - progress.pending.length); journey.acknowledge(); openBookPage(index); }} />}</Modal>
  </SafeAreaView></View>;
}

const S = StyleSheet.create({
  milestoneToast: { position: 'absolute', top: 64, left: 16, right: 16, zIndex: 80, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#FFF9EFF2', borderWidth: 1, borderColor: '#C7A98A', alignItems: 'center', gap: 3, shadowColor: '#2A1D14', shadowOpacity: .2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  milestoneTitle: { color: C.red, fontFamily: BRUSH, fontSize: 14, textAlign: 'center' },
  milestoneLine: { color: '#4E4034', fontSize: 12, textAlign: 'center' },
  footprintRow: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  footprint: { alignItems: 'center', minWidth: 58, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#FFF9EFE0', borderWidth: 1, borderColor: '#D9C7AE' },
  footprintDone: { backgroundColor: '#F4E1D6', borderColor: '#B84C3D' },
  footprintMark: { fontSize: 15, color: '#B7A58F' },
  footprintMarkDone: { color: '#B84C3D' },
  footprintText: { fontSize: 10, color: '#6F675B' },
  pageTop: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4, marginBottom: 8 },
  pageTopText: { flex: 1, paddingRight: 4 },
  pageEyebrow: { color: C.red, fontSize: 12, fontWeight: '700', letterSpacing: 1, textShadowColor: '#FFF9EF', textShadowRadius: 6 },
  pageLead: { marginTop: 3, fontFamily: BRUSH, fontSize: 18, lineHeight: 25, color: C.ink, textShadowColor: '#FFF9EFE6', textShadowRadius: 8 },
  walkActionButton: { width: '100%', marginTop: 0 },
  sectionBlock: { marginTop: 18 },
  sectionHeading: { fontFamily: BRUSH, fontSize: 21, letterSpacing: 1, color: C.ink, marginBottom: 4, textShadowColor: '#FFF9EFE6', textShadowRadius: 8 },
  jumpRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: -4, marginBottom: 8 },
  indexLead: { fontFamily: BRUSH, fontSize: 17, color: C.ink, marginBottom: 4 },
  largeTitle: { flexShrink: 1, fontFamily: BRUSH, fontSize: 28, letterSpacing: 1.5, color: C.ink, textShadowColor: '#FFF9EFD9', textShadowRadius: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  glassButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF6ECE6', borderWidth: StyleSheet.hairlineWidth, borderColor: '#3A2A1E2E', shadowColor: '#2A1D14', shadowOpacity: .12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  demoBadge: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 10, paddingRight: 8, borderRadius: 16, backgroundColor: '#F3E6D2F2', borderWidth: StyleSheet.hairlineWidth, borderColor: '#8A695066' },
  demoBadgeText: { color: '#7A5A43', fontSize: 12, fontWeight: '600' },

  walkCaption: { alignSelf: 'center', textAlign: 'center', color: '#4E4034', fontSize: 14, lineHeight: 20, marginTop: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFF9EFE0' },
  homeGoshuinOnlyCard: { padding: 0, borderWidth: 0, borderRadius: 17, backgroundColor: 'transparent' },
  homeOmikujiCardFocused: { outlineStyle: 'solid', outlineColor: '#D9C7AE', outlineWidth: 1 },
  homeTutorialIntro: { alignItems: 'center', paddingVertical: 12 },
  homeOmikujiTargetWrapper: { width: '48%', height: 244 },
  onboardingHomeTarget: { borderWidth: 3, borderColor: '#E6C171', shadowColor: '#8B6135', shadowOpacity: .4, shadowRadius: 11, shadowOffset: { width: 0, height: 2 }, elevation: 8 },
  omikujiModal: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  omikujiBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#261A12A6' },
  omikujiModalContent: { padding: 18 },
  omikujiModalCard: { width: '100%', maxWidth: 440, alignSelf: 'center', borderRadius: 26, padding: 16, paddingTop: 52, backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: '#D9C2A1', shadowColor: '#27170F', shadowOpacity: .35, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 10, overflow: 'hidden' },
  omikujiModalBackground: { ...StyleSheet.absoluteFillObject },
  omikujiCardClose: { position: 'absolute', top: 8, right: 8, zIndex: 4 },
  homeStepsSlot: { marginTop: -27, marginBottom: 2 }, homeStepsCard: { width: '100%', height: 132, overflow: 'hidden', alignItems: 'stretch' },
  desktop: { flex: 1, backgroundColor: '#E6E1D7', alignItems: 'center' }, app: { width: '100%', maxWidth: 480, flex: 1, backgroundColor: C.paper, overflow: 'hidden' }, backgroundScrollLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }, backgroundScrollTrack: { position: 'absolute', left: 0, right: 0, top: 0, bottom: -260 }, bookBackgroundTrack: { bottom: 0 }, backgroundArt: { ...StyleSheet.absoluteFillObject, opacity: .76 }, bookBackgroundArt: { opacity: 1 }, backgroundWash: { ...StyleSheet.absoluteFillObject, backgroundColor: C.paper, opacity: .12 }, bookBackgroundWash: { opacity: 0 }, loading: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 25 }, muted: { color: C.muted, fontSize: 13 },
  homeWidgetDropTarget: { borderWidth: 3, borderColor: '#B84C3D', transform: [{ scale: 1.025 }], shadowColor: '#8B2F23', shadowOffset: { width: 0, height: 4 }, shadowOpacity: .35, shadowRadius: 9, elevation: 8 },
  homeDropOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B2F234D' },
  headerLogo: { width: 112, height: 40 },
  header: { height: 64, paddingLeft: 20, paddingRight: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 5 }, logo: { fontFamily: BRUSH, fontSize: 39, letterSpacing: 2, color: C.ink }, logoMark: { width: 32, height: 32, borderRadius: 6, marginLeft: 2, transform: [{ rotate: '8deg' }] },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 12, overflow: 'hidden' }, homeContent: { paddingBottom: 0 }, chapter: { fontFamily: BRUSH, color: '#766452', fontSize: 14, letterSpacing: 2 },
  dot: { height: 4, width: 4, backgroundColor: C.red, borderRadius: 5 },   homeWidgetsHidden: { opacity: 0 }, homeCardGroup: { marginTop: 'auto' }, homeWidgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'space-between', marginTop: 5, marginBottom: 8 }, homeWidgetCard: { width: '48%', height: 244, borderRadius: 17, borderWidth: 1, borderColor: '#D9C7AE', backgroundColor: '#FFF9EF', padding: 11, overflow: 'hidden', alignItems: 'stretch' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 }, footerNote: { marginTop: 25, textAlign: 'center', color: '#9A9081', fontSize: 12, lineHeight: 19 },
  bookWrap: { marginHorizontal: -17, marginTop: 38, paddingHorizontal: 5, paddingVertical: 5, backgroundColor: 'transparent', shadowColor: '#27170F', shadowOffset: { width: 0, height: 15 }, shadowOpacity: .34, shadowRadius: 17, elevation: 12 }, bookCoverEdge: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 8, overflow: 'hidden' }, bookCloth: { ...StyleSheet.absoluteFillObject, opacity: .42 }, bookPaperEdges: { position: 'absolute', top: 2, bottom: 3, left: 3, right: 3, borderRadius: 5, backgroundColor: '#DBCCAD', borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#AF9875' }, bookViewport: { position: 'relative', overflow: 'hidden', borderRadius: 3, minHeight: 340 }, openBook: { flexDirection: 'row', overflow: 'hidden', minHeight: 340, height: 340 }, bookPageArt: { position: 'absolute', top: 0, bottom: 0, width: '50%', overflow: 'hidden' }, bookLeft: { flex: 1, padding: 12, justifyContent: 'center' }, bookRight: { flex: 1.02, padding: 15, paddingLeft: 12, justifyContent: 'center', gap: 9 }, bookReading: { fontSize: 11, color: C.muted, letterSpacing: 1 }, bookName: { fontFamily: BRUSH, fontSize: 21, color: C.ink, lineHeight: 31 }, shortRule: { height: 1, width: 25, backgroundColor: C.red, marginVertical: 2 }, bookTheme: { fontFamily: BRUSH, fontSize: 12, lineHeight: 21, color: C.red }, bookDescription: { fontFamily: SERIF, fontSize: 11, lineHeight: 20, color: '#6C6050' }, bookLocation: { flex: 1, fontSize: 11, lineHeight: 14, color: '#887B68' }, bookDetail: { backgroundColor: C.red, borderRadius: 9, minHeight: 35, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 }, bookDetailText: { color: '#FFF8EB', fontSize: 12, fontFamily: BRUSH },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, marginVertical: 14 }, pagerButton: { width: 42, height: 38, borderRadius: 19, backgroundColor: '#EFE6D8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9C9B5' }, pageCounter: { alignItems: 'center', minWidth: 110, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFF9EFE6' }, pageCounterText: { fontFamily: SERIF, fontSize: 15, color: C.ink, letterSpacing: 2 },
  nextPilgrimageAction: { position: 'relative', alignSelf: 'stretch', alignItems: 'center', paddingTop: 56, marginTop: 58 }, nextPilgrimagePeek: { position: 'absolute', left: '50%', marginLeft: -95, width: 190, zIndex: 5 }, nextPilgrimagePeekImage: { position: 'absolute', bottom: 0 },
  tourPair: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  walkMinimal: { flex: 1, alignItems: 'center', paddingTop: 2, paddingBottom: 6 },
  detailContent: { padding: 25, paddingTop: 70, paddingBottom: 45 }, detailReading: { textAlign: 'center', color: C.muted, fontSize: 12, letterSpacing: 2 }, detailName: { textAlign: 'center', fontFamily: BRUSH, fontSize: 31, color: C.ink, marginTop: 8 }, detailTheme: { fontFamily: BRUSH, fontSize: 19, color: C.red, textAlign: 'center' }, detailDescription: { fontFamily: SERIF, fontSize: 14, lineHeight: 26, color: '#6D6354', textAlign: 'center', marginTop: 8 },   detailModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#241D17A8' }, detailPopupLayout: { ...StyleSheet.absoluteFillObject, zIndex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 }, detailPopupCard: { position: 'relative', width: '90%', maxWidth: 500, height: '88%', maxHeight: 820, borderRadius: 18, borderWidth: 1, borderColor: '#E3D6C1', overflow: 'hidden', backgroundColor: C.paper, shadowColor: '#201810', shadowOffset: { width: 0, height: 10 }, shadowOpacity: .3, shadowRadius: 22, elevation: 16 }, detailPopupScroll: { flex: 1 }, detailPopupContent: { paddingHorizontal: 22, paddingTop: 52, paddingBottom: 18 }, detailPopupClose: { position: 'absolute', top: 12, right: 12, zIndex: 10 }, detailStampTapTarget: { flex: 1, minHeight: 90, aspectRatio: 2 / 3, maxWidth: 290, alignSelf: 'center', marginVertical: 12 }, stampPreviewOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: 'center', justifyContent: 'center', padding: 24 }, stampPreviewBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211A16D9' }, stampPreviewFrame: { width: '88%', maxWidth: 360, shadowColor: '#160F0B', shadowOffset: { width: 0, height: 12 }, shadowOpacity: .45, shadowRadius: 20, elevation: 18 }, stampPreviewCard: { width: '100%', aspectRatio: 2 / 3, overflow: 'hidden', borderRadius: 9, borderWidth: 1, borderColor: '#E1D3BB', backgroundColor: '#F5EFDF' }, stampPreviewClose: { position: 'absolute', top: 12, right: 12, zIndex: 2 },
  });
