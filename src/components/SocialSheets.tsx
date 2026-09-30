import React, { useEffect, useState } from 'react';
import { Modal, Share, StyleSheet, Text, View } from 'react-native';
import { WashiInput } from './WashiInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BRUSH, C, Icon } from '../components';
import { getPetCharacter, type PetCharacter } from '../petCatalog';
import { WashiArt, WashiPressable as Pressable } from './Washi';
import { PagedBody } from './PagedBody';
import { answerFriendRequest, fetchFriendRequests, fetchFriends, getMyFriendCode, sendFriendRequest, SOCIAL_ONLINE, type Friend, type FriendRequest, type Gift, type GiftItem } from '../services/social';

const TICKET_IMAGES: Record<GiftItem['kind'], number> = {
  keychainDrop: require('../../assets/ui-round3/tickets/ticket-keychain-drop-v2.webp'),
};
const TICKET_NAMES: Record<GiftItem['kind'], string> = {
  keychainDrop: 'ミニチュアキーホルダー引換券',
};

/** Page sheet shared by the social screens and the book index. */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={S.sheet}>
      <View style={S.sheetHeader}>
        <Text accessibilityRole="header" style={S.sheetTitle}>{title}</Text>
        <Pressable plate="round" artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={S.close}><Icon name="close" size={21} /></Pressable>
      </View>
      <PagedBody style={S.sheetBody}>{children}</PagedBody>
    </SafeAreaView>
  </Modal>;
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return <View style={S.sectionTitleRow}><Text style={S.sectionTitle}>{title}</Text>{!!note && <Text style={S.sectionNote}>{note}</Text>}</View>;
}

/** A section title kept on the same page as the first thing under it. */
function titled(key: string, title: string, note: string | undefined, items: React.ReactElement[], empty: React.ReactElement): React.ReactElement[] {
  const list = items.length ? items : [empty];
  return list.map((item, index) => index === 0 ? <View key={`${key}-head`}><SectionTitle title={title} note={note} />{item}</View> : item);
}

