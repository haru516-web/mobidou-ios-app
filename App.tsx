import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Modal, PanResponder, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ShipporiMincho_500Medium } from '@expo-google-fonts/shippori-mincho/500Medium';
import { ShipporiMincho_700Bold } from '@expo-google-fonts/shippori-mincho/700Bold';
import Svg, { Circle } from 'react-native-svg';
import { Button, C, Clouds, Companion, Icon, Meter, Section, SERIF, Stamp, Torii } from './src/components';
import { PET_CHARACTERS, getPetCharacter } from './src/petCatalog';
import { SHRINES, type Shrine } from './src/data/shrines';
import { DAILY_TARGETS, creditedSteps } from './src/services/progress';
import { sourceLabel } from './src/services/steps';
import { useJourney } from './src/services/useJourney';
import { BACKGROUND_OPTIONS, BACKGROUND_SEASONS, getBackgroundOption, type BackgroundSeason } from './src/data/backgrounds';
import { PET_BACKGROUNDS } from './src/data/petBackgrounds';
import { PILGRIMAGES, getPilgrimage } from './src/data/pilgrimages';
import { pilgrimageShrines, PilgrimagePicker, RouteMap, CompletionPage } from './src/components/PilgrimageScreen';
import { WashiArt, WashiPressable as Pressable } from './src/components/Washi';
import { PilgrimageAward } from './src/components/PilgrimageAward';
import { PILGRIMAGE_WALK_ATLASES } from './src/data/pilgrimageWalkAtlases';
import { PILGRIMAGE_IMAGES } from './src/data/pilgrimageImages';
import { CollectionBackdrop, CollectionGallery } from './src/components/CollectionGallery';

type Tab = 'home' | 'book' | 'walk' | 'pets' | 'collection';
type OutingTab = 'count' | 'map';
const TABS = [{ id: 'home', title: 'ホーム', icon: 'home-outline' }, { id: 'book', title: '御朱印帳', icon: 'book-outline' }, { id: 'walk', title: 'おでかけ', icon: 'footsteps-outline' }, { id: 'pets', title: 'モビー', icon: 'paw-outline' }, { id: 'collection', title: 'コレクション', icon: 'albums-outline' }] as const;
const fmt = (n: number) => n.toLocaleString('ja-JP');
const OPENING_WORDMARK = require('./assets/mobidou-wordmark-brush.png');
const OPENING_EMBLEM = require('./assets/mobidou-opening-emblem.png');
const OPENING_TIMELINE = [
  { id: '0500-pre-dawn', time: '05:00', label: '明け方', image: require('./assets/backgrounds/opening-cycle/01-0500-pre-dawn.png') },
  { id: '0600-sunrise', time: '06:00', label: '朝焼け', image: require('./assets/backgrounds/opening-cycle/02-0600-sunrise.png') },
  { id: '0700-morning', time: '07:00', label: '朝', image: require('./assets/backgrounds/opening-cycle/03-0700-morning.png') },
  { id: '0830-morning', time: '08:30', label: '朝', image: require('./assets/backgrounds/opening-cycle/04-0830-morning.png') },
  { id: '1000-late-morning', time: '10:00', label: '午前', image: require('./assets/backgrounds/opening-cycle/05-1000-late-morning.png') },
  { id: '1130-before-noon', time: '11:30', label: '昼前', image: require('./assets/backgrounds/opening-cycle/06-1130-before-noon.png') },
  { id: '1300-noon', time: '13:00', label: '正午', image: require('./assets/backgrounds/opening-cycle/07-1300-noon.png') },
  { id: '1430-afternoon', time: '14:30', label: '午後', image: require('./assets/backgrounds/opening-cycle/08-1430-afternoon.png') },
  { id: '1600-late-afternoon', time: '16:00', label: '昼下がり', image: require('./assets/backgrounds/opening-cycle/09-1600-late-afternoon.png') },
  { id: '1730-golden-hour', time: '17:30', label: '黄金時間', image: require('./assets/backgrounds/opening-cycle/10-1730-golden-hour.png') },
  { id: '1830-sunset', time: '18:30', label: '夕陽', image: require('./assets/backgrounds/opening-cycle/11-1830-sunset.png') },
  { id: '1930-blue-hour', time: '19:30', label: '宵', image: require('./assets/backgrounds/opening-cycle/12-1930-blue-hour.png') },
  { id: '2100-night', time: '21:00', label: '夜', image: require('./assets/backgrounds/opening-cycle/13-2100-night.png') },
  { id: '2300-late-night', time: '23:00', label: '月夜', image: require('./assets/backgrounds/opening-cycle/14-2300-late-night.png') },
  { id: '0200-midnight', time: '02:00', label: '深夜', image: require('./assets/backgrounds/opening-cycle/15-0200-midnight.png') },
  { id: '0430-before-dawn', time: '04:30', label: '夜明け前', image: require('./assets/backgrounds/opening-cycle/16-0430-before-dawn.png') },
] as const;
function displayDate(day: string) { const [y, m, d] = day.split('-'); return `${y}年${Number(m)}月${Number(d)}日`; }

function StepRing({ steps, goal }: { steps: number; goal: number }) {
  const size = 248;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, steps / goal));
  return <View style={S.walkRingWrap}>
    <Svg width={size} height={size} style={S.walkRingSvg}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#D8D0C4" strokeWidth={stroke} fill="none" strokeLinecap="round" />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.red} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - progress)} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
    </Svg>
    <View style={S.walkRingCenter}><Text style={S.walkRingCount}>{fmt(steps)}</Text><Text style={S.walkRingUnit}>歩</Text><Text style={S.walkRingGoal}>目標 {fmt(goal)}歩</Text></View>
  </View>;
}

function OpeningScene({ scene, width, frameIndex, progress }: { scene: (typeof OPENING_TIMELINE)[number]; width: number; frameIndex: number; progress: Animated.Value }) {
  const lastFrameIndex = OPENING_TIMELINE.length - 1;
  const inputRange = frameIndex === 0
    ? [0, 1]
    : frameIndex === lastFrameIndex
      ? [lastFrameIndex - 1, lastFrameIndex]
      : [frameIndex - 1, frameIndex, frameIndex + 1];
  const outputRange = frameIndex === 0
    ? [1, 0]
    : frameIndex === lastFrameIndex
      ? [0, 1]
      : [0, 1, 0];
  return <Animated.View style={[S.openingScene, { width, opacity: progress.interpolate({ inputRange, outputRange, extrapolate: 'clamp' }) }]}>
    <Image source={scene.image} contentFit="cover" style={S.openingSceneImage} />
  </Animated.View>;
}

