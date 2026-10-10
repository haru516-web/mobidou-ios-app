import { Alert } from 'react-native';
import { authedRequest } from './server';

/*
 * Reporting and blocking other players (names are shown to other people, so both are needed).
 * The server keeps a block one-way but hides both players from each other, and keeps each report for the operator to read.
 */

export type ReportReason = 'name' | 'behavior' | 'other';
export type Blocked = { id: string; name: string; petId: string | null };

export async function blockPlayer(userId: string): Promise<'ok' | 'offline'> {
  const reply = await authedRequest('/blocks', { body: { userId } });
  return reply?.status === 200 ? 'ok' : 'offline';
}

export async function unblockPlayer(userId: string): Promise<'ok' | 'offline'> {
  const reply = await authedRequest('/blocks/remove', { body: { userId } });
  return reply?.status === 200 ? 'ok' : 'offline';
}

export async function fetchBlocked(): Promise<Blocked[] | null> {
  const reply = await authedRequest('/blocks', { method: 'GET' });
  const rows = reply?.status === 200 ? (reply.data as { blocked?: unknown } | null)?.blocked : null;
  if (!Array.isArray(rows)) return null;
  return rows.flatMap(row => {
    const r = row as { id?: unknown; name?: unknown; petId?: unknown };
    return typeof r.id === 'string' ? [{ id: r.id, name: typeof r.name === 'string' ? r.name : 'もびさん', petId: typeof r.petId === 'string' ? r.petId : null }] : [];
  });
}

export async function reportPlayer(userId: string, reason: ReportReason): Promise<'ok' | 'offline' | 'limit'> {
  const reply = await authedRequest('/reports', { body: { userId, reason } });
  if (reply?.status === 201) return 'ok';
  return reply?.status === 429 ? 'limit' : 'offline';
}

const OFFLINE = 'サーバーにつながりませんでした。電波のよいところで、もう一度お試しください。';

/**
 * The menu behind the "…" next to another player: report, or block. `onChanged` runs after a block went through,
 * so the screen can drop that player from its list.
 */
export function openModerationMenu(person: { id: string; name: string }, onChanged?: () => void) {
  const block = () => Alert.alert(
    `${person.name}さんをブロックしますか？`,
    'ブロックすると、お互いに、フレンドや、イベントのチームの候補として、見えなくなります。フレンドだった場合は、解除されます。',
    [
      { text: 'やめる', style: 'cancel' },
      { text: 'ブロックする', style: 'destructive', onPress: () => { void blockPlayer(person.id).then(result => {
        if (result === 'ok') { onChanged?.(); Alert.alert('ブロックしました', '設定したブロックは、フレンド画面の「ブロック中」から、解除できます。'); } else Alert.alert('ブロック', OFFLINE);
      }); } },
    ],
  );
  const report = (reason: ReportReason) => void reportPlayer(person.id, reason).then(result => {
    if (result === 'ok') {
      Alert.alert('通報を受け付けました', 'ご連絡ありがとうございます。内容を確認します。あわせて、このプレイヤーを、ブロックすることもできます。', [
        { text: '閉じる', style: 'cancel' },
        { text: 'ブロックする', onPress: block },
      ]);
    } else Alert.alert('通報', result === 'limit' ? '通報の回数が、1日の上限に達しました。明日、もう一度お試しください。' : OFFLINE);
  });
  const chooseReason = () => Alert.alert('通報の理由', `${person.name}さんについて、あてはまるものを選んでください。`, [
    { text: '名前が不適切', onPress: () => report('name') },
    { text: '迷惑な行為', onPress: () => report('behavior') },
    { text: 'その他', onPress: () => report('other') },
    { text: 'やめる', style: 'cancel' },
  ]);
  Alert.alert(`${person.name}さん`, undefined, [
    { text: '通報する', onPress: chooseReason },
    { text: 'ブロックする', style: 'destructive', onPress: block },
    { text: 'キャンセル', style: 'cancel' },
  ]);
}
