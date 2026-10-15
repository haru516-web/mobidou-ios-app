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
export type ServerState = { account: ServerAccount | null; starterDone: boolean; claimedRoutes: string[] };
export type ServerOp = { type: 'starter'; petId: string } | { type: 'claim'; routeId: string };

export const emptyServerState = (): ServerState => ({ account: null, starterDone: false, claimedRoutes: [] });

export function normalizeServerState(value: unknown): ServerState {
  const source = value && typeof value === 'object' ? value as Partial<ServerState> : {};
  const account = source.account && typeof source.account.userId === 'string' && typeof source.account.secret === 'string' ? { userId: source.account.userId, secret: source.account.secret } : null;
  return {
    account,
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

async function loadState() {
  try { return normalizeServerState(JSON.parse(await AsyncStorage.getItem(STATE_KEY) ?? 'null')); } catch { return emptyServerState(); }
}
const saveState = (state: ServerState) => AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)).catch(() => undefined);

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
    return account;
  });
}

/** A signed-in call. If the server no longer knows the account, it is dropped so the next call registers again. */
export async function authedRequest(path: string, init: { method?: string; body?: unknown; /** Keep the account on a 401 (account deletion: the server still has it, it only did not accept this device's key). */ keepAccountOn401?: boolean } = {}) {
  const account = await ensureAccount();
  if (!account) return null;
  const { keepAccountOn401, ...rest } = init;
  const result = await request(path, { ...rest, account });
  if (result?.status === 401 && !keepAccountOn401) await exclusive(async () => { const state = await loadState(); if (state.account?.userId === account.userId) await saveState({ ...state, account: null }); });
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
  return exclusive(async () => { await saveState({ ...emptyServerState(), account }); });
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
  }

  for (const op of ops) {
    const result = op.type === 'starter'
      ? await request('/pets/starter', { body: { petId: op.petId }, account: state.account })
      : await request('/free-pulls/claim', { body: { routeId: op.routeId }, account: state.account });
    if (!result) return;
    // The server no longer knows this account (for example a reset database): register again next time.
    if (result.status === 401) { await saveState({ ...state, account: null }); return; }
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