function OpeningExperience({ onEnter, error }: { onEnter: () => void; error?: string | null }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const frameProgress = useRef(new Animated.Value(0)).current;
  const enteringRef = useRef(false);
  const autoRunningRef = useRef(false);
  const gestureCommittedRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAnimationRef = useRef<{ stop: () => void } | null>(null);

  const complete = useCallback(() => {
    if (enteringRef.current) return;
    enteringRef.current = true;
    settleTimerRef.current = setTimeout(onEnter, 420);
  }, [onEnter]);

  useEffect(() => () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    autoAnimationRef.current?.stop();
  }, []);

  useEffect(() => {
    const listenerId = frameProgress.addListener(({ value }) => {
      if (!autoRunningRef.current) return;
      const visualIndex = Math.max(0, Math.min(OPENING_TIMELINE.length - 1, Math.round(value)));
      if (visualIndex !== indexRef.current) {
        indexRef.current = visualIndex;
        setIndex(visualIndex);
      }
    });
    return () => frameProgress.removeListener(listenerId);
  }, [frameProgress]);

  const startAutoJourney = useCallback(() => {
    if (width <= 0 || autoRunningRef.current || enteringRef.current) return;
    autoRunningRef.current = true;
    gestureCommittedRef.current = true;
    frameProgress.stopAnimation();
    const startIndex = indexRef.current;
    const finalIndex = OPENING_TIMELINE.length - 1;
    setIndex(startIndex);
    const animation = Animated.timing(frameProgress, {
      toValue: finalIndex,
      duration: 4000,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    autoAnimationRef.current = animation;
    animation.start(({ finished }) => {
      autoAnimationRef.current = null;
      if (!finished) return;
      indexRef.current = finalIndex;
      setIndex(finalIndex);
      complete();
    });
  }, [complete, frameProgress, width]);

  const finishGesture = useCallback((gesture: { dx: number; dy: number }) => {
    if (width <= 0 || autoRunningRef.current) return;
    if (gestureCommittedRef.current) {
      gestureCommittedRef.current = false;
      return;
    }
    const threshold = Math.max(48, width * .18);
    if (Math.hypot(gesture.dx, gesture.dy) >= threshold) startAutoJourney();
  }, [startAutoJourney, width]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !enteringRef.current && !autoRunningRef.current,
    onStartShouldSetPanResponderCapture: () => !enteringRef.current && !autoRunningRef.current,
    onMoveShouldSetPanResponder: (_, gesture) => !enteringRef.current && !autoRunningRef.current && Math.hypot(gesture.dx, gesture.dy) > 4,
    onMoveShouldSetPanResponderCapture: (_, gesture) => !enteringRef.current && !autoRunningRef.current && Math.hypot(gesture.dx, gesture.dy) > 4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      gestureCommittedRef.current = false;
      frameProgress.stopAnimation();
    },
    onPanResponderMove: (_, gesture) => {
      if (width <= 0 || autoRunningRef.current) return;
      if (gestureCommittedRef.current) return;
      const threshold = Math.max(48, width * .18);
      if (Math.hypot(gesture.dx, gesture.dy) >= threshold) {
        gestureCommittedRef.current = true;
        startAutoJourney();
      }
    },
    onPanResponderRelease: (_, gesture) => finishGesture(gesture),
    onPanResponderTerminate: (_, gesture) => finishGesture(gesture),
  }), [finishGesture, frameProgress, startAutoJourney, width]);

  return <SafeAreaView
    accessibilityLabel="オープニング。画面を上下左右にスライドして開始"
    accessibilityHint="どの方向にスライドしても、16枚の背景が時間の流れに沿って切り替わり、その後アプリを開始します"
    style={[S.opening, Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as any) : null]}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    {...pan.panHandlers}
  >
    <View pointerEvents="none" style={[S.openingTrack, { width: Math.max(1, width) }]}>
      {OPENING_TIMELINE.map((scene, sceneIndex) => <OpeningScene key={scene.id} scene={scene} width={width} frameIndex={sceneIndex} progress={frameProgress} />)}
    </View>
    <View pointerEvents="none" style={S.openingContent}>
      <View style={S.openingMiddleSpace}>
        <Image source={OPENING_WORDMARK} contentFit="contain" style={S.openingCenterWordmark} />
        <Image source={OPENING_EMBLEM} contentFit="contain" style={S.openingEmblem} />
      </View>
      <View style={S.openingCopy}>
        <Text style={S.openingTagline}>歩くたび、小さな旅。</Text>
        <Text style={S.openingSubline}>モビーと歩いて、もびの世界へ。</Text>
        <Text style={S.openingStage}>{OPENING_TIMELINE[index].time}  {OPENING_TIMELINE[index].label}</Text>
     </View>
     {!!error && <Text style={[S.errorText, S.openingError]}>{error}</Text>}
      <Text style={S.openingSwipeHint}>画面をスライドしてね</Text>
    </View>
  </SafeAreaView>;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Shippori: ShipporiMincho_500Medium, ShipporiBold: ShipporiMincho_700Bold });
  return <SafeAreaProvider><StatusBar style="dark" /><Main fontsReady={fontsLoaded || !!fontError} /></SafeAreaProvider>;
}
function Main({ fontsReady }: { fontsReady: boolean }) {
  const journey = useJourney();
  const { data, progress } = journey;
  const [tab, setTab] = useState<Tab>('home');
  const [outingTab, setOutingTab] = useState<OutingTab>('count');
  const [filter, setFilter] = useState<'all' | 'collected' | 'locked'>('all');
  const [featured, setFeatured] = useState(0);
  const [detail, setDetail] = useState<Shrine | null>(null);
  const [settings, setSettings] = useState(false);
  const [overlayBusy, setOverlayBusy] = useState(false);
  const [info, setInfo] = useState<'privacy' | 'about' | null>(null);
  const [openingVisible, setOpeningVisible] = useState(true);
  const [routePicker, setRoutePicker] = useState(false);
  const [legacyBook, setLegacyBook] = useState(false);
  const [backgroundSeason, setBackgroundSeason] = useState<BackgroundSeason>(() => getBackgroundOption(data.backgroundId).season);
  const scroll = useRef<ScrollView>(null);
  const collectionScrollX = useRef(new Animated.Value(0)).current;
  const pet = getPetCharacter(data.pet);
  const currentBackground = getBackgroundOption(data.backgroundId);
  const activeRoute = getPilgrimage(progress.routeId);
  const routeSteps = creditedSteps(progress);
  const activeShrines = pilgrimageShrines(activeRoute);
  const routePrefix = data.demo ? 'trial:' : 'real:';
  const routeRecords = Object.fromEntries(PILGRIMAGES.flatMap(route => {
    const record = activeRoute?.id === route.id ? progress : data.routes?.[`${routePrefix}${route.id}`];
    return record ? [[route.id, record]] : [];
  }));
  const collectionRewardDates = Object.fromEntries(progress.rewards.map(reward => [reward.id, displayDate(reward.date)]));
  const routeBookOwned = !!activeRoute && data.bookDesigns.owned[activeRoute.id] === true;
  const routeBookSelected = !!activeRoute && data.bookDesigns.selected[activeRoute.id] === 'route' && routeBookOwned;
  const backgroundChoices = BACKGROUND_OPTIONS.filter(option => option.season === backgroundSeason);
  const today = activeShrines.slice(progress.dayStart, progress.dayStart + (activeRoute?.targets.length ?? 3));
  const nextIndex = today.findIndex((_, index) => !progress.rewards.some(r => r.id === (activeRoute?.ids[progress.dayStart + index] ?? today[index].id)));
  const next = nextIndex >= 0 ? today[nextIndex] : undefined;
  const nextTarget = nextIndex >= 0 ? (activeRoute?.targets[nextIndex] ?? DAILY_TARGETS[nextIndex]) : (activeRoute?.targets.at(-1) ?? 5000);
  const collected = activeShrines.filter((_, index) => progress.rewards.some(r => r.id === (activeRoute?.ids[index] ?? activeShrines[index].id)));
  const latestIndex = Math.max(0, collected.length - 1);
  const latest = collected[latestIndex] ?? activeShrines[0] ?? SHRINES[0];
  const latestReward = progress.rewards[latestIndex];
  const visible = activeShrines.map((shrine, index) => ({ shrine, index })).filter(({ index }) => filter === 'all' || (filter === 'collected' ? index < collected.length : index >= collected.length));
  const selectedIndex = featured % activeShrines.length;
  const selected = activeShrines[selectedIndex] ?? SHRINES[0];
  const selectedReward = progress.rewards[selectedIndex];
  const [turning, setTurning] = useState(false);
  const [turnSnapshot, setTurnSnapshot] = useState<Shrine | null>(null);
  const [turnDirection, setTurnDirection] = useState<1 | -1>(1);
  const pageTurn = useRef(new Animated.Value(0)).current;
  const pendingIndex = progress.pending[0] ? (activeRoute?.ids.indexOf(progress.pending[0]) ?? -1) : -1;
  const pending = pendingIndex >= 0 ? activeShrines[pendingIndex] : SHRINES.find(s => s.id === progress.pending[0]);
  const awardVisible = !!pending && data.onboarded && !settings && !detail && !routePicker && !overlayBusy && !openingVisible && !legacyBook;
  const move = (value: Tab) => { if (value === 'collection') collectionScrollX.setValue(0); setTab(value); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const enterApp = () => { setOpeningVisible(false); if (!data.onboarded) journey.enter(false); };
  const turnPage = useCallback((direction: 1 | -1) => {
    if (turning || activeShrines.length < 2) return;
    setTurnSnapshot(selected);
    setTurnDirection(direction);
    setFeatured((selectedIndex + direction + activeShrines.length) % activeShrines.length);
    setTurning(true);
    pageTurn.setValue(0);
    Animated.timing(pageTurn, { toValue: 1, duration: 430, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() => {
      setTurnSnapshot(null);
      setTurning(false);
    });
  }, [activeShrines.length, pageTurn, selected, selectedIndex, turning]);
  const bookPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy) + 12 && Math.abs(gesture.dx) > 18,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 46) turnPage(gesture.dx < 0 ? 1 : -1);
    },
  }), [turnPage]);
  const renderBookSpread = (book: Shrine, reward: (typeof progress.rewards)[number] | undefined) => <View style={S.openBook}>
    <View style={S.bookLeft}><Stamp shrine={book} locked={!reward} /><View style={S.bookBinding} /></View>
    <View style={S.bookRight}>
      <Text style={S.bookReading}>{book.reading}</Text><Text style={S.bookName}>{book.name}</Text><View style={S.shortRule} /><Text style={S.bookTheme}>{book.theme}</Text><Text style={S.bookDescription}>{book.description}</Text>
      <View style={S.inline}><Torii size={16} color={C.muted} /><Text style={S.bookLocation}>{book.place}</Text></View>
      <Pressable accessibilityRole="button" onPress={() => setDetail(book)} style={S.bookDetail}><Text style={S.bookDetailText}>{reward ? 'このご縁をみる' : 'まだ見ぬご縁をみる'}</Text><Icon name="chevron-forward" color="#FFF9EE" size={13} /></Pressable>
    </View>
  </View>;
  useEffect(() => { setBackgroundSeason(currentBackground.season); }, [currentBackground.season]);
  useEffect(() => { if (!openingVisible && journey.ready && !progress.routeId) setRoutePicker(true); }, [openingVisible, journey.ready, progress.routeId, data.demo]);
  useEffect(() => {
    if (settings || detail || routePicker || openingVisible) { setOverlayBusy(true); return; }
    const timer = setTimeout(() => setOverlayBusy(false), 380);
    return () => clearTimeout(timer);
  }, [settings, detail, routePicker, openingVisible]);

  if (!journey.ready || !fontsReady) return <View style={S.loading}><Text style={S.logo}>もび道</Text><ActivityIndicator color={C.red} /><Text style={S.muted}>ご縁の支度をしています</Text></View>;
  return <View style={S.desktop}><SafeAreaView style={S.app}>
    {tab !== 'collection' && <>
      <Image source={currentBackground.image} contentFit="cover" style={S.backgroundArt} pointerEvents="none" />
      <View pointerEvents="none" style={S.backgroundWash} />
      <Clouds />
    </>}
    {tab === 'collection' && <CollectionBackdrop itemCount={activeShrines.length || 6} scrollX={collectionScrollX} />}
    <View style={S.header}>
      <View style={S.headerSide}><Text style={S.brandMini}>歩く、集める、</Text><Text style={S.brandMini}>好きになる。</Text></View>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="もび道 ホームへ" onPress={() => move('home')} style={S.brand}><Image source={require('./assets/mobidou-wordmark-brush.png')} style={S.headerLogo} contentFit="contain" /><Image source={require('./assets/mobidou-icon.png')} style={S.logoMark} contentFit="contain" /></Pressable>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="設定を開く" onPress={() => setSettings(true)} style={S.gear}><Icon name="settings-outline" size={21} /></Pressable>
    </View>
    {data.demo && <View style={[S.demoBar, tab === 'collection' && S.collectionChrome]}><View style={S.dot} /><Text style={S.demoText}>体験モード · 実際の歩数・御朱印帳とは別の記録</Text><Pressable accessibilityRole="button" accessibilityLabel="体験モードを終了" onPress={() => journey.enter(false)} style={{ padding: 7 }}><Icon name="close" size={14} color={C.red} /></Pressable></View>}
    {!!journey.error && <View style={S.error}><Text style={S.errorText}>{journey.error}</Text><Pressable accessibilityRole="button" accessibilityLabel="お知らせを閉じる" onPress={journey.dismissError} style={{ padding: 8 }}><Icon name="close" size={18} color={C.red} /></Pressable></View>}
    <ScrollView ref={scroll} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
      {tab === 'home' && <>
        <View style={S.homeHeading}><View style={S.hairline} /><Text style={S.chapter}>日々を、ひとめぐり。</Text><View style={S.hairline} /></View>
        <Companion pet={pet} haptics={data.haptics} onBond={journey.bond} />
        {activeRoute && <Pressable accessibilityRole="button" accessibilityLabel={`巡礼中 ${activeRoute.name}。コースを変更`} onPress={() => setRoutePicker(true)} style={S.routeHero}>
          <View style={{ flex: 1 }}><Text style={S.smallTag}>{activeRoute.type} · {progress.rewards.length}/{activeRoute.ids.length}</Text><Text style={S.routeHeroTitle}>{activeRoute.name}</Text><Text style={S.latestText}>{progress.completedAt ? `結願 · ${activeRoute.gift}` : activeRoute.subtitle}</Text></View><Icon name="map-outline" size={28} color={activeRoute.color} />
        </Pressable>}
        <View style={S.stepsCard}><WashiArt />
          <View style={S.between}><Text style={S.eyebrow}>{new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} のあしあと</Text><Pressable accessibilityRole="button" accessibilityLabel="歩数を更新" onPress={() => void journey.refresh()} disabled={journey.busy} style={S.refresh}><Icon name="refresh" size={14} color={C.muted} /><Text style={S.tiny}>{data.demo ? '体験の歩数' : journey.busy ? '更新中' : journey.synced || sourceLabel[data.source]}</Text></Pressable></View>
          <View style={S.stepValueRow}><Text style={S.stepValue}>{fmt(progress.steps)}</Text><Text style={S.stepUnit}>歩</Text><View style={S.stepFlower}><Icon name="flower-outline" size={35} color="#BEA48F" /></View></View>
          <Meter value={routeSteps / nextTarget} />
          <View style={[S.between, { marginTop: 12 }]}><Text style={S.stepCaption}>{next ? <>次のご縁まで <Text style={{ color: C.red, fontWeight: '600' }}>{fmt(Math.max(0, nextTarget - routeSteps))}歩</Text></> : collected.length === activeShrines.length ? 'この巡礼を結願しました。' : '今日のご縁が、すべて結ばれました。'}</Text><Text style={S.tiny}>{next ? `${fmt(nextTarget)}歩` : 'おつかれさま'}</Text></View>
        </View>
        {data.demo ? <Button title="体験で1,000歩あるく" icon="footsteps-outline" secondary onPress={journey.demoWalk} style={{ marginTop: 12 }} /> : data.source === 'none' && <Button title="歩数をつないで、はじめる" icon="footsteps-outline" onPress={() => void journey.connect()} disabled={journey.busy} style={{ marginTop: 12 }} />}
        {data.demo && !next && !progress.completedAt && <Button title="体験の翌日へ進む" secondary onPress={journey.demoTomorrow} style={{ marginTop: 12 }} />}
        <Section title="ご縁を、ひとつずつ。" action="御朱印帳へ" actionArtwork={false} onPress={() => move('book')} />
        <Pressable accessibilityRole="button" accessibilityLabel={`${latest.name}の詳細を見る`} onPress={() => { setFeatured(latestIndex); setDetail(latest); }} style={S.latest}>
          <Stamp shrine={latest} style={{ width: 100 }} />
          <View style={{ flex: 1, gap: 9 }}><Text style={S.smallTag}>{latestReward ? '最近授かった御朱印' : 'はじめてのご縁'}</Text><Text style={S.latestName}>{latest.name}</Text><Text style={S.latestText}>{latest.theme}</Text><View style={S.inline}><Text style={S.linkText}>{latestReward ? '思い出をひらく' : '御朱印をのぞいてみる'}</Text><Icon name="arrow-forward" size={14} color={C.red} /></View></View>
        </Pressable>
        <Text style={S.footerNote}>遠くに行かなくても、いつもの散歩が小さな旅に。</Text>
      </>}

      {tab === 'book' && <>
        <View style={S.pageHeading}><Text style={S.pageTitle}>御朱印帳</Text><Text style={S.subtitle}>めぐった日々の、やさしいご縁。</Text></View>
        {activeRoute && <View style={S.bookDesignPanel}>
          <WashiArt />
          <View style={S.bookDesignHeader}><View><Text style={S.eyebrow}>御朱印帳のきせかえ</Text><Text style={S.bookDesignTitle}>{activeRoute.name} 専用帳</Text></View><Icon name="book-outline" size={25} color={activeRoute.color} /></View>
          <View style={S.bookDesignChoices}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: !routeBookSelected }} onPress={() => journey.selectBookDesign(activeRoute.id, 'normal')} style={[S.bookDesignChoice, !routeBookSelected && S.bookDesignChoiceActive]}><Text style={S.bookDesignChoiceTitle}>標準</Text><Text style={S.bookDesignChoiceNote}>最初から使えます</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: routeBookSelected }} onPress={() => routeBookOwned ? journey.selectBookDesign(activeRoute.id, 'route') : journey.purchaseBookDesign(activeRoute.id)} style={[S.bookDesignChoice, routeBookSelected && S.bookDesignChoiceActive]}>
              <Image source={PILGRIMAGE_IMAGES[activeRoute.id]} contentFit="cover" style={S.bookDesignArt} pointerEvents="none" /><View pointerEvents="none" style={S.bookDesignShade} />
              <Text style={[S.bookDesignChoiceTitle, S.bookDesignRouteText]}>{routeBookOwned ? '専用帳を使う' : '専用帳を仮購入'}</Text><Text style={[S.bookDesignChoiceNote, S.bookDesignRouteText]}>{routeBookOwned ? '購入済み' : '価格未設定・決済なし'}</Text>
            </Pressable>
          </View>
        </View>}
        <View style={[S.bookWrap, routeBookSelected && activeRoute ? { backgroundColor: activeRoute.color, borderColor: activeRoute.color } : null]}>
          <WashiArt /><View style={S.bookTop}><Text style={S.bookNumber}>MOBIDOU GOSHUIN BOOK</Text><Text style={S.bookNumber}>{String(selectedIndex + 1).padStart(2, '0')} / {String(activeShrines.length).padStart(2, '0')}</Text></View>
          <View {...bookPanResponder.panHandlers} style={S.bookViewport}>
            {renderBookSpread(selected, selectedReward)}
            {turnSnapshot && <Animated.View pointerEvents="none" style={[S.bookFlip, { transform: [{ perspective: 950 }, { rotateY: pageTurn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', turnDirection === 1 ? '-86deg' : '86deg'] }) }, { translateX: pageTurn.interpolate({ inputRange: [0, 1], outputRange: [0, turnDirection * 7] }) }] }]}>{renderBookSpread(turnSnapshot, progress.rewards[selectedIndex])}</Animated.View>}
          </View>
          <View style={S.bookBottom}><Text style={S.bookDate}>{selectedReward ? `${displayDate(selectedReward.date)} 結縁` : 'これからの一歩が、この一枚に。'}</Text><Text style={S.bookSwipeHint}>スワイプでもめくれます</Text><Torii size={19} color={C.red} /></View>
        </View>
        <View style={S.pager}><Pressable accessibilityRole="button" accessibilityLabel="前の御朱印ページ" disabled={turning} onPress={() => turnPage(-1)} style={[S.pagerButton, turning && { opacity: .45 }]}><Icon name="chevron-back" size={18} /></Pressable><View style={S.pageCounter}><Text style={S.pageCounterText}>{String(selectedIndex + 1).padStart(2, '0')} / {String(activeShrines.length).padStart(2, '0')}</Text><Text style={S.pageCounterHint}>左右の矢印でページをめくる</Text></View><Pressable accessibilityRole="button" accessibilityLabel="次の御朱印ページ" disabled={turning} onPress={() => turnPage(1)} style={[S.pagerButton, turning && { opacity: .45 }]}><Icon name="chevron-forward" size={18} /></Pressable></View>
        {activeRoute && progress.completedAt && <CompletionPage route={activeRoute} progress={progress} />}
        <View style={S.collectionProgress}><WashiArt /><Icon name="flower" size={26} color={C.red} /><View style={{ flex: 1 }}><View style={[S.between, { marginBottom: 10 }]}><Text style={S.progressLabel}>集めたご縁</Text><Text style={S.count}><Text style={S.countRed}>{collected.length}</Text> / {activeShrines.length}<Text style={S.tiny}> 印</Text></Text></View><Meter value={collected.length / activeShrines.length} /></View></View>
        <View style={S.filters}>{([['all', 'すべて', activeShrines.length], ['collected', '集めた', collected.length], ['locked', 'これから', activeShrines.length - collected.length]] as const).map(([key, label, total]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: filter === key }} onPress={() => setFilter(key)} style={[S.filter, filter === key && S.filterActive]}><Text style={[S.filterText, filter === key && { color: '#FFFCF5' }]}>{label} ({total})</Text></Pressable>)}</View>
        {visible.length === 0 && <View style={S.empty}><Torii size={42} color={C.gold} /><Text style={S.emptyTitle}>{filter === 'locked' ? 'すべてのご縁が、つながりました。' : '最初の一枚を、ゆっくりと。'}</Text><Text style={S.emptyText}>{filter === 'locked' ? '御朱印帳をひらいて、歩いた日々を振り返ろう。' : '1,000歩から、モビーとの物語が始まります。'}</Text><Button title="おでかけをみる" secondary onPress={() => move('walk')} /></View>}
        <View style={S.stampGrid}>{visible.map(({ shrine: s, index }) => { const owned = index < collected.length; return <Pressable accessibilityRole="button" accessibilityLabel={`${s.name} ${owned ? '取得済み' : '未取得'}`} key={`${s.id}-${index}`} onPress={() => { setFeatured(index); setDetail(s); }} style={S.stampCard}><Stamp shrine={s} locked={!owned} /><View style={S.stampLabel}><Text style={S.stampName}>{activeRoute?.type === '七願掛け' ? `第${index + 1}巡 · ${s.name}` : s.name}</Text><Text style={S.stampTheme}>{s.theme}</Text></View>{owned && <View style={S.ownedDot}><Icon name="flower" color={C.red} size={15} /></View>}</Pressable>; })}</View>
        <Text style={S.footerNote}>すべて、もびの世界にだけある架空の社です。</Text>
      </>}

      {tab === 'walk' && <>
        <View style={S.outingTabs} accessibilityRole="tablist">
          {([['count', 'カウント'], ['map', 'マップ']] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: outingTab === id }} onPress={() => { setOutingTab(id); scroll.current?.scrollTo({ y: 0, animated: false }); }} style={[S.outingTab, outingTab === id && S.outingTabActive]}><Text style={[S.outingTabText, outingTab === id && S.outingTabTextActive]}>{label}</Text><View style={[S.outingTabIndicator, { opacity: outingTab === id ? 1 : 0 }]} /></Pressable>)}
        </View>
        {outingTab === 'count' && <>
          <View style={S.walkMinimal}>
            <View style={S.walkMinimalHeader}><View><Text style={S.walkMinimalTitle}>おでかけ</Text><Text style={S.walkMinimalSubtitle}>今日の歩数</Text></View><Pressable accessibilityRole="button" accessibilityLabel="歩数を更新" onPress={() => void (data.source === 'none' ? journey.connect() : journey.refresh())} disabled={journey.busy} style={S.walkRefresh}><Icon name="refresh" size={18} color={C.red} /><Text style={S.walkRefreshText}>{data.source === 'none' ? '連携' : journey.busy ? '更新中' : '更新'}</Text></Pressable></View>
            <Text style={S.routeHeroTitle}>{activeRoute?.name}</Text><StepRing steps={routeSteps} goal={nextTarget} />
            <Text style={S.demoHelp}>{progress.completedAt ? '結願しました。次の巡礼へ出かけましょう。' : next ? `次は ${next.name} · あと ${fmt(Math.max(0, nextTarget - routeSteps))}歩` : '今日の巡礼はここまで。また明日つづきを歩こう。'}</Text>
          </View>
          {activeRoute && (data.demo ? <Button title="体験で1,000歩あるく" icon="footsteps-outline" onPress={journey.demoWalk} style={S.walkDemoButton} /> : <Button title={data.source === 'none' ? '歩数を連携する' : journey.busy ? '歩数を更新しています…' : '今日の歩数を更新'} icon="refresh" disabled={journey.busy} onPress={() => void (data.source === 'none' ? journey.connect() : journey.refresh())} style={S.walkDemoButton} />)}
        </>}
        {outingTab === 'map' && activeRoute && <>
          <Section title="いま歩いている巡礼" subtitle={`${activeRoute.type} · ${progress.rewards.length}/${activeRoute.ids.length}`} action="旅を選び直す" onPress={() => setRoutePicker(true)} />
          <RouteMap route={activeRoute} count={progress.rewards.length} progress={progress} pet={pet} onStop={(shrine, index) => { setFeatured(index); setDetail(shrine); }} />
          <View style={S.walkNote}><WashiArt /><Text style={S.walkNoteText}>{activeRoute.completion}と、{activeRoute.gift}を授かります。歩きながらの操作はせず、立ち止まって確認してください。</Text></View>
        </>}
      </>}

      {tab === 'collection' && <CollectionGallery shrines={activeShrines} rewardIds={progress.rewards.map(reward => reward.id)} rewardDates={collectionRewardDates} special={journey.special} onPurchasePass={journey.purchasePass} scrollX={collectionScrollX} />}

      {tab === 'pets' && <>
        <View style={S.pageHeading}><Text style={S.pageTitle}>いっしょに、もび道。</Text><Text style={S.subtitle}>気になる子と、今日を歩こう。</Text></View>
        <View style={S.chosenPet}><WashiArt /><Image source={PET_BACKGROUNDS[pet.id]} style={S.chosenPetBackdrop} contentFit="cover" pointerEvents="none" /><View pointerEvents="none" style={S.chosenPetWash} /><Image source={pet.image} style={{ width: 100, height: 110 }} contentFit="contain" /><View style={{ flex: 1 }}><Text style={S.smallTag}>あなたの相棒</Text><Text style={S.chosenName}>{pet.name}</Text><Text style={S.latestText}>{pet.catchphrase}</Text><Text style={S.affection}>♡ ふれあい {(data.affection[data.pet] ?? 0)} 回</Text></View></View>
        <Section title="モビーたち" subtitle={`${PET_CHARACTERS.length}体、みんな最初から選べます。`} />
        <View style={S.petGrid}>{PET_CHARACTERS.map(p => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${p.name}を相棒にする`} accessibilityState={{ selected: data.pet === p.id }} onPress={() => journey.choosePet(p.id)} style={[S.petCard, data.pet === p.id && S.petCardActive]}><Image source={PET_BACKGROUNDS[p.id]} style={S.petBackdropImage} contentFit="cover" pointerEvents="none" /><View pointerEvents="none" style={S.petBackdropWash} /><View pointerEvents="none" style={[S.petBackdropTint, { backgroundColor: p.accent + '35' }]} /><Image source={p.image} style={S.petThumb} contentFit="contain" /><Text style={S.petName}>{p.name}</Text>{data.pet === p.id && <View style={S.petCheck}><Icon name="checkmark" size={11} color="#FFF" /></View>}</Pressable>)}</View>
        <Button title={`${pet.name}とふれあう`} onPress={() => move('home')} style={{ marginTop: 22 }} />
      </>}
    </ScrollView>
    <View style={[S.nav, tab === 'collection' && S.collectionNav]}>{TABS.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} onPress={() => move(item.id)} style={S.navItem}><Icon name={item.icon} size={24} color={tab === item.id ? C.red : '#81796D'} /><Text style={[S.navText, tab === item.id && { color: C.red }]}>{item.title}</Text><View style={[S.navIndicator, { opacity: tab === item.id ? 1 : 0 }]} /></Pressable>)}</View>

    <Modal visible={routePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (activeRoute) setRoutePicker(false); }}><SafeAreaView style={S.modal}><PilgrimagePicker activeId={activeRoute?.id} records={routeRecords} pet={pet} onClose={() => { if (activeRoute) setRoutePicker(false); }} onSelect={routeId => { journey.selectRoute(routeId); setFeatured(0); setFilter('all'); setRoutePicker(false); move('walk'); }} /></SafeAreaView></Modal>

    <Modal visible={!!detail} onShow={() => setOverlayBusy(true)} onDismiss={() => { setDetail(null); setOverlayBusy(false); }} animationType="slide" onRequestClose={() => setDetail(null)} presentationStyle="pageSheet"><SafeAreaView style={S.modal}><View style={S.modalHeader}><Text style={S.modalTitle}>ご縁のものがたり</Text><Close onPress={() => setDetail(null)} /></View>{detail && <ScrollView contentContainerStyle={S.detailContent}><Text style={S.detailReading}>{detail.reading}</Text><Text style={S.detailName}>{detail.name}</Text><Stamp shrine={detail} style={{ width: '65%', maxWidth: 290, alignSelf: 'center', marginVertical: 24 }} /><Text style={S.detailTheme}>{detail.theme}</Text><Text style={S.detailDescription}>{detail.description}</Text><View style={S.detailMeta}><Meta icon="location-outline" text={detail.place} /><Meta icon="leaf-outline" text={detail.blessing} /><Meta icon="book-outline" text={detail.stampLocation} />{(() => { const reward = progress.rewards[featured]; return reward ? <><Meta icon="calendar-outline" text={`${displayDate(reward.date)} に授かりました`} /><Meta icon="footsteps-outline" text={`${fmt(reward.threshold)}歩のご縁 · 獲得時 ${fmt(reward.steps)}歩${data.demo ? '（体験）' : ''}`} /></> : <Meta icon="lock-closed-outline" text="これから出会う御朱印です。歩数を重ねて順番に解放。" />; })()}</View><Text style={S.footerNote}>もびの世界だけに存在する、架空の社・御朱印です。</Text><Button title="御朱印帳にもどる" onPress={() => { setDetail(null); move('book'); }} secondary /></ScrollView>}</SafeAreaView></Modal>

    <Modal visible={settings} onShow={() => setOverlayBusy(true)} onDismiss={() => { setSettings(false); setInfo(null); setOverlayBusy(false); }} animationType="slide" onRequestClose={() => setSettings(false)} presentationStyle="pageSheet"><SafeAreaView style={S.modal}><View style={S.modalHeader}><Text style={S.modalTitle}>旅のしたく</Text><Close onPress={() => { setInfo(null); setSettings(false); }} /></View>{!!journey.error && <View style={S.error}><Text style={S.errorText}>{journey.error}</Text></View>}<ScrollView contentContainerStyle={S.settingsContent}>
      <Section title="歩数のつながり" /><View style={S.settingCard}><WashiArt /><Meta icon="footsteps-outline" text={sourceLabel[data.source]} /><Text style={S.settingHelp}>{data.source === 'healthkit' ? 'ヘルスケアの当日歩数を読み取ります。0歩のままの場合は、ヘルスケアの共有設定をご確認ください。読み取り権限の拒否はアプリから判別できません。' : data.source === 'motion' ? 'Expo Goではモーションとフィットネスから読み取ります。HealthKitはiOSの開発ビルドで利用できます。' : 'iPhoneで歩数を連携すると、今日の歩数で御朱印を集められます。'}
      </Text><Button title="歩数を連携する" disabled={journey.busy} onPress={() => void journey.connect()} />{Platform.OS === 'ios' && <Button title="iPhoneの設定をひらく" secondary onPress={() => void Linking.openSettings().catch(() => {})} style={{ marginTop: 10 }} />}</View>
      <View style={S.settingRow}><View style={{ flex: 1 }}><Text style={S.settingLabel}>ふれあいの振動</Text><Text style={S.settingHelp}>なでたとき・御朱印を授かったとき</Text></View><Switch accessibilityLabel="ふれあいの振動" value={data.haptics} onValueChange={journey.toggleHaptics} trackColor={{ true: C.red, false: '#CCC4B8' }} /></View>
      <Section title="巡礼の旅" /><Text style={S.settingHelp}>{activeRoute ? `${activeRoute.name}を巡礼中。途中で旅を変えても、これまでの記録は残ります。` : '最初に、これから辿る巡礼を選びます。'}</Text><Button title="巡礼コースを選ぶ" icon="map-outline" onPress={() => { setSettings(false); setRoutePicker(true); }} />
      <Section title="背景の季節" /><Text style={S.settingHelp}>季節と景色を選ぶと、ホームの背景が切り替わります。選択は端末に保存されます。</Text>
      <View style={S.seasonTabs}>{BACKGROUND_SEASONS.map(season => <Pressable key={season.id} accessibilityRole="button" accessibilityState={{ selected: backgroundSeason === season.id }} onPress={() => setBackgroundSeason(season.id)} style={[S.seasonTab, backgroundSeason === season.id && { backgroundColor: season.color, borderColor: season.color }]}><Text style={[S.seasonTabText, backgroundSeason === season.id && { color: '#FFF9EF' }]}>{season.label}</Text></Pressable>)}</View>
      <View style={S.backgroundGrid}>{backgroundChoices.map(option => { const selectedBackground = data.backgroundId === option.id; return <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`${option.label}（${option.note}）を背景にする`} accessibilityState={{ selected: selectedBackground }} onPress={() => journey.chooseBackground(option.id)} style={[S.backgroundOption, selectedBackground && S.backgroundOptionActive]}><Image source={option.image} style={S.backgroundImage} contentFit="cover" /><View pointerEvents="none" style={S.backgroundOptionShade} /><View pointerEvents="none" style={S.backgroundOptionCopy}><Text style={S.backgroundOptionLabel}>{option.label}</Text><Text style={S.backgroundOptionNote}>{option.note}</Text></View>{selectedBackground && <View style={S.backgroundCheck}><Icon name="checkmark" size={13} color="#FFF" /></View>}</Pressable>; })}</View>
      <Section title="もび道を体験" /><Text style={S.settingHelp}>体験用の御朱印帳で、お散歩と授与演出を試せます。本番の記録には影響しません。</Text><Button title={data.demo ? '体験を終えて実記録にもどる' : '体験モードをはじめる'} secondary onPress={() => { journey.enter(!data.demo); setSettings(false); move('home'); }} />
      <Section title="このアプリについて" /><Button title="プライバシーとデータ" secondary onPress={() => setInfo('privacy')} /><Button title="もび道について・利用上の案内" secondary onPress={() => setInfo('about')} style={{ marginTop: 10 }} />
      <Text style={S.footerNote}>{'もび道（もびどう） 1.0.0\n今日の一歩に、小さなご縁を。'}</Text>
    </ScrollView>{!!info && (<View style={S.infoBackdrop}><View style={S.infoCard}><WashiArt /><Text style={S.modalTitle}>{info === 'privacy' ? 'プライバシーとデータ' : 'もび道について'}</Text><ScrollView style={{ maxHeight: 380 }}><Text style={S.infoText}>{info === 'privacy' ? 'もび道は、今日の歩数・集めた御朱印・選んだモビー・ふれあい回数・設定を端末内に保存します。\n\nログイン、広告、アクセス解析、サーバー送信はありません。GPSも使用しません。歩数は御朱印の解放にのみ使用し、ヘルスケアへ書き込みません。\n\n端末を変更しても記録は自動では引き継がれません。アプリを削除すると記録は失われる場合があります。歩数アクセスはiPhoneの設定からいつでも変更できます。' : 'もび道（もびどう）は、モビーと歩いて架空の御朱印を集めるアプリです。\n\n巡礼は、日常の場所から特別な場所へ移動し、道中の祈りや記録を経て日常へ戻る旅。もび道では、神域参詣・山岳修行・札所周回・観音巡礼・七願掛け・物語の聖地巡礼という6つの旅の型から選べます。\n\n各地点は社・宮・寺・観音堂などの参拝先として設計し、参拝後に境内の授与所で御朱印を授かります。登場する社・宮・地名・御朱印はすべて、もびの世界の創作です。実在の宗教施設や実際の参拝・授与品とは関係ありません。\n\n歩数は1日単位で、端末の現地時間に合わせて切り替わります。御朱印は順番に解放され、最後まで歩き切ると結願証・称号・専用の結願印を授かります。\n\n歩きながらの画面操作は立ち止まって。体調に合わせて、無理なく楽しんでください。'}</Text></ScrollView><Button title="とじる" onPress={() => setInfo(null)} /></View></View>)}</SafeAreaView></Modal>



    <Modal visible={openingVisible} animationType="fade" onRequestClose={() => {}}><OpeningExperience onEnter={enterApp} error={journey.error} /></Modal>
    <Modal visible={awardVisible} animationType="fade" onRequestClose={() => {}}>{awardVisible && pending && <PilgrimageAward key={`${data.demo}-${progress.routeId}-${progress.pending[0]}`} shrine={pending} pet={pet} walkSource={PILGRIMAGE_WALK_ATLASES[pet.id]} demo={data.demo} haptics={data.haptics} route={activeRoute} stopIndex={pendingIndex} special={journey.special} onPurchasePass={journey.purchasePass} onRedeemPass={journey.redeemPass} onClose={() => { const index = Math.max(0, collected.length - progress.pending.length); journey.acknowledge(); setFeatured(index); move('book'); }} />}</Modal>
  </SafeAreaView></View>;
}
function Close({ onPress }: { onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onPress} style={S.close}><Icon name="close" /></Pressable>; }
function Meta({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) { return <View style={S.meta}><Icon name={icon} size={18} color={C.gold} /><Text style={S.metaText}>{text}</Text></View>; }

const S = StyleSheet.create({
  desktop: { flex: 1, backgroundColor: '#E6E1D7', alignItems: 'center' }, app: { width: '100%', maxWidth: 480, flex: 1, backgroundColor: C.paper, overflow: 'hidden' }, backgroundArt: { ...StyleSheet.absoluteFillObject, opacity: .76 }, backgroundWash: { ...StyleSheet.absoluteFillObject, backgroundColor: C.paper, opacity: .12 }, loading: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 25 }, muted: { color: C.muted, fontSize: 12 },
  headerLogo: { width: 124, height: 45, marginTop: 5 },
  header: { height: 87, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerSide: { width: 63 }, brandMini: { color: C.muted, fontSize: 8, lineHeight: 16, letterSpacing: .2 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 5 }, logo: { fontFamily: 'ShipporiBold', fontSize: 39, letterSpacing: 2, color: C.ink }, logoMark: { width: 38, height: 38, borderRadius: 6, marginTop: 9, transform: [{ rotate: '8deg' }] }, gear: { width: 63, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 24 }, homeHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 0, marginBottom: 4 }, hairline: { width: 30, height: 1, backgroundColor: '#CDBEAC' }, chapter: { fontFamily: SERIF, color: '#766452', fontSize: 14, letterSpacing: 2 },
  demoBar: { backgroundColor: '#EEE1CA', paddingLeft: 17, minHeight: 28, alignItems: 'center', flexDirection: 'row', gap: 5 }, collectionChrome: { backgroundColor: '#EEE1CAD9' }, dot: { height: 4, width: 4, backgroundColor: C.red, borderRadius: 5 }, demoText: { color: '#8A6950', fontSize: 9, flex: 1 }, error: { backgroundColor: '#F5DCD4', margin: 10, padding: 9, flexDirection: 'row', alignItems: 'center', borderRadius: 8 }, errorText: { color: '#813D31', flexShrink: 1, fontSize: 12, lineHeight: 19 },
  routeHero: { minHeight: 88, borderRadius: 16, padding: 17, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F6EEDDDD', borderWidth: 1, borderColor: '#D9C7AE', marginVertical: 10 }, routeHeroTitle: { fontFamily: SERIF, color: C.ink, fontSize: 19, marginVertical: 7 },
  stepsCard: { padding: 20, backgroundColor: '#FFFCF5', borderWidth: 1, borderColor: C.line, borderRadius: 19, marginTop: 7, overflow: 'hidden' }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { fontSize: 10, color: C.muted, letterSpacing: 1 }, refresh: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 24 }, tiny: { fontSize: 9, color: C.muted }, stepValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 17, gap: 7 }, stepValue: { fontSize: 52, fontWeight: '300', color: C.ink, letterSpacing: 1 }, stepUnit: { fontFamily: SERIF, fontSize: 16, color: C.muted }, stepFlower: { marginLeft: 'auto', alignSelf: 'center', marginRight: 6 }, stepCaption: { color: '#746959', fontSize: 11 },
  latest: { borderRadius: 13, borderWidth: 1, borderColor: C.line, padding: 13, backgroundColor: '#FFFCF5', flexDirection: 'row', gap: 18, alignItems: 'center' }, latestName: { fontFamily: SERIF, fontSize: 20, color: C.ink }, latestText: { color: C.muted, fontSize: 10, lineHeight: 18 }, smallTag: { color: C.red, fontSize: 10, letterSpacing: 1 }, inline: { flexDirection: 'row', alignItems: 'center', gap: 6 }, linkText: { color: C.red, fontSize: 12 }, footerNote: { marginTop: 25, textAlign: 'center', color: '#9A9081', fontSize: 9, lineHeight: 19 },
  pageHeading: { paddingTop: 9, paddingBottom: 23, alignItems: 'center' }, pageTitle: { fontFamily: SERIF, color: C.ink, fontSize: 28, letterSpacing: 2 }, subtitle: { color: C.muted, fontSize: 11, letterSpacing: 1, marginTop: 9 },
  bookDesignPanel: { borderWidth: 1, borderColor: '#D9C9B5', borderRadius: 16, backgroundColor: '#FFF9EEDD', padding: 14, marginBottom: 14, overflow: 'hidden' }, bookDesignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }, bookDesignTitle: { fontFamily: SERIF, fontSize: 16, color: C.ink, marginTop: 4 }, bookDesignChoices: { flexDirection: 'row', gap: 9 }, bookDesignChoice: { flex: 1, minHeight: 74, borderRadius: 12, borderWidth: 1, borderColor: '#D9C9B5', backgroundColor: '#F1E9DA', justifyContent: 'center', padding: 11, overflow: 'hidden' }, bookDesignChoiceActive: { borderWidth: 2, borderColor: C.red, backgroundColor: '#FFF9EF' }, bookDesignChoiceTitle: { fontFamily: SERIF, color: C.ink, fontSize: 13 }, bookDesignChoiceNote: { color: C.muted, fontSize: 8, marginTop: 5 }, bookDesignArt: { ...StyleSheet.absoluteFillObject }, bookDesignShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#30251976' }, bookDesignRouteText: { color: '#FFF9EF', textShadowColor: '#2D231DBB', textShadowRadius: 3 },
  bookWrap: { marginHorizontal: -10, backgroundColor: '#8F4035', borderRadius: 12, padding: 7, borderWidth: 1, borderColor: '#713229', shadowColor: '#624532', shadowOffset: { width: 0, height: 7 }, shadowOpacity: .2, shadowRadius: 10, elevation: 4 }, bookTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 }, bookNumber: { fontSize: 7, color: '#F8DFCB', letterSpacing: 1.5 }, bookViewport: { position: 'relative', overflow: 'hidden', borderRadius: 4, minHeight: 306 }, openBook: { flexDirection: 'row', backgroundColor: '#FBF5E8', borderRadius: 4, overflow: 'hidden', minHeight: 306, height: 306 }, bookFlip: { ...StyleSheet.absoluteFillObject, zIndex: 3, backfaceVisibility: 'hidden' }, bookLeft: { flex: 1, padding: 9, justifyContent: 'center', backgroundColor: '#F2EBDC', borderRightWidth: 1, borderColor: '#D4C5B0' }, bookBinding: { position: 'absolute', right: -1, top: 0, bottom: 0, width: 7, backgroundColor: '#AF917226', borderLeftWidth: 1, borderColor: '#8E6E4A20' }, bookRight: { flex: 1.02, padding: 15, justifyContent: 'center', gap: 9, backgroundColor: '#FCF7EC' }, bookReading: { fontSize: 7, color: C.muted, letterSpacing: 1 }, bookName: { fontFamily: 'ShipporiBold', fontSize: 21, color: C.ink, lineHeight: 31 }, shortRule: { height: 1, width: 25, backgroundColor: C.red, marginVertical: 2 }, bookTheme: { fontFamily: SERIF, fontSize: 12, lineHeight: 21, color: C.red }, bookDescription: { fontFamily: SERIF, fontSize: 9, lineHeight: 20, color: '#6C6050' }, bookLocation: { flex: 1, fontSize: 8, lineHeight: 14, color: '#887B68' }, bookDetail: { backgroundColor: C.red, borderRadius: 9, minHeight: 35, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 }, bookDetailText: { color: '#FFF8EB', fontSize: 9 }, bookBottom: { borderBottomLeftRadius: 6, borderBottomRightRadius: 6, paddingHorizontal: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E9DEC9' }, bookDate: { color: '#8D7960', fontSize: 8, flex: 1 }, bookSwipeHint: { color: '#AA7B61', fontSize: 8, letterSpacing: .3, marginRight: 8 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, marginVertical: 14 }, pagerButton: { width: 42, height: 38, borderRadius: 19, backgroundColor: '#EFE6D8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9C9B5' }, pageCounter: { alignItems: 'center', minWidth: 150 }, pageCounterText: { fontFamily: SERIF, fontSize: 15, color: C.ink, letterSpacing: 2 }, pageCounterHint: { color: '#958675', fontSize: 8, marginTop: 4, letterSpacing: .4 }, collectionProgress: { flexDirection: 'row', gap: 17, alignItems: 'center', paddingVertical: 19, paddingHorizontal: 4 }, progressLabel: { color: '#766754', fontSize: 12, fontFamily: SERIF }, count: { fontSize: 16, color: C.ink }, countRed: { color: C.red, fontSize: 26, fontFamily: SERIF }, filters: { flexDirection: 'row', gap: 8, marginBottom: 17 }, filter: { flex: 1, minHeight: 37, backgroundColor: '#EEE8DC', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, filterActive: { backgroundColor: C.red }, filterText: { color: '#7D705F', fontSize: 11 }, stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stampCard: { width: '48%', flexGrow: 1, maxWidth: '49%', backgroundColor: '#FFFCF5', borderRadius: 10, padding: 9, borderWidth: 1, borderColor: '#E5DDCF' }, stampLabel: { paddingTop: 9, paddingBottom: 5, alignItems: 'center' }, stampName: { fontFamily: SERIF, color: C.ink, fontSize: 15 }, stampTheme: { fontSize: 8, color: C.muted, marginTop: 6 }, ownedDot: { position: 'absolute', top: 14, right: 14, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF9EE', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 17 }, emptyTitle: { color: C.ink, fontFamily: SERIF, fontSize: 19, textAlign: 'center' }, emptyText: { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 22 },
  walkMinimal: { alignItems: 'center', minHeight: 420, paddingTop: 23, paddingBottom: 10 }, walkMinimalHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, walkMinimalTitle: { fontFamily: SERIF, color: C.ink, fontSize: 27, letterSpacing: 2 }, walkMinimalSubtitle: { color: C.muted, fontSize: 10, letterSpacing: 1, marginTop: 4 }, walkRefresh: { minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 18, backgroundColor: '#FFFCF5D9', borderWidth: 1, borderColor: C.line }, walkRefreshText: { color: C.red, fontSize: 11 }, walkRingWrap: { width: 248, height: 248, alignItems: 'center', justifyContent: 'center', marginTop: 3 }, walkRingSvg: { position: 'absolute' }, walkRingCenter: { alignItems: 'center', justifyContent: 'center' }, walkRingCount: { fontSize: 49, fontWeight: '300', color: C.ink, letterSpacing: 1 }, walkRingUnit: { fontFamily: SERIF, fontSize: 16, color: C.muted, marginTop: -2 }, walkRingGoal: { fontSize: 10, color: C.muted, marginTop: 9, letterSpacing: 1 }, walkPeekStage: { width: '100%', height: 330, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', marginTop: -4 }, walkMobibouPeekImage: { position: 'absolute', width: '118%', height: 330, bottom: 0, zIndex: 3 }, walkPeekImage: { position: 'absolute', width: 322, height: 322, bottom: 50, zIndex: 3 }, walkToriiTop: { position: 'absolute', width: '118%', height: 210, bottom: -10, zIndex: 2 }, walkDemoButton: { width: '100%', marginTop: 16, marginBottom: 24 }, walkMinimalAction: { width: '100%', marginTop: 6 }, walkSummary: { alignItems: 'center', borderRadius: 20, backgroundColor: '#EEE8DC', padding: 25, marginBottom: 27 }, walkCount: { fontSize: 40, fontWeight: '300', color: C.ink, marginTop: 12 }, walkBlurb: { color: C.muted, fontSize: 11, marginTop: 8 }, route: { gap: 0 }, routeItem: { flexDirection: 'row', gap: 13 }, routeRail: { width: 26, alignItems: 'center' }, routeNode: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: '#C5AA92', alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, marginTop: 18 }, routeLine: { width: 1, flex: 1, backgroundColor: '#D5C4AF' }, routeCard: { flex: 1, padding: 15, borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: '#FFFCF5', flexDirection: 'row', gap: 12, marginBottom: 17 }, routeThreshold: { color: C.red, fontSize: 13, fontWeight: '600', marginBottom: 8 }, routeStatus: { fontSize: 8, color: C.muted, fontWeight: '400' }, routeName: { fontFamily: SERIF, color: C.ink, fontSize: 19, marginBottom: 5 }, demoHelp: { textAlign: 'center', color: C.muted, fontSize: 9, lineHeight: 19 }, walkNote: { padding: 17, borderRadius: 14, backgroundColor: '#EEE8DB', flexDirection: 'row', gap: 12, marginTop: 24 }, walkNoteText: { fontSize: 10, lineHeight: 22, color: '#837662', flex: 1 },
  chosenPet: { flexDirection: 'row', gap: 15, backgroundColor: '#EEE7DA', borderRadius: 18, padding: 17, alignItems: 'center', overflow: 'hidden' }, chosenPetBackdrop: { ...StyleSheet.absoluteFillObject, opacity: .72 }, chosenPetWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF9E9A8' }, chosenName: { fontFamily: SERIF, fontSize: 24, color: C.ink, marginVertical: 7 }, affection: { color: C.red, fontSize: 10, marginTop: 7 }, petGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, petCard: { width: '31%', flexGrow: 1, maxWidth: '32%', paddingTop: 8, paddingBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2DACC', borderRadius: 13, backgroundColor: '#FFF9F0', overflow: 'hidden' }, petCardActive: { borderColor: C.red, backgroundColor: '#F3E5D7', borderWidth: 1.5 }, petBackdropImage: { ...StyleSheet.absoluteFillObject, opacity: .72 }, petBackdropWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF9E9A8' }, petBackdropTint: { ...StyleSheet.absoluteFillObject }, petThumb: { width: 85, height: 95 }, petName: { fontSize: 10, color: '#675B4D', marginTop: 3 }, petCheck: { position: 'absolute', right: 6, top: 6, backgroundColor: C.red, borderRadius: 9, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  outingTabs: { flexDirection: 'row', borderWidth: 1, borderColor: '#D9CBB6', borderRadius: 16, backgroundColor: '#F4EDDF', padding: 4, marginBottom: 18, overflow: 'hidden' }, outingTab: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 5 }, outingTabActive: { backgroundColor: '#FFF9EF', borderWidth: 1, borderColor: '#D9C3A3' }, outingTabText: { fontFamily: SERIF, color: '#766B5B', fontSize: 14, letterSpacing: 1.4 }, outingTabTextActive: { color: C.red }, outingTabIndicator: { width: 26, height: 2, borderRadius: 2, backgroundColor: C.red },
  nav: { flexDirection: 'row', backgroundColor: '#FCF9F1', borderWidth: 1, borderColor: '#E3DACB', borderRadius: 24, marginHorizontal: 12, marginBottom: 8, overflow: 'hidden', paddingTop: 12, paddingBottom: 3 }, collectionNav: { backgroundColor: '#FCF9F1D9' }, navItem: { flex: 1, alignItems: 'center', gap: 6, minHeight: 55 }, navText: { color: '#81796D', fontSize: 10, letterSpacing: 1 }, navIndicator: { width: 17, height: 3, backgroundColor: C.red, borderRadius: 4, marginTop: 1 },
  modal: { flex: 1, backgroundColor: C.paper, width: '100%', maxWidth: 600, alignSelf: 'center' }, modalHeader: { padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: C.line }, modalTitle: { fontFamily: SERIF, fontSize: 23, color: C.ink }, close: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' }, detailContent: { padding: 25, paddingBottom: 45 }, detailReading: { textAlign: 'center', color: C.muted, fontSize: 11, letterSpacing: 2 }, detailName: { textAlign: 'center', fontFamily: SERIF, fontSize: 31, color: C.ink, marginTop: 8 }, detailTheme: { fontFamily: SERIF, fontSize: 19, color: C.red, textAlign: 'center' }, detailDescription: { fontFamily: SERIF, fontSize: 14, lineHeight: 29, color: '#6D6354', textAlign: 'center', marginTop: 18 }, detailMeta: { backgroundColor: C.pale, padding: 18, borderRadius: 15, gap: 16, marginTop: 24 }, meta: { flexDirection: 'row', gap: 11, alignItems: 'center' }, metaText: { fontSize: 12, color: '#776B59', flex: 1, lineHeight: 20 },
  settingsContent: { padding: 24, paddingBottom: 50 }, settingCard: { backgroundColor: '#FFFCF5', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.line }, settingHelp: { fontSize: 12, color: C.muted, lineHeight: 22, marginVertical: 13 }, settingRow: { flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, borderColor: C.line, paddingVertical: 22 }, settingLabel: { color: C.ink, fontSize: 15 }, seasonTabs: { flexDirection: 'row', gap: 7, marginTop: 2, marginBottom: 11 }, seasonTab: { flex: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: C.line, backgroundColor: '#F1ECE3', alignItems: 'center', justifyContent: 'center' }, seasonTabText: { color: '#786D5E', fontFamily: SERIF, fontSize: 13 }, backgroundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 11 }, backgroundOption: { width: '48%', aspectRatio: 1.06, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.line, backgroundColor: C.pale }, backgroundOptionActive: { borderWidth: 2, borderColor: C.red }, backgroundImage: { ...StyleSheet.absoluteFillObject }, backgroundOptionShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 52, backgroundColor: '#2B241A70' }, backgroundOptionCopy: { position: 'absolute', left: 10, right: 10, bottom: 8 }, backgroundOptionLabel: { color: '#FFF9EF', fontFamily: SERIF, fontSize: 14 }, backgroundOptionNote: { color: '#FFF9EFCF', fontSize: 9, marginTop: 2 }, backgroundCheck: { position: 'absolute', top: 9, right: 9, width: 24, height: 24, borderRadius: 12, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }, infoBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2B241AB0', justifyContent: 'center', alignItems: 'center', padding: 24 }, infoCard: { width: '100%', maxWidth: 420, backgroundColor: C.paper, borderRadius: 22, padding: 25, gap: 20 }, infoText: { fontSize: 13, lineHeight: 24, color: '#726653' },
  opening: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: '#F8EEDC', overflow: 'hidden' }, openingTrack: { ...StyleSheet.absoluteFillObject }, openingScene: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' }, openingSceneImage: { ...StyleSheet.absoluteFillObject }, openingContent: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 30, paddingBottom: 22 }, openingMiddleSpace: { flex: 1, minHeight: 290, width: '100%', alignItems: 'center', justifyContent: 'center' }, openingCenterWordmark: { width: 190, height: 58, marginBottom: 8 }, openingEmblem: { width: 220, height: 220, opacity: .96 }, openingCopy: { alignItems: 'center', paddingHorizontal: 12, marginBottom: 13 }, openingTagline: { fontFamily: SERIF, fontSize: 25, letterSpacing: 3, color: C.ink }, openingSubline: { fontSize: 11, letterSpacing: 1.5, color: '#765E4B', marginTop: 9 }, openingStage: { fontFamily: SERIF, fontSize: 12, letterSpacing: 2.5, color: '#765E4B', marginTop: 13 }, openingError: { marginBottom: 10, textAlign: 'center' }, openingSwipeHint: { fontFamily: 'ShipporiBold', fontSize: 14, color: '#FFF9EF', letterSpacing: 1.2, marginTop: 4, marginBottom: 4, transform: [{ translateY: -24 }], textShadowColor: '#3A2D27AA', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
