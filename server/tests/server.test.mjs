import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { handleWithStore } from "../src/worker.ts";
import { hashSecret, verifySignedTransaction } from "../src/crypto.ts";
import { GACHA_PET_IDS, PAID_PITY_INTERVAL } from "../src/config/gacha.ts";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryStore {
  users = new Map();
  hashes = new Map();
  claims = new Set();
  tickets = [];
  walletRows = new Map();
  purchases = new Map();
  requests = new Map();
  friendRows = new Set();
  events = new Map();
  steps = new Map();
  pulls = [];
  owned = new Map();
  freePullClaims = new Set();
  paidPullCounts = new Map();
  failNextCommit = false;

  hits = new Map();
  async hitRateLimit(key, window) {
    const id = `${key}:${window}`;
    this.hits.set(id, (this.hits.get(id) ?? 0) + 1);
    return this.hits.get(id);
  }
  async registerUser(user, secretHash) {
    this.users.set(user.id, user);
    this.hashes.set(user.id, secretHash);
    this.walletRows.set(user.id, { paid: 0, free: 0 });
  }
  async credentialHash(userId) { return this.hashes.get(userId) ?? null; }
  async user(userId) { return this.users.get(userId) ?? null; }
  async userByFriendCode(code) { return [...this.users.values()].find((user) => user.friendCode === code) ?? null; }
  async claimGift(userId, gift) {
    const key = `${userId}:${gift.id}`;
    if (this.claims.has(key)) return false;
    this.claims.add(key);
    if (gift.tickets) this.tickets.push({ userId, amount: gift.tickets, reason: "gift", ref: gift.id });
    const wallet = this.walletRows.get(userId);
    wallet.free += gift.freePulls ?? 0;
    wallet.paid += gift.paidPulls ?? 0;
    return true;
  }
  async ticketBalance(userId) { return this.tickets.filter((entry) => entry.userId === userId).reduce((sum, row) => sum + row.amount, 0); }
  async consumeTickets(userId, amount, ref) {
    if (this.tickets.some((entry) => entry.userId === userId && entry.reason === "consume" && entry.ref === ref)) return false;
    if (await this.ticketBalance(userId) < amount) return false;
    this.tickets.push({ userId, amount: -amount, reason: "consume", ref });
    return true;
  }
  async grantMonthlyTickets(userId, plan, periodStart, periodEnd, amount) {
    const ref = `${plan}:${periodStart}`;
    if (this.tickets.some((entry) => entry.userId === userId && entry.reason === "monthly_subscription" && entry.ref === ref)) return false;
    this.tickets.push({ userId, amount, reason: "monthly_subscription", ref, periodEnd });
    return true;
  }
  async recordPurchase(userId, transaction, product) {
    if (this.purchases.has(transaction.transactionId)) return false;
    this.purchases.set(transaction.transactionId, userId);
    this.purchaseLog.push({ id: transaction.transactionId, userId, productId: transaction.productId, at: new Date(transaction.purchaseDate).toISOString() });
    const wallet = this.walletRows.get(userId);
    wallet.paid += product.paidPulls ?? 0;
    if (product.plan && product.monthlyTickets && transaction.expiresDate) {
      await this.grantMonthlyTickets(userId, product.plan, new Date(transaction.purchaseDate).toISOString(), new Date(transaction.expiresDate).toISOString(), product.monthlyTickets);
    } else if (product.monthlyTickets) {
      this.tickets.push({ userId, amount: product.monthlyTickets, reason: "purchase", ref: transaction.transactionId });
    }
    return true;
  }
  async revokePurchase(transactionId) { this.purchases.delete(transactionId); this.purchaseLog = this.purchaseLog.filter((entry) => entry.id !== transactionId); }
  purchaseLog = [];
  ageGroups = new Map();
  async ageGroup(userId) { return this.ageGroups.get(userId) ?? null; }
  async setAgeGroup(userId, group) { this.ageGroups.set(userId, group); }
  async purchasedProducts(userId, from, to) { return this.purchaseLog.filter((entry) => entry.userId === userId && entry.at >= from && entry.at < to).map((entry) => entry.productId); }
  async wallet(userId) { return { ...this.walletRows.get(userId), paidPulls: this.paidPullCounts.get(userId) ?? 0 }; }
  async ownedPets(userId) { return { ...(this.owned.get(userId) ?? {}) }; }
  async chooseStarter(userId, petId) {
    const owned = this.owned.get(userId) ?? {};
    if (Object.keys(owned).length > 0) return false;
    this.owned.set(userId, { [petId]: 1 });
    return true;
  }
  async mergeOwnedPets(userId, owned) {
    const current = this.owned.get(userId) ?? {};
    for (const [petId, copies] of Object.entries(owned)) current[petId] = Math.max(current[petId] ?? 0, copies);
    this.owned.set(userId, current);
  }
  async claimFreePull(userId, routeId) {
    const key = `${userId}:${routeId}`;
    if (this.freePullClaims.has(key)) return false;
    this.freePullClaims.add(key);
    this.walletRows.get(userId).free += 1;
    return true;
  }
  async commitDraws(userId, draws, kind, paidPulls) {
    if (this.failNextCommit) { this.failNextCommit = false; throw new Error("simulated transaction failure"); }
    const wallet = this.walletRows.get(userId);
    if (wallet[kind] < draws.length) throw new Error("insufficient balance");
    const owned = { ...(this.owned.get(userId) ?? {}) };
    for (const draw of draws) owned[draw.petId] = (owned[draw.petId] ?? 0) + 1;
    wallet[kind] -= draws.length;
    this.owned.set(userId, owned);
    this.pulls.push(...draws.map((draw) => ({ userId, ...draw })));
    if (kind === "paid") this.paidPullCounts.set(userId, paidPulls);
  }
  async friends(userId) {
    return [...this.friendRows].filter((row) => row.startsWith(`${userId}:`)).map((row) => this.users.get(row.split(":")[1]));
  }
  saves = new Map();
  async cloudSave(userId) { return this.saves.get(userId) ?? null; }
  async putCloudSave(userId, data, baseVersion) {
    const current = this.saves.get(userId);
    if ((current?.version ?? 0) !== baseVersion) return null;
    this.saves.set(userId, { data, version: baseVersion + 1, updatedAt: "now" });
    return baseVersion + 1;
  }
  appleLinks = new Map();
  async linkApple(userId, sub) {
    if (this.appleLinks.has(sub)) return this.appleLinks.get(sub) === userId ? "already_linked" : "apple_in_use";
    if ([...this.appleLinks.values()].includes(userId)) return "account_has_other_apple";
    this.appleLinks.set(sub, userId);
    return "linked";
  }
  async userByApple(sub) { return this.appleLinks.get(sub) ?? null; }
  async appleLinked(userId) { return [...this.appleLinks.values()].includes(userId); }
  async rotateSecret(userId, hash) { this.hashes.set(userId, hash); }
  async updateProfile(userId, name, petId) { Object.assign(this.users.get(userId), { name, petId }); }
  async friendshipExists(userId, friendId) { return this.friendRows.has(`${userId}:${friendId}`); }
  async pendingRequestExists(fromId, toId) { return [...this.requests.values()].some((row) => row.fromId === fromId && row.toId === toId && row.status === "pending"); }
  async friendRequests(userId) { return [...this.requests.values()].filter((row) => row.toId === userId && row.status === "pending"); }
  async requestFriend(fromId, toId, id) { this.requests.set(id, { id, fromId, toId, status: "pending" }); }
  async answerFriendRequest(userId, requestId, answer) {
    const request = this.requests.get(requestId);
    if (!request || request.toId !== userId || request.status !== "pending") return false;
    request.status = answer;
    if (answer === "accepted") {
      this.friendRows.add(`${request.fromId}:${userId}`);
      this.friendRows.add(`${userId}:${request.fromId}`);
    }
    return true;
  }
  async event(eventId) { return this.events.get(eventId) ?? null; }
  async saveEventSteps(userId, eventId, day, cumulative) {
    const key = `${userId}:${eventId}:${day}`;
    this.steps.set(key, Math.max(this.steps.get(key) ?? 0, cumulative));
    return this.steps.get(key);
  }
  async eventStatus(eventId) {
    const rows = [...this.steps.entries()].filter(([key]) => key.split(":")[1] === eventId);
    return { totalCumulative: rows.reduce((sum, [, value]) => sum + value, 0), members: new Set(rows.map(([key]) => key.split(":")[0])).size };
  }
}

