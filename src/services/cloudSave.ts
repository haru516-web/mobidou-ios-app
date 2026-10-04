import AsyncStorage from '@react-native-async-storage/async-storage';
import { authedRequest } from './server.ts';

/*
 * The whole record, kept on the server for players who tied their account to an Apple ID, so a new device can pick it up.
 *
 * Nothing is sent until the account is tied to an Apple ID. After that the record is sent a short while after it
 * changes (never more than once a minute, and only when it really changed). The server refuses a save made on top of
 * an older version, so a device that was replaced cannot overwrite the newer record.
 */

const STATE_KEY = '@mobidou/cloudsave/v1';
/** The record is also sent when the app is left, shortly after it opens, and when linking; this is only the gap for the safety send while the app stays open. */
export const MIN_UPLOAD_GAP_MS = 15 * 60_000;

export type CloudState = {
  /** The account is tied to an Apple ID (the server keeps saves for those only). */
  linked: boolean;
  /** The server's version this device last saw; 0 when the server has none. */
  version: number;
  /** Fingerprint of the last record sent or received. */
  hash: string;
  /** When the last upload was tried (epoch ms). */
  at: number;
  /** The server holds a newer record from elsewhere; this device stops sending until it restores. */
  conflict: boolean;
  /** When the Apple link was last asked of the server (epoch ms), so it is not asked at every start. */
  linkCheckedAt: number;
};

export const emptyCloudState = (): CloudState => ({ linked: false, version: 0, hash: '', at: 0, conflict: false, linkCheckedAt: 0 });

export function normalizeCloudState(value: unknown): CloudState {
  const s = value && typeof value === 'object' ? value as Partial<CloudState> : {};
  return {
    linked: s.linked === true,
    version: Number.isSafeInteger(s.version) && Number(s.version) >= 0 ? Number(s.version) : 0,
    hash: typeof s.hash === 'string' ? s.hash : '',
    at: Number.isFinite(s.at) ? Number(s.at) : 0,
    conflict: s.conflict === true,
    linkCheckedAt: Number.isFinite(s.linkCheckedAt) ? Number(s.linkCheckedAt) : 0,
  };
}

/** A short fingerprint (cyrb53) to tell whether the record changed. Not for security. */
export function fingerprint(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Whether the record should be sent now. `force` skips the wait between sends: it is for moments that matter and are rare
 * (the app leaving the screen, the first copy after linking, just before the record is wiped).
 */
export function shouldUpload(state: CloudState, hash: string, now: number, force = false): boolean {
  return state.linked && !state.conflict && hash !== state.hash && (force || now - state.at >= MIN_UPLOAD_GAP_MS);
}

async function loadState() {
  try { return normalizeCloudState(JSON.parse(await AsyncStorage.getItem(STATE_KEY) ?? 'null')); } catch { return emptyCloudState(); }
}
const saveState = (state: CloudState) => AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)).catch(() => undefined);

/** Tell the saver whether the account is tied to an Apple ID. */
export async function setCloudLinked(linked: boolean) {
  const state = await loadState();
  await saveState({ ...state, linked, linkCheckedAt: Date.now() });
}

/** What was last learned about the Apple link, without asking the server. */
export async function readCloudLinked(): Promise<{ linked: boolean; checkedAt: number }> {
  const state = await loadState();
  return { linked: state.linked, checkedAt: state.linkCheckedAt };
}

let uploading = false;

export type UploadResult = 'uploaded' | 'skipped' | 'conflict' | 'failed';

/** Send the record (the text of a 引き継ぎコード without the account's secret) if it is due. Never throws. */
export async function uploadSave(record: string, options: { now?: number; force?: boolean } = {}): Promise<UploadResult> {
  const now = options.now ?? Date.now();
  if (uploading) return 'skipped';
  uploading = true;
  try {
    const state = await loadState();
    const hash = fingerprint(record);
    if (!shouldUpload(state, hash, now, options.force)) return 'skipped';
    const reply = await authedRequest('/save', { body: { data: record, baseVersion: state.version } });
    if (reply?.status === 200 && typeof reply.data?.version === 'number') {
      await saveState({ ...state, version: reply.data.version, hash, at: now });
      return 'uploaded';
    }
    if (reply?.status === 409) { await saveState({ ...state, conflict: true, at: now }); return 'conflict'; }
    await saveState({ ...state, at: now });
    return 'failed';
  } catch {
    return 'failed';
  } finally {
    uploading = false;
  }
}

/** The record the server holds for this account, or null when there is none (or the server cannot be reached). */
export async function downloadSave(): Promise<{ record: string; version: number } | null> {
  const reply = await authedRequest('/save', { method: 'GET' });
  const data = reply?.data;
  return reply?.status === 200 && data && typeof data.data === 'string' && typeof data.version === 'number' ? { record: data.data, version: data.version } : null;
}

/** This device now holds exactly what the server has, so the next upload builds on that version. */
export async function markRestored(record: string, version: number) {
  await saveState({ linked: true, version, hash: fingerprint(record), at: Date.now(), conflict: false, linkCheckedAt: Date.now() });
}
