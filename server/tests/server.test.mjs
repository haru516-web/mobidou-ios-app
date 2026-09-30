import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { handleWithStore } from "../src/worker.ts";
import { hashSecret, verifySignedTransaction } from "../src/crypto.ts";

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
  pity = new Map();

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
    const wallet = this.walletRows.get(userId);
    wallet.paid += product.paidPulls ?? 0;
    if (product.plan && product.monthlyTickets && transaction.expiresDate) {
      await this.grantMonthlyTickets(userId, product.plan, new Date(transaction.purchaseDate).toISOString(), new Date(transaction.expiresDate).toISOString(), product.monthlyTickets);
    } else if (product.monthlyTickets) {
      this.tickets.push({ userId, amount: product.monthlyTickets, reason: "purchase", ref: transaction.transactionId });
    }
    return true;
  }
  async revokePurchase(transactionId) { this.purchases.delete(transactionId); }
  async wallet(userId, poolId) { return { ...this.walletRows.get(userId), pity: this.pity.get(`${userId}:${poolId}`) ?? 0 }; }
  async commitDraws(userId, poolId, draws, freeSpent, paidSpent, pity) {
    const wallet = this.walletRows.get(userId);
    if (wallet.free < freeSpent || wallet.paid < paidSpent) throw new Error("insufficient balance");
    wallet.free -= freeSpent;
    wallet.paid -= paidSpent;
    this.pulls.push(...draws.map((draw) => ({ userId, poolId, ...draw })));
    this.pity.set(`${userId}:${poolId}`, pity);
  }
  async friends(userId) {
    return [...this.friendRows].filter((row) => row.startsWith(`${userId}:`)).map((row) => this.users.get(row.split(":")[1]));
  }
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
  EVENT_STEPS_WINDOW_END: "20:30",
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
function call(context, method, path, body, user = null, now) {
  const credential = user ? context.credentials.get(user) : null;
  return handleWithStore(new Request(`https://server.test${path}`, {
    method,
    ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    ...(credential ? { headers: { "content-type": "application/json", authorization: `Bearer ${credential}` }, body: body === undefined ? undefined : JSON.stringify(body) } : {})
  }), env, context.store, now);
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
  assert.equal((await context.store.wallet(account.userId, "standard")).free, 1);
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
  const jws = await signedTransaction(root);
  const verified = await verifySignedTransaction(jws, testEnv);
  assert.equal(verified.transactionId, "tx-001");

  const context = createContext();
  const account = await register(context);
  const first = await handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: jws })
  }), testEnv, context.store);
  const replay = await handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: jws })
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

test("gacha spends free balance separately from paid balance", async () => {
  const context = createContext();
  const account = await register(context);
  await call(context, "POST", "/gifts/paid-test/claim", {}, account.userId);
  await call(context, "POST", "/gifts/welcome/claim", {}, account.userId);
  const pull = await call(context, "POST", "/gacha/pull", { pool: "standard", count: 1 }, account.userId);
  assert.equal(pull.status, 200);
  assert.equal((await pull.json()).freeCount, 1);
  const afterFree = await context.store.wallet(account.userId, "standard");
  assert.deepEqual({ paid: afterFree.paid, free: afterFree.free }, { paid: 1, free: 0 });
  assert.ok(Number.isInteger(afterFree.pity));
  const paidPull = await call(context, "POST", "/gacha/pull", { pool: "standard", count: 1 }, account.userId);
  assert.equal(paidPull.status, 200);
  assert.equal((await paidPull.json()).paidCount, 1);
  const afterPaid = await context.store.wallet(account.userId, "standard");
  assert.deepEqual({ paid: afterPaid.paid, free: afterPaid.free }, { paid: 0, free: 0 });
  assert.ok(Number.isInteger(afterPaid.pity));
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
  const outside = await call(context, "POST", "/events/autumn/steps", { cumulative: 900 }, account.userId, new Date("2026-09-30T12:00:00.000Z"));
  assert.equal(outside.status, 409);
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
