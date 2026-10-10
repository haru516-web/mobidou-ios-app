import AsyncStorage from '@react-native-async-storage/async-storage';
import { isPetId, type PetId } from '../petCatalog';
import type { PassKind } from './specialRewards';
import { formatFriendCode, isFriendCode, normalizeFriendCode, readFriendRequests, readFriends, requestFailure, type RequestFailure } from './friends';
import { authedRequest, request } from './server';

/*
 * Social features: presents and friends.
 *
 * Friends talk to the Cloudflare server (profile, friend codes, requests). Presents come from the server's
 * published list and are sample data in 体験モード. What a friend can see is only a name and the main Mobby.
 *
 * Friends and presents are on for everyone. Presents are a static list published on the server; the server
 * records each claim so an account takes a present only once.
 */

export const SOCIAL_ONLINE = true;

/** `gachaTicket` is a 木札: one pull of the gacha. */
export type GiftItem = { kind: PassKind | 'gachaTicket'; quantity: number };
export type Gift = { id: string; title: string; message: string; from: string; items: readonly GiftItem[]; sentAt: string; expiresAt?: string };

export type Friend = { id: string; name: string; petId: PetId };
export type FriendRequest = { id: string; name: string; petId: PetId; sentAt: string; fromId?: string };

export type SocialWriteResult = { ok: true } | { ok: false; reason: RequestFailure };
export { formatFriendCode, isFriendCode, normalizeFriendCode };

const RECEIVED_GIFTS_KEY = '@mobidou/social/received-gifts/v1';
const READ_NOTICES_KEY = '@mobidou/notices/read/v1';

const SAMPLE_GIFTS: readonly Gift[] = [
  { id: 'sample-welcome', title: 'もび道へようこそ', message: '旅のはじまりに、ささやかな授与品をどうぞ。', from: 'もび道 運営', items: [{ kind: 'keychainDrop', quantity: 1 }], sentAt: '2026-09-28' },
  { id: 'sample-autumn', title: '秋の巡礼まつり', message: '期間中に巡礼した方へ、キーホルダー交換券をお届けします。', from: 'もび道 運営', items: [{ kind: 'keychainDrop', quantity: 2 }], sentAt: '2026-09-27', expiresAt: '2026-10-31' },
];

const SAMPLE_FRIENDS: readonly Friend[] = [
  { id: 'sample-hana', name: 'はな', petId: 'mobirin' },
  { id: 'sample-sora', name: 'そら', petId: 'mobichi' },
  { id: 'sample-kai', name: 'かい', petId: 'yami' },
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

/** The presents the operator has published (a static list on the server); samples in 体験モード. Expired ones are left out. */
export async function fetchGifts({ demo }: { demo: boolean }): Promise<readonly Gift[]> {
  if (demo) return SAMPLE_GIFTS;
  const reply = await request('/gifts.json', { method: 'GET' });
  const list: unknown = reply?.status === 200 ? reply.data : null;
  if (!Array.isArray(list)) return [];
  const today = new Date().toISOString().slice(0, 10);
  return list.flatMap((entry): Gift[] => {
    const gift = entry as Partial<Gift> | null;
    if (!gift || typeof gift.id !== 'string' || typeof gift.title !== 'string' || !Array.isArray(gift.items) || gift.items.length === 0) return [];
    const items = gift.items.filter((item): item is GiftItem => !!item && (item.kind === 'gachaTicket' || item.kind === 'keychainDrop') && Number.isInteger(item.quantity) && item.quantity > 0);
    if (!items.length || (typeof gift.expiresAt === 'string' && gift.expiresAt < today)) return [];
    return [{ id: gift.id, title: gift.title, message: typeof gift.message === 'string' ? gift.message : '', from: typeof gift.from === 'string' ? gift.from : 'もび道 運営', items, sentAt: typeof gift.sentAt === 'string' ? gift.sentAt : today, ...(typeof gift.expiresAt === 'string' ? { expiresAt: gift.expiresAt } : {}) }];
  });
}

/** Claim a present on the server, which lets each account take it only once (also after a reinstall). */
export async function claimGiftOnServer(id: string): Promise<'claimed' | 'already' | 'offline'> {
  const reply = await authedRequest('/gifts/' + encodeURIComponent(id) + '/claim', { method: 'POST', body: {} });
  if (!reply || reply.status !== 200) return 'offline';
  return reply.data?.status === 'claimed' ? 'claimed' : 'already';
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

const PROFILE_KEY = '@mobidou/social/profile/v1';
const PROFILE_GUIDE_KEY = '@mobidou/social/profile-guide/v1';

export type Profile = { name: string; petId: string | null; friendCode: string };

/** The name and main Mobby friends see, and the code to give them. Null when the server cannot be reached. */
export async function fetchProfile(): Promise<Profile | null> {
  if (!SOCIAL_ONLINE) return null;
  const reply = await authedRequest('/profile', { method: 'GET' });
  const data = reply?.data;
  if (!reply || reply.status !== 200 || !data || typeof data.friendCode !== 'string') return null;
  const profile = { name: typeof data.name === 'string' ? data.name : '', petId: typeof data.petId === 'string' ? data.petId : null, friendCode: data.friendCode };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ name: profile.name })).catch(() => undefined);
  return profile;
}