function Empty({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
  return <View style={S.empty}><Icon name={icon} size={24} color="#B7A58F" /><Text style={S.emptyText}>{text}</Text></View>;
}

function OfflineBanner({ text }: { text: string }) {
  return <View style={S.offline}><Icon name="cloud-offline-outline" size={18} color="#8A6950" /><Text style={S.offlineText}>{text}</Text></View>;
}

// ---- 通知 -----------------------------------------------------------------

export type AppNotice = {
  id: string;
  kind: 'todo' | 'status' | 'event';
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  body?: string;
  date?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Notices that count toward Mobby's badge until they have been seen. */
export const countsAsUnread = (notice: AppNotice, readIds: ReadonlySet<string>) => notice.kind !== 'status' && !readIds.has(notice.id);

function NoticeRow({ notice, unread, onAction }: { notice: AppNotice; unread: boolean; onAction?: () => void }) {
  return <View style={[S.card, S.noticeRow]}>
    <WashiArt />
    <View style={[S.noticeIcon, notice.kind === 'todo' && S.noticeIconTodo]}><Icon name={notice.icon} size={20} color={notice.kind === 'todo' ? '#FFF9EF' : C.red} /></View>
    <View style={{ flex: 1 }}>
      <View style={S.noticeTitleRow}>{unread && <View style={S.unreadDot} />}<Text style={S.noticeTitle}>{notice.title}</Text></View>
      {!!notice.body && <Text style={S.noticeBody}>{notice.body}</Text>}
      {!!notice.date && <Text style={S.noticeDate}>{notice.date}</Text>}
      {!!notice.actionLabel && !!onAction && <Pressable plate="secondary" artwork={false} accessibilityRole="button" onPress={onAction} style={S.inlineAction}><Text style={S.inlineActionText}>{notice.actionLabel}</Text><Icon name="chevron-forward" size={14} color={C.red} /></Pressable>}
    </View>
  </View>;
}

export function NotificationsSheet({ visible, notices, readIds, onClose }: { visible: boolean; notices: readonly AppNotice[]; readIds: ReadonlySet<string>; onClose: () => void }) {
  const todo = notices.filter(notice => notice.kind === 'todo');
  const status = notices.filter(notice => notice.kind === 'status');
  const events = notices.filter(notice => notice.kind === 'event');
  const act = (notice: AppNotice) => { onClose(); notice.onAction?.(); };
  return <Sheet visible={visible} title="通知" onClose={onClose}>
    {todo.length > 0 && titled('todo', 'やること', undefined, todo.map(notice => <NoticeRow key={notice.id} notice={notice} unread={countsAsUnread(notice, readIds)} onAction={() => act(notice)} />), <View />)}
    {status.length > 0 && titled('status', 'いまの旅', undefined, status.map(notice => <NoticeRow key={notice.id} notice={notice} unread={false} onAction={() => act(notice)} />), <View />)}
    {titled('events', 'できごと', events.length ? `${events.length}件` : undefined, events.map(notice => <NoticeRow key={notice.id} notice={notice} unread={countsAsUnread(notice, readIds)} onAction={() => act(notice)} />), <Empty icon="notifications-outline" text="御朱印を授かると、ここにお知らせが届きます" />)}
  </Sheet>;
}

// ---- プレゼントボックス ------------------------------------------------------

function GiftCard({ gift, received, onReceive }: { gift: Gift; received: boolean; onReceive?: () => void }) {
  return <View style={[S.card, received && S.cardMuted]}>
    <WashiArt />
    <View style={S.giftHeader}><Icon name="gift-outline" size={20} color={C.red} /><Text style={S.giftTitle}>{gift.title}</Text></View>
    <Text style={S.giftMessage}>{gift.message}</Text>
    <View style={S.giftItems}>
      {gift.items.map(item => <View key={item.kind} style={S.giftItem}>
        <Image source={TICKET_IMAGES[item.kind]} contentFit="contain" style={S.giftTicket} />
        <Text style={S.giftItemName}>{TICKET_NAMES[item.kind]}</Text>
        <Text style={S.giftItemCount}>×{item.quantity}</Text>
      </View>)}
    </View>
    <View style={S.giftFooter}>
      <Text style={S.giftMeta}>{gift.from} · {gift.sentAt}{gift.expiresAt ? ` · ${gift.expiresAt}まで` : ''}</Text>
      {received
        ? <Text style={S.giftReceived}>受け取り済み</Text>
        : <Pressable plate="primary" artwork={false} accessibilityRole="button" accessibilityLabel={`${gift.title}を受け取る`} onPress={onReceive} style={S.primarySmall}><Text style={S.primarySmallText}>受け取る</Text></Pressable>}
    </View>
  </View>;
}

export function PresentBoxSheet({ visible, gifts, receivedIds, demo, onReceive, onClose }: { visible: boolean; gifts: readonly Gift[]; receivedIds: ReadonlySet<string>; demo: boolean; onReceive: (gift: Gift) => void; onClose: () => void }) {
  const waiting = gifts.filter(gift => !receivedIds.has(gift.id));
  const received = gifts.filter(gift => receivedIds.has(gift.id));
  return <Sheet visible={visible} title="プレゼントボックス" onClose={onClose}>
    {!SOCIAL_ONLINE && <OfflineBanner text={demo ? 'プレゼントの配信は準備中です。体験モードではサンプルを受け取れます。' : 'プレゼントの配信は準備中です。配信が始まると、ここに届きます。'} />}
    {titled('waiting', '受け取れるプレゼント', waiting.length ? `${waiting.length}件` : undefined, waiting.map(gift => <GiftCard key={gift.id} gift={gift} received={false} onReceive={() => onReceive(gift)} />), <Empty icon="gift-outline" text="いま受け取れるプレゼントはありません" />)}
    {received.length > 0 && titled('received', '受け取り済み', undefined, received.map(gift => <GiftCard key={gift.id} gift={gift} received />), <View />)}
  </Sheet>;
}

// ---- フレンド ---------------------------------------------------------------

function PetAvatar({ petId, size = 52 }: { petId: PetCharacter['id']; size?: number }) {
  const pet = getPetCharacter(petId);
  return <View style={[S.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: pet.accent + '33' }]}><Image source={pet.image} contentFit="contain" style={{ width: size * .86, height: size * .86 }} /></View>;
}

export function FriendsSheet({ visible, demo, pet, onClose }: { visible: boolean; demo: boolean; pet: PetCharacter; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [friends, setFriends] = useState<readonly Friend[]>([]);
  const [requests, setRequests] = useState<readonly FriendRequest[]>([]);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setNotice('');
    void Promise.all([getMyFriendCode(), fetchFriends({ demo }), fetchFriendRequests({ demo })]).then(([myCode, list, pending]) => {
      if (!active) return;
      setCode(myCode); setFriends(list); setRequests(pending);
    });
    return () => { active = false; };
  }, [demo, visible]);

  const offlineMessage = 'フレンド機能はオンライン接続の準備中です。公開までお待ちください。';
  const submit = async () => {
    const result = await sendFriendRequest(input);
    setNotice(result.ok ? '申請を送りました' : result.reason === 'invalid' ? 'フレンドコードの形式が正しくありません（例：MOBI-ABCD-2345）' : offlineMessage);
  };
  const answer = async (request: FriendRequest, accept: boolean) => {
    const result = await answerFriendRequest(request.id, accept);
    setNotice(result.ok ? (accept ? `${request.name}さんとフレンドになりました` : '申請を見送りました') : offlineMessage);
  };

  return <Sheet visible={visible} title="フレンド" onClose={onClose}>
    {!SOCIAL_ONLINE && <OfflineBanner text={demo ? 'フレンド機能は準備中です。体験モードではサンプルを表示しています。' : 'フレンド機能は準備中です。公開後、ここでフレンドと歩みを共有できます。'} />}
    {!!notice && <Text accessibilityLiveRegion="polite" style={S.notice}>{notice}</Text>}

    <View style={[S.card, S.myCard]}>
      <WashiArt />
      <PetAvatar petId={pet.id} size={64} />
      <View style={{ flex: 1 }}>
        <Text style={S.myLabel}>あなたのフレンドコード</Text>
        <Text selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.7} style={S.myCode}>{code || '…'}</Text>
      </View>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="フレンドコードを共有" disabled={!code} onPress={() => void Share.share({ message: `もび道でいっしょに歩こう！ フレンドコード：${code}` }).catch(() => undefined)} style={S.iconButton}><Icon name="share-outline" size={20} color={C.red} /></Pressable>
    </View>

    <View key="add"><SectionTitle title="フレンドを追加" />
    <View style={[S.card, S.addRow]}>
      <WashiArt />
      <WashiInput value={input} onChangeText={value => setInput(value.toUpperCase())} placeholder="MOBI-XXXX-XXXX" placeholderTextColor="#B7A58F" autoCapitalize="characters" autoCorrect={false} accessibilityLabel="フレンドコード" style={S.codeInput} />
      <Pressable plate="primary" artwork={false} accessibilityRole="button" disabled={!input.trim()} onPress={() => void submit()} style={[S.primarySmall, !input.trim() && S.disabled]}><Text style={S.primarySmallText}>申請</Text></Pressable>
    </View></View>

    {titled('requests', '届いた申請', requests.length ? `${requests.length}件` : undefined, requests.map(request => <View key={request.id} style={[S.card, S.personRow]}>
      <WashiArt />
      <PetAvatar petId={request.petId} />
      <View style={{ flex: 1 }}><Text style={S.personName}>{request.name}</Text><Text style={S.personMeta}>{request.sentAt}に申請</Text></View>
      <Pressable plate="primary" artwork={false} accessibilityRole="button" accessibilityLabel={`${request.name}さんの申請を承認`} onPress={() => void answer(request, true)} style={S.primarySmall}><Text style={S.primarySmallText}>承認</Text></Pressable>
      <Pressable plate="secondary" artwork={false} accessibilityRole="button" accessibilityLabel={`${request.name}さんの申請を見送る`} onPress={() => void answer(request, false)} style={S.secondarySmall}><Text style={S.secondarySmallText}>見送る</Text></Pressable>
    </View>), <Empty icon="mail-outline" text="届いている申請はありません" />)}

    {titled('friends', 'フレンド', friends.length ? `${friends.length}人` : undefined, friends.map(friend => <View key={friend.id} style={[S.card, S.personRow]}>
      <WashiArt />
      <PetAvatar petId={friend.petId} />
      <View style={{ flex: 1 }}>
        <Text style={S.personName}>{friend.name}</Text>
        <Text style={S.personMeta}>{friend.routeName} · 御朱印 {friend.goshuinCount}</Text>
        <Text style={S.personMeta}>最終 {friend.lastActive}</Text>
      </View>
    </View>), <Empty icon="people-outline" text="フレンドコードを交換して、いっしょに歩こう" />)}
  </Sheet>;
}