const env = {
  DB: {},
  APPLE_ROOT_CERTIFICATES: "test-root",
  APPLE_BUNDLE_ID: "com.example.mobidou",
  PRODUCT_CATALOG_JSON: JSON.stringify({ "plus.monthly": { plan: "plus", monthlyTickets: 10 }, "gacha.ticket": { paidPulls: 1 } }),
  GIFTS_JSON: JSON.stringify([{ id: "welcome", title: "Welcome", tickets: 4, freePulls: 1 }, { id: "paid-test", title: "Paid test", paidPulls: 1 }]),
  CATALOG_JSON: JSON.stringify([{ id: "mobby_sample_01", name: "Sample" }]),
  EVENT_STEPS_WINDOW_START: "20:00",
  EVENT_STEPS_DAILY_MAX: "100000"
};

const createContext = () => ({ store: new MemoryStore(), credentials: new Map() });
async function register(context, name = "Tester") {
  const response = await handleWithStore(new Request("https://server.test/auth/register", { method: "POST", body: JSON.stringify({ name }) }), env, context.store);
  assert.equal(response.status, 201);
  const data = await response.json();
  context.credentials.set(data.userId, `${data.userId}.${data.secret}`);
  return data;
}
function call(context, method, path, body, user = null, now, random) {
  const credential = user ? context.credentials.get(user) : null;
  return handleWithStore(new Request(`https://server.test${path}`, {
    method,
    ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    ...(credential ? { headers: { "content-type": "application/json", authorization: `Bearer ${credential}` }, body: body === undefined ? undefined : JSON.stringify(body) } : {})
  }), env, context.store, now, random);
}

function der(tag, content) {
  const bytes = Buffer.from(content);
  let length;
  if (bytes.length < 128) {
    length = Buffer.from([bytes.length]);
  } else {
    const encoded = [];
    let remaining = bytes.length;
    while (remaining > 0) { encoded.unshift(remaining & 0xff); remaining >>>= 8; }
    length = Buffer.from([0x80 | encoded.length, ...encoded]);
  }
  return Buffer.concat([Buffer.from([tag]), length, bytes]);
}
function sequence(...parts) { return der(0x30, Buffer.concat(parts)); }
function oid(value) {
  const arcs = value.split(".").map(Number);
  const bytes = [arcs[0] * 40 + arcs[1]];
  for (const arc of arcs.slice(2)) {
    let current = arc;
    const encoded = [current & 0x7f];
    current >>>= 7;
    while (current > 0) { encoded.unshift((current & 0x7f) | 0x80); current >>>= 7; }
    bytes.push(...encoded);
  }
  return der(0x06, bytes);
}
function integer(bytes) {
  let value = Buffer.from(bytes);
  while (value.length > 1 && value[0] === 0) value = value.subarray(1);
  if (value[0] & 0x80) value = Buffer.concat([Buffer.from([0]), value]);
  return der(0x02, value);
}
function ecdsaDerSignature(raw) { return sequence(integer(raw.subarray(0, 32)), integer(raw.subarray(32))); }
function timeValue(date) {
  return der(0x17, Buffer.from(date.toISOString().slice(2, 19).replace(/[-:T]/g, "") + "Z"));
}

