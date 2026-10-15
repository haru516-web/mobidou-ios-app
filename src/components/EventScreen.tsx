import React, { useEffect, useState } from 'react';
import { AppState, Share, StyleSheet, Text, View } from 'react-native';
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
import { eventProgress, inviteMessage, normalizeTeamCode, teamInviteLink, teamSteps, type EventTeam, type JoinFailure } from '../services/eventTeam';
import { devEventTeam, eventTeamApi, loadEventTeam, useEventPendingRequest, useEventTeam } from '../services/eventTeamStore';
import { fetchProfile, saveProfile } from '../services/social';
import { openModerationMenu } from '../services/moderation';
import { SERVER_URL } from '../services/server';
import { offerNotifications } from '../services/notifications';
import { playSfx } from '../services/audio';

const ME_ID = 'me';
const JOIN_MESSAGES: Record<JoinFailure, string> = {
  invalid: 'チームコードの形式が正しくありません（6文字）。',
  not_found: 'そのコードのチームが見つかりませんでした。コードを確かめてください。',
  full: 'そのチームはもう満員です。',
  already_started: 'そのチームはすでに出発しています。',
  already_member: 'すでにそのチームに入っています。',
  request_pending: '別のチームに、参加の申請を出しています。先に、その申請を取り消してください。',
  offline: 'サーバーにつながりませんでした。電波のよいところで、もう一度お試しください。',
  profile_required: 'チームに入るには、名前の登録が必要です。',
  not_active: 'いまはイベントの期間ではありません。',
  too_many: '試した回数が多すぎます。しばらくしてから、もう一度お試しください。',
  unavailable: 'うまくいきませんでした。しばらくしてから、もう一度お試しください。',
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
  const meId = team.meId ?? ME_ID;
  const max = event.maxMembers ?? 4;
  return <PaperCard>
    <View style={S.rowBetween}><Text style={S.label}>チームメンバー</Text><Text style={S.small}>{team.members.length} / {max}人</Text></View>
    {team.members.map(m => <View key={m.id} style={S.member}>
      <PetAvatar petId={m.petId as PetCharacter['id']} size={34} />
      <Text numberOfLines={1} style={S.memberName}>{m.id === meId ? `${m.name}（自分）` : m.name}</Text>
      {team.status !== 'recruiting' && <Text style={S.memberSteps}>{m.steps.toLocaleString()}歩</Text>}
      {m.id !== meId && !m.id.startsWith('dev-') && <Pressable artwork={false} accessibilityRole="button" accessibilityLabel={`${m.name}さんを通報・ブロック`} onPress={() => openModerationMenu({ id: m.id, name: m.name })} style={S.iconButton}><Icon name="ellipsis-horizontal" size={18} color={C.muted} /></Pressable>}
    </View>)}
  </PaperCard>;
}

