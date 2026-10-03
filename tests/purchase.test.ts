import test from 'node:test';
import assert from 'node:assert/strict';
import { buyPulls, drawPaidTickets, fetchLimits, fetchPaidTickets, setAgeGroup, settleCredits, type PurchaseApi, type PurchasedItem, type PurchaseStore, type Reply } from '../src/services/purchase.ts';
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
  assert.deepEqual(outcome, { ok: true, paidTickets: 5 });
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
  assert.deepEqual(await buyPulls('pull1', store, noWallet), { ok: true, paidTickets: null });
});

test('settling re-verifies an unfinished receipt, finishes it, and reports the balance', async () => {
  const finished: string[] = [];
  const pending: PurchasedItem = { sku: SINGLE, jws: 'old-jws', finish: async () => { finished.push('old'); } };
  const other: PurchasedItem = { sku: 'something.else', jws: 'x', finish: async () => { finished.push('other'); } };
  const { api, calls } = fakeApi();
  const { store } = fakeStore({ unfinished: [pending, other] });
  assert.equal(await settleCredits(store, api), 5);
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