const S = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: C.paper, width: '100%', maxWidth: 600, alignSelf: 'center' },
  sheetHeader: { paddingHorizontal: 22, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: C.line },
  sheetTitle: { fontFamily: BRUSH, fontSize: 23, color: C.ink },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, marginBottom: 2 },
  sectionTitle: { fontFamily: BRUSH, fontSize: 17, color: C.ink },
  sectionNote: { fontSize: 13, color: C.muted },
  card: { overflow: 'hidden', padding: 14 },
  cardMuted: { opacity: .6 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 22, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D9C9B3' },
  emptyText: { color: C.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 14, backgroundColor: '#F3E6D2' },
  offlineText: { flex: 1, color: '#7A5A43', fontSize: 13, lineHeight: 19 },
  notice: { color: '#7D4939', fontSize: 13, lineHeight: 19, textAlign: 'center', paddingVertical: 4 },
  noticeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  noticeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4E7D8' },
  noticeIconTodo: { backgroundColor: C.red },
  noticeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  noticeTitle: { flex: 1, fontFamily: BRUSH, fontSize: 15, lineHeight: 21, color: C.ink },
  noticeBody: { marginTop: 3, color: '#6D6354', fontSize: 13, lineHeight: 19 },
  noticeDate: { marginTop: 4, color: C.muted, fontSize: 12 },
  inlineAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 8, minHeight: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#D6BFB0', backgroundColor: '#FFF9EF' },
  inlineActionText: { color: C.red, fontFamily: BRUSH, fontSize: 13 },
  giftHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  giftTitle: { flex: 1, fontFamily: BRUSH, fontSize: 16, color: C.ink },
  giftMessage: { marginTop: 6, color: '#6D6354', fontSize: 13, lineHeight: 19 },
  giftItems: { marginTop: 10, gap: 8 },
  giftItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, backgroundColor: '#F6EDDF' },
  giftTicket: { width: 30, height: 44 },
  giftItemName: { flex: 1, color: C.ink, fontFamily: BRUSH, fontSize: 13 },
  giftItemCount: { color: C.red, fontFamily: 'ShipporiBold', fontSize: 15 },
  giftFooter: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  giftMeta: { flex: 1, color: C.muted, fontSize: 12 },
  giftReceived: { color: C.muted, fontSize: 13, fontWeight: '600' },
  primarySmall: { minHeight: 38, minWidth: 64, paddingHorizontal: 14, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red },
  primarySmallText: { color: '#FFF9EF', fontFamily: BRUSH, fontSize: 14 },
  secondarySmall: { minHeight: 38, paddingHorizontal: 12, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D6BFB0' },
  secondarySmallText: { color: C.red, fontFamily: BRUSH, fontSize: 13 },
  disabled: { opacity: .45 },
  myCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myLabel: { color: C.muted, fontSize: 12 },
  myCode: { marginTop: 3, color: C.ink, fontFamily: 'ShipporiBold', fontSize: 17, letterSpacing: .5 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4E7D8' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeInput: { flex: 1, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFFFFF', color: C.ink, fontSize: 16, letterSpacing: 1 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  personName: { fontFamily: BRUSH, fontSize: 16, color: C.ink },
  personMeta: { marginTop: 2, color: C.muted, fontSize: 12 },
});