async function createCertificate(subjectName, issuerName, publicKey, signingKey, serialNumber, isCa) {
  const spki = Buffer.from(await crypto.subtle.exportKey("spki", publicKey));
  const validity = sequence(timeValue(new Date("2025-01-01T00:00:00.000Z")), der(0x18, Buffer.from("20350101000000Z")));
  const signatureAlgorithm = sequence(oid("1.2.840.10045.4.3.2"));
  const basicConstraints = sequence(oid("2.5.29.19"), der(0x01, Buffer.from([0xff])), der(0x04, sequence(...(isCa ? [der(0x01, Buffer.from([0xff]))] : []))));
  const keyUsageBits = isCa ? Buffer.from([2, 4]) : Buffer.from([7, 0x80]);
  const keyUsage = [sequence(oid("2.5.29.15"), der(0x01, Buffer.from([0xff])), der(0x04, der(0x03, keyUsageBits)))];
  const extensions = der(0xa3, sequence(basicConstraints, ...keyUsage));
  const tbs = sequence(der(0xa0, der(0x02, Buffer.from([2]))), integer(Buffer.from([serialNumber])), signatureAlgorithm, issuerName, validity, subjectName, spki, extensions);
  const signature = Buffer.from(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, tbs));
  return sequence(tbs, signatureAlgorithm, der(0x03, Buffer.concat([Buffer.from([0]), ecdsaDerSignature(signature)])));
}

async function selfSignedTestRoot() {
  const rootPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const rootName = sequence(der(0x31, sequence(oid("2.5.4.3"), der(0x0c, Buffer.from("Self-Signed Test Root")))));
  const rootDer = await createCertificate(rootName, rootName, rootPair.publicKey, rootPair.privateKey, 1, true);
  const leafPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const leafName = sequence(der(0x31, sequence(oid("2.5.4.3"), der(0x0c, Buffer.from("StoreKit Test Signer")))));
  const leafDer = await createCertificate(leafName, rootName, leafPair.publicKey, rootPair.privateKey, 2, false);
  const pem = `-----BEGIN CERTIFICATE-----\n${rootDer.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END CERTIFICATE-----`;
  return { pair: leafPair, certificate: leafDer, pem };
}

async function signedTransaction(root, overrides = {}) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "ES256", x5c: [root.certificate.toString("base64")] });
  const payload = encode({ transactionId: "tx-001", originalTransactionId: "original-001", productId: "plus.monthly", bundleId: "com.example.mobidou", purchaseDate: Date.now(), expiresDate: Date.now() + 30 * 86400000, ...overrides });
  const data = `${header}.${payload}`;
  const signature = Buffer.from(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, root.pair.privateKey, Buffer.from(data))).toString("base64url");
  return `${data}.${signature}`;
}

test("health, static gifts, and catalog routes work", async () => {
  const context = createContext();
  assert.equal((await call(context, "GET", "/health")).status, 200);
  assert.equal((await (await call(context, "GET", "/gifts.json")).json()).length, 2);
  assert.equal((await (await call(context, "GET", "/catalog.json")).json())[0].id, "mobby_sample_01");
});

test("anonymous registration issues one secret and stores only its SHA-256 hash", async () => {
  const context = createContext();
  const account = await register(context);
  assert.match(account.userId, /^[0-9a-f-]{36}$/);
  assert.match(account.secret, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(context.store.hashes.get(account.userId), await hashSecret(account.secret));
  assert.notEqual(context.store.hashes.get(account.userId), account.secret);
  assert.equal((await call(context, "GET", "/friends", undefined, account.userId)).status, 200);
  assert.equal((await handleWithStore(new Request("https://server.test/friends"), env, context.store)).status, 401);
});

test("claiming the same gift twice grants tickets and free pulls once", async () => {
  const context = createContext();
  const account = await register(context);
  const first = await call(context, "POST", "/gifts/welcome/claim", {}, account.userId);
  const second = await call(context, "POST", "/gifts/welcome/claim", {}, account.userId);
  assert.deepEqual(await first.json(), { status: "claimed" });
  assert.deepEqual(await second.json(), { status: "already_claimed" });
  assert.equal(await context.store.ticketBalance(account.userId), 4);
  assert.equal((await context.store.wallet(account.userId)).free, 1);
});

test("monthly ticket grants are period-idempotent and insufficient consumes are rejected", async () => {
  const context = createContext();
  const account = await register(context);
  const period = "2026-09-30T00:00:00.000Z";
  assert.equal(await context.store.grantMonthlyTickets(account.userId, "plus", period, "2026-10-30T00:00:00.000Z", 10), true);
  assert.equal(await context.store.grantMonthlyTickets(account.userId, "plus", period, "2026-10-30T00:00:00.000Z", 10), false);
  assert.equal(await context.store.ticketBalance(account.userId), 10);
  const rejected = await call(context, "POST", "/tickets/consume", { amount: 11, requestId: "too-many" }, account.userId);
  assert.equal(rejected.status, 409);
  const consumed = await call(context, "POST", "/tickets/consume", { amount: 10, requestId: "one-time" }, account.userId);
  assert.equal(consumed.status, 200);
  assert.equal((await consumed.json()).remaining, 0);
});

test("StoreKit ES256 JWS verifies with the configured self-signed test root and purchase replay grants once", async () => {
  const root = await selfSignedTestRoot();
  const testEnv = { ...env, APPLE_ROOT_CERTIFICATES: root.pem };
  const jws = await signedTransaction(root, { appAccountToken: "verification-only" });
  const verified = await verifySignedTransaction(jws, testEnv);
  assert.equal(verified.transactionId, "tx-001");

  const context = createContext();
  const account = await register(context);
  const accountJws = await signedTransaction(root, { appAccountToken: account.userId });
  const first = await handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: accountJws })
  }), testEnv, context.store);
  const replay = await handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: accountJws })
  }), testEnv, context.store);
  assert.equal((await first.json()).status, "verified");
  assert.equal((await replay.json()).status, "already_processed");
  assert.equal(await context.store.ticketBalance(account.userId), 10);
});

