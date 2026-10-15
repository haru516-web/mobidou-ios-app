import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MobbyCollection } from './gacha';

/*
 * Connection to the Cloudflare server (stage 1).
 *
 * The app stays fully playable offline and keeps drawing free pulls on the
 * device. This module only reports what already happened — the first Mobby and
 * each first route clear — to an anonymous account, retrying later when the
 * network or the server is unavailable. Nothing here throws into the UI.
 * Paid pulls will move to the server in stage 2.
 */

/** Set EXPO_PUBLIC_SERVER_URL to another address, or to an empty string to switch the connection off. */
export const SERVER_URL = (process.env.EXPO_PUBLIC_SERVER_URL ?? 'https://mobidou-server.mobidou.workers.dev').replace(/\/$/, '');

const STATE_KEY = '@mobidou/server/v1';
const TIMEOUT_MS = 8000;

export type ServerAccount = { userId: string; secret: string };
export type ServerState = {
  account: ServerAccount | null;
  /** Accounts the server stopped accepting. Kept so that deleting the account still reaches them (another call's 401 does not forget them). */
  lost: ServerAccount[];
  starterDone: boolean;
  claimedRoutes: string[];
};
export type ServerOp = { type: 'starter'; petId: string } | { type: 'claim'; routeId: string };

export const emptyServerState = (): ServerState => ({ account: null, lost: [], starterDone: false, claimedRoutes: [] });

export function normalizeServerState(value: unknown): ServerState {
  const source = value && typeof value === 'object' ? value as Partial<ServerState> : {};
  const account = source.account && typeof source.account.userId === 'string' && typeof source.account.secret === 'string' ? { userId: source.account.userId, secret: source.account.secret } : null;
  // Older builds kept one lost account as an object; it is read as a list of one.
  const rawLost: unknown[] = Array.isArray(source.lost) ? source.lost : source.lost ? [source.lost] : [];
  const lost: ServerAccount[] = [];
  for (const entry of rawLost) {
    const row = entry as Partial<ServerAccount> | null;
    if (row && typeof row.userId === 'string' && typeof row.secret === 'string' && !lost.some(known => known.userId === row.userId)) lost.push({ userId: row.userId, secret: row.secret });
  }
  return {
    account,
    lost: lost.slice(-20),
    starterDone: source.starterDone === true,
    claimedRoutes: Array.isArray(source.claimedRoutes) ? [...new Set(source.claimedRoutes.filter((id): id is string => typeof id === 'string'))] : [],
  };
}

/**
 * What still has to be reported. The starter is only known while exactly one
 * Mobby is owned; once more exist (an older save), it can no longer be told
 * apart and is not reported.
 */
export function planServerOps(mobbies: MobbyCollection, state: ServerState): { ops: ServerOp[]; starterUnknown: boolean } {
  const ops: ServerOp[] = [];
  const owned = Object.keys(mobbies.owned);
  const starterUnknown = !state.starterDone && owned.length > 1;
  if (!state.starterDone && owned.length === 1) ops.push({ type: 'starter', petId: owned[0] });
  for (const routeId of mobbies.freePullRoutes) if (!state.claimedRoutes.includes(routeId)) ops.push({ type: 'claim', routeId });
  return { ops, starterUnknown };
}