export function EventScreen({ visible, onClose, event, pet, initialCode = '', onOpenProfile }: { visible: boolean; onOpenProfile?: () => void; /** Opens the friends sheet, where the profile name is set. */ onClose: () => void; event: PilgrimageEvent; pet: Pet; /** A code that came with an invite link; it is filled in when the screen opens. */ initialCode?: string }) {
  const team = useEventTeam(event.id);
  const pending = useEventPendingRequest(event.id);
  const [code, setCode] = useState(initialCode);
  useEffect(() => { if (initialCode) setCode(initialCode); }, [initialCode]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Teammates see this name, so the server needs one before a team can be made or joined.
  const [name, setName] = useState('');
  const [needName, setNeedName] = useState(false);
  const me = { id: ME_ID, name: 'あなた', petId: pet.id };
  const min = event.minMembers ?? 2, max = event.maxMembers ?? 4;

  // Ask the server how the team stands when the screen opens, and when the app comes back to it. Requests and answers
  // reach the player as notifications, so there is no need to keep asking while the screen stays open.
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (!visible) return undefined;
    void loadEventTeam(event);
    void fetchProfile().then(profile => { if (profile) { setNeedName(!profile.name); if (profile.name) setName(profile.name); } });
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void loadEventTeam(event); });
    return () => subscription.remove();
  }, [visible, event]);
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await loadEventTeam(event); } finally { setRefreshing(false); }
  };

  const run = async (job: () => Promise<boolean>, failed?: () => void) => {
    if (busy) return;
    setBusy(true);
    try { const ok = await job(); playSfx(ok ? 'sfx_success' : 'sfx_error'); if (!ok) failed?.(); }
    finally { setBusy(false); }
  };
  /** Saves the typed name first when the server has none yet. Returns false (with a notice) when that did not work. */
  const ensureName = async () => {
    if (!needName) return true;
    const saved = await saveProfile(name, pet.id);
    if (saved.ok) { setNeedName(false); return true; }
    setNotice(saved.reason === 'invalid' ? '名前は1〜12文字で入力してください。' : saved.reason === 'inappropriate' ? 'その名前は使えません。別の名前にしてください。' : JOIN_MESSAGES.offline);
    return false;
  };
  const create = () => void run(async () => {
    setNotice('');
    if (!(await ensureName())) return false;
    const result = await eventTeamApi.create(event, me);
    if (!result.ok) { setNotice(JOIN_MESSAGES[result.reason]); return false; }
    // Others will ask to join: offer to tell the player when they do.
    void offerNotifications();
    return true;
  });
  const join = () => void run(async () => {
    setNotice('');
    if (!(await ensureName())) return false;
    const result = await eventTeamApi.join(event, code, me);
    if (!result.ok) { setNotice(JOIN_MESSAGES[result.reason]); return false; }
    // The maker answers later: offer to tell the player when they do.
    void offerNotifications();
    setCode('');
    return true;
  });
  const answer = (requestId: string, accept: boolean) => void run(async () => {
    setNotice('');
    const result = await eventTeamApi.answerRequest(event, requestId, accept);
    if (result !== 'ok') { setNotice(result === 'full' ? 'このチームはもう満員です。' : result === 'offline' ? JOIN_MESSAGES.offline : JOIN_MESSAGES.unavailable); return false; }
    return true;
  });
  const cancelRequest = () => void run(async () => {
    setNotice('');
    const ok = await eventTeamApi.cancelRequest(event.id);
    if (!ok) setNotice(JOIN_MESSAGES.offline);
    return ok;
  });
  const requestCard = (requests: readonly { id: string; name: string; petId: string }[]) => (requests.length === 0 ? null : <PaperCard key="requests">
    <Text style={S.label}>参加の申請が届いています</Text>
    <Text style={S.small}>承認すると、その人がチームの仲間になり、フレンドにもなります。</Text>
    {requests.map(row => <View key={row.id} style={S.member}>
      <PetAvatar petId={row.petId as PetCharacter['id']} size={34} />
      <Text numberOfLines={1} style={S.memberName}>{row.name}</Text>
      <Pressable plate="primary" artwork={false} accessibilityRole="button" accessibilityLabel={`${row.name}さんの参加を承認する`} disabled={busy} onPress={() => answer(row.id, true)} style={S.primarySmall}><Text style={S.primarySmallText}>承認</Text></Pressable>
      <Pressable plate="secondary" artwork={false} accessibilityRole="button" accessibilityLabel={`${row.name}さんの参加を見送る`} disabled={busy} onPress={() => answer(row.id, false)} style={S.secondarySmall}><Text style={S.secondarySmallText}>見送る</Text></Pressable>
    </View>)}
  </PaperCard>);
  const claim = () => void run(async () => {
    setNotice('');
    const ok = await eventTeamApi.claim(event);
    if (!ok) setNotice(JOIN_MESSAGES.unavailable);
    return ok;
  });
  const leave = () => void run(async () => {
    setNotice('');
    const ok = await eventTeamApi.leave(event.id, team?.meId ?? ME_ID);
    if (!ok) setNotice(JOIN_MESSAGES.offline);
    return ok;
  });
  const share = (t: EventTeam) => void Share.share({ message: inviteMessage(event, t.code, teamInviteLink(SERVER_URL, t.code)) }).catch(() => undefined);
  /** The team code with its share button: shown while the team can still take someone in, before and after it sets out. */
  const codeCard = (t: EventTeam) => (<PaperCard key="code">
        <Text style={S.label}>チームコード</Text>
        <View style={S.rowBetween}>
          <Text selectable style={S.code}>{normalizeTeamCode(t.code)}</Text>
          <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="チームコードと招待リンクを共有" onPress={() => share(t)} style={S.iconButton}><Icon name="share-outline" size={20} color={C.red} /></Pressable>
        </View>
        <Text style={S.small}>フレンドや、まだアプリを持っていない友だちにも送れます。コードを入れた人から申請が届くので、あなたが承認すると、チームに入れます。</Text>
      </PaperCard>);

  const body: React.ReactElement[] = [];
  if (!team && pending) {
    body.push(<PaperCard key="waiting">
      <Text style={S.headline}>{event.name}</Text>
      <Text style={S.label}>参加の申請を送りました</Text>
      <Text style={S.body}>{pending.creatorName}さんが承認すると、チームに入れます。そのままお待ちください。この画面を閉じても、申請は残ります。</Text>
    </PaperCard>);
    body.push(<View key="cancel" style={S.actions}>
      <Button title={refreshing ? "確認中…" : "返事を確認する"} secondary disabled={refreshing} onPress={() => void refresh()} />
      <Button title="申請を取り消す" secondary disabled={busy} onPress={cancelRequest} />
      {!!notice && <Text accessibilityLiveRegion="polite" style={S.notice}>{notice}</Text>}
    </View>);
  } else if (!team) {
    body.push(<PaperCard key="intro">
      <Text style={S.headline}>{event.name}</Text>
      <Text style={S.body}>{event.tagline}</Text>
      <Text style={S.label}>あそび方</Text>
      <Text style={S.body}>・{min}〜{max}人のチームで参加します（ひとりでは参加できません）{'\n'}・チームをつくった人が、参加の申請を承認します。仲間が1人参加すると、イベントが始まります{'\n'}・全員の歩数を合わせて、イベントの道を進みます{'\n'}・クリアすると、参加した全員が受け取れます：{event.reward}</Text>
    </PaperCard>);
    body.push(<View key="actions" style={S.actions}>
      {needName && <PaperCard key="profile">
        <Text style={S.label}>はじめに、プロフィールの名前を決めましょう</Text>
        <Text style={S.small}>名前は、チームのメンバーとフレンドに見えます。ニックネームでかまいません（12文字まで）。決めたら、このイベントの画面にもどって、チームをつくります。</Text>
      </PaperCard>}
      {needName
        ? <Button title="プロフィールを決める" onPress={() => (onOpenProfile ?? onClose)()} />
        : <Button title="チームをつくる" disabled={busy} onPress={create} />}
      {!needName && <Text style={S.label}>チームコードで参加する</Text>}
      {!needName && <Text style={S.small}>フレンドから教えてもらったチームコード（英数字6文字）を入れて、「参加」を押します。</Text>}
      {!needName && <View style={[S.joinRow]}>
        <WashiArt />
        <WashiInput value={code} onChangeText={value => setCode(value.toUpperCase())} maxLength={7} placeholder="チームコード" placeholderTextColor="#B7A58F" autoCapitalize="characters" autoCorrect={false} accessibilityLabel="チームコード" style={S.codeInput} />
        <Pressable plate="primary" artwork={false} accessibilityRole="button" disabled={busy || !code.trim() || (needName && !name.trim())} onPress={join} style={[S.primarySmall, (busy || !code.trim()) && S.disabled]}><Text style={S.primarySmallText}>参加</Text></Pressable>
      </View>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={S.notice}>{notice}</Text>}
    </View>);
  } else if (team.status === 'recruiting') {
    // The way back to the first screen (make a team / enter a code). It is the same as leaving the team, so it sits first, not on the second page.
    body.push(<Pressable key="back" plate="secondary" artwork={false} accessibilityRole="button" accessibilityLabel="前の画面にもどる（チームをぬける）" onPress={leave} style={S.back}><Icon name="chevron-back" size={16} color={C.red} /><Text style={S.secondarySmallText}>{team.members.length > 1 ? 'チームをぬけて、もどる' : 'もどる'}</Text></Pressable>);
    body.push(codeCard(team));
    body.push(<Members key="members" team={team} event={event} />);
    body.push(<View key="refresh" style={S.actions}><Button title={refreshing ? "確認中…" : "申請を確認する"} secondary disabled={refreshing} onPress={() => void refresh()} /></View>);
    const asking = requestCard(team.requests ?? []);
    if (asking) body.push(asking);
    body.push(<View key="start" style={S.actions}>
      <Text style={S.hint}>仲間が1人参加すると、イベントが始まります（{min}〜{max}人）。参加したい人は、チームコードを入れて申請します。あなたが承認すると、チームに入れます。</Text>
      {!!notice && <Text accessibilityLiveRegion="polite" style={S.notice}>{notice}</Text>}
    </View>);
  } else {
    const progress = eventProgress(event, teamSteps(team));
    body.push(<View key="map"><EventMap event={event} steps={progress.steps} pet={pet} maxHeight={330} />
      <Text style={S.target}>{progress.cleared ? '結願。時をめぐる旅が終わりました。' : progress.next ? `次は「${progress.next.name}」· あと${(progress.next.at - progress.steps).toLocaleString()}歩` : ''}</Text>
    </View>);
    const tickets = eventTicketsEarned(event.goalSteps, progress.steps);
    const nextTicket = nextEventTicketAt(event.goalSteps, tickets);
    body.push(<Text key="tickets" style={S.ticketLine}>木札 {tickets} / 4{nextTicket ? ` · 次は ${nextTicket.toLocaleString()}歩で1枚` : ' · すべてもらいました'}</Text>);
    body.push(<PaperCard key="collected">
      <View style={S.rowBetween}><Text style={S.label}>集まった時代の宝物</Text><Text style={S.small}>{progress.reached} / {(event.spots ?? []).length}</Text></View>
      <Text style={S.body}>{(event.spots ?? []).map((s, i) => i < progress.reached ? s.miniature : '？').join(' · ')}</Text>
    </PaperCard>);
    body.push(<Members key="members" team={team} event={event} />);
    body.push(<View key="refresh" style={S.actions}><Button title={refreshing ? "確認中…" : "チームの状況を更新する"} secondary disabled={refreshing} onPress={() => void refresh()} /></View>);
    const asking = team.members.length < max ? requestCard(team.requests ?? []) : null;
    if (asking) body.push(asking);
    if (team.members.length < max) body.push(codeCard(team));
    if (progress.cleared) body.push(<View key="claim" style={S.actions}>
      <Button title={team.claimed ? '受け取りました' : '報酬を受け取る'} disabled={team.claimed || busy} onPress={claim} />
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

  return <Sheet event visible={visible} title="イベント巡礼" onClose={onClose}>{body}</Sheet>;
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
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 38, paddingLeft: 8, paddingRight: 14, borderRadius: 19, borderWidth: 1, borderColor: '#D6BFB0' },
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
