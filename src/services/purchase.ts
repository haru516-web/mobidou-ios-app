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
  pull1: { sku: 'jp.mobby.mobidou.gacha.single', count: 1, priceYen: 300 },
  pull5: { sku: 'jp.mobby.mobidou.gacha.five', count: 5, priceYen: 1200 },
} as const;
export type PullProductId = keyof typeof PULL_PRODUCTS;
/** The plus plan: an auto-renewing subscription (App Store Connect product id). The server credits its monthly 木札 and reports the plan. */
export const PLUS_PRODUCT = { sku: 'jp.mobby.mobidou.plus.monthly', priceYen: 300 } as const;
export type PurchaseKind = 'in-app' | 'subs';

export type BuyOutcome =
  /** `wallet` is the server's balance now, or null when it could not be read (it is read again at the next start). */
  | { ok: true; wallet: Wallet | null }
  | { ok: false; reason: 'cancelled' | 'offline' | 'unavailable' | 'verify_failed'; detail?: string }
  /** The player has not said which age group they are in yet; ask, call `setAgeGroup`, then buy again. */
  | { ok: false; reason: 'age_needed' }
  /** This purchase would go over the monthly cap for the player's age group. */
  | { ok: false; reason: 'limit'; capYen: number; remainingYen: number }
  /** Purchases are paused for this account after repeated refunds of tickets that had been used. */
  | { ok: false; reason: 'restricted' };

export type AgeGroup = 'under16' | '16to19' | 'adult';
export type Limits = { ageGroup: AgeGroup | null; capYen: number | null; remainingYen: number | null; restricted?: boolean };

/** What the screen does once a purchase has ended. Kept apart from the screen so every ending has a tested answer. */
export type FollowUp =
  /** Bought: the balance is already known; settle anything left over. */
  | { kind: 'done' }
  /** The player has not said which age group they are in yet: ask, then buy again. */
  | { kind: 'askAge' }
  /** A quiet ending, such as cancelling the App Store sheet. */
  | { kind: 'quiet' }
  | { kind: 'message'; text: string };

/** `showDetail` adds the technical reason to a message (development builds). */
/**
 * What to tell someone when the store would not start or finish a purchase. The raw error stays out of sight outside development,
 * but the kind of stall is named, so "nothing happens" can be told apart from a store that is not answering.
 */
function unavailableText(detail: string | undefined): string {
  const d = detail ?? '';
  if (d.startsWith('cancelled_at_once')) return '購入シートを開けませんでした。iPhoneの「設定」→「App Store」で、サンドボックスアカウント（TestFlight）またはApple IDにサインインできているかを確認し、もう一度お試しください。';
  if (d.startsWith('no_answer')) return 'ストアからの応答がありませんでした。購入シートが開かない場合は、iPhoneの再起動と、電波のよいところでの再試行をお願いします。購入の完了はまだ確認できていません。後から完了した購入は、次回起動時に確認します。';
  if (d.startsWith('product_not_found')) return 'この商品がストアで見つかりませんでした。しばらくしてから、もう一度お試しください。';
  if (d.startsWith('timeout')) return 'ストアに接続できませんでした。電波のよいところで、もう一度お試しください。';
  return 'この環境では購入できません。';
}

export function purchaseFollowUp(outcome: BuyOutcome, showDetail = false): FollowUp {
  if (outcome.ok) return { kind: 'done' };
  if (outcome.reason === 'age_needed') return { kind: 'askAge' };
  if (outcome.reason === 'restricted') {
    return { kind: 'message', text: '返金が続いたため、このアカウントでは、いまは購入をお受けできません。心当たりがない場合は、運営者までご連絡ください。' };
  }
  if (outcome.reason === 'limit') {
    return { kind: 'message', text: `今月の購入の上限（${outcome.capYen.toLocaleString('ja-JP')}円）まで、あと${outcome.remainingYen.toLocaleString('ja-JP')}円です。この商品は上限を超えるため、購入できません。\n上限は、毎月1日にリセットされます。` };
  }
  const base = {
    cancelled: '',
    offline: 'サーバーにつながりませんでした。電波のよいところで、もう一度お試しください。購入はされていません。',
    unavailable: unavailableText(outcome.reason === 'unavailable' ? outcome.detail : undefined),
    verify_failed: '購入の確認ができませんでした。Appleでの支払いが完了している場合もあります。アプリを開き直すと、自動でやり直します。',
  }[outcome.reason];
  if (!base) return { kind: 'quiet' };
  return { kind: 'message', text: showDetail && outcome.detail ? `${base}\n\n(開発用の詳細: ${outcome.detail})` : base };
}

