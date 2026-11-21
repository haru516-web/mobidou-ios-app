import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image as RNImage, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { Image } from './AppImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { PetCharacter } from '../petCatalog';
import type { Pilgrimage } from '../data/pilgrimages';
import { PRAYER_ACTION_ORDER, PRAYER_ATLASES } from '../data/prayerAtlasesV2';
import rawMetrics from '../data/pilgrimageSpriteMetrics.json';
import { BRUSH, Button, C, SERIF, useReducedMotion } from '../components';
import { FitToHeight } from './PagedBody';
import { STAMP_IMAGES } from '../data/shrines';
import { EVENT_FEEL } from '../data/eventImages';
import { AwardFx, BURST_AT } from './AwardFx';
import { InkReveal } from './InkReveal';
import type { SpecialCollection } from '../services/specialRewards';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import { PULL_REACTION_FRAMES } from '../data/pullReactionFrames';
import { SHRINE_SAYINGS } from '../data/shrineSayings';
import { VerticalSaying } from './VerticalSaying';
import { PrayerControls } from './PrayerControls';
import { pickLetterQuestion } from '../data/letterQuestions';
import { addLetter, useLetters, LETTER_MAX_LENGTH, isValidAnswer, savePendingQuestion, clearPendingQuestion, loadPendingQuestion } from '../services/letters';

/** Set when the ceremony is for an event spot: the event's own goshuin and miniature, and no keychain roll (every spot gives its miniature). */
export type EventAwardInfo = { name: string; goshuinImage: ImageSourcePropType; keychainImage: ImageSourcePropType; reached: number; total: number; complete: boolean; reward?: string };

const PHASES = [
  { key: 'approach', frames: 18, label: '鳥居へ、とことこ' },
  { key: 'bowIn', frames: 8, label: '鳥居の前で一礼' },
  { key: 'enter', frames: 22, label: '神域へ入ります' },
  { key: 'pray', frames: 40, label: '二礼二拍手一礼' },
  { key: 'return', frames: 18, label: '鳥居へ戻ります' },
  { key: 'bowOut', frames: 8, label: '感謝をこめて一礼' },
  { key: 'leave', frames: 20, label: 'またね、とことこ' },
] as const;
const TOTAL_FRAMES = PHASES.reduce((sum, phase) => sum + phase.frames, 0);
function locate(frame: number) {
  let offset = 0;
  for (const phase of PHASES) {
    if (frame < offset + phase.frames) return { ...phase, local: frame - offset, progress: (frame - offset) / (phase.frames - 1) };
    offset += phase.frames;
  }
  return { key: 'reveal' as const, frames: 1, label: '御朱印を授かりました', local: 0, progress: 1 };
}
type Metric = { columns: number; width: number; height: number; cellWidth: number; left: number; top: number; cropWidth: number; cropHeight: number };
const metrics = rawMetrics as Record<string, Metric>;
const STAGE = require('../../assets/ui-round3/pilgrimage/ceremony-stage.webp');
const GATE = require('../../assets/ui-round3/pilgrimage/ceremony-gate.webp');

function Sprite({ source, metric, frame, size, onLoad }: { source: ImageSourcePropType; metric: Metric; frame: number; size: number; onLoad: () => void }) {
  const scale = size / metric.cropHeight;
  // Stable callback: the core Image restarts loading whenever onLoad changes.
  const loadRef = React.useRef(onLoad);
  loadRef.current = onLoad;
  const handleLoad = React.useCallback(() => loadRef.current(), []);
  return <View style={{ width: metric.cropWidth * scale, height: size, overflow: 'hidden' }}>
    <RNImage source={source} onLoad={handleLoad} resizeMode="stretch" style={{ position: 'absolute', left: -(metric.cellWidth * frame + metric.left) * scale, top: -metric.top * scale, width: metric.width * scale, height: metric.height * scale }} />
  </View>;
}