test("tampered StoreKit JWS and unknown product are rejected", async () => {
  const root = await selfSignedTestRoot();
  const jws = await signedTransaction(root);
  const [protectedHeader, payload, signature] = jws.split(".");
  const changedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  await assert.rejects(() => verifySignedTransaction(`${protectedHeader}.${payload}.${changedSignature}`, { ...env, APPLE_ROOT_CERTIFICATES: root.pem }));
  const context = createContext();
  const account = await register(context);
  const unknown = await signedTransaction(root, { productId: "unconfigured" });
  const response = await handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ jws: unknown })
  }), { ...env, APPLE_ROOT_CERTIFICATES: root.pem }, context.store);
  assert.equal(response.status, 400);
});

test("purchase verification requires appAccountToken to match the authenticated user", async () => {
  const root = await selfSignedTestRoot();
  const testEnv = { ...env, APPLE_ROOT_CERTIFICATES: root.pem };
  const context = createContext();
  const alice = await register(context, "Alice");
  const bob = await register(context, "Bob");
  const missing = await signedTransaction(root, { transactionId: "tx-missing-token" });
  const mismatched = await signedTransaction(root, { transactionId: "tx-wrong-user", appAccountToken: bob.userId });
  assert.equal((await handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(alice.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: missing })
  }), testEnv, context.store)).status, 400);
  assert.equal((await handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(alice.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: mismatched })
  }), testEnv, context.store)).status, 403);
});

test("friend code request, acceptance, and friends list are wired", async () => {
  const context = createContext();
  const alice = await register(context, "Alice");
  const bob = await register(context, "Bob");
  const request = await call(context, "POST", "/friend-requests", { friendCode: bob.friendCode }, alice.userId);
  assert.equal(request.status, 201);
  const inbox = await call(context, "GET", "/friends", undefined, bob.userId);
  const incoming = (await inbox.json()).incomingRequests;
  assert.equal(incoming.length, 1);
  const answer = await call(context, "POST", `/friend-requests/${incoming[0].id}/answer`, { answer: "accepted" }, bob.userId);
  assert.equal(answer.status, 200);
  assert.equal((await (await call(context, "GET", "/friends", undefined, alice.userId)).json()).friends.length, 1);
});

test("gacha odds expose all Mobbies at equal rates and fixed random values reach both boundaries", async () => {
  const context = createContext();
  const account = await register(context);
  const odds = await (await call(context, "GET", "/gacha/odds")).json();
  assert.equal(odds.pets.length, 17);
  assert.equal(odds.paidPityInterval, PAID_PITY_INTERVAL);
  odds.pets.forEach((entry) => assert.equal(entry.rate, 1 / 17));
  context.store.walletRows.get(account.userId).paid = 2;
  const first = await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid" }, account.userId, undefined, () => 0);
  const last = await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid" }, account.userId, undefined, () => 0.999999);
  assert.equal((await first.json()).results[0].petId, GACHA_PET_IDS[0]);
  assert.equal((await last.json()).results[0].petId, GACHA_PET_IDS.at(-1));
});

test("starter and first-clear free pulls are each idempotent, and free five-pulls are rejected", async () => {
  const context = createContext();
  const account = await register(context);
  assert.equal((await call(context, "POST", "/pets/starter", { petId: "mobibou" }, account.userId)).status, 201);
  assert.equal((await call(context, "POST", "/pets/starter", { petId: "mobirin" }, account.userId)).status, 409);
  assert.equal((await call(context, "POST", "/pets/starter", { petId: "not-a-mobby" }, account.userId)).status, 400);
  assert.equal((await (await call(context, "POST", "/free-pulls/claim", { routeId: "route-a" }, account.userId)).json()).status, "claimed");
  assert.equal((await (await call(context, "POST", "/free-pulls/claim", { routeId: "route-a" }, account.userId)).json()).status, "already_claimed");
  assert.equal((await context.store.wallet(account.userId)).free, 1);
  assert.equal((await call(context, "POST", "/gacha/pull", { count: 5, kind: "free" }, account.userId)).status, 400);
});

test("free pulls do not advance paid pity and duplicate copies set isNew correctly", async () => {
  const context = createContext();
  const account = await register(context);
  await call(context, "POST", "/pets/starter", { petId: GACHA_PET_IDS[0] }, account.userId);
  await call(context, "POST", "/free-pulls/claim", { routeId: "route-a" }, account.userId);
  context.store.paidPullCounts.set(account.userId, 24);
  const response = await call(context, "POST", "/gacha/pull", { count: 1, kind: "free" }, account.userId, undefined, () => 0);
  const result = (await response.json()).results[0];
  assert.deepEqual(result, { petId: GACHA_PET_IDS[0], kind: "free", isNew: false, guaranteed: false });
  assert.equal((await context.store.wallet(account.userId)).paidPulls, 24);
  assert.equal((await context.store.ownedPets(account.userId))[GACHA_PET_IDS[0]], 2);
});