export type PurchasedItem = { sku: string; jws: string; finish: () => Promise<void> };
export interface PurchaseStore {
  purchase(sku: string, accountToken: string, kind?: PurchaseKind): Promise<PurchasedItem | 'cancelled'>;
  /** Purchases paid for but not finished yet (for example after a crash). */
  unfinished(): Promise<PurchasedItem[]>;
  /** The price the App Store shows for each product id, in the shopper's currency (for example "¥300"). Empty when it cannot be read. */
  prices?(): Promise<Record<string, string>>;
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

export type Wallet = { paid: number; refundDebt: number };

/**
 * Bought 木札 the server holds for this account, and how many are owed back after a refund (the next purchase pays that off
 * first). Null when the server cannot say.
 */
export async function fetchWallet(api: PurchaseApi = serverApi): Promise<Wallet | null> {
  const reply = await api.get('/wallet');
  const paid = reply?.data?.paid;
  const debt = reply?.data?.refundDebt;
  if (!ok(reply) || typeof paid !== 'number' || !Number.isFinite(paid) || paid < 0) return null;
  return { paid, refundDebt: typeof debt === 'number' && Number.isFinite(debt) && debt > 0 ? debt : 0 };
}

/** Bought 木札 the server holds for this account, or null when the server cannot say. */
export async function fetchPaidTickets(api: PurchaseApi = serverApi): Promise<number | null> {
  return (await fetchWallet(api))?.paid ?? null;
}

/** The plan the server says is running right now, or null when it cannot say. */
export async function fetchPlan(api: PurchaseApi = serverApi): Promise<'none' | 'plus' | null> {
  const reply = await api.get('/plan');
  if (!ok(reply)) return null;
  return reply?.data?.plan === 'plus' ? 'plus' : 'none';
}

/** The spending cap and what is left of it this month, or null when the server cannot say. */
export async function fetchLimits(api: PurchaseApi = serverApi): Promise<Limits | null> {
  const reply = await api.get('/limits');
  const data = reply?.data;
  if (!ok(reply) || !data) return null;
  const group = data.ageGroup;
  const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
  return { ageGroup: group === 'under16' || group === '16to19' || group === 'adult' ? group : null, capYen: number(data.capYen), remainingYen: number(data.remainingYen), restricted: data.restricted === true };
}

/** Record which age group the player is in. A mistaken choice may be lowered later but not raised. */
export async function setAgeGroup(group: AgeGroup, api: PurchaseApi = serverApi): Promise<boolean> {
  return ok(await api.post('/profile/age-group', { ageGroup: group }));
}

const verify = async (api: PurchaseApi, jws: string) => ok(await api.post('/purchases/verify', { signedTransactionInfo: jws }));

/** `onStage` is told which step is under way (account, limits, store, verify, wallet), so a stall can be located. */
export async function buyPulls(productId: PullProductId, store: PurchaseStore | null, api: PurchaseApi = serverApi, onStage?: (stage: string) => void): Promise<BuyOutcome> {
  onStage?.('start');
  if (!store) return { ok: false, reason: 'unavailable', detail: 'store_module_missing' };
  const product = PULL_PRODUCTS[productId];
  onStage?.('account');
  const account = await api.account();
  if (!account) return { ok: false, reason: 'offline' };

  onStage?.('limits');
  const limits = await fetchLimits(api);
  if (!limits) return { ok: false, reason: 'offline' };
  if (limits.restricted) return { ok: false, reason: 'restricted' };
  if (limits.ageGroup === null) return { ok: false, reason: 'age_needed' };
  if (limits.capYen !== null && limits.remainingYen !== null && product.priceYen > limits.remainingYen) return { ok: false, reason: 'limit', capYen: limits.capYen, remainingYen: limits.remainingYen };

  let bought: PurchasedItem | 'cancelled';
  onStage?.('store');
  try { bought = await store.purchase(product.sku, account.userId); } catch (error) { return { ok: false, reason: 'unavailable', detail: error instanceof Error ? error.message : String(error) }; }
  if (bought === 'cancelled') return { ok: false, reason: 'cancelled' };

  onStage?.('verify');
  if (!(await verify(api, bought.jws))) return { ok: false, reason: 'verify_failed' };
  await bought.finish().catch(() => undefined);
  onStage?.('wallet');
  return { ok: true, wallet: await fetchWallet(api) };
}

export type BuyPlanOutcome = BuyOutcome extends infer T ? T extends { ok: true } ? { ok: true; wallet: Wallet | null; plan: 'none' | 'plus' | null } : T : never;

/** Subscribe to the plus plan. Same order as a pull purchase: account, cap, store, server check; then the wallet and the plan are read again. */
export async function buyPlan(store: PurchaseStore | null, api: PurchaseApi = serverApi, onStage?: (stage: string) => void): Promise<BuyPlanOutcome> {
  onStage?.('start');
  if (!store) return { ok: false, reason: 'unavailable', detail: 'store_module_missing' };
  onStage?.('account');
  const account = await api.account();
  if (!account) return { ok: false, reason: 'offline' };
  onStage?.('limits');
  const limits = await fetchLimits(api);
  if (!limits) return { ok: false, reason: 'offline' };
  if (limits.restricted) return { ok: false, reason: 'restricted' };
  if (limits.ageGroup === null) return { ok: false, reason: 'age_needed' };
  if (limits.capYen !== null && limits.remainingYen !== null && PLUS_PRODUCT.priceYen > limits.remainingYen) return { ok: false, reason: 'limit', capYen: limits.capYen, remainingYen: limits.remainingYen };
  let bought: PurchasedItem | 'cancelled';
  onStage?.('store');
  try { bought = await store.purchase(PLUS_PRODUCT.sku, account.userId, 'subs'); } catch (error) { return { ok: false, reason: 'unavailable', detail: error instanceof Error ? error.message : String(error) }; }
  if (bought === 'cancelled') return { ok: false, reason: 'cancelled' };
  onStage?.('verify');
  if (!(await verify(api, bought.jws))) return { ok: false, reason: 'verify_failed' };
  await bought.finish().catch(() => undefined);
  onStage?.('wallet');
  return { ok: true, wallet: await fetchWallet(api), plan: await fetchPlan(api) };
}

/**
 * Finish whatever an earlier run left half done: verify receipts that were
 * never finished, then report the server's 木札 balance. Safe to call at every
 * start; returns null when the server cannot be reached.
 */
export async function settleCredits(store: PurchaseStore | null, api: PurchaseApi = serverApi): Promise<Wallet | null> {
  const known = new Set<string>([...Object.values(PULL_PRODUCTS).map(product => product.sku), PLUS_PRODUCT.sku]);
  const pending = store ? (await store.unfinished().catch(() => [] as PurchasedItem[])).filter(item => known.has(item.sku)) : [];
  for (const item of pending) if (await verify(api, item.jws)) await item.finish().catch(() => undefined);
  return fetchWallet(api);
}

/** What a restore found: purchases of this account credited, ones that belong to another (earlier) account, and ones that failed. */
export type RestoreOutcome =
  | { kind: 'offline' }
  | { kind: 'done'; wallet: Wallet | null; credited: number; otherAccount: number; failed: number };

/**
 * Settings > restore. Each purchase the App Store still lists for this Apple ID is checked with the server. A purchase made
 * under an earlier anonymous account (the app was reinstalled and not signed in with Apple) is not this account's, so it is
 * reported as such instead of being counted as restored.
 */
export async function restorePurchases(store: PurchaseStore | null, api: PurchaseApi = serverApi): Promise<RestoreOutcome> {
  const known = new Set<string>([...Object.values(PULL_PRODUCTS).map(product => product.sku), PLUS_PRODUCT.sku]);
  const items = store ? (await store.unfinished().catch(() => [] as PurchasedItem[])).filter(item => known.has(item.sku)) : [];
  let credited = 0, otherAccount = 0, failed = 0;
  for (const item of items) {
    const reply = await api.post('/purchases/verify', { signedTransactionInfo: item.jws });
    if (reply === null) return { kind: 'offline' };
    if (ok(reply)) { credited += 1; await item.finish().catch(() => undefined); }
    else if (reply.status === 403 && reply.data?.error === 'app_account_token_mismatch') otherAccount += 1;
    else failed += 1;
  }
  const wallet = await fetchWallet(api);
  if (wallet === null && items.length === 0) return { kind: 'offline' };
  return { kind: 'done', wallet, credited, otherAccount, failed };
}

export type PaidDraw = {
  results: PullResult[]; paidPulls: number; paidTickets: number; complete: boolean;
  /** The operation ids behind these results. Hand them to `settlePaidDraws` once the results are in the player's collection. */
  opIds: string[];
};

/*
 * A bought-木札 draw is made by the server, and the answer can be lost on the way back (a dropped connection, the app
 * closed). Each request therefore carries an operation id that is written down BEFORE it is sent and only forgotten
 * once the result is in the collection. Asking again with the same id returns the stored result without drawing again.
 */
export type PendingDraw = { opId: string; count: number };
export type PendingDrawStore = { read(): Promise<PendingDraw[]>; write(list: PendingDraw[]): Promise<void> };
let pendingMemory: PendingDraw[] = [];
let pendingStore: PendingDrawStore = { read: async () => pendingMemory, write: async list => { pendingMemory = list; } };
/** The app gives a store that survives a restart; the default only lasts while the app runs. */
export function setPendingDrawStore(store: PendingDrawStore) { pendingStore = store; }
const newOpId = () => `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
async function readPending() { try { return await pendingStore.read(); } catch { return []; } }
async function addPending(entry: PendingDraw) { await pendingStore.write([...(await readPending()), entry]).catch(() => undefined); }

/** Forget operations whose results the player now has. */
export async function settlePaidDraws(opIds: readonly string[]) {
  if (opIds.length === 0) return;
  await pendingStore.write((await readPending()).filter(entry => !opIds.includes(entry.opId))).catch(() => undefined);
}

/**
 * Ask again for draws whose answer never arrived. Returns what the server has for them (the result of a draw that was
 * made, or a fresh draw if the request never got through); null when there is nothing waiting or the server is out of reach.
 */
export async function recoverPaidDraws(api: PurchaseApi = serverApi): Promise<PaidDraw | null> {
  const pending = await readPending();
  if (pending.length === 0) return null;
  const results: PullResult[] = [];
  const opIds: string[] = [];
  let paidPulls = 0;
  let paidTickets = 0;
  for (const entry of pending) {
    const reply = await api.post('/gacha/pull', { count: entry.count, kind: 'paid', opId: entry.opId });
    if (reply === null) break; // no connection: keep it for next time
    const drawn = readPulls(reply);
    if (drawn) { results.push(...drawn.results); opIds.push(entry.opId); paidPulls = drawn.paidPulls; paidTickets = drawn.remaining; continue; }
    // The server answered "no": it will never become a draw (no balance left, a refused request), so stop waiting for it.
    if (reply.status >= 400 && reply.status < 500 && reply.status !== 429) await settlePaidDraws([entry.opId]);
  }
  return results.length ? { results, paidPulls, paidTickets, complete: true, opIds } : null;
}

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
  const opIds: string[] = [];
  let paidPulls = 0;
  let paidTickets = 0;
  let left = count;
  while (left > 0) {
    const chunk = left >= 5 ? 5 : 1;
    const opId = newOpId();
    await addPending({ opId, count: chunk });
    const reply = await api.post('/gacha/pull', { count: chunk, kind: 'paid', opId });
    const drawn = readPulls(reply);
    if (!drawn) {
      // A definite "no" from the server means nothing was drawn; no answer at all means it may have been (kept for recoverPaidDraws).
      if (reply !== null && reply.status >= 400 && reply.status < 500 && reply.status !== 429) await settlePaidDraws([opId]);
      break;
    }
    results.push(...drawn.results); opIds.push(opId); paidPulls = drawn.paidPulls; paidTickets = drawn.remaining; left -= chunk;
  }
  return results.length ? { results, paidPulls, paidTickets, complete: left === 0, opIds } : null;
}
