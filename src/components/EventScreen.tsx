import React, { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Image } from './AppImage';
import type { PilgrimageEvent } from '../data/events';
import { EVENT_MAP_IMAGE } from '../data/eventImages';
import type { PetCharacter } from '../petCatalog';
import { BRUSH, Button, C, Icon } from '../components';
import { PaperCard, WashiArt, WashiPressable as Pressable } from './Washi';
import { WashiInput } from './WashiInput';
import { PetAvatar, Sheet } from './SocialSheets';
import { eventTicketsEarned, nextEventTicketAt } from '../services/eventGacha';
import { eventProgress, inviteMessage, normalizeTeamCode, startBlocker, teamInviteLink, teamSteps, type EventTeam, type JoinFailure } from '../services/eventTeam';
import { devEventTeam, eventTeamApi, useEventTeam } from '../services/eventTeamStore';
import { SERVER_URL } from '../services/server';
import { playSfx } from '../services/audio';

const ME_ID = 'me';
const JOIN_MESSAGES: Record<JoinFailure, string> = {
  invalid: 'チームコードの形式が正しくありません（6文字）。',
  not_found: 'そのコードのチームが見つかりませんでした。コードを確かめてください。',
  full: 'そのチームはもう満員です。',
  already_started: 'そのチームはすでに出発しています。',
  already_member: 'すでにそのチームに入っています。',
};

type Pet = Pick<PetCharacter, 'id' | 'image' | 'name'>;

/** Where the 15 spots sit on the map art (fractions of its width and height), bottom-left to top-right. */
const SPOT_ANCHORS = [{ x: .10, y: .84 }, { x: .22, y: .78 }, { x: .34, y: .72 }, { x: .25, y: .64 }, { x: .16, y: .56 }, { x: .29, y: .51 }, { x: .42, y: .46 }, { x: .57, y: .50 }, { x: .72, y: .54 }, { x: .78, y: .45 }, { x: .84, y: .36 }, { x: .72, y: .29 }, { x: .60, y: .22 }, { x: .73, y: .16 }, { x: .86, y: .10 }];

/** The map art is 2:3; it is drawn as large as fits in `maxHeight` and the spots follow the road painted into it. */
export function EventMap({ event, steps, pet, maxHeight }: { event: PilgrimageEvent; steps: number; pet: Pet; maxHeight: number }) {
  const [available, setAvailable] = useState(310);
  const spots = event.spots ?? [];
  const width = Math.max(120, Math.min(available, maxHeight / 1.5));
  const height = width * 1.5;
  const progress = eventProgress(event, steps);
  const points = spots.map((_, i) => ({ x: SPOT_ANCHORS[Math.min(i, SPOT_ANCHORS.length - 1)].x * width, y: SPOT_ANCHORS[Math.min(i, SPOT_ANCHORS.length - 1)].y * height }));
  const from = points[Math.max(0, progress.reached - 1)] ?? points[0];
  const to = points[Math.min(points.length - 1, progress.reached)] ?? from;
  // Before the first spot the moby stands on it; after the last it stays there.
  const here = progress.next && progress.reached > 0 ? { x: from.x + (to.x - from.x) * progress.ratio, y: from.y + (to.y - from.y) * progress.ratio } : points[progress.next ? 0 : points.length - 1] ?? from;
  const scale = width / 310;
  return <View onLayout={e => setAvailable(Math.round(e.nativeEvent.layout.width))} style={{ width: '100%', alignItems: 'center' }}>
    <View style={[S.map, { width, height }]}>
      <Image source={EVENT_MAP_IMAGE} contentFit="cover" style={StyleSheet.absoluteFillObject} />
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
        {points.map((p, i) => {
          const reached = i < progress.reached, next = i === progress.reached && !progress.cleared;
          return <React.Fragment key={spots[i].id}>
            <Circle cx={p.x} cy={p.y} r={(next ? 11 : 9) * scale} fill={reached ? '#2F4A6B' : '#FFF9EB'} stroke={next ? '#C9A24B' : '#2F4A6B'} strokeWidth={(next ? 3 : 1.5) * scale} />
            <SvgText x={p.x} y={p.y + 4 * scale} fontSize={10 * scale} fontWeight="700" textAnchor="middle" fill={reached ? '#FFF4DE' : '#2F4A6B'}>{reached ? '✓' : i + 1}</SvgText>
          </React.Fragment>;
        })}
      </Svg>
      <View pointerEvents="none" accessibilityLabel={`${pet.name}の現在地`} style={[S.mapPet, { left: here.x - 22, top: here.y - 50 }]}><Image source={pet.image} contentFit="contain" style={S.mapPetImage} /></View>
      <Text style={S.mapStatus}>チーム合計 {progress.steps.toLocaleString()}歩</Text>
    </View>
  </View>;
}