test("paid pull 25 and 50 guarantee an unowned Mobby while 24 and 26 do not", async () => {
  const context = createContext();
  const account = await register(context);
  const owned = Object.fromEntries(GACHA_PET_IDS.slice(0, -2).map((petId) => [petId, 1]));
  context.store.owned.set(account.userId, owned);
  context.store.walletRows.get(account.userId).paid = 4;
  context.store.paidPullCounts.set(account.userId, 23);
  const randomValues = [0, 0, 0, 0];
  const random = () => randomValues.shift() ?? 0;
  const at24 = (await (await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid" }, account.userId, undefined, random)).json()).results[0];
  const at25 = (await (await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid" }, account.userId, undefined, random)).json()).results[0];
  const at26 = (await (await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid" }, account.userId, undefined, random)).json()).results[0];
  assert.equal(at24.guaranteed, false);
  assert.equal(at25.guaranteed, true);
  assert.equal(at25.petId, GACHA_PET_IDS.at(-2));
  assert.equal(at26.guaranteed, false);
  context.store.walletRows.get(account.userId).paid = 1;
  context.store.paidPullCounts.set(account.userId, 49);
  const at50 = (await (await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid" }, account.userId, undefined, () => 0)).json()).results[0];
  assert.equal(at50.guaranteed, true);
  assert.equal(at50.petId, GACHA_PET_IDS.at(-1));
});

test("a pity pull falls back to the uniform pool when every Mobby is owned", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.owned.set(account.userId, Object.fromEntries(GACHA_PET_IDS.map((petId) => [petId, 1])));
  context.store.walletRows.get(account.userId).paid = 1;
  context.store.paidPullCounts.set(account.userId, 24);
  const result = (await (await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid" }, account.userId, undefined, () => 0)).json()).results[0];
  assert.deepEqual(result, { petId: GACHA_PET_IDS[0], kind: "paid", isNew: false, guaranteed: false });
});

test("a failed five-pull commits no balance, ownership, history, or paid-pity changes", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.walletRows.get(account.userId).paid = 5;
  context.store.paidPullCounts.set(account.userId, 22);
  context.store.failNextCommit = true;
  const response = await call(context, "POST", "/gacha/pull", { count: 5, kind: "paid" }, account.userId, undefined, () => 0);
  assert.equal(response.status, 409);
  assert.deepEqual(await context.store.wallet(account.userId), { paid: 5, free: 0, paidPulls: 22 });
  assert.deepEqual(await context.store.ownedPets(account.userId), {});
  assert.equal(context.store.pulls.length, 0);
});

test("event step submissions use Tokyo time and replace same-day cumulative values", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.events.set("autumn", { id: "autumn", name: "Autumn", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z", mapId: "map-a" });
  const now = new Date("2026-09-30T11:10:00.000Z"); // 20:10 JST
  const first = await call(context, "POST", "/events/autumn/steps", { cumulative: 500 }, account.userId, now);
  const second = await call(context, "POST", "/events/autumn/steps", { cumulative: 300 }, account.userId, now);
  assert.equal((await first.json()).cumulative, 500);
  assert.equal((await second.json()).cumulative, 500);
  const status = await call(context, "GET", "/events/autumn", undefined, account.userId, now);
  assert.equal((await status.json()).totalCumulative, 500);
  // 21:00 JST the same day still counts for 09-30.
  const evening = await call(context, "POST", "/events/autumn/steps", { cumulative: 900 }, account.userId, new Date("2026-09-30T12:00:00.000Z"));
  assert.deepEqual(await evening.json(), { day: "2026-09-30", cumulative: 900 });
});

test("event steps missed in the evening can be sent until 20:00 JST the next day", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.events.set("autumn", { id: "autumn", name: "Autumn", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z", mapId: "map-a" });
  const late = await call(context, "POST", "/events/autumn/steps", { cumulative: 700 }, account.userId, new Date("2026-09-30T10:59:00.000Z")); // 19:59 JST 09-30 -> belongs to 09-29
  assert.deepEqual(await late.json(), { day: "2026-09-29", cumulative: 700 });
  const morning = await call(context, "POST", "/events/autumn/steps", { cumulative: 800 }, account.userId, new Date("2026-09-30T15:30:00.000Z")); // 00:30 JST 10-01 -> belongs to 09-30
  assert.deepEqual(await morning.json(), { day: "2026-09-30", cumulative: 800 });
  const wrong = await call(context, "POST", "/events/autumn/steps", { cumulative: 999, day: "2026-10-01" }, account.userId, new Date("2026-09-30T15:30:00.000Z"));
  assert.equal(wrong.status, 409);
  assert.deepEqual(await wrong.json(), { error: "steps_day_mismatch", openDay: "2026-09-30" });
  const status = await call(context, "GET", "/events/autumn", undefined, account.userId, new Date("2026-09-30T15:30:00.000Z"));
  assert.equal((await status.json()).openDay, "2026-09-30");
  const nextWindow = await call(context, "POST", "/events/autumn/steps", { cumulative: 50 }, account.userId, new Date("2026-10-01T11:00:00.000Z")); // 20:00 JST 10-01 opens a new day
  assert.deepEqual(await nextWindow.json(), { day: "2026-10-01", cumulative: 50 });
});

test("Apple notification route validates its signed envelope and handles revocation", async () => {
  const root = await selfSignedTestRoot();
  const transaction = await signedTransaction(root, { revocationDate: Date.now() });
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "ES256", x5c: [root.certificate.toString("base64")] });
  const payload = encode({ notificationType: "REFUND", data: { bundleId: "com.example.mobidou", signedTransactionInfo: transaction } });
  const input = `${header}.${payload}`;
  const signature = Buffer.from(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, root.pair.privateKey, Buffer.from(input))).toString("base64url");
  const jws = `${input}.${signature}`;
  const context = createContext();
  const response = await handleWithStore(new Request("https://server.test/apple/notifications", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signedPayload: jws })
  }), { ...env, APPLE_ROOT_CERTIFICATES: root.pem }, context.store);
  assert.equal(response.status, 204);
});

test("Apple notification grants by the transaction appAccountToken, not a top-level value", async () => {
  const root = await selfSignedTestRoot();
  const context = createContext();
  const correct = await register(context, "Correct");
  const wrong = await register(context, "Wrong");
  const transaction = await signedTransaction(root, { transactionId: "notification-grant", appAccountToken: correct.userId });
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "ES256", x5c: [root.certificate.toString("base64")] });
  const payload = encode({
    notificationType: "DID_RENEW",
    appAccountToken: wrong.userId,
    data: { bundleId: "com.example.mobidou", signedTransactionInfo: transaction }
  });
  const input = `${header}.${payload}`;
  const signature = Buffer.from(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, root.pair.privateKey, Buffer.from(input))).toString("base64url");
  const response = await handleWithStore(new Request("https://server.test/apple/notifications", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signedPayload: `${input}.${signature}` })
  }), { ...env, APPLE_ROOT_CERTIFICATES: root.pem }, context.store);
  assert.equal(response.status, 204);
  assert.equal(await context.store.ticketBalance(correct.userId), 10);
  assert.equal(await context.store.ticketBalance(wrong.userId), 0);
});

