import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Circle } from 'react-native-svg';
import { PILGRIMAGES, type Pilgrimage } from '../data/pilgrimages';
import { PILGRIMAGE_IMAGES } from '../data/pilgrimageImages';
import { PILGRIMAGE_MAP_IMAGE } from '../data/pilgrimageMapImages';
import { PILGRIMAGE_PEEK_IMAGES, PILGRIMAGE_PEEK_METRICS } from '../data/pilgrimagePeekImages';
import { SHRINES, type Shrine } from '../data/shrines';
import { creditedSteps, expandPointTargets, type Progress } from '../services/progress';
import type { PetCharacter } from '../petCatalog';
import { Button, C, SERIF, Icon } from '../components';
import { PaperCard, WashiPressable as Pressable } from './Washi';
import { TutorialSpotlightOverlay, TutorialTarget, type TutorialRect } from './TutorialSpotlight';

export function pilgrimageShrines(route?: Pilgrimage): Shrine[] {
  return route ? route.ids.map(id => SHRINES.find(s => s.id === id.split('~')[0])!) : [...SHRINES];
}

type MapPosition = { start: number; end: number; ratio: number; steps: number; nextTarget: number; previousTarget: number };

export function routeMapPosition(route: Pilgrimage, progress?: Progress, count = progress?.rewards.length ?? 0): MapPosition {
  const completed = Math.max(0, Math.min(count, route.ids.length));
  const steps = progress ? creditedSteps(progress) : 0;
  if (completed >= route.ids.length) {
    const lastTarget = route.targets.at(-1) ?? 0;
    return { start: Math.max(0, route.ids.length - 1), end: Math.max(0, route.ids.length - 1), ratio: 1, steps, previousTarget: lastTarget, nextTarget: lastTarget };
  }
  const targets = expandPointTargets(route.ids.length, route.targets);
  const targetIndex = Math.min(completed, Math.max(0, targets.length - 1));
  const nextTarget = targets[targetIndex] ?? targets.at(-1) ?? 1;
  const previousTarget = targetIndex === 0 ? 0 : targets[targetIndex - 1] ?? 0;
  const ratio = Math.max(0, Math.min(1, (steps - previousTarget) / Math.max(1, nextTarget - previousTarget)));
  return { start: completed, end: Math.min(completed + 1, route.ids.length - 1), ratio, steps, previousTarget, nextTarget };
}