/** Save the name (1 to 12 characters) and the main Mobby that friends will see. */
export async function saveProfile(name: string, petId: string): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'inappropriate' | 'offline' }> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 12) return { ok: false, reason: 'invalid' };
  const reply = await authedRequest('/profile', { body: { name: trimmed, petId } });
  if (!reply) return { ok: false, reason: 'offline' };
  if (reply.status === 200) { await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ name: trimmed })).catch(() => undefined); return { ok: true }; }
  if (reply.status === 400 && reply.data?.error === 'inappropriate_name') return { ok: false, reason: 'inappropriate' };
  return { ok: false, reason: reply.status === 400 ? 'invalid' : 'offline' };
}

/** The name saved on this device, or '' when none was. */
export async function savedProfileName() {
  try { return (JSON.parse(await AsyncStorage.getItem(PROFILE_KEY) ?? 'null') as { name?: string } | null)?.name ?? ''; } catch { return ''; }
}

/** The main Mobby was changed: let friends see the new one. Does nothing until a name has been registered. */
export async function syncProfilePet(petId: string) {
  const name = await savedProfileName();
  if (SOCIAL_ONLINE && name) await saveProfile(name, petId);
}

/** Whether a name was saved on this device (so the guide to register one is not shown again). */
export async function hasSavedProfileName() {
  try { return !!(JSON.parse(await AsyncStorage.getItem(PROFILE_KEY) ?? 'null') as { name?: string } | null)?.name; } catch { return false; }
}

export async function wasProfileGuideShown() {
  return (await AsyncStorage.getItem(PROFILE_GUIDE_KEY).catch(() => null)) === '1';
}

export const markProfileGuideShown = () => AsyncStorage.setItem(PROFILE_GUIDE_KEY, '1').catch(() => undefined);

/** The code shown in 体験モード and while the friend features are off. */
export const SAMPLE_FRIEND_CODE = 'MOBIA-BCD23';

/** Friends and the requests waiting for an answer, from one request to the server. */
export async function fetchSocialOverview({ demo }: { demo: boolean }): Promise<{ friends: readonly Friend[]; requests: readonly FriendRequest[] }> {
  if (demo) return { friends: SAMPLE_FRIENDS, requests: SAMPLE_REQUESTS };
  if (!SOCIAL_ONLINE) return { friends: [], requests: [] };
  const reply = await authedRequest('/friends', { method: 'GET' });
  if (reply?.status !== 200) return { friends: [], requests: [] };
  return { friends: readFriends(reply.data, isPetId, 'mobibou') as Friend[], requests: readFriendRequests(reply.data, isPetId, 'mobibou') as FriendRequest[] };
}

export async function sendFriendRequest(code: string): Promise<SocialWriteResult> {
  if (!isFriendCode(code)) return { ok: false, reason: 'invalid' };
  if (!SOCIAL_ONLINE) return { ok: false, reason: 'offline' };
  const reply = await authedRequest('/friend-requests', { body: { friendCode: normalizeFriendCode(code) } });
  if (reply && reply.status === 201) return { ok: true };
  return { ok: false, reason: requestFailure(reply?.status ?? null, reply?.data?.error) };
}

export async function answerFriendRequest(id: string, accept: boolean): Promise<SocialWriteResult> {
  if (!SOCIAL_ONLINE) return { ok: false, reason: 'offline' };
  const reply = await authedRequest('/friend-requests/' + encodeURIComponent(id) + '/answer', { body: { answer: accept ? 'accepted' : 'declined' } });
  return reply && reply.status === 200 ? { ok: true } : { ok: false, reason: 'offline' };
}
