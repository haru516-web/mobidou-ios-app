import test from 'node:test';
import assert from 'node:assert/strict';
import { buyPlan, buyPulls, drawPaidTickets, fetchLimits, fetchPaidTickets, recoverPaidDraws, restorePurchases, setAgeGroup, setPendingDrawStore, settleCredits, settlePaidDraws, type PurchaseApi, type PurchasedItem, type PurchaseStore, type Reply } from '../src/services/purchase.ts';
import { applyServerPulls, emptyMobbyCollection, setPaidTickets, ticketCount } from '../src/services/gacha.ts';

const SINGLE = 'jp.mobby.mobidou.gacha.single';
const FIVE = 'jp.mobby.mobidou.gacha.five';
const mobbies = { ...emptyMobbyCollection(), owned: { mobibou: 1 } };
const reply = (status: number, data: Record<string, unknown> | null = {}): Reply => ({ status, data });

/** A scripted server: records calls, answers by path, and lets a test break one of them. */
function fakeApi(overrides: Record<string, () => Reply> = {}, wallet = { paid: 0 }) {
  const calls: string[] = [];
  const api: PurchaseApi = {
    account: async () => ({ userId: 'user-1', secret: 's' }),
    post: async (path, body) => {
      calls.push(path + (path === '/gacha/pull' ? `:${(body as { count: number }).count}` : ''));
      if (overrides[path]) return overrides[path]();
      if (path === '/pets/sync') return reply(200, { owned: {} });
      if (path === '/purchases/verify') { wallet.paid += 5; return reply(200, { status: 'verified' }); }
      if (path === '/gacha/pull') {
        const count = (body as { count: number }).count;
        wallet.paid -= count;
        return reply(200, { results: Array.from({ length: count }, () => ({ petId: 'yami', kind: 'paid', isNew: true, guaranteed: false })), paidPulls: 7, remaining: wallet.paid });
      }
      return reply(404);
    },
    get: async path => {
      calls.push('GET ' + path);
      if (overrides['GET ' + path]) return overrides['GET ' + path]();
      if (path === '/limits') return reply(200, { ageGroup: 'adult', capYen: null, spentYen: 0, remainingYen: null });
      return path === '/wallet' ? reply(200, { paid: wallet.paid, free: 0, paidPulls: 0 }) : reply(404);
    },
  };
  return { api, calls, wallet };
}

function fakeStore(options: { cancel?: boolean; unfinished?: PurchasedItem[] } = {}) {
  const events: string[] = [];
  const store: PurchaseStore = {
    purchase: async (sku, token) => {
      events.push(`purchase:${sku}:${token}`);
      if (options.cancel) return 'cancelled';
      return { sku, jws: 'jws-1', finish: async () => { events.push('finish'); } };
    },
    unfinished: async () => options.unfinished ?? [],
  };
  return { store, events };
}

test('buying credits the 木札 and does NOT draw: the rope is still unpulled', async () => {
  const { api, calls } = fakeApi();
  const { store, events } = fakeStore();
  const outcome = await buyPulls('pull5', store, api);
  assert.deepEqual(outcome, { ok: true, wallet: { paid: 5, refundDebt: 0 } });
  assert.ok(!calls.some(call => call.startsWith('/gacha/pull')));
  assert.deepEqual(events, [`purchase:${FIVE}:user-1`, 'finish']);
});

test('a purchase is verified before it is finished', async () => {
  const { api, calls } = fakeApi();
  const { store, events } = fakeStore();
  await buyPulls('pull1', store, api);
  assert.ok(calls.indexOf('/purchases/verify') >= 0);
  assert.equal(events[0], `purchase:${SINGLE}:user-1`);
  assert.equal(events[1], 'finish');
});

test('without a server connection nothing is charged', async () => {
  const { store, events } = fakeStore();
  const noAccount: PurchaseApi = { ...fakeApi().api, account: async () => null };
  assert.deepEqual(await buyPulls('pull1', store, noAccount), { ok: false, reason: 'offline' });
  assert.deepEqual(events, []);
  assert.deepEqual(await buyPulls('pull1', null, fakeApi().api), { ok: false, reason: 'unavailable', detail: 'store_module_missing' });
});