test("registration allows five per minute from one address, then 429, and other addresses are unaffected", async () => {
  const store = new MemoryStore();
  const register = (ip, now) => handleWithStore(new Request("https://server.test/auth/register", { method: "POST", body: "{}", headers: { "CF-Connecting-IP": ip } }), env, store, now);
  const start = new Date("2026-10-03T12:00:10Z");
  for (let i = 0; i < 5; i++) assert.equal((await register("1.1.1.1", start)).status, 201);
  assert.equal((await register("1.1.1.1", start)).status, 429);
  assert.equal(store.users.size, 5);
  assert.equal((await register("2.2.2.2", start)).status, 201);
  assert.equal((await register("1.1.1.1", new Date("2026-10-03T12:01:10Z"))).status, 201);
});

test("registration is capped at 30 per day per address", async () => {
  const store = new MemoryStore();
  const register = (now) => handleWithStore(new Request("https://server.test/auth/register", { method: "POST", body: "{}", headers: { "CF-Connecting-IP": "3.3.3.3" } }), env, store, now);
  let refused = 0;
  for (let i = 0; i < 40; i++) if ((await register(new Date(Date.parse("2026-10-03T00:00:00Z") + i * 120_000))).status === 429) refused++;
  assert.equal(refused, 10);
});

test("CORS: preflight is answered and every response allows cross-origin callers", async () => {
  const store = new MemoryStore();
  const preflight = await handleWithStore(new Request("https://server.test/pets/starter", { method: "OPTIONS", headers: { Origin: "http://localhost:8096" } }), env, store);
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get("access-control-allow-headers"), /authorization/);
  const refused = await handleWithStore(new Request("https://server.test/nope"), env, store);
  assert.equal(refused.status, 401);
  assert.equal(refused.headers.get("access-control-allow-origin"), "*");
});

test("pets/sync raises owned copies without lowering them, ignores unknown pets, and feeds the paid-pull guarantee", async () => {
  const context = createContext();
  const account = await register(context);
  const [first, second] = GACHA_PET_IDS;
  const synced = await call(context, "POST", "/pets/sync", { owned: { [first]: 2, "not-a-pet": 5 } }, account.userId);
  assert.equal(synced.status, 200);
  assert.deepEqual((await synced.json()).owned, { [first]: 2 });
  const lowered = await call(context, "POST", "/pets/sync", { owned: { [first]: 1, [second]: 1 } }, account.userId);
  assert.deepEqual((await lowered.json()).owned, { [first]: 2, [second]: 1 });
  assert.equal((await call(context, "POST", "/pets/sync", { owned: { [first]: 0 } }, account.userId)).status, 400);
  assert.equal((await call(context, "POST", "/pets/sync", { owned: [] }, account.userId)).status, 400);
  assert.equal((await call(context, "POST", "/pets/sync", { owned: {} })).status, 401);
});

test("GET /wallet reports the balances of the signed-in user", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.walletRows.get(account.userId).paid = 3;
  const response = await call(context, "GET", "/wallet", undefined, account.userId);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { paid: 3, free: 0, paidPulls: 0 });
});