export function RouteMap({ route, count, progress, pet, onStop, showSpeech = false, viewportHeight }: { route: Pilgrimage; count: number; progress?: Progress; pet?: Pick<PetCharacter, 'id' | 'image' | 'name'>; onStop?: (shrine: Shrine, index: number) => void; showSpeech?: boolean; viewportHeight?: number }) {
  const stops = pilgrimageShrines(route);
  const naturalHeight = 120 + stops.length * 78;
  // These anchors follow the road painted into the generated map plate. Route
  // labels and the live moby therefore sit on the same geography as the art.
  const mapAnchors = [
    { x: .10, y: .15 }, { x: .44, y: .39 }, { x: .84, y: .17 },
    { x: .62, y: .61 }, { x: .92, y: .81 },
  ];
  const peekAsset = pet ? PILGRIMAGE_PEEK_IMAGES[pet.id] : undefined;
  const peekClearance = peekAsset ? (showSpeech ? 92 : 135) : 0;
  const height = showSpeech && viewportHeight
    ? Math.min(naturalHeight, Math.max(280, viewportHeight - peekClearance - 12))
    : naturalHeight;
  const points = stops.map((_, i) => {
    const t = stops.length <= 1 ? 0 : i / (stops.length - 1);
    const scaled = t * (mapAnchors.length - 1);
    const left = Math.floor(scaled);
    const right = Math.min(mapAnchors.length - 1, left + 1);
    const mix = scaled - left;
    return { x: (mapAnchors[left].x + (mapAnchors[right].x - mapAnchors[left].x) * mix) * 310, y: (mapAnchors[left].y + (mapAnchors[right].y - mapAnchors[left].y) * mix) * height };
  });
  const position = routeMapPosition(route, progress, count);
  const peekMetric = pet ? PILGRIMAGE_PEEK_METRICS[pet.id] : undefined;
  const peekScale = peekMetric ? Math.min((showSpeech ? 132 : 190) / peekMetric.width, (showSpeech ? 132 : 200) / peekMetric.height) : 1;
  const peekImageWidth = peekMetric ? peekMetric.width * peekScale : 190;
  const peekImageHeight = peekMetric ? peekMetric.height * peekScale : 200;
  const peekImageBottom = peekMetric ? peekMetric.bottom * peekImageHeight : 166;
  const start = points[position.start] ?? points[0];
  const end = points[position.end] ?? start;
  const currentX = start.x + (end.x - start.x) * position.ratio;
  const currentY = start.y + (end.y - start.y) * position.ratio;
  const legend = route.type === '神域参詣' ? '大社・本宮へ続く社をたどる' : route.type === '山岳修行' ? '山系の稜線と社寺をたどる' : route.type === '札所周回' ? '水辺の札所を輪にして巡る' : route.type === '観音巡礼' ? '月影と観音堂をたどる' : route.type === '七願掛け' ? '灯りと願掛け社をたどる' : route.type === '門前宿場巡り' ? '河川と宿場の社寺をたどる' : '川辺の景色を物語としてたどる';
  return <View style={[S.mapFrame, { height: height + peekClearance, paddingTop: peekClearance }]}>
    <View style={[S.map, { height }]}>
      <Image source={PILGRIMAGE_MAP_IMAGE} contentFit="cover" style={StyleSheet.absoluteFillObject} />
      <View style={S.mapHeader}><Text style={S.mapTitle}>巡礼絵図</Text><Text style={S.mapSubtitle}>{legend}</Text></View>
      <Svg width="100%" height={height} viewBox={`0 0 310 ${height}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        {points.slice(0, Math.max(1, Math.min(points.length, count + 1))).map((p, i, visible) => i < visible.length - 1 ? <Path key={`done-${i}`} d={`M ${p.x} ${p.y} Q ${visible[i + 1].x} ${visible[i + 1].y} ${visible[i + 1].x} ${visible[i + 1].y}`} fill="none" stroke={route.color} strokeWidth={5} opacity={.72} /> : null)}
        {points.map((p, i) => <Circle key={`node-${i}`} cx={p.x} cy={p.y} r={13} fill={i < count ? route.color : '#FFF9EB'} stroke={route.color} strokeWidth={2} />)}
      </Svg>
      {pet && <View pointerEvents="none" accessibilityLabel={`${pet.name}の現在地。${position.steps.toLocaleString()}歩`} style={[S.mapPet, { left: `${Math.max(2, Math.min(88, currentX / 310 * 100 - 5.5))}%`, top: Math.max(8, Math.min(height - 52, currentY - 38)) }]}><Image source={pet.image} contentFit="contain" style={S.mapPetImage} /></View>}
      {stops.map((s, i) => <Pressable key={`${s.id}-${i}`} accessibilityRole="button" accessibilityLabel={`${i + 1}番 ${s.name} ${i < count ? '参拝済み' : i === count ? '次の目的地' : 'これから'}`} onPress={() => onStop?.(s, i)} style={{ position: 'absolute', top: Math.max(i === 0 ? 60 : 21, points[i].y - 21), left: `${Math.max(18, Math.min(82, points[i].x / 310 * 100))}%`, width: 128, marginLeft: -64, minHeight: 40, padding: 8, borderRadius: 6, alignItems: 'center', backgroundColor: '#FFF9EBEA', borderWidth: i === count ? 2 : 0, borderColor: route.color }}><Text style={{ color: route.color, fontSize: 11, fontFamily: SERIF, textAlign: 'center' }}>{i < count ? '✓' : `${i + 1}`} {s.name}</Text>{i === count && <Text style={{ fontSize: 9, color: C.red }}>現在の目的地</Text>}</Pressable>)}
      <Text style={S.mapStatus}>{pet ? `${pet.name} · ${position.steps.toLocaleString()}歩` : '現在地は歩数に合わせて進みます'}</Text>
      <Text style={S.mapFootnote}>もびの世界の巡礼絵図 · 実際の地図ではありません</Text>
    </View>
    {peekAsset && pet && <View pointerEvents="none" accessibilityLabel={`${pet.name}が巡礼絵図の上辺に乗っている`} style={[S.mapPeek, { top: peekClearance - peekImageBottom + 14, height: peekImageHeight }]}><Image source={peekAsset} contentFit="contain" style={[S.mapPeekImage, { width: peekImageWidth, height: peekImageHeight, left: (190 - peekImageWidth) / 2, position: 'absolute', bottom: 0 }]} /></View>}
  </View>;
}

export function PilgrimagePicker({ activeId, onSelect, onClose, records, pet, guidedRouteId, guidedRoutePresented = false }: { activeId?: string; onSelect: (id: string) => void; onClose: () => void; records: Record<string, Progress>; pet?: Pick<PetCharacter, 'id' | 'image' | 'name'>; guidedRouteId?: string; guidedRoutePresented?: boolean }) {
  const [preview, setPreview] = useState<Pilgrimage | null>(null);
  const [tutorialRect, setTutorialRect] = useState<TutorialRect | null>(null);
  const reportTutorialRect = setTutorialRect;
  return <View style={{ flex: 1, backgroundColor: C.paper }}>
    <View style={S.header}><View><Text style={S.kicker}>もびの世界を歩く</Text><Text style={S.title}>{preview ? preview.name : 'どの旅へ、出かけよう。'}</Text></View>{(preview || activeId) && !guidedRouteId && <Pressable accessibilityRole="button" accessibilityLabel={preview ? 'コース一覧に戻る' : '巡礼選択を閉じる'} onPress={() => preview ? setPreview(null) : onClose()} style={S.close}><Icon name={preview ? 'arrow-back' : 'close'} /></Pressable>}</View>
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 0, paddingBottom: 40 }}>
      {preview ? guidedRouteId ? <>
        <Image source={PILGRIMAGE_IMAGES[preview.id]} accessibilityLabel={preview.subtitle} style={[S.hero, { height: 190 }]} contentFit="cover" />
        <Text style={[S.kicker, { color: preview.color, marginTop: 20 }]}>{preview.type} · {preview.ids.length}か所</Text>
        <Text style={[S.headline, { marginVertical: 9 }]}>最初の旅は、このコースから。</Text>
        <Text style={S.body}>歩くと巡礼が進み、順番に御朱印を集められます。</Text>
        <TutorialTarget active={!!guidedRouteId && guidedRoutePresented} onRectChange={reportTutorialRect} style={S.guidedRouteTarget}>
          <Button title="この巡礼に出発する" onPress={() => onSelect(preview.id)} style={S.guidedRouteButton} />
        </TutorialTarget>
        <Text style={[S.small, { textAlign: 'center' }]}>ルートはあとから選び直せます。</Text>
      </> : <>
        <Image source={PILGRIMAGE_IMAGES[preview.id]} accessibilityLabel={preview.subtitle} style={S.hero} contentFit="cover" />
        <Text style={[S.kicker, { marginTop: 20 }]}>{preview.type} · {preview.ids.length}{preview.type === '七願掛け' ? '巡' : 'か所'}</Text><Text style={S.headline}>{preview.subtitle}</Text><Text style={S.body}>{preview.description}</Text>
        <PaperCard><Text style={S.label}>この旅の結願</Text><Text style={S.body}>{preview.completion}</Text><Text style={S.label}>旅の証</Text><Text style={S.body}>{preview.gift}・称号「{preview.title}」</Text><Text style={S.small}>一日の参拝目安：{preview.targets.map(n => n.toLocaleString()).join(' / ')}歩{preview.type === '七願掛け' ? ' · 1日1巡' : ''}</Text></PaperCard>
        <RouteMap route={preview} count={records[preview.id]?.rewards.length ?? 0} progress={records[preview.id]} pet={pet} />
        <Button title={activeId === preview.id ? 'この旅をつづける' : records[preview.id] ? 'この旅を再開する' : 'この巡礼に出発する'} onPress={() => onSelect(preview.id)} style={{ marginTop: 18 }} />
        <Text style={S.small}>出発後に歩いた歩数で進みます。途中で旅を変えても記録は残ります。</Text>
      </> : <>
        <Text style={[S.body, { marginBottom: 20 }]}>{guidedRouteId ? 'さまざまな巡礼マップがあります。最初は「木漏れ日の奥宮へ」から始めましょう。' : '森の奥へ。雲の上へ。それとも、いつもの社へ。\n今の気持ちに合う巡礼を選んでください。'}</Text>
        {PILGRIMAGES.map((route, i) => {
          const guidedTarget = route.id === guidedRouteId;
          const card = <Pressable key={route.id} disabled={!!guidedRouteId && !guidedTarget} accessibilityRole="button" accessibilityLabel={`${route.name} ${route.type}の詳細${guidedRouteId && !guidedTarget ? '。今回は選択できません' : ''}`} accessibilityState={{ disabled: !!guidedRouteId && !guidedTarget }} onPress={() => { if (guidedTarget) setTutorialRect(null); setPreview(route); }} style={[S.card, guidedTarget && S.guidedMapCard]}>
            <Image source={PILGRIMAGE_IMAGES[route.id]} style={S.cardImage} contentFit="cover" />
            <View style={S.cardCopy}><Text style={[S.kicker, { color: route.color }]}>{String(i + 1).padStart(2, '0')} / {route.type}{!guidedRouteId && (activeId === route.id ? ' · 巡礼中' : records[route.id]?.completedAt ? ' · 結願' : '')}</Text><Text style={S.cardTitle}>{route.name}</Text><Text style={S.body}>{route.subtitle}</Text><View style={S.meta}><Text style={S.small}>{route.ids.length}{route.type === '七願掛け' ? '巡' : 'か所'} · {route.targets[0].toLocaleString()}歩から</Text><Icon name="arrow-forward" size={18} color={route.color} /></View></View>
          </Pressable>;
          return guidedTarget
            ? <TutorialTarget key={route.id} active={guidedRoutePresented} onRectChange={reportTutorialRect} style={S.guidedMapCardTarget}>{card}</TutorialTarget>
            : card;
        })}
        <Text style={S.small}>登場する寺社や景色は、もびの世界の創作です。</Text>
      </>}
    </ScrollView>
    {guidedRouteId && guidedRoutePresented && <TutorialSpotlightOverlay targetRect={tutorialRect} step={preview ? '2 / 6' : '1 / 6'} title={preview ? 'この巡礼に出発しよう' : '最初のルートを選ぼう'} detail={preview ? '「この巡礼に出発する」をタップ' : '「木漏れ日の奥宮へ」のマップカードをタップ'} />}
  </View>;
}

export function CompletionPage({ route, progress, onChooseNext }: { route: Pilgrimage; progress: Progress; onChooseNext?: () => void }) {
  return <PaperCard><View style={{ alignItems: 'center', gap: 10, paddingVertical: 15 }}><Text style={S.kicker}>巡 礼 結 願 証</Text><Text style={S.headline}>{route.name}</Text><Text style={[S.title, { color: C.red, borderWidth: 2, borderColor: C.red, padding: 13 }]}>結願</Text><Text style={S.body}>{route.gift}</Text><Text style={S.body}>{route.completion}。</Text><Text style={S.label}>「{route.title}」</Text><Text style={S.small}>{progress.completedAt} · {route.ids.length}のご縁を結びました</Text>{onChooseNext && <Button title="次の巡礼を選ぶ" icon="map-outline" onPress={onChooseNext} style={{ marginTop: 10, alignSelf: 'stretch' }} />}</View></PaperCard>;
}

const S = StyleSheet.create({
  guidedRouteTarget: { alignSelf: 'stretch', marginTop: 15, padding: 5 }, guidedRouteButton: { borderWidth: 3, borderColor: '#E6C171', shadowColor: '#8B6135', shadowOpacity: .48, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 9 },
  guidedMapCardTarget: { alignSelf: 'stretch' }, guidedMapCard: { borderWidth: 3, borderColor: '#E6C171', shadowColor: '#8B6135', shadowOpacity: .42, shadowRadius: 11, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  header: { padding: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, kicker: { fontSize: 10, letterSpacing: 1.6, color: C.muted }, title: { fontFamily: SERIF, color: C.ink, fontSize: 23, marginTop: 8 }, close: { padding: 10, minWidth: 44, minHeight: 44 }, hero: { width: '100%', height: 235, borderRadius: 12 }, headline: { fontFamily: SERIF, fontSize: 23, color: C.ink, marginVertical: 14 }, body: { fontSize: 13, lineHeight: 24, color: '#655B4D' }, label: { fontFamily: SERIF, fontSize: 15, color: C.ink, marginVertical: 8 }, small: { fontSize: 10, lineHeight: 20, color: '#857560', marginTop: 5 }, card: { marginBottom: 23, borderRadius: 12, backgroundColor: '#F6EEDC', borderWidth: 1, borderColor: '#DECFB7' }, cardImage: { width: '100%', height: 175 }, cardCopy: { padding: 17 }, cardTitle: { fontFamily: SERIF, fontSize: 23, color: C.ink, marginTop: 9, marginBottom: 4 }, meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }, mapFrame: { position: 'relative', width: '100%' }, map: { overflow: 'hidden', borderRadius: 12, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: '#F2E7CF', width: '100%' }, mapHeader: { position: 'absolute', left: 16, top: 13, zIndex: 3 }, mapTitle: { fontFamily: SERIF, fontSize: 16, color: '#4C5D4B' }, mapSubtitle: { marginTop: 3, fontSize: 10, color: '#776B58' }, mapPet: { position: 'absolute', width: 44, height: 44, zIndex: 4, alignItems: 'center', justifyContent: 'center' }, mapPetImage: { width: 39, height: 39 }, mapPeek: { position: 'absolute', top: -120, left: '50%', marginLeft: -95, width: 190, height: 200, zIndex: 5 }, mapPeekImage: { width: '100%', height: '100%' }, mapStatus: { position: 'absolute', right: 16, bottom: 25, fontSize: 9, color: '#5F594F', textShadowColor: '#FFF8E3', textShadowRadius: 3 }, mapFootnote: { position: 'absolute', bottom: 7, alignSelf: 'center', fontSize: 8, color: '#71634C' },
});