test('cancelling the App Store sheet stops quietly', async () => {
  const { api, calls } = fakeApi();
  const { store } = fakeStore({ cancel: true });
  assert.deepEqual(await buyPulls('pull1', store, api), { ok: false, reason: 'cancelled' });
  assert.deepEqual(calls, ['GET /limits']);
});

test('if the server cannot verify the receipt, the transaction stays unfinished so the App Store replays it', async () => {
  const { api } = fakeApi({ '/purchases/verify': () => reply(500, { error: 'internal_error' }) });
  const { store, events } = fakeStore();
  assert.deepEqual(await buyPulls('pull1', store, api), { ok: false, reason: 'verify_failed' });
  assert.ok(!events.includes('finish'));
});

test('if the balance cannot be read after a verified purchase, the purchase still counts', async () => {
  const { api } = fakeApi();
  const { store } = fakeStore();
  const noWallet: PurchaseApi = { ...api, get: async path => (path === '/wallet' ? null : api.get(path)) };
  assert.deepEqual(await buyPulls('pull1', store, noWallet), { ok: true, wallet: null });
});

test('settling re-verifies an unfinished receipt, finishes it, and reports the balance', async () => {
  const finished: string[] = [];
  const pending: PurchasedItem = { sku: SINGLE, jws: 'old-jws', finish: async () => { finished.push('old'); } };
  const other: PurchasedItem = { sku: 'something.else', jws: 'x', finish: async () => { finished.push('other'); } };
  const { api, calls } = fakeApi();
  const { store } = fakeStore({ unfinished: [pending, other] });
  assert.deepEqual(await settleCredits(store, api), { paid: 5, refundDebt: 0 });
  assert.deepEqual(finished, ['old']);
  assert.ok(calls.indexOf('/purchases/verify') < calls.indexOf('GET /wallet'));
});

test('the balance is null, not zero, when the server cannot say', async () => {
  const { api } = fakeApi();
  assert.equal(await fetchPaidTickets({ ...api, get: async () => reply(500, null) }), null);
  assert.equal(await settleCredits(null, { ...api, get: async () => null }), null);
});

test('pulling the rope spends bought 木札 on the server, five at a time, after syncing what is owned', async () => {
  const { api, calls } = fakeApi(undefined, { paid: 7 });
  const drawn = await drawPaidTickets(6, mobbies, api);
  assert.equal(drawn?.results.length, 6);
  assert.equal(drawn?.complete, true);
  assert.equal(drawn?.paidTickets, 1);
  assert.deepEqual(calls, ['/pets/sync', '/gacha/pull:5', '/gacha/pull:1']);
});

test('if the server cannot be reached, nothing is drawn and nothing is spent', async () => {
  const offline = fakeApi({ '/pets/sync': () => null as unknown as Reply });
  assert.equal(await drawPaidTickets(1, mobbies, offline.api), null);
  assert.ok(!offline.calls.some(call => call.startsWith('/gacha/pull')));
  const refused = fakeApi({ '/gacha/pull': () => reply(409, { error: 'insufficient_paid_gacha_balance' }) });
  assert.equal(await drawPaidTickets(1, mobbies, refused.api), null);
});

test('a draw cut short reports what it got and says it is incomplete', async () => {
  let calls = 0;
  const { api } = fakeApi({ '/gacha/pull': () => (++calls === 1 ? reply(200, { results: Array.from({ length: 5 }, () => ({ petId: 'yami', kind: 'paid' })), paidPulls: 5, remaining: 1 }) : reply(503, null)) });
  const drawn = await drawPaidTickets(6, mobbies, api);
  assert.equal(drawn?.results.length, 5);
  assert.equal(drawn?.complete, false);
  assert.equal(drawn?.paidTickets, 1);
});

