import { authedRequest, ensureAccount, type ServerAccount } from './server.ts';
import type { MobbyCollection, PullResult } from './gacha';

/*
 * Buying gacha pulls (stage 2).
 *
 * Order matters so a payment is never lost:
 *   1. make sure there is an account, and tell the server what the player owns
 *      (so the 25th-paid-pull guarantee knows who is still missing);
 *   2. App Store purchase, tagged with the account id;
 *   3. the server verifies the Apple-signed receipt and credits the pulls;
 *   4. only then the transaction is finished;
 *   5. the server draws.
 * If anything after the payment fails, the receipt stays unfinished (the App
 * Store replays it) or the credit stays on the server's wallet, and
 * `settlePaidPulls` completes the job the next time the app opens.
 */

export const PULL_PRODUCTS = {
  pull1: { sku: 'jp.mobby.mobidou.gacha.single', count: 1 },
  pull5: { sku: 'jp.mobby.mobidou.gacha.five', count: 5 },
} as const;
export type PullProductId = keyof typeof PULL_PRODUCTS;

export type DrawnPulls = { results: PullResult[]; paidPulls: number };
export type BuyOutcome =
  | ({ ok: true } & DrawnPulls)
  | { ok: false; reason: 'cancelled' | 'offline' | 'unavailable' | 'verify_failed' | 'pull_failed' };

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

function readPulls(reply: Reply): DrawnPulls | null {
  const data = reply?.data;
  if (!ok(reply) || !data || !Array.isArray(data.results)) return null;
  const results: PullResult[] = [];
  for (const row of data.results) {
    if (!row || typeof row !== 'object' || typeof (row as PullResult).petId !== 'string') return null;
    const { petId, isNew, guaranteed, kind } = row as PullResult;
    results.push({ petId, isNew: isNew === true, guaranteed: guaranteed === true, kind: kind === 'free' ? 'free' : 'paid' });
  }
  return { results, paidPulls: typeof data.paidPulls === 'number' ? data.paidPulls : 0 };
}

const drawPaid = async (api: PurchaseApi, count: 1 | 5) => readPulls(await api.post('/gacha/pull', { count, kind: 'paid' }));

const verify = async (api: PurchaseApi, jws: string) => ok(await api.post('/purchases/verify', { signedTransactionInfo: jws }));

/** Tell the server what this device owns. Returns false when the server could not be reached. */
const syncOwned = async (api: PurchaseApi, mobbies: MobbyCollection) => ok(await api.post('/pets/sync', { owned: mobbies.owned }));

export async function buyPulls(productId: PullProductId, mobbies: MobbyCollection, store: PurchaseStore | null, api: PurchaseApi = serverApi): Promise<BuyOutcome> {
  if (!store) return { ok: false, reason: 'unavailable' };
  const product = PULL_PRODUCTS[productId];
  const account = await api.account();
  if (!account || !(await syncOwned(api, mobbies))) return { ok: false, reason: 'offline' };

  let bought: PurchasedItem | 'cancelled';
  try { bought = await store.purchase(product.sku, account.userId); } catch { return { ok: false, reason: 'unavailable' }; }
  if (bought === 'cancelled') return { ok: false, reason: 'cancelled' };

  if (!(await verify(api, bought.jws))) return { ok: false, reason: 'verify_failed' };
  await bought.finish().catch(() => undefined);

  const drawn = await drawPaid(api, product.count);
  return drawn ? { ok: true, ...drawn } : { ok: false, reason: 'pull_failed' };
}

/**
 * Finish whatever an earlier run left half done: verify receipts that were
 * never finished, then draw every pull the server still holds credit for.
 * Safe to call at every start; returns null when there is nothing to do.
 */
export async function settlePaidPulls(mobbies: MobbyCollection, store: PurchaseStore | null, api: PurchaseApi = serverApi): Promise<DrawnPulls | null> {
  const known = new Set<string>(Object.values(PULL_PRODUCTS).map(product => product.sku));
  const pending = store ? (await store.unfinished().catch(() => [] as PurchasedItem[])).filter(item => known.has(item.sku)) : [];
  if (pending.length === 0) {
    const wallet = await api.get('/wallet');
    if (!ok(wallet) || !(Number(wallet?.data?.paid) > 0)) return null;
  }
  if (!(await syncOwned(api, mobbies))) return null;
  for (const item of pending) if (await verify(api, item.jws)) await item.finish().catch(() => undefined);

  let paid = Number((await api.get('/wallet'))?.data?.paid);
  const all: PullResult[] = [];
  let paidPulls = 0;
  while (paid > 0) {
    const count = paid >= 5 ? 5 : 1;
    const drawn = await drawPaid(api, count);
    if (!drawn) break;
    all.push(...drawn.results); paidPulls = drawn.paidPulls; paid -= count;
  }
  return all.length ? { results: all, paidPulls } : null;
}