test("monthly spending cap by age group: set once, can be lowered but not raised, counted per Tokyo month", async () => {
  const context = createContext();
  const account = await register(context);
  const priced = { ...env, PRODUCT_CATALOG_JSON: JSON.stringify({ "gacha.ticket": { paidPulls: 1, priceYen: 300 }, "gacha.five": { paidPulls: 5, priceYen: 1200 } }) };
  const limits = async (now) => (await handleWithStore(new Request("https://server.test/limits", { headers: { authorization: "Bearer " + context.credentials.get(account.userId) } }), priced, context.store, now)).json();
  const setGroup = (ageGroup) => call(context, "POST", "/profile/age-group", { ageGroup }, account.userId);
  const october = new Date("2026-10-15T03:00:00Z");

  assert.deepEqual(await limits(october), { ageGroup: null, capYen: 5000, spentYen: 0, remainingYen: 5000 });
  assert.equal((await setGroup("teenager")).status, 400);
  assert.equal((await setGroup("16to19")).status, 200);
  assert.equal((await limits(october)).capYen, 10000);
  assert.equal((await setGroup("adult")).status, 409);
  assert.equal((await setGroup("under16")).status, 200);

  for (const [id, productId, purchaseDate] of [["t1", "gacha.five", "2026-10-02T00:00:00Z"], ["t2", "gacha.ticket", "2026-10-10T00:00:00Z"], ["t3", "gacha.five", "2026-09-30T14:59:00Z"], ["t4", "gacha.five", "2026-11-01T00:00:00Z"]]) {
    await context.store.recordPurchase(account.userId, { transactionId: id, productId, purchaseDate: Date.parse(purchaseDate) }, { paidPulls: 1 });
  }
  // 2026-09-30T14:59Z is 23:59 on 30 September in Tokyo; 2026-11-01T00:00Z is 09:00 on 1 November.
  assert.deepEqual(await limits(october), { ageGroup: "under16", capYen: 5000, spentYen: 1500, remainingYen: 3500 });

  assert.equal((await setGroup("adult")).status, 409);
  context.store.ageGroups.set(account.userId, "adult");
  assert.deepEqual(await limits(october), { ageGroup: "adult", capYen: null, spentYen: 1500, remainingYen: null });
});

test("profile: a short name and a known main Mobby are saved and read back; bad input is refused", async () => {
  const context = createContext();
  const account = await register(context);
  const [pet] = GACHA_PET_IDS;
  assert.equal((await call(context, "POST", "/profile", { name: "", petId: pet }, account.userId)).status, 400);
  assert.equal((await call(context, "POST", "/profile", { name: "あ".repeat(13), petId: pet }, account.userId)).status, 400);
  assert.equal((await call(context, "POST", "/profile", { name: "bad" + String.fromCharCode(7), petId: pet }, account.userId)).status, 400);
  assert.equal((await call(context, "POST", "/profile", { name: "はる", petId: "not-a-pet" }, account.userId)).status, 400);
  assert.equal((await call(context, "POST", "/profile", { name: "  はる  ", petId: pet }, account.userId)).status, 200);
  assert.deepEqual(await (await call(context, "GET", "/profile", undefined, account.userId)).json(), { name: "はる", petId: pet, friendCode: account.friendCode, appleLinked: false });
  assert.equal((await call(context, "GET", "/profile")).status, 401);
});

test("friends by code: needs a profile, accepts hyphens and lower case, and refuses duplicates", async () => {
  const context = createContext();
  const ann = await register(context, "");
  const ben = await register(context, "");
  const [pet] = GACHA_PET_IDS;
  await call(context, "POST", "/profile", { name: "ベン", petId: pet }, ben.userId);

  const ask = (user, code) => call(context, "POST", "/friend-requests", { friendCode: code }, user.userId);
  const spaced = ben.friendCode.slice(0, 5) + "-" + ben.friendCode.slice(5).toLowerCase();
  assert.equal((await ask(ann, spaced)).status, 400, "no name yet");
  await call(context, "POST", "/profile", { name: "アン", petId: pet }, ann.userId);
  assert.equal((await ask(ann, "ZZZZZZZZZZ")).status, 404);
  assert.equal((await ask(ann, ann.friendCode)).status, 400, "cannot add yourself");
  assert.equal((await ask(ann, spaced)).status, 201);
  assert.equal((await ask(ann, ben.friendCode)).status, 409, "already requested");
  assert.equal((await ask(ben, ann.friendCode)).status, 409, "they already asked");

  const inbox = (await (await call(context, "GET", "/friends", undefined, ben.userId)).json()).incomingRequests;
  assert.equal(inbox.length, 1);
  assert.equal((await call(context, "POST", "/friend-requests/" + inbox[0].id + "/answer", { answer: "accepted" }, ben.userId)).status, 200);
  assert.equal((await ask(ann, ben.friendCode)).status, 409, "already friends");
  const friends = (await (await call(context, "GET", "/friends", undefined, ann.userId)).json()).friends;
  assert.equal(friends.length, 1);
});

test("the invite link page shows only the code, and only for a well-formed code", async () => {
  const context = createContext();
  const page = await call(context, "GET", "/f/ABCDEFGH23");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  const html = await page.text();
  assert.match(html, /ABCDEFGH23/);
  assert.match(html, /mobidou:\/\/friend\?code=ABCDEFGH23/);
  assert.equal((await call(context, "GET", "/f/short")).status, 401);
  assert.equal((await call(context, "GET", "/f/abcdefgh23")).status, 401);
  assert.equal((await call(context, "GET", "/f/ABCDEFGH23" + "<script>")).status, 401);
});

async function appleFixture() {
  const pair = await webcrypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await webcrypto.subtle.exportKey("jwk", pair.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
  const b64 = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
  const token = async (claims = {}, options = {}) => {
    const header = b64({ alg: options.alg ?? "RS256", kid: options.kid ?? "test-key" });
    const payload = b64({ iss: "https://appleid.apple.com", aud: env.APPLE_BUNDLE_ID, exp: Math.floor(Date.now() / 1000) + 600, sub: "apple-person-1", ...claims });
    const signature = Buffer.from(await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5", options.signWith ?? pair.privateKey, Buffer.from(header + "." + payload))).toString("base64url");
    return header + "." + payload + "." + signature;
  };
  return { token, appleEnv: { ...env, APPLE_JWKS_JSON: JSON.stringify({ keys: [jwk] }) }, otherPair: await webcrypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]) };
}

