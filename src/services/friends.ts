/*
 * Friend codes, invite links and how the server's answers are read.
 * Pure on purpose (no React Native, no storage) so it can be tested directly.
 */

/** A code is 10 characters from this alphabet (no 0/O/1/I). It may be typed with spaces, hyphens or lower case. */
const CODE = /^[A-HJ-NP-Z2-9]{10}$/;

export const normalizeFriendCode = (value: string) => value.replace(/[\s-]/g, '').toUpperCase();
export const isFriendCode = (value: string) => CODE.test(normalizeFriendCode(value));

/** `ABCDE-FGHJK`: easier to read aloud and type than ten characters in a row. */
export function formatFriendCode(value: string) {
  const code = normalizeFriendCode(value);
  return code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}

export const friendInviteLink = (serverUrl: string, code: string) => `${serverUrl.replace(/\/$/, '')}/f/${normalizeFriendCode(code)}`;

/**
 * The code in an invite: the app's own link (`mobidou://friend?code=…`) or the web page
 * the link in a message opens (`…/f/CODE`). Anything else is not an invite.
 */
export function friendCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const app = /^mobidou:\/\/friend\/?\?(?:[^#]*&)?code=([^&#]+)/i.exec(url);
  const web = /^https?:\/\/[^/]+\/f\/([^/?#]+)\/?(?:[?#].*)?$/i.exec(url);
  const raw = app?.[1] ?? web?.[1];
  if (!raw) return null;
  let decoded: string;
  try { decoded = decodeURIComponent(raw); } catch { return null; }
  return isFriendCode(decoded) ? normalizeFriendCode(decoded) : null;
}

export type Friend = { id: string; name: string; petId: string };
export type FriendRequest = { id: string; name: string; petId: string; sentAt: string };

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** The server sends no more than a name and the main Mobby; an unknown Mobby falls back so a screen never breaks. */
export function readFriends(data: unknown, isPetId: (id: string) => boolean, fallbackPet: string): Friend[] {
  const rows = (data as { friends?: unknown } | null)?.friends;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap(row => {
    const id = text(row?.id);
    const name = text(row?.name);
    return id && name ? [{ id, name, petId: isPetId(text(row?.petId)) ? text(row.petId) : fallbackPet }] : [];
  });
}

const monthDay = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : `${date.getMonth() + 1}月${date.getDate()}日`;
};

export function readFriendRequests(data: unknown, isPetId: (id: string) => boolean, fallbackPet: string): FriendRequest[] {
  const rows = (data as { incomingRequests?: unknown } | null)?.incomingRequests;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap(row => {
    const id = text(row?.id);
    const name = text(row?.fromName);
    return id && name ? [{ id, name, petId: isPetId(text(row?.fromPetId)) ? text(row.fromPetId) : fallbackPet, sentAt: monthDay(text(row?.createdAt)) }] : [];
  });
}

export type RequestFailure = 'not_found' | 'self' | 'already_friends' | 'already_requested' | 'they_already_asked' | 'profile_required' | 'invalid' | 'offline';

/** Why a friend request did not go through, from the server's status and error code. */
export function requestFailure(status: number | null, error: unknown): RequestFailure {
  if (status === null) return 'offline';
  if (status === 404) return 'not_found';
  if (status === 409 && (error === 'already_friends' || error === 'already_requested' || error === 'they_already_asked')) return error;
  if (status === 400 && error === 'cannot_add_self') return 'self';
  if (status === 400 && error === 'profile_required') return 'profile_required';
  if (status === 400) return 'invalid';
  return 'offline';
}
