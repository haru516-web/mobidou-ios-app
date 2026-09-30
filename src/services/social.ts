import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PetId } from '../petCatalog';
import type { PassKind } from './specialRewards';

/*
 * Social features: presents and friends.
 *
 * Both need a server (delivery of presents, friend graph, requests). None
 * exists yet, so this module is the seam: the screens only talk to the
 * functions below. Until a backend is connected, they return local sample
 * data in 体験モード and empty results otherwise, and every write that would
 * reach another user reports `offline`. Replace the bodies marked `SERVER:`
 * with API calls; the screens need no changes.
 */

export const SOCIAL_ONLINE = false;

export type GiftItem = { kind: PassKind; quantity: number };
export type Gift = { id: string; title: string; message: string; from: string; items: readonly GiftItem[]; sentAt: string; expiresAt?: string };

export type Friend = { id: string; name: string; petId: PetId; goshuinCount: number; routeName: string; lastActive: string };
export type FriendRequest = { id: string; name: string; petId: PetId; sentAt: string };

export type SocialWriteResult = { ok: true } | { ok: false; reason: 'offline' | 'invalid' };

const RECEIVED_GIFTS_KEY = '@mobidou/social/received-gifts/v1';
const FRIEND_CODE_KEY = '@mobidou/social/friend-code/v1';
const READ_NOTICES_KEY = '@mobidou/notices/read/v1';

const SAMPLE_GIFTS: readonly Gift[] = [
  { id: 'sample-welcome', title: 'もび道へようこそ', message: '旅のはじまりに、ささやかな授与品をどうぞ。', from: 'もび道 運営', items: [{ kind: 'keychainDrop', quantity: 1 }], sentAt: '2026-09-28' },
  { id: 'sample-autumn', title: '秋の巡礼まつり', message: '期間中に巡礼した方へ、キーホルダー交換券をお届けします。', from: 'もび道 運営', items: [{ kind: 'keychainDrop', quantity: 2 }], sentAt: '2026-09-27', expiresAt: '2026-10-31' },
];

const SAMPLE_FRIENDS: readonly Friend[] = [
  { id: 'sample-hana', name: 'はな', petId: 'mobirin', goshuinCount: 12, routeName: '木漏れ日の奥宮へ', lastActive: '今日' },
  { id: 'sample-sora', name: 'そら', petId: 'mobichi', goshuinCount: 5, routeName: '山並みの修行道', lastActive: '昨日' },
  { id: 'sample-kai', name: 'かい', petId: 'yami', goshuinCount: 27, routeName: '水辺の札所めぐり', lastActive: '3日前' },
];

const SAMPLE_REQUESTS: readonly FriendRequest[] = [
  { id: 'sample-req-ren', name: 'れん', petId: 'mobiyura', sentAt: '今日' },
];

async function readIdSet(key: string) {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

async function writeIdSet(key: string, ids: Set<string>) {
  await AsyncStorage.setItem(key, JSON.stringify([...ids])).catch(() => undefined);
}

/** SERVER: GET /gifts. Sample presents only in 体験モード for now. */
export async function fetchGifts({ demo }: { demo: boolean }): Promise<readonly Gift[]> {
  return demo ? SAMPLE_GIFTS : [];
}

export const readReceivedGiftIds = () => readIdSet(RECEIVED_GIFTS_KEY);

/** SERVER: POST /gifts/:id/receive. The caller grants the items locally. */
export async function markGiftReceived(id: string) {
  const ids = await readIdSet(RECEIVED_GIFTS_KEY);
  ids.add(id);
  await writeIdSet(RECEIVED_GIFTS_KEY, ids);
}

export const readReadNoticeIds = () => readIdSet(READ_NOTICES_KEY);

export async function markNoticesRead(noticeIds: readonly string[]) {
  const ids = await readIdSet(READ_NOTICES_KEY);
  noticeIds.forEach(id => ids.add(id));
  await writeIdSet(READ_NOTICES_KEY, ids);
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateFriendCode() {
  const pick = () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join('');
  return `MOBI-${block()}-${block()}`;
}

export function isFriendCode(value: string) {
  return /^MOBI-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(value.trim().toUpperCase());
}

/** SERVER: the code should be issued by the server; a local one stands in. */
export async function getMyFriendCode() {
  try {
    const saved = await AsyncStorage.getItem(FRIEND_CODE_KEY);
    if (saved && isFriendCode(saved)) return saved;
  } catch {
    // Fall through and issue a new local code.
  }
  const code = generateFriendCode();
  await AsyncStorage.setItem(FRIEND_CODE_KEY, code).catch(() => undefined);
  return code;
}

/** SERVER: GET /friends. */
export async function fetchFriends({ demo }: { demo: boolean }): Promise<readonly Friend[]> {
  return demo ? SAMPLE_FRIENDS : [];
}

/** SERVER: GET /friend-requests. */
export async function fetchFriendRequests({ demo }: { demo: boolean }): Promise<readonly FriendRequest[]> {
  return demo ? SAMPLE_REQUESTS : [];
}

/** SERVER: POST /friend-requests { code }. */
export async function sendFriendRequest(code: string): Promise<SocialWriteResult> {
  if (!isFriendCode(code)) return { ok: false, reason: 'invalid' };
  return { ok: false, reason: 'offline' };
}

/** SERVER: POST /friend-requests/:id/accept or /decline. */
export async function answerFriendRequest(_id: string, _accept: boolean): Promise<SocialWriteResult> {
  return { ok: false, reason: 'offline' };
}