test('server pulls are recorded on the device: new vs duplicate is decided locally, the count only moves up, tickets follow the server', () => {
  const known = (id: string) => id === 'yami' || id === 'mobibou';
  const results = [
    { petId: 'yami', isNew: false, guaranteed: false, kind: 'paid' as const },
    { petId: 'yami', isNew: true, guaranteed: true, kind: 'paid' as const },
    { petId: 'mystery', isNew: true, guaranteed: false, kind: 'paid' as const },
  ];
  const next = applyServerPulls({ ...mobbies, paidPulls: 9, paidTickets: 4 }, results, 7, known, 2);
  assert.deepEqual(next.owned, { mobibou: 1, yami: 2 });
  assert.deepEqual(next.unrevealed.map(entry => [entry.petId, entry.isNew, entry.guaranteed]), [['yami', true, false], ['yami', false, true]]);
  assert.equal(next.paidPulls, 9);
  assert.equal(next.paidTickets, 2);
});

test('the ticket count is free plus bought, and the stored balance follows the server', () => {
  const held = { ...mobbies, freePulls: 2, paidTickets: 3 };
  assert.equal(ticketCount(held), 5);
  assert.equal(setPaidTickets(held, 3), held);
  assert.equal(ticketCount(setPaidTickets(held, 0)), 2);
  assert.equal(setPaidTickets(held, -4).paidTickets, 0);
});

const limitsReply = (ageGroup: string | null, capYen: number | null, remainingYen: number | null) => () => reply(200, { ageGroup, capYen, spentYen: 0, remainingYen });

test('nothing is charged until the player has said which age group they are in', async () => {
  const { api } = fakeApi({ 'GET /limits': limitsReply(null, 5000, 5000) });
  const { store, events } = fakeStore();
  assert.deepEqual(await buyPulls('pull1', store, api), { ok: false, reason: 'age_needed' });
  assert.deepEqual(events, []);
});

test('a purchase that would go over the monthly cap is refused before the App Store is touched', async () => {
  const { api } = fakeApi({ 'GET /limits': limitsReply('under16', 5000, 1000) });
  const { store, events } = fakeStore();
  assert.deepEqual(await buyPulls('pull5', store, api), { ok: false, reason: 'limit', capYen: 5000, remainingYen: 1000 });
  assert.deepEqual(events, []);
  // The 300 yen single still fits in what is left.
  assert.equal((await buyPulls('pull1', store, api)).ok, true);
});

test('an exact fit is allowed, and an adult has no cap', async () => {
  const { store } = fakeStore();
  assert.equal((await buyPulls('pull5', store, fakeApi({ 'GET /limits': limitsReply('16to19', 10000, 1200) }).api)).ok, true);
  assert.equal((await buyPulls('pull5', store, fakeApi({ 'GET /limits': limitsReply('adult', null, null) }).api)).ok, true);
});

test('if the limits cannot be read, nothing is charged', async () => {
  const { api } = fakeApi({ 'GET /limits': () => null as unknown as Reply });
  const { store, events } = fakeStore();
  assert.deepEqual(await buyPulls('pull1', store, api), { ok: false, reason: 'offline' });
  assert.deepEqual(events, []);
});

test('limits and the age group are read and written through the server', async () => {
  const { api, calls } = fakeApi({ 'GET /limits': limitsReply('16to19', 10000, 8800), '/profile/age-group': () => reply(200, { ageGroup: '16to19' }) });
  assert.deepEqual(await fetchLimits(api), { ageGroup: '16to19', capYen: 10000, remainingYen: 8800 });
  assert.equal(await setAgeGroup('16to19', api), true);
  assert.deepEqual(calls, ['GET /limits', '/profile/age-group']);
  assert.equal(await setAgeGroup('adult', fakeApi({ '/profile/age-group': () => reply(409, { error: 'age_group_cannot_be_raised' }) }).api), false);
  assert.equal(await fetchLimits(fakeApi({ 'GET /limits': () => reply(500, null) }).api), null);
});

