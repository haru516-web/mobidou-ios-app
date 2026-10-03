import test from 'node:test';
import assert from 'node:assert/strict';
import { buyPulls, settlePaidPulls, type PurchaseApi, type PurchasedItem, type PurchaseStore, type Reply } from '../src/services/purchase.ts';
import { applyServerPulls, emptyMobbyCollection } from '../src/services/gacha.ts';

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
      if (path === '/purchases/verify') return reply(200, { status: 'verified' });
      if (path === '/gacha/pull') {
        const count = (body as { count: number }).count;
        wallet.paid -= count;
        return reply(200, { results: Array.from({ length: count }, () => ({ petId: 'yami', kind: 'paid', isNew: true, guaranteed: false })), paidPulls: 7 });
      }
      return reply(404);
    },
    get: async path => { calls.push('GET ' + path); return path === '/wallet' ? reply(200, { paid: wallet.paid, free: 0, paidPulls: 0 }) : reply(404); },
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

test('a purchase is verified before it is finished, and the draw comes last', async () => {
  const { api, calls, wallet } = fakeApi(undefined, { paid: 0 });
  const { store, events } = fakeStore();
  wallet.paid = 5;
  const outcome = await buyPulls('pull5', mobbies, store, api);
  assert.equal(outcome.ok, true);
  if (outcome.ok) { assert.equal(outcome.results.length, 5); assert.equal(outcome.paidPulls, 7); }
  assert.deepEqual(calls, ['/pets/sync', '/purchases/verify', '/gacha/pull:5']);
  assert.deepEqual(events, [`purchase:${FIVE}:user-1`, 'finish']);
});

test('the App Store purchase is tagged with the account id so the server can match it', async () => {
  const { api } = fakeApi();
  const { store, events } = fakeStore();
  await buyPulls('pull1', mobbies, store, api);
  assert.equal(events[0], `purchase:${SINGLE}:user-1`);
});

test('without a server connection nothing is charged', async () => {
  const { store, events } = fakeStore();
  const offline = fakeApi({ '/pets/sync': () => null as unknown as Reply });
  assert.deepEqual(await buyPulls('pull1', mobbies, store, offline.api), { ok: false, reason: 'offline' });
  assert.deepEqual(events, []);
  assert.deepEqual(await buyPulls('pull1', mobbies, null, fakeApi().api), { ok: false, reason: 'unavailable' });
});

test('cancelling the App Store sheet stops quietly', async () => {
  const { api, calls } = fakeApi();
  const { store } = fakeStore({ cancel: true });
  assert.deepEqual(await buyPulls('pull1', mobbies, store, api), { ok: false, reason: 'cancelled' });
  assert.deepEqual(calls, ['/pets/sync']);
});

test('if the server cannot verify the receipt, the transaction stays unfinished so the App Store replays it', async () => {
  const { api, calls } = fakeApi({ '/purchases/verify': () => reply(500, { error: 'internal_error' }) });
  const { store, events } = fakeStore();
  assert.deepEqual(await buyPulls('pull1', mobbies, store, api), { ok: false, reason: 'verify_failed' });
  assert.ok(!events.includes('finish'));
  assert.ok(!calls.some(call => call.startsWith('/gacha/pull')));
});

test('if the draw fails after payment, the receipt is finished and the credit waits for settlement', async () => {
  const { api } = fakeApi({ '/gacha/pull': () => reply(503, null) });
  const { store, events } = fakeStore();
  assert.deepEqual(await buyPulls('pull1', mobbies, store, api), { ok: false, reason: 'pull_failed' });
  assert.ok(events.includes('finish'));
});

test('settling draws every pull the server still holds credit for, five at a time', async () => {
  const { api, calls } = fakeApi(undefined, { paid: 6 });
  const drawn = await settlePaidPulls(mobbies, null, api);
  assert.equal(drawn?.results.length, 6);
  assert.deepEqual(calls.filter(call => call.startsWith('/gacha/pull')), ['/gacha/pull:5', '/gacha/pull:1']);
});

test('settling re-verifies an unfinished receipt, finishes it, then draws', async () => {
  const finished: string[] = [];
  const pending: PurchasedItem = { sku: SINGLE, jws: 'old-jws', finish: async () => { finished.push('old'); } };
  const other: PurchasedItem = { sku: 'something.else', jws: 'x', finish: async () => { finished.push('other'); } };
  const { api, calls } = fakeApi(undefined, { paid: 1 });
  const { store } = fakeStore({ unfinished: [pending, other] });
  const drawn = await settlePaidPulls(mobbies, store, api);
  assert.equal(drawn?.results.length, 1);
  assert.deepEqual(finished, ['old']);
  assert.ok(calls.indexOf('/purchases/verify') < calls.indexOf('/gacha/pull:1'));
});

test('settling does nothing when there is nothing to settle', async () => {
  const { api, calls } = fakeApi(undefined, { paid: 0 });
  assert.equal(await settlePaidPulls(mobbies, null, api), null);
  assert.deepEqual(calls, ['GET /wallet']);
});

test('server pulls are recorded on the device: new vs duplicate is decided locally, the count only moves up', () => {
  const known = (id: string) => id === 'yami' || id === 'mobibou';
  const results = [
    { petId: 'yami', isNew: false, guaranteed: false, kind: 'paid' as const },
    { petId: 'yami', isNew: true, guaranteed: true, kind: 'paid' as const },
    { petId: 'mystery', isNew: true, guaranteed: false, kind: 'paid' as const },
  ];
  const next = applyServerPulls({ ...mobbies, paidPulls: 9 }, results, 7, known);
  assert.deepEqual(next.owned, { mobibou: 1, yami: 2 });
  assert.deepEqual(next.unrevealed.map(entry => [entry.petId, entry.isNew, entry.guaranteed]), [['yami', true, false], ['yami', false, true]]);
  assert.equal(next.paidPulls, 9);
});