export function PilgrimageAward({ shrine, pet, walkSource, demo, haptics, route, stopIndex, special, goshuinOwned = false, event, onArrive, onRedeemKeychainTicket, onClose, remaining = 1, onSkipAll }: { event?: EventAwardInfo; shrine: { id: string; name: string; theme: string }; pet: PetCharacter; walkSource?: ImageSourcePropType; demo: boolean; haptics: boolean; route?: Pilgrimage; stopIndex: number; special: SpecialCollection; goshuinOwned?: boolean; onArrive: (shrineId: string) => void; onRedeemKeychainTicket: (shrineId: string) => void; onClose: () => void; /** How many ceremonies are waiting, this one included. */ remaining?: number; /** Skips every waiting ceremony at once and goes to the summary. */ onSkipAll?: () => void }) {
  // Each user action advances the authored ceremony frames. The explicit
  // skip control remains available for users who want the reward directly.
  // A goshuin the player already holds gets a short visit: skip the walk and go straight to the reveal.
  const [frame, setFrame] = useState(goshuinOwned ? TOTAL_FRAMES : 0);
  const [width, setWidth] = useState(380);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [revealDone, setRevealDone] = useState(false);
  // The goshuin is shown first; the miniature draw has its own page after the next button.
  const [page, setPage] = useState<'goshuin' | 'miniature' | 'saying' | 'question'>('goshuin');
  // The shrine's saying, written alone after the miniature. Event spots have none.
  const saying = event ? undefined : SHRINE_SAYINGS[shrine.id];
  // After the saying, one question is asked and the answer is kept as a letter. Event spots skip it.
  const hasQuestion = !event;
  const savedLetters = useLetters();
  const [question, setQuestion] = useState(() => pickLetterQuestion(savedLetters.map(letter => letter.question)));
  // Closing the app on the question screen must bring the player back to it, so the question is kept until it is answered.
  const [resumeChecked, setResumeChecked] = useState(event || !hasQuestion);
  useEffect(() => {
    if (resumeChecked) return;
    let alive = true;
    void loadPendingQuestion().then(pending => {
      if (!alive) return;
      if (pending && pending.shrineId === shrine.id) { setQuestion(pending.question); setFrame(TOTAL_FRAMES); setPage('question'); }
      setResumeChecked(true);
    });
    return () => { alive = false; };
  }, [resumeChecked, shrine.id]);
  useEffect(() => { if (page === 'question') void savePendingQuestion({ shrineId: shrine.id, question }); }, [page, shrine.id, question]);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const pageAfter = (current: 'miniature' | 'saying'): 'saying' | 'question' | null => current === 'miniature' && saying ? 'saying' : hasQuestion ? 'question' : null;
  const finish = async () => {
    if (saving) return;
    setSaving(true);
    if (!isValidAnswer(answer)) { setSaving(false); return; }
    await addLetter({ shrineId: shrine.id, shrineName: shrine.name, question, quote: saying, answer });
    await clearPendingQuestion();
    onClose();
  };
  const miniature = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const paint = useRef(new Animated.Value(0)).current;
  const revealHapticSent = useRef(false);
  const phase = useMemo(() => locate(frame), [frame]);
  useSceneBgm('bgm_walk_award', true, 40);
  useEffect(() => {
    if (phase.key === 'bowIn' || phase.key === 'bowOut') playSfx('sfx_bow');
    if (phase.key === 'pray') duckBgm(4800);
  }, [phase.key]);
  useEffect(() => {
    if (['approach', 'enter', 'return', 'leave'].includes(phase.key) && phase.local % 4 === 0) playSfx('sfx_award_footsteps');
    if (phase.key === 'pray' && (phase.local === 19 || phase.local === 27)) playSfx('sfx_clap');
  }, [phase.key, phase.local]);
  const prayer = PRAYER_ATLASES[pet.id];
  // The clear reward belongs to the first finish only; a later lap is just a visit.
  const complete = event ? event.complete && !goshuinOwned : !!route && stopIndex === route.ids.length - 1 && !goshuinOwned;
  // Reduce Motion is scoped to the post-prayer reward reveal.
  const revealReducedMotion = useReducedMotion();
  // Walk sheets are generated incrementally for the roster.  The ceremony
  // must still play for a character whose sheet is not available yet, using
  // the character's neutral art for the walking beats while the prayer sheet
  // keeps the authored two-rei-two-claps-one-bow motion.
  const allReady = ['stage', 'gate', 'rei', 'hakushu', ...(walkSource ? ['walk'] : [])].every(id => loaded[id]);
  const markLoaded = (id: string) => setLoaded(previous => previous[id] ? previous : { ...previous, [id]: true });
  useEffect(() => {
    if (phase.key !== 'reveal') return;
    reveal.setValue(0);
    paint.setValue(0);
    const painting = Animated.timing(paint, { toValue: 1, duration: 1800, delay: BURST_AT - 50, easing: Easing.inOut(Easing.quad), useNativeDriver: false });
    painting.start();
    setRevealDone(false);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: revealReducedMotion ? 0 : 3800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    if (revealReducedMotion) setRevealDone(true);
    animation.start(({ finished }) => { if (finished) setRevealDone(true); });
    return () => { animation.stop(); painting.stop(); };
  }, [phase.key, reveal, paint, revealReducedMotion]);
  useEffect(() => {
    if (phase.key !== 'reveal') return;
    const timer = setTimeout(() => {
      playSfx('sfx_stamp_reveal');
      if (complete) playJingle('jingle_complete');
      if (haptics && !revealHapticSent.current) {
        revealHapticSent.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, revealReducedMotion ? 0 : BURST_AT);
    return () => clearTimeout(timer);
  }, [haptics, phase.key, revealReducedMotion, complete]);
  const t = phase.progress;
  // Coordinates share the 600 x 400 illustration space on every phone.
  const x = phase.key === 'approach' ? -80 + 175 * t : phase.key === 'bowIn' ? 95
    : phase.key === 'enter' ? 95 + 345 * t : phase.key === 'pray' ? 440
      : phase.key === 'return' ? 440 - 160 * t : phase.key === 'bowOut' ? 280 : 280 - 370 * t;
  const y = phase.key === 'enter' ? 340 - 35 * t : phase.key === 'pray' ? 305 : phase.key === 'return' ? 305 + 35 * t : 340;
  const k = width / 600;
  const walking = ['approach', 'enter', 'return', 'leave'].includes(phase.key);
  const prayerFrame = phase.key === 'pray' ? phase.local : phase.local % 8;
  const action = phase.key === 'pray' ? PRAYER_ACTION_ORDER[Math.floor(prayerFrame / 8)] : 'rei';
  const facingLeft = phase.key === 'return' || phase.key === 'leave';
  const showAward = phase.key === 'reveal';
  // The keychain is rolled once when this ceremony opens (never again for the same visit).
  useEffect(() => { if (!event) onArrive(shrine.id); }, [onArrive, shrine.id, event]);
  // An event spot always gives its miniature, so there is nothing to roll.
  const arrival: { shrineId: string; outcome: string } | null = event ? { shrineId: shrine.id, outcome: 'won' } : special.arrival?.shrineId === shrine.id ? special.arrival : null;
  useEffect(() => {
    if (page === 'miniature' && (arrival?.outcome === 'won' || arrival?.outcome === 'ticket')) { playSfx('sfx_keychain_get'); playJingle('sfx_special_reveal'); }
  }, [page, arrival?.outcome]);
  useEffect(() => {
    if (page !== 'miniature') return;
    miniature.setValue(0);
    const animation = Animated.timing(miniature, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [page, miniature, arrival?.outcome]);
  const ticketCount = event ? 0 : special.passes.keychainDrop;
  const canUseTicket = page === 'miniature' && arrival?.outcome === 'missed' && ticketCount > 0;
  const keychainStatus = arrival?.outcome === 'owned' ? 'もう持ってるよ' : arrival?.outcome === 'won' ? '獲得しました' : arrival?.outcome === 'ticket' ? '券で獲得しました' : 'ドロップなし';
  const keychainInstruction = arrival?.outcome === 'owned' ? 'このミニチュアは、もう持っています。' : arrival?.outcome === 'won' ? 'ミニチュアキーホルダーを授かりました。' : arrival?.outcome === 'ticket' ? '交換券を使って授かりました。' : ticketCount > 0 ? '外れました。この場で交換券を使って受け取れます。' : '今回はご縁がありませんでした。次の参拝でまた挑戦できます。';
  const keychainArt = event?.keychainImage ?? COLLECTION_KEYCHAINS[shrine.id as keyof typeof COLLECTION_KEYCHAINS];
  const gotKeychain = arrival?.outcome === 'won' || arrival?.outcome === 'ticket' || arrival?.outcome === 'owned';
  // The Mobby chosen on the home screen looks glum when nothing dropped.
  const sadSource = PULL_REACTION_FRAMES[pet.id as keyof typeof PULL_REACTION_FRAMES]?.[3] ?? pet.image;
  const miniatureScale = miniature.interpolate({ inputRange: [0, 1], outputRange: [.82, 1] });
  const useTicket = () => { if (canUseTicket) onRedeemKeychainTicket(shrine.id); };
  const rewardCardOpacity = reveal.interpolate({ inputRange: [0, .03, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
  const sealOpacity = paint.interpolate({ inputRange: [0, .94, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const copyOpacity = reveal.interpolate({ inputRange: [0, .66, .78, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const copyLift = reveal.interpolate({ inputRange: [0, .66, .8, 1], outputRange: [10, 10, 0, 0], extrapolate: 'clamp' });
  const guaranteeOpacity = reveal.interpolate({ inputRange: [0, .7, .82, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const guaranteeLift = reveal.interpolate({ inputRange: [0, .7, .84, 1], outputRange: [8, 8, 0, 0], extrapolate: 'clamp' });
  const sprites = [
    { id: 'walk', source: walkSource, frame: phase.local % (metrics[pet.id + '/walk']?.columns ?? 4), visible: walking },
    { id: 'rei', source: prayer?.rei, frame: prayerFrame % 8, visible: !walking && action === 'rei' },
    { id: 'hakushu', source: prayer?.hakushu, frame: prayerFrame % 8, visible: !walking && action === 'hakushu' },
  ];
  if (!resumeChecked) return <SafeAreaView style={S.page} />;
  // The keyboard lifts the whole page, so what is being typed and the button stay above it; the scaled content shrinks to the room left.
  return <SafeAreaView style={S.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><FitToHeight key={showAward ? 'award-' + page : 'walk'} style={S.fit}><View style={S.content}>
    {page !== 'saying' && page !== 'question' && <Text style={S.eyebrow}>{event ? event.name : demo ? '体験の巡礼' : route?.name ?? '今日の巡礼'}</Text>}
    {page !== 'saying' && page !== 'question' && <Text accessibilityRole="header" style={S.title}>{showAward && page === 'miniature' ? (arrival ? gotKeychain ? (arrival.outcome === 'owned' ? 'もう持っているミニチュア' : 'ミニチュアを授かりました') : 'ミニチュアはドロップしませんでした' : 'ミニチュアの抽選') : showAward ? complete ? '巡礼、結願。' : goshuinOwned ? '再びのご参拝です' : '新しい御朱印を授かりました' : allReady ? phase.label : '参道の支度をしています'}</Text>}
    <View style={[S.stage, { height: width * 2 / 3 }, showAward && S.stageHidden]} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={pet.name + 'が' + phase.label}>
      <Image source={event ? EVENT_FEEL.ceremonyStage : STAGE} contentFit="fill" style={StyleSheet.absoluteFillObject} onLoad={() => markLoaded('stage')} />
      <View style={{ position: 'absolute', left: 0, top: 0, width: 600, height: 400, transformOrigin: 'top left', transform: [{ scale: k }] }}>
        <Image source={event ? EVENT_FEEL.ceremonyGate : GATE} onLoad={() => markLoaded('gate')} contentFit="contain" style={{ position: 'absolute', left: 126, bottom: 42, width: 154, height: 194, zIndex: 3 }} />
        {!showAward && <View style={{ position: 'absolute', left: x - 70, top: y - 140, width: 140, height: 140, zIndex: 2, transform: [{ scaleX: facingLeft ? -1 : 1 }] }}>
          {sprites.map(sprite => {
            const metric = metrics[pet.id + '/' + sprite.id];
            if (sprite.source && metric) return <View key={sprite.id} style={{ position: 'absolute', bottom: 0, alignSelf: 'center', opacity: sprite.visible ? 1 : 0 }}><Sprite source={sprite.source} metric={metric} frame={sprite.frame} size={140} onLoad={() => markLoaded(sprite.id)} /></View>;
            if (sprite.id === 'walk') return <Image key={sprite.id} source={pet.image} contentFit="contain" onLoad={() => markLoaded('walk')} style={{ position: 'absolute', bottom: 0, alignSelf: 'center', width: 140, height: 140, opacity: sprite.visible ? 1 : 0 }} />;
            return null;
          })}
        </View>}
      </View>
    </View>
    {!showAward && <View style={S.phaseTrack}>{PHASES.map(p => <View key={p.key} style={[S.phaseDot, { backgroundColor: phase.key === p.key ? '#D4B387' : '#685C49' }]} />)}</View>}
    {showAward && page === 'goshuin' && <>
      <View style={S.rewardScene}>
        <AwardFx />
        <Animated.View style={[S.reward, { opacity: rewardCardOpacity, }]}>
          <View style={S.stampFrame}>
            <InkReveal source={event?.goshuinImage ?? STAMP_IMAGES[shrine.id as keyof typeof STAMP_IMAGES]} progress={paint} />
          </View>
          <Animated.View style={[S.seal, { opacity: sealOpacity, transform: [{ rotate: '-10deg' }] }]}><Text style={S.sealText}>{complete ? '結願' : '結縁'}</Text></Animated.View>
        </Animated.View>
      </View>
      <Animated.View style={[S.copyGroup, { opacity: copyOpacity, transform: [{ translateY: copyLift }] }]}><Text style={S.name}>{shrine.name}</Text><Text style={S.theme}>{event ? shrine.theme : route?.chapters[stopIndex] ?? shrine.theme}</Text></Animated.View>
      <Animated.View style={[S.guaranteeBadge, { opacity: guaranteeOpacity, transform: [{ translateY: guaranteeLift }] }]}><Text style={S.guaranteeText}>{goshuinOwned ? 'この御朱印は、御朱印帳に綴られています' : '歩いた証として、御朱印を授かりました'}</Text></Animated.View>
      {event && <Animated.View style={[S.journeyRecord, { opacity: guaranteeOpacity }]}>
        <Text style={S.recordTitle}>ここまで歩いた記録</Text>
        <Text style={S.recordText}>{event.name} · {event.reached} / {event.total}地点に到達</Text>
        {complete && <><Text style={S.recordText}>イベントの道を、みんなで歩き終えました。</Text>{!!event.reward && <Text style={S.recordGift}>{event.reward}</Text>}<Text style={S.recordText}>報酬は、イベント画面から受け取れます。</Text></>}
      </Animated.View>}
      {route && <Animated.View style={[S.journeyRecord, { opacity: guaranteeOpacity }]}>
        <Text style={S.recordTitle}>ここまで歩いた記録</Text>
        <Text style={S.recordText}>{route.name} · {stopIndex + 1} / {route.ids.length}地点に到達</Text>
        {complete && <><Text style={S.recordGift}>{route.gift}</Text><Text style={S.recordText}>「{route.title}」</Text><Text style={S.recordText}>旅の証を、御朱印帳に綴りました。</Text>{!demo && <Text style={S.recordText}>ガチャを1回、無料で引けます。</Text>}</>}
      </Animated.View>}
    </>}
    {showAward && page === 'miniature' && <Animated.View style={[S.miniatureScene, { opacity: miniature, transform: [{ scale: miniatureScale }] }]}>
      {!arrival ? <Text style={S.specialWaiting}>ドロップ結果を確認しています…</Text> : gotKeychain
        ? (keychainArt ? <Image source={keychainArt} contentFit="contain" accessibilityLabel="ミニチュアキーホルダー" style={S.miniatureImage} /> : null)
        : <Image source={sadSource} contentFit="contain" accessibilityLabel={pet.name + 'は残念そう'} style={S.miniatureImage} />}
      {arrival && <Text style={S.specialStatus}>{keychainStatus}</Text>}
      {arrival && <Text style={S.specialInstruction}>{arrival.outcome === 'missed' && ticketCount === 0 ? 'ドロップしなかったよ。次の参拝でまた挑戦できます。' : keychainInstruction}</Text>}
      {!event && <Text style={S.passOwned}>交換券 {ticketCount}枚</Text>}
      {canUseTicket && <View style={S.exchangeActions}><Button title="券を使って受け取る" secondary onPress={useTicket} style={S.specialButton} /></View>}
    </Animated.View>}
    {/* Like the ink painting of the goshuin, this slow opening is the point of the page, so it ignores the reduced-motion setting. */}
    {showAward && page === 'saying' && !!saying && <VerticalSaying text={saying} />}
    {showAward && page === 'question' && <View style={S.questionScene}>
      <Text style={S.questionPlace}>{shrine.name}にて</Text>
      <Text accessibilityRole="header" style={S.questionText}>{question}</Text>
      <TextInput accessibilityLabel="答えを書く" value={answer} onChangeText={text => setAnswer(text.slice(0, LETTER_MAX_LENGTH))} multiline maxLength={LETTER_MAX_LENGTH} placeholder="ここに書く" placeholderTextColor="#9A8A72" style={S.answerInput} />
      <Text style={S.questionCount}>{answer.trim().length === 1 ? '2文字以上で書いてください　' : ''}{answer.length} / {LETTER_MAX_LENGTH}</Text>
      <Text style={S.questionWarn}>書いた答えは、あとから変えられません。{'\n'}手紙として残り、いつでも見返せます。</Text>
    </View>}
  </View></FitToHeight>
  {!showAward && <View style={{ padding: 12, alignItems: 'center', gap: 12 }}>
    <PrayerControls ready={allReady} onFrame={setFrame} />
    <Button title="演出を省略して御朱印をみる" secondary onPress={() => setFrame(TOTAL_FRAMES)} style={S.skip} />
    {!event && !!onSkipAll && remaining > 1 && <Button title={`残りの${remaining}か所を、まとめて省略`} secondary onPress={onSkipAll} style={S.skip} />}
  </View>}
  {/* Outside the scaled area, so it keeps its size and stays tappable however tall the content is. */}
  {/* Always present, so the room left for the scaled content does not change when the button appears. */}
  <View style={[S.closeBar, !showAward && { display: 'none' }]}>{showAward && !event && !!onSkipAll && remaining > 1 && page !== 'saying' && page !== 'question' && <Button title={`残りの${remaining - 1}か所を、まとめて省略`} secondary onPress={onSkipAll} style={{ width: '100%', maxWidth: 350, marginBottom: 8 }} />}{showAward && (() => {
    const next = page === 'miniature' || page === 'saying' ? pageAfter(page) : null;
    const title = page === 'question' ? '手紙に残してホームへ' : page === 'goshuin' ? (revealDone ? '次へ' : 'ご縁を結んでいます…') : next ? '次へ' : 'ホームへ';
    const press = page === 'question' ? () => { void finish(); } : page === 'goshuin' ? () => setPage('miniature') : next ? () => setPage(next) : onClose;
    return <Button title={title} disabled={page === 'question' ? !isValidAnswer(answer) || saving : !revealDone || !arrival} onPress={press} style={{ width: '100%', maxWidth: 350 }} />;
  })()}</View></KeyboardAvoidingView>
  </SafeAreaView>;
}
const S = StyleSheet.create({
  questionScene: { width: '100%', maxWidth: 350, alignItems: 'center', gap: 10 },
  questionPlace: { fontFamily: BRUSH, fontSize: 16, color: '#D4B387' },
  questionText: { fontFamily: BRUSH, fontSize: 24, lineHeight: 34, color: '#FFF5E2', textAlign: 'center' },
  answerInput: { width: '100%', minHeight: 120, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#D4B387', backgroundColor: '#FFF8E7', color: '#4A2F22', fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
  questionCount: { alignSelf: 'flex-end', fontSize: 12, color: '#BFAE92' },
  questionWarn: { fontSize: 13, lineHeight: 20, color: '#F2C9A0', textAlign: 'center' },
  journeyRecord: { width: '100%', maxWidth: 350, alignItems: 'center', gap: 5 },
  recordTitle: { fontFamily: BRUSH, fontSize: 19, color: '#FFF5E2', textAlign: 'center' },
  recordText: { fontFamily: SERIF, fontSize: 13, lineHeight: 20, color: '#E6D8C5', textAlign: 'center' },
  recordGift: { fontFamily: BRUSH, fontSize: 20, color: '#F6D9A3', textAlign: 'center' },
  stageHidden: { display: 'none' },
  fit: { flex: 1 }, closeBar: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, minHeight: 76 },
  page: { flex: 1, backgroundColor: '#302D25' }, content: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 24, gap: 15 },
  eyebrow: { color: '#D5BD98', fontSize: 11, letterSpacing: 2 }, title: { color: '#FFF8E9', fontFamily: BRUSH, fontSize: 23, textAlign: 'center', minHeight: 32 }, stage: { width: '100%', maxWidth: 520, overflow: 'hidden', borderRadius: 14, backgroundColor: '#D9CAB2' },
  phaseTrack: { flexDirection: 'row', gap: 9, padding: 7 }, phaseDot: { height: 4, width: 18, borderRadius: 2 }, skip: { backgroundColor: '#FFF5E8', maxWidth: 350, minHeight: 44 }, rewardScene: { width: '100%', maxWidth: 350, minHeight: 420, alignItems: 'center', justifyContent: 'center', position: 'relative' }, particle: { position: 'absolute', left: '50%', top: '50%', width: 30, height: 30, marginLeft: -15, marginTop: -15, textAlign: 'center', fontWeight: '700' }, reward: { width: 264, alignItems: 'center', zIndex: 2 }, rewardRays: { position: 'absolute', pointerEvents: 'none', width: 340, height: 340 }, shineClip: { position: 'absolute', width: 212, aspectRatio: 2 / 3, overflow: 'hidden', borderRadius: 5 }, shine: { position: 'absolute', top: -60, bottom: -60, left: '50%', width: 46, marginLeft: -23, backgroundColor: '#FFF4D2AA' }, stampFrame: { width: 264, height: 340, alignItems: 'center', justifyContent: 'center' }, inkRing: { position: 'absolute', alignSelf: 'center', top: 44, width: 250, height: 250, borderRadius: 125, borderWidth: 2, borderColor: C.red }, seal: { position: 'absolute', right: 4, bottom: 9, borderWidth: 3, borderColor: C.red, padding: 6, transform: [{ rotate: '-10deg' }], backgroundColor: '#FFF6E8DD' }, sealText: { color: C.red, fontFamily: BRUSH, fontSize: 19 }, copyGroup: { alignItems: 'center', gap: 2 }, name: { color: '#FFF5E2', fontFamily: BRUSH, fontSize: 21, textAlign: 'center' }, theme: { color: '#E6D8C5', fontSize: 12, lineHeight: 22, textAlign: 'center' }, guaranteeBadge: { borderWidth: 1, borderColor: '#C69B72', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 5, backgroundColor: '#5C493B', marginTop: 2 }, guaranteeText: { color: '#F6D9A3', fontFamily: SERIF, fontSize: 11, letterSpacing: 1 }, completion: { paddingVertical: 26, paddingHorizontal: 24, alignItems: 'center', overflow: 'hidden', width: '100%', maxWidth: 350, gap: 8 }, completionTitle: { fontFamily: BRUSH, fontSize: 24, letterSpacing: 2, color: C.red }, completionText: { fontFamily: SERIF, fontSize: 13, lineHeight: 21, letterSpacing: .6, color: C.ink, textAlign: 'center' },
  miniatureScene: { width: '100%', maxWidth: 350, alignItems: 'center', gap: 10, paddingVertical: 8 }, miniatureImage: { width: 240, height: 240 },
  specialCard: { width: '100%', maxWidth: 350, paddingVertical: 12, paddingHorizontal: 18, overflow: 'hidden' }, specialEyebrow: { color: '#9a6851', fontFamily: SERIF, fontSize: 11, letterSpacing: 1.4, textAlign: 'center' }, specialTitle: { color: C.ink, fontFamily: BRUSH, fontSize: 15, letterSpacing: 1, marginTop: 4, marginBottom: 7, textAlign: 'center' }, specialRows: { gap: 7 }, specialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, specialLabel: { color: '#5f503e', fontFamily: SERIF, fontSize: 13, flex: 1 }, specialStatus: { color: '#8a7e6e', fontFamily: SERIF, fontSize: 13 }, specialWon: { color: '#a24c3e', fontFamily: SERIF }, specialWaiting: { color: '#806f5b', fontFamily: SERIF, fontSize: 12, lineHeight: 17, textAlign: 'center', paddingVertical: 5 }, specialInstruction: { color: '#6f5f4b', fontFamily: SERIF, fontSize: 12, lineHeight: 19, marginTop: 7, textAlign: 'center' }, passOwned: { color: '#776957', fontFamily: SERIF, fontSize: 11, lineHeight: 15, marginTop: 11, textAlign: 'center' }, exchangeActions: { gap: 7, marginTop: 10 }, specialButton: { minHeight: 42 }, noPass: { color: '#806f5b', fontSize: 11, lineHeight: 16, marginTop: 10, textAlign: 'center' }, purchaseActions: { gap: 6, marginTop: 8 }, purchaseButton: { minHeight: 40 }, fakePurchase: { color: '#998a76', fontSize: 11, textAlign: 'center', marginTop: 7 },
});
import { duckBgm, playJingle, playSfx, useSceneBgm } from '../services/audio';