test('the wallet reports bought 木札 and the refund debt, and treats a missing or odd debt as none', async () => {
  const { fetchWallet } = await import('../src/services/purchase.ts');
  const reading = (data: Record<string, unknown> | null, status = 200) => fakeApi({ 'GET /wallet': () => reply(status, data) }).api;
  assert.deepEqual(await fetchWallet(reading({ paid: 2, refundDebt: 3 })), { paid: 2, refundDebt: 3 });
  assert.deepEqual(await fetchWallet(reading({ paid: 2 })), { paid: 2, refundDebt: 0 });
  assert.deepEqual(await fetchWallet(reading({ paid: 2, refundDebt: -1 })), { paid: 2, refundDebt: 0 });
  assert.equal(await fetchWallet(reading({ paid: -1 })), null);
  assert.equal(await fetchWallet(reading({}, 500)), null);
});

test('every way a purchase can end has a follow-up, and asking for the age is never lost', async () => {
  const { purchaseFollowUp } = await import('../src/services/purchase.ts');
  assert.deepEqual(purchaseFollowUp({ ok: true, wallet: null }), { kind: 'done' });
  assert.deepEqual(purchaseFollowUp({ ok: false, reason: 'age_needed' }), { kind: 'askAge' });
  assert.deepEqual(purchaseFollowUp({ ok: false, reason: 'cancelled' }), { kind: 'quiet' });
  const limit = purchaseFollowUp({ ok: false, reason: 'limit', capYen: 5000, remainingYen: 1000 });
  assert.equal(limit.kind, 'message');
  assert.match(limit.kind === 'message' ? limit.text : '', /5,000円.*1,000円/s);
  for (const reason of ['offline', 'unavailable', 'verify_failed'] as const) assert.equal(purchaseFollowUp({ ok: false, reason }).kind, 'message', reason);
  const withDetail = purchaseFollowUp({ ok: false, reason: 'unavailable', detail: 'timeout: x' }, true);
  assert.match(withDetail.kind === 'message' ? withDetail.text : '', /timeout: x/);
  const withoutDetail = purchaseFollowUp({ ok: false, reason: 'unavailable', detail: 'timeout: x' }, false);
  assert.doesNotMatch(withoutDetail.kind === 'message' ? withoutDetail.text : '', /timeout/);
});

test('a purchase the store would not start says so in words, without showing the raw error', async () => {
  const { purchaseFollowUp } = await import('../src/services/purchase.ts');
  const text = (detail: string) => { const out = purchaseFollowUp({ ok: false, reason: 'unavailable', detail }, false); return out.kind === 'message' ? out.text : ''; };
  assert.match(text('cancelled_at_once: E_USER_CANCELLED x'), /購入シートを開けませんでした/);
  assert.match(text('no_answer: events=0 ignored=0'), /応答がありませんでした/);
  assert.match(text('product_not_found: jp.mobby.x'), /見つかりませんでした/);
  assert.match(text('timeout: initConnection did not answer in 15s'), /接続できませんでした/);
  assert.doesNotMatch(text('no_answer: events=2 ignored=2'), /events=/);
});

test('subscribing buys the plus product as a subscription, verifies it, then reads the plan', async () => {
  const { api, calls } = fakeApi({ 'GET /plan': () => reply(200, { plan: 'plus' }) });
  const kinds: (string | undefined)[] = [];
  const events: string[] = [];
  const store: PurchaseStore = {
    purchase: async (sku, token, kind) => { kinds.push(kind); events.push(`purchase:${sku}:${token}`); return { sku, jws: 'jws-plan', finish: async () => { events.push('finish'); } }; },
    unfinished: async () => [],
  };
  const outcome = await buyPlan(store, api);
  assert.deepEqual(kinds, ['subs']);
  assert.deepEqual(events, ['purchase:jp.mobby.mobidou.plus.monthly:user-1', 'finish']);
  assert.ok(outcome.ok && outcome.plan === 'plus');
  assert.ok(calls.indexOf('/purchases/verify') < calls.indexOf('GET /plan'));
});

test('a cancelled subscription changes nothing', async () => {
  const { api, calls } = fakeApi();
  const { store } = fakeStore({ cancel: true });
  assert.deepEqual(await buyPlan(store, api), { ok: false, reason: 'cancelled' });
  assert.ok(!calls.includes('/purchases/verify'));
});