function Members({ team, event }: { team: EventTeam; event: PilgrimageEvent }) {
  const max = event.maxMembers ?? 4;
  return <PaperCard>
    <View style={S.rowBetween}><Text style={S.label}>チームメンバー</Text><Text style={S.small}>{team.members.length} / {max}人</Text></View>
    {team.members.map(m => <View key={m.id} style={S.member}>
      <PetAvatar petId={m.petId as PetCharacter['id']} size={34} />
      <Text numberOfLines={1} style={S.memberName}>{m.id === ME_ID ? `${m.name}（自分）` : m.name}</Text>
      {team.status !== 'recruiting' && <Text style={S.memberSteps}>{m.steps.toLocaleString()}歩</Text>}
    </View>)}
  </PaperCard>;
}

export function EventScreen({ visible, onClose, event, pet }: { visible: boolean; onClose: () => void; event: PilgrimageEvent; pet: Pet }) {
  const team = useEventTeam(event.id);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const me = { id: ME_ID, name: 'あなた', petId: pet.id };
  const min = event.minMembers ?? 2, max = event.maxMembers ?? 4;

  const create = () => { eventTeamApi.create(event, me); playSfx('sfx_success'); setNotice(''); };
  const join = () => {
    const result = eventTeamApi.join(event, code, me);
    playSfx(result.ok ? 'sfx_success' : 'sfx_error');
    setNotice(result.ok ? '' : JOIN_MESSAGES[result.reason]);
    if (result.ok) setCode('');
  };
  const start = () => { const r = eventTeamApi.start(event); playSfx(r.ok ? 'sfx_success' : 'sfx_error'); };
  const claim = () => { playSfx(eventTeamApi.claim(event) ? 'sfx_success' : 'sfx_error'); };
  const share = (t: EventTeam) => void Share.share({ message: inviteMessage(event, t.code, teamInviteLink(SERVER_URL, t.code)) }).catch(() => undefined);

  const body: React.ReactElement[] = [];
  if (!team) {
    body.push(<PaperCard key="intro">
      <Text style={S.headline}>{event.name}</Text>
      <Text style={S.body}>{event.tagline}</Text>
      <Text style={S.label}>あそび方</Text>
      <Text style={S.body}>・フレンドと{min}〜{max}人のチームで参加します（ひとりでは参加できません）{'\n'}・全員の歩数を合わせて、イベントの道を進みます{'\n'}・クリアすると、参加した全員が受け取れます：{event.reward}</Text>
    </PaperCard>);
    body.push(<View key="actions" style={S.actions}>
      <Button title="チームをつくる" onPress={create} />
      <View style={[S.joinRow]}>
        <WashiArt />
        <WashiInput value={code} onChangeText={value => setCode(value.toUpperCase())} maxLength={7} placeholder="チームコード" placeholderTextColor="#B7A58F" autoCapitalize="characters" autoCorrect={false} accessibilityLabel="チームコード" style={S.codeInput} />
        <Pressable plate="primary" artwork={false} accessibilityRole="button" disabled={!code.trim()} onPress={join} style={[S.primarySmall, !code.trim() && S.disabled]}><Text style={S.primarySmallText}>参加</Text></Pressable>
      </View>
      {!!notice && <Text accessibilityLiveRegion="polite" style={S.notice}>{notice}</Text>}
    </View>);
  } else if (team.status === 'recruiting') {
    const blocker = startBlocker(team, event);
    body.push(<PaperCard key="code">
      <Text style={S.label}>チームコード</Text>
      <View style={S.rowBetween}>
        <Text selectable style={S.code}>{normalizeTeamCode(team.code)}</Text>
        <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="チームコードと招待リンクを共有" onPress={() => share(team)} style={S.iconButton}><Icon name="share-outline" size={20} color={C.red} /></Pressable>
      </View>
      <Text style={S.small}>フレンドや、まだアプリを持っていない友だちにも送れます。リンクから参加すると、そのままフレンドになります。</Text>
    </PaperCard>);
    body.push(<Members key="members" team={team} event={event} />);
    body.push(<View key="start" style={S.actions}>
      <Button title="このメンバーで出発する" disabled={!!blocker} onPress={start} />
      <Text style={S.hint}>{blocker === 'too_few' ? `あと${min - team.members.length}人以上集まると出発できます（${min}〜${max}人）` : '出発すると、メンバーの追加はできなくなります'}</Text>
      <Pressable plate="secondary" artwork={false} accessibilityRole="button" onPress={() => { eventTeamApi.leave(event.id, ME_ID); setNotice(''); }} style={S.leave}><Text style={S.secondarySmallText}>チームをぬける</Text></Pressable>
    </View>);
  } else {
    const progress = eventProgress(event, teamSteps(team));
    body.push(<View key="map"><EventMap event={event} steps={progress.steps} pet={pet} maxHeight={330} />
      <Text style={S.target}>{progress.cleared ? '結願。時をめぐる旅が終わりました。' : progress.next ? `次は「${progress.next.name}」· あと${(progress.next.at - progress.steps).toLocaleString()}歩` : ''}</Text>
    </View>);
    const tickets = eventTicketsEarned(event.goalSteps, progress.steps);
    const nextTicket = nextEventTicketAt(event.goalSteps, tickets);
    body.push(<Text key="tickets" style={S.ticketLine}>イベント木札 {tickets} / 4{nextTicket ? ` · 次は ${nextTicket.toLocaleString()}歩で1枚` : ' · すべてもらいました'}</Text>);
    body.push(<PaperCard key="collected">
      <View style={S.rowBetween}><Text style={S.label}>集まった時代の宝物</Text><Text style={S.small}>{progress.reached} / {(event.spots ?? []).length}</Text></View>
      <Text style={S.body}>{(event.spots ?? []).map((s, i) => i < progress.reached ? s.miniature : '？').join(' · ')}</Text>
    </PaperCard>);
    body.push(<Members key="members" team={team} event={event} />);
    if (progress.cleared) body.push(<View key="claim" style={S.actions}>
      <Button title={team.claimed ? '受け取りました' : '報酬を受け取る'} disabled={team.claimed} onPress={claim} />
      <Text style={S.hint}>{event.reward}</Text>
    </View>);
  }

  if (__DEV__) body.push(<View key="dev" style={S.dev}>
    <Text style={S.devLabel}>開発用（本番では出ません）</Text>
    <View style={S.devRow}>
      {team?.status === 'recruiting' && <Pressable plate="secondary" artwork={false} accessibilityRole="button" onPress={() => devEventTeam.addFriend(event.id, `友だち${team.members.length}`)} style={S.secondarySmall}><Text style={S.secondarySmallText}>友だち参加</Text></Pressable>}
      {team && team.status !== 'recruiting' && <Pressable plate="secondary" artwork={false} accessibilityRole="button" onPress={() => devEventTeam.addSteps(event.id, 20000)} style={S.secondarySmall}><Text style={S.secondarySmallText}>+2万歩</Text></Pressable>}
      {team && <Pressable plate="secondary" artwork={false} accessibilityRole="button" onPress={() => devEventTeam.reset(event.id)} style={S.secondarySmall}><Text style={S.secondarySmallText}>リセット</Text></Pressable>}
    </View>
  </View>);

  return <Sheet visible={visible} title="イベント巡礼" onClose={onClose}>{body}</Sheet>;
}