test("Apple identity tokens: only a genuine, current token addressed to this app is accepted", async () => {
  const { verifyAppleIdentityToken } = await import("../src/crypto.ts");
  const { token, appleEnv, otherPair } = await appleFixture();
  assert.deepEqual(await verifyAppleIdentityToken(await token(), appleEnv), { sub: "apple-person-1" });
  await assert.rejects(verifyAppleIdentityToken(await token({ aud: "com.other.app" }), appleEnv), /another app/);
  await assert.rejects(verifyAppleIdentityToken(await token({ iss: "https://evil.example" }), appleEnv), /issuer/);
  await assert.rejects(verifyAppleIdentityToken(await token({ exp: Math.floor(Date.now() / 1000) - 3600 }), appleEnv), /expired/);
  await assert.rejects(verifyAppleIdentityToken(await token({}, { signWith: otherPair.privateKey }), appleEnv), /signature/);
  await assert.rejects(verifyAppleIdentityToken(await token({}, { kid: "unknown" }), appleEnv), /Unknown signing key/);
  await assert.rejects(verifyAppleIdentityToken(await token({}, { alg: "HS256" }), appleEnv), /Unsupported/);
  await assert.rejects(verifyAppleIdentityToken("not.a", appleEnv), /Malformed/);
});

test("Apple sign-in: link once, then a new device takes the account over and the old device is signed out", async () => {
  const context = createContext();
  const { token, appleEnv } = await appleFixture();
  const withApple = (path, body, user) => handleWithStore(new Request("https://server.test" + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(user ? { authorization: "Bearer " + context.credentials.get(user) } : {}) },
    body: JSON.stringify(body)
  }), appleEnv, context.store);

  const first = await register(context);
  assert.equal((await withApple("/account/apple/link", { identityToken: "garbage" }, first.userId)).status, 401);
  assert.equal((await withApple("/account/apple/link", { identityToken: await token() }, first.userId)).status, 200);
  assert.equal((await (await withApple("/account/apple/link", { identityToken: await token() }, first.userId)).json()).status, "already_linked");
  assert.equal((await (await call(context, "GET", "/profile", undefined, first.userId)).json()).appleLinked, true);

  // Another anonymous account cannot claim the same Apple ID, and this account cannot take a second one.
  const stranger = await register(context);
  assert.equal((await withApple("/account/apple/link", { identityToken: await token() }, stranger.userId)).status, 409);
  assert.equal((await withApple("/account/apple/link", { identityToken: await token({ sub: "apple-person-2" }) }, first.userId)).status, 409);

  // A new device signs in with Apple and receives the same account with a fresh secret.
  assert.equal((await withApple("/auth/apple", { identityToken: await token({ sub: "nobody" }) })).status, 404);
  assert.equal((await withApple("/auth/apple", { identityToken: "garbage" })).status, 401);
  const restored = await (await withApple("/auth/apple", { identityToken: await token() })).json();
  assert.equal(restored.userId, first.userId);
  assert.equal(restored.friendCode, first.friendCode);
  context.credentials.set("new-device", restored.userId + "." + restored.secret);
  assert.equal((await call(context, "GET", "/profile", undefined, "new-device")).status, 200);
  assert.equal((await call(context, "GET", "/profile", undefined, first.userId)).status, 401, "the old device is signed out");
});

test("cloud save: only for Apple-linked accounts, versioned so a stale device cannot overwrite a newer record", async () => {
  const context = createContext();
  const { token, appleEnv } = await appleFixture();
  const send = (method, path, body, user) => handleWithStore(new Request("https://server.test" + path, {
    method,
    headers: { "content-type": "application/json", ...(user ? { authorization: "Bearer " + context.credentials.get(user) } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  }), appleEnv, context.store);
  const account = await register(context);

  assert.equal((await send("GET", "/save", undefined, account.userId)).status, 403, "not linked yet");
  assert.equal((await send("POST", "/save", { data: "{}", baseVersion: 0 }, account.userId)).status, 403);
  assert.equal((await send("POST", "/account/apple/link", { identityToken: await token() }, account.userId)).status, 200);

  assert.equal((await send("GET", "/save", undefined, account.userId)).status, 404, "nothing saved yet");
  assert.equal((await send("POST", "/save", { data: "x", baseVersion: 0 }, account.userId)).status, 400);
  assert.equal((await send("POST", "/save", { data: "{}", baseVersion: -1 }, account.userId)).status, 400);
  assert.equal((await send("POST", "/save", { data: "{" + "a".repeat(200_001) + "}", baseVersion: 0 }, account.userId)).status, 413);

  const first = await (await send("POST", "/save", { data: "{\"steps\":1}", baseVersion: 0 }, account.userId)).json();
  assert.deepEqual(first, { version: 1 });
  assert.equal((await send("POST", "/save", { data: "{\"steps\":0}", baseVersion: 0 }, account.userId)).status, 409, "a device that never saw version 1");
  const second = await (await send("POST", "/save", { data: "{\"steps\":2}", baseVersion: 1 }, account.userId)).json();
  assert.deepEqual(second, { version: 2 });
  const read = await (await send("GET", "/save", undefined, account.userId)).json();
  assert.equal(read.data, "{\"steps\":2}");
  assert.equal(read.version, 2);
  assert.equal((await send("GET", "/save")).status, 401);
});
