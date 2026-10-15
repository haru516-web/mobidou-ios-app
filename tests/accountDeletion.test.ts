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

/** A device with an in-memory storage and a scripted server: the original account (user-1) is refused, anonymous ones are accepted. */
async function withServer<T>(body: (api: { calls: { path: string; user: string }[]; refuse: Set<string>; imports: Awaited<ReturnType<typeof loadModules>> }) => Promise<T>): Promise<T> {
  const imports = await loadModules();
  const kept = new Map<string, string>();
  imports.server.useServerStorageForTests({ getItem: async key => kept.get(key) ?? null, setItem: async (key, value) => { kept.set(key, value); } });
  const originalFetch = globalThis.fetch;
  const calls: { path: string; user: string }[] = [];
  const refuse = new Set<string>(["user-1"]);
  let registered = 0;
  globalThis.fetch = (async (url: string, init: { headers?: Record<string, string> }) => {
    const path = new URL(url).pathname;
    const user = (init.headers?.Authorization ?? "").replace("Bearer ", "").split(".")[0];
    calls.push({ path, user });
    if (path === "/auth/register") { registered += 1; return new Response(JSON.stringify({ userId: `anon-${registered}`, secret: "new-secret", friendCode: "X" }), { status: 201 }); }
    if (refuse.has(user)) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    if (path === "/account/delete") return new Response(JSON.stringify({ status: "deleted" }), { status: 200 });
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  try { return await body({ calls, refuse, imports }); } finally { globalThis.fetch = originalFetch; }
}
async function loadModules() {
  return { server: await import("../src/services/server.ts"), deletion: await import("../src/services/accountDeletion.ts") };
}

test("an account the server stopped accepting is kept as lost: another 401 or a new anonymous account cannot turn it into \"deleted\"", async () => {
  await withServer(async ({ calls, imports: { server, deletion } }) => {
    await server.adoptServerAccount({ userId: "user-1", secret: "secret-1" });
    await server.authedRequest("/profile", { method: "GET" });
    assert.equal(await server.readServerAccount(), null);
    // The next call registers a new anonymous account; the lost one is still remembered.
    await server.authedRequest("/profile", { method: "GET" });
    assert.equal((await server.readServerAccount())?.userId, "anon-1");
    assert.deepEqual(await server.readLostAccounts(), [{ userId: "user-1", secret: "secret-1" }]);
    // Deleting reaches the lost account first (it is refused), then deletes the one in use, and says an older one was left.
    assert.equal(await deletion.deleteServerAccount(), "partly");
    assert.deepEqual(calls.filter(call => call.path === "/account/delete").map(call => call.user), ["user-1", "anon-1"]);
    // Nothing is left to try: a plain success is possible afterwards.
    assert.deepEqual(await server.readLostAccounts(), []);
  });
});

test("a lost account that is accepted again is deleted with the current one; one that is refused does not block", async () => {
  await withServer(async ({ refuse, imports: { server, deletion } }) => {
    await server.adoptServerAccount({ userId: "user-1", secret: "secret-1" });
    await server.authedRequest("/profile", { method: "GET" });
    await server.authedRequest("/profile", { method: "GET" });
    refuse.delete("user-1");
    assert.equal(await deletion.deleteServerAccount(), "deleted");
  });
});

test("adopting another account keeps a lost one; the same account signing in again settles its own loss", async () => {
  await withServer(async ({ imports: { server } }) => {
    await server.adoptServerAccount({ userId: "user-1", secret: "secret-1" });
    await server.authedRequest("/profile", { method: "GET" });
    await server.adoptServerAccount({ userId: "other", secret: "x" });
    assert.deepEqual((await server.readLostAccounts()).map(row => row.userId), ["user-1"]);
    await server.adoptServerAccount({ userId: "user-1", secret: "fresh-secret" });
    assert.deepEqual(await server.readLostAccounts(), []);
    assert.deepEqual(await server.readServerAccount(), { userId: "user-1", secret: "fresh-secret" });
  });
});

test("a late 401 for an old key does not undo a newer sign-in of the same account", async () => {
  await withServer(async ({ imports: { server } }) => {
    await server.adoptServerAccount({ userId: "user-1", secret: "old-secret" });
    // The call is made with the old key; before its answer, the account signs in again with a fresh key.
    const originalFetch = globalThis.fetch;
    let release: () => void = () => undefined;
    const gate = new Promise<void>(resolve => { release = resolve; });
    globalThis.fetch = (async () => { await gate; return new Response("{}", { status: 401 }); }) as unknown as typeof fetch;
    const pending = server.authedRequest("/profile", { method: "GET" });
    await new Promise(resolve => setTimeout(resolve, 5));
    await server.adoptServerAccount({ userId: "user-1", secret: "new-secret" });
    release();
    await pending;
    globalThis.fetch = originalFetch;
    assert.deepEqual(await server.readServerAccount(), { userId: "user-1", secret: "new-secret" });
    assert.deepEqual(await server.readLostAccounts(), []);
  });
});