const S = StyleSheet.create({
  headline: { fontFamily: BRUSH, fontSize: 22, color: C.ink, marginBottom: 6 },
  body: { fontSize: 13, lineHeight: 23, color: '#655B4D' },
  label: { fontFamily: BRUSH, fontSize: 15, color: C.ink, marginVertical: 6 },
  small: { fontSize: 12, lineHeight: 19, color: '#857560', marginTop: 4 },
  hint: { fontSize: 12, lineHeight: 18, color: C.muted, textAlign: 'center' },
  notice: { color: '#7D4939', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  actions: { gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, overflow: 'hidden' },
  codeInput: { flex: 1, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFFFFF', color: C.ink, fontSize: 16, letterSpacing: 2 },
  code: { fontFamily: 'ShipporiBold', fontSize: 28, letterSpacing: 5, color: C.ink },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4E7D8' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  memberName: { flex: 1, fontFamily: BRUSH, fontSize: 15, color: C.ink },
  memberSteps: { fontSize: 13, color: C.red, fontFamily: 'ShipporiBold' },
  primarySmall: { minHeight: 38, minWidth: 64, paddingHorizontal: 14, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red },
  primarySmallText: { color: '#FFF9EF', fontFamily: BRUSH, fontSize: 14 },
  secondarySmall: { minHeight: 38, paddingHorizontal: 12, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D6BFB0' },
  secondarySmallText: { color: C.red, fontFamily: BRUSH, fontSize: 13 },
  leave: { alignSelf: 'center', minHeight: 38, paddingHorizontal: 14, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D6BFB0' },
  disabled: { opacity: .45 },
  map: { overflow: 'hidden', borderRadius: 12, backgroundColor: '#F2E7CF' },
  mapPet: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mapPetImage: { width: 40, height: 40 },
  mapStatus: { position: 'absolute', right: 10, bottom: 10, fontSize: 11, color: '#4E4034', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, overflow: 'hidden', backgroundColor: '#FBF4E4F2' },
  ticketLine: { fontSize: 12, color: '#8D5847', textAlign: 'center' },
  target: { fontFamily: BRUSH, fontSize: 14, color: C.ink, textAlign: 'center', marginTop: 10 },
  dev: { gap: 6, paddingTop: 4, alignItems: 'center' },
  devLabel: { fontSize: 11, color: C.muted },
  devRow: { flexDirection: 'row', gap: 8 },
});
