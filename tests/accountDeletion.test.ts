import test from 'node:test';
import assert from 'node:assert/strict';
import { DELETE_CONFIRMATION_WORD, isAppStorageKey } from '../src/services/accountDeletion.ts';

test("only this app's keys are erased, and the confirmation word is the one on screen", () => {
  assert.equal(isAppStorageKey('@mobidou/journey/v1'), true);
  assert.equal(isAppStorageKey('@mobidou/server/v1'), true);
  assert.equal(isAppStorageKey('@mobidou/cloudsave/v1'), true);
  assert.equal(isAppStorageKey('@other/app'), false);
  assert.equal(isAppStorageKey('mobidou'), false);
  assert.equal(DELETE_CONFIRMATION_WORD, '削除');
});

test('an account the server stopped accepting is kept as lost: another 401 or a new anonymous account cannot turn it into "deleted"', async () => {
  const { adoptServerAccount, authedRequest, readLostAccount, readServerAccount, useServerStorageForTests } = await import('../src/services/server.ts');
  const { deleteServerAccount } = await import('../src/services/accountDeletion.ts');
  const kept = new Map<string, string>();
  useServerStorageForTests({ getItem: async key => kept.get(key) ?? null, setItem: async (key, value) => { kept.set(key, value); } });
  const originalFetch = globalThis.fetch;
  const calls: { path: string; user: string }[] = [];
  let registered = 0;
  globalThis.fetch = (async (url: string, init: { headers?: Record<string, string> }) => {
    const path = new URL(url).pathname;
    const user = (init.headers?.Authorization ?? '').replace('Bearer ', '').split('.')[0];
    calls.push({ path, user });
    if (path === '/auth/register') { registered += 1; return new Response(JSON.stringify({ userId: `anon-${registered}`, secret: 'new-secret', friendCode: 'X' }), { status: 201 }); }
    // The original account (user-1) is no longer accepted; the anonymous ones are, but only for deletion here.
    if (user === 'user-1') return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    if (path === '/account/delete') return new Response(JSON.stringify({ status: 'deleted' }), { status: 200 });
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  try {
    await adoptServerAccount({ userId: 'user-1', secret: 'secret-1' });
    // Another authenticated call is refused first: the account is dropped, but remembered.
    await authedRequest('/profile', { method: 'GET' });
    assert.equal(await readServerAccount(), null);
    // The next call registers a new anonymous account.
    await authedRequest('/profile', { method: 'GET' });
    assert.equal((await readServerAccount())?.userId, 'anon-1', 'a new anonymous account was made in between');
    assert.deepEqual(await readLostAccount(), { userId: 'user-1', secret: 'secret-1' });
    // Deleting now must reach the lost account first: refused, so nothing is called deleted and the new one is not deleted instead.
    assert.equal(await deleteServerAccount(), 'signed_out');
    assert.equal(calls.filter(call => call.path === '/account/delete').every(call => call.user === 'user-1'), true);
    assert.equal(await deleteServerAccount(), 'signed_out');
    assert.deepEqual(await readLostAccount(), { userId: 'user-1', secret: 'secret-1' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