export async function request(path: string, init: { method?: string; body?: unknown; account?: ServerAccount | null }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (init.account) headers.Authorization = `Bearer ${init.account.userId}.${init.account.secret}`;
    const response = await fetch(SERVER_URL + path, { method: init.method ?? 'POST', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body), signal: controller.signal });
    const data = await response.json().catch(() => null);
    return { status: response.status, data: data as Record<string, unknown> | null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Where the state is kept. A test replaces it (the device's storage is not there in plain Node). */
let storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> } = AsyncStorage;
export function useServerStorageForTests(replacement: typeof storage): void { storage = replacement; }

async function loadState() {
  try { return normalizeServerState(JSON.parse(await storage.getItem(STATE_KEY) ?? 'null')); } catch { return emptyServerState(); }
}
const saveState = (state: ServerState) => storage.setItem(STATE_KEY, JSON.stringify(state)).catch(() => undefined);

/** Told when the account on this device changes (registered, taken over, dropped): the push registration follows it. */
const accountListeners = new Set<() => void>();
export function subscribeAccount(listener: () => void): () => void {
  accountListeners.add(listener);
  return () => { accountListeners.delete(listener); };
}
const accountChanged = () => { accountListeners.forEach(listener => { try { listener(); } catch { /* a listener must not break the call */ } }); };

/** Everything that reads and rewrites the saved state goes through here, one at a time. */
let chain: Promise<unknown> = Promise.resolve();
function exclusive<T>(job: () => Promise<T>): Promise<T> {
  const next = chain.then(job, job);
  chain = next.catch(() => undefined);
  return next;
}

/** The anonymous account, registered on first use. `null` while the server cannot be reached. */
export function ensureAccount(): Promise<ServerAccount | null> {
  if (!SERVER_URL) return Promise.resolve(null);
  return exclusive(async () => {
    const state = await loadState();
    if (state.account) return state.account;
    const registered = await request('/auth/register', { body: {} });
    const data = registered?.data;
    if (registered?.status !== 201 || !data || typeof data.userId !== 'string' || typeof data.secret !== 'string') return null;
    const account = { userId: data.userId, secret: data.secret };
    await saveState({ ...state, account });
    accountChanged();
    return account;
  });
}

/** A signed-in call. If the server no longer knows the account, it is dropped so the next call registers again. */
export async function authedRequest(path: string, init: { method?: string; body?: unknown; /** Keep the account on a 401 (account deletion: the server still has it, it only did not accept this device's key). */ keepAccountOn401?: boolean } = {}) {
  const account = await ensureAccount();
  if (!account) return null;
  const { keepAccountOn401, ...rest } = init;
  const result = await request(path, { ...rest, account });
  if (result?.status === 401 && !keepAccountOn401) await exclusive(async () => {
    const state = await loadState();
    // The account is dropped so the next call registers again, but it is remembered as lost until it has been dealt with.
    // Only when it is still the very account (and key) this call was made with: a late 401 for an old key does not undo a newer sign-in.
    if (state.account?.userId === account.userId && state.account.secret === account.secret) {
      await saveState({ ...state, account: null, lost: withLost(state.lost, account) });
      accountChanged();
    }
  });
  return result;
}

/** The anonymous account saved on this device, for the 引き継ぎコード. */
export async function readServerAccount(): Promise<ServerAccount | null> {
  return exclusive(async () => (await loadState()).account);
}

/**
 * Take over an account from a 引き継ぎコード. What the server already knows (first Mobby, route clears) is
 * reported again on the next sync, which the server treats as already done.
 */
export function adoptServerAccount(account: ServerAccount): Promise<void> {
  return exclusive(async () => {
    const before = await loadState();
    // The same account signing in again resolves its own loss; another account's loss stays until it has been dealt with.
    await saveState({ ...emptyServerState(), account, lost: before.lost.filter(known => known.userId !== account.userId) });
    accountChanged();
  });
}

/** Accounts the server stopped accepting that have not been deleted yet. */
export async function readLostAccounts(): Promise<ServerAccount[]> {
  return exclusive(async () => (await loadState()).lost);
}
export function removeLostAccounts(userIds: readonly string[]): Promise<void> {
  return exclusive(async () => {
    const state = await loadState();
    if (state.lost.some(known => userIds.includes(known.userId))) await saveState({ ...state, lost: state.lost.filter(known => !userIds.includes(known.userId)) });
  });
}
const withLost = (lost: readonly ServerAccount[], account: ServerAccount): ServerAccount[] =>
  [...lost.filter(known => known.userId !== account.userId), account].slice(-20);

/** The account in use is not accepted: it is kept as lost (and the device has none for now), as a 401 on any call does. */
export function markAccountLost(account: ServerAccount): Promise<void> {
  return exclusive(async () => {
    const state = await loadState();
    if (state.account?.userId === account.userId && state.account.secret === account.secret) {
      await saveState({ ...state, account: null, lost: withLost(state.lost, account) });
      accountChanged();
    }
  });
}

let running: Promise<void> | null = null;
let latest: MobbyCollection | null = null;

async function runOnce(mobbies: MobbyCollection) {
  let state = await loadState();
  const { ops, starterUnknown } = planServerOps(mobbies, state);
  if (starterUnknown) { state = { ...state, starterDone: true }; await saveState(state); }
  if (ops.length === 0) return;

  if (!state.account) {
    const registered = await request('/auth/register', { body: {} });
    const data = registered?.data;
    if (registered?.status !== 201 || !data || typeof data.userId !== 'string' || typeof data.secret !== 'string') return;
    state = { ...state, account: { userId: data.userId, secret: data.secret } };
    await saveState(state);
    accountChanged();
  }

  for (const op of ops) {
    const result = op.type === 'starter'
      ? await request('/pets/starter', { body: { petId: op.petId }, account: state.account })
      : await request('/free-pulls/claim', { body: { routeId: op.routeId }, account: state.account });
    if (!result) return;
    // The server no longer knows this account (for example a reset database): register again next time.
    if (result.status === 401) { await saveState({ ...state, account: null, lost: state.account ? withLost(state.lost, state.account) : state.lost }); accountChanged(); return; }
    // Accepted, already known (409), or refused as invalid (400): none of these will change on a retry.
    const settled = result.status === 200 || result.status === 201 || result.status === 409 || result.status === 400;
    if (!settled) return;
    state = op.type === 'starter' ? { ...state, starterDone: true } : { ...state, claimedRoutes: [...state.claimedRoutes, op.routeId] };
    await saveState(state);
  }
}

/** Report anything new to the server. Safe to call often and from anywhere: calls are serialised and never reject. */
export function syncServer(mobbies: MobbyCollection): Promise<void> {
  if (!SERVER_URL) return Promise.resolve();
  latest = mobbies;
  if (running) return running;
  running = (async () => {
    try {
      while (latest) {
        const next = latest;
        latest = null;
        await exclusive(() => runOnce(next)).catch(() => undefined);
      }
    } finally { running = null; }
  })();
  return running;
}
