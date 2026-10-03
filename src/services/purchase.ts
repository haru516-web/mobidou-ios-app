import { authedRequest, ensureAccount, type ServerAccount } from './server.ts';
import type { MobbyCollection, PullResult } from './gacha';

/*
 * Buying and spending gacha 木札 (stage 2).
 *
 * Buying only puts 木札 in the player's hands; the draw happens later, when
 * the rope is pulled. Order matters so a payment is never lost:
 *   1. make sure there is an account;
 *   2. App Store purchase, tagged with the account id;
 *   3. the server verifies the Apple-signed receipt and credits the 木札;
 *   4. only then the transaction is finished.
 * If anything after the payment fails, the receipt stays unfinished (the App
 * Store replays it) and `settleCredits` completes the job the next time the
 * app opens.
 */

export const PULL_PRODUCTS = {
  pull1: { sku: 'jp.mobby.mobidou.gacha.single', count: 1 },
  pull5: { sku: 'jp.mobby.mobidou.gacha.five', count: 5 },
} as const;
export type PullProductId = keyof typeof PULL_PRODUCTS;

export type BuyOutcome =
  /** `paidTickets` is the server's balance now, or null when it could not be read (it is read again at the next start). */
  | { ok: true; paidTickets: number | null }
  | { ok: false; reason: 'cancelled' | 'offline' | 'unavailable' | 'verify_failed'; detail?: string };

export type PurchasedItem = { sku: string; jws: string; finish: () => Promise<void> };
export interface PurchaseStore {
  purchase(sku: string, accountToken: string): Promise<PurchasedItem | 'cancelled'>;
  /** Purchases paid for but not finished yet (for example after a crash). */
  unfinished(): Promise<PurchasedItem[]>;
}
export type Reply = { status: number; data: Record<string, unknown> | null } | null;
export interface PurchaseApi {
  account(): Promise<ServerAccount | null>;
  post(path: string, body: unknown): Promise<Reply>;
  get(path: string): Promise<Reply>;
}

export const serverApi: PurchaseApi = {
  account: ensureAccount,
  post: (path, body) => authedRequest(path, { body }),
  get: path => authedRequest(path, { method: 'GET' }),
};

const ok = (reply: Reply) => reply !== null && reply.status >= 200 && reply.status < 300;

/** Bought 木札 the server holds for this account, or null when the server cannot say. */
export async function fetchPaidTickets(api: PurchaseApi = serverApi): Promise<number | null> {
  const wallet = await api.get('/wallet');
  const paid = wallet?.data?.paid;
  return ok(wallet) && typeof paid === 'number' && Number.isFinite(paid) && paid >= 0 ? paid : null;
}

const verify = async (api: PurchaseApi, jws: string) => ok(await api.post('/purchases/verify', { signedTransactionInfo: jws }));

export async function buyPulls(productId: PullProductId, store: PurchaseStore | null, api: PurchaseApi = serverApi): Promise<BuyOutcome> {
  if (!store) return { ok: false, reason: 'unavailable', detail: 'store_module_missing' };
  const product = PULL_PRODUCTS[productId];
  const account = await api.account();
  if (!account) return { ok: false, reason: 'offline' };

  let bought: PurchasedItem | 'cancelled';
  try { bought = await store.purchase(product.sku, account.userId); } catch (error) { return { ok: false, reason: 'unavailable', detail: error instanceof Error ? error.message : String(error) }; }
  if (bought === 'cancelled') return { ok: false, reason: 'cancelled' };

  if (!(await verify(api, bought.jws))) return { ok: false, reason: 'verify_failed' };
  await bought.finish().catch(() => undefined);
  return { ok: true, paidTickets: await fetchPaidTickets(api) };
}

/**
 * Finish whatever an earlier run left half done: verify receipts that were
 * never finished, then report the server's 木札 balance. Safe to call at every
 * start; returns null when the server cannot be reached.
 */
export async function settleCredits(store: PurchaseStore | null, api: PurchaseApi = serverApi): Promise<number | null> {
  const known = new Set<string>(Object.values(PULL_PRODUCTS).map(product => product.sku));
  const pending = store ? (await store.unfinished().catch(() => [] as PurchasedItem[])).filter(item => known.has(item.sku)) : [];
  for (const item of pending) if (await verify(api, item.jws)) await item.finish().catch(() => undefined);
  return fetchPaidTickets(api);
}

export type PaidDraw = { results: PullResult[]; paidPulls: number; paidTickets: number; complete: boolean };

function readPulls(reply: Reply): { results: PullResult[]; paidPulls: number; remaining: number } | null {
  const data = reply?.data;
  if (!ok(reply) || !data || !Array.isArray(data.results)) return null;
  const results: PullResult[] = [];
  for (const row of data.results) {
    if (!row || typeof row !== 'object' || typeof (row as PullResult).petId !== 'string') return null;
    const { petId, isNew, guaranteed, kind } = row as PullResult;
    results.push({ petId, isNew: isNew === true, guaranteed: guaranteed === true, kind: kind === 'free' ? 'free' : 'paid' });
  }
  return { results, paidPulls: typeof data.paidPulls === 'number' ? data.paidPulls : 0, remaining: typeof data.remaining === 'number' ? data.remaining : 0 };
}

/**
 * Spend `count` bought 木札: tell the server what the player owns (so the
 * guarantee knows who is still missing), then have it draw, five at a time.
 * Returns null when nothing could be drawn (no connection, no balance); a
 * partial result says `complete: false` and the 木札 not spent stay on the server.
 */
export async function drawPaidTickets(count: number, mobbies: MobbyCollection, api: PurchaseApi = serverApi): Promise<PaidDraw | null> {
  if (count < 1) return null;
  if (!ok(await api.post('/pets/sync', { owned: mobbies.owned }))) return null;
  const results: PullResult[] = [];
  let paidPulls = 0;
  let paidTickets = 0;
  let left = count;
  while (left > 0) {
    const chunk = left >= 5 ? 5 : 1;
    const drawn = readPulls(await api.post('/gacha/pull', { count: chunk, kind: 'paid' }));
    if (!drawn) break;
    results.push(...drawn.results); paidPulls = drawn.paidPulls; paidTickets = drawn.remaining; left -= chunk;
  }
  return results.length ? { results, paidPulls, paidTickets, complete: left === 0 } : null;
}