/** Each test starts with nothing waiting (earlier tests leave their own unanswered draws behind). */
const freshPending = () => { let list: { opId: string; count: number }[] = []; setPendingDrawStore({ read: async () => list, write: async next => { list = next; } }); };

test('a draw whose answer was lost is asked for again with the same operation id, then forgotten once settled', async () => {
  freshPending();
  // First attempt: the request goes out but no answer comes back.
  const sent: { opId: string; count: number }[] = [];
  const lost: PurchaseApi = {
    account: async () => ({ userId: 'user-1', secret: 's' }),
    post: async (path, body) => {
      if (path === '/pets/sync') return reply(200, { owned: {} });
      sent.push({ opId: (body as { opId: string }).opId, count: (body as { count: number }).count });
      return null;
    },
    get: async () => reply(404),
  };
  assert.equal(await drawPaidTickets(1, mobbies, lost), null);
  assert.equal(sent.length, 1);
  assert.match(sent[0].opId, /^[A-Za-z0-9-]{8,64}$/);

  // The next start asks again; the server has the stored answer.
  const asked: string[] = [];
  const back: PurchaseApi = {
    account: async () => ({ userId: 'user-1', secret: 's' }),
    post: async (_path, body) => {
      asked.push((body as { opId: string }).opId);
      return reply(200, { results: [{ petId: 'yami', kind: 'paid', isNew: true, guaranteed: false }], paidPulls: 3, remaining: 4 });
    },
    get: async () => reply(404),
  };
  const recovered = await recoverPaidDraws(back);
  assert.deepEqual(asked, [sent[0].opId]);
  assert.deepEqual(recovered?.results.map(r => r.petId), ['yami']);
  assert.equal(recovered?.paidTickets, 4);

  // Still waiting until the player has the result; asking again returns it again.
  assert.equal((await recoverPaidDraws(back))?.results.length, 1);
  await settlePaidDraws(recovered!.opIds);
  assert.equal(await recoverPaidDraws(back), null);
});

test('a draw the server refused for good is not asked for again', async () => {
  freshPending();
  const refuse: PurchaseApi = {
    account: async () => ({ userId: 'user-1', secret: 's' }),
    post: async path => (path === '/pets/sync' ? reply(200, { owned: {} }) : reply(409, { error: 'insufficient_paid_gacha_balance' })),
    get: async () => reply(404),
  };
  assert.equal(await drawPaidTickets(1, mobbies, refuse), null);
  assert.equal(await recoverPaidDraws(refuse), null);
});

test('restore reports what it found: credited, belonging to an earlier account, or nothing', async () => {
  const item = (sku: string, jws: string) => ({ sku, jws, finish: async () => undefined });
  const storeWith = (items: ReturnType<typeof item>[]): PurchaseStore => ({ unfinished: async () => items, buy: async () => 'cancelled' } as unknown as PurchaseStore);
  const answering = (reply: Reply): PurchaseApi => ({
    account: async () => ({ userId: 'user-1', secret: 's' }),
    post: async () => reply,
    get: async () => reply200Wallet,
  });
  const reply200Wallet = reply(200, { paid: 0, free: 0, paidPulls: 0, refundDebt: 0 });
  const plus = 'jp.mobby.mobidou.plus.monthly';

  const mine = await restorePurchases(storeWith([item(plus, 'a')]), answering(reply(200, { status: 'verified' })));
  assert.deepEqual(mine.kind === 'done' && [mine.credited, mine.otherAccount, mine.failed], [1, 0, 0]);

  const earlier = await restorePurchases(storeWith([item(plus, 'a')]), answering(reply(403, { error: 'app_account_token_mismatch' })));
  assert.deepEqual(earlier.kind === 'done' && [earlier.credited, earlier.otherAccount, earlier.failed], [0, 1, 0]);

  const nothing = await restorePurchases(storeWith([]), answering(reply(200, {})));
  assert.deepEqual(nothing.kind === 'done' && [nothing.credited, nothing.otherAccount, nothing.failed], [0, 0, 0]);

  const offline = await restorePurchases(storeWith([item(plus, 'a')]), { account: async () => null, post: async () => null, get: async () => null });
  assert.equal(offline.kind, 'offline');
});
