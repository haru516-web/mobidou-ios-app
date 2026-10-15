import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { handleWithStore } from "../src/worker.ts";
import { createExpoNotifier } from "../src/push.ts";
import { hashSecret, verifySignedTransaction } from "../src/crypto.ts";
import { GACHA_PET_IDS } from "../src/config/gacha.ts";

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
  async hitRateLimit(key, window, windowMs) {
    if (!Number.isFinite(windowMs)) throw new Error("hitRateLimit needs the length of the window");
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
  revokedIds = new Set();
  async isRevoked(transactionId) { return this.revokedIds.has(transactionId); }
  pushRows = new Map();
  pushSentKeys = new Set();
  async savePushToken(userId, token, prefs) { this.pushRows.set(token, { userId, ...prefs }); }
  async removePushToken(token, userId) { if (!userId || this.pushRows.get(token)?.userId === userId) this.pushRows.delete(token); }
  async pushTokens(userIds, category) { return [...this.pushRows].filter(([, row]) => userIds.includes(row.userId) && row[category]).map(([token]) => token); }
  async markPushSent(key) { if (this.pushSentKeys.has(key)) return false; this.pushSentKeys.add(key); return true; }
  async recordPurchase(userId, transaction, product) {
    if (this.purchases.has(transaction.transactionId) || this.revokedIds.has(transaction.transactionId)) return false;
    this.purchases.set(transaction.transactionId, userId);
    this.purchaseLog.push({ id: transaction.transactionId, userId, productId: transaction.productId, at: new Date(transaction.purchaseDate).toISOString() });
    const wallet = this.walletRows.get(userId);
    const pulls = product.paidPulls ?? 0;
    const owed = this.refundDebts.get(userId) ?? 0;
    const paidOff = Math.min(pulls, owed);
    this.refundDebts.set(userId, owed - paidOff);
    wallet.paid += pulls - paidOff;
    if (product.plan && product.monthlyTickets && transaction.expiresDate) {
      await this.grantMonthlyTickets(userId, product.plan, new Date(transaction.purchaseDate).toISOString(), new Date(transaction.expiresDate).toISOString(), product.monthlyTickets);
    } else if (product.monthlyTickets) {
      this.tickets.push({ userId, amount: product.monthlyTickets, reason: "purchase", ref: transaction.transactionId });
    }
    return true;
  }
  planPeriods = [];
  async recordPlanPeriod(userId, plan, periodStart, periodEnd, pulls, transactionId) {
    if (!this.planPeriods.some((row) => row.userId === userId && row.plan === plan && row.periodStart === periodStart)) this.planPeriods.push({ userId, plan, periodStart, periodEnd });
    const ref = `plan:${transactionId}`;
    if (pulls > 0 && !this.planCredits?.has(ref)) { (this.planCredits ??= new Set()).add(ref); this.walletRows.get(userId).paid += pulls; }
  }
  async activePlan(userId, at) {
    return this.planPeriods.find((row) => row.userId === userId && row.periodStart <= at && row.periodEnd > at)?.plan ?? null;
  }
  refundDebts = new Map();
  refunded = new Set();
  shortfalls = [];
  async refundShortfalls(userId, since) { return this.shortfalls.filter((entry) => entry.userId === userId && entry.at >= since).length; }
  async revokePurchase(transactionId, paidPulls = 0) {
    this.revokedIds.add(transactionId);
    const userId = this.purchases.get(transactionId);
    this.purchases.delete(transactionId);
    this.purchaseLog = this.purchaseLog.filter((entry) => entry.id !== transactionId);
    if (!userId || !paidPulls || this.refunded.has(transactionId)) return;
    this.refunded.add(transactionId);
    const wallet = this.walletRows.get(userId);
    const taken = Math.min(paidPulls, wallet.paid);
    wallet.paid -= taken;
    if (taken < paidPulls) this.shortfalls.push({ userId, at: new Date().toISOString() });
  }
  purchaseLog = [];
  ageGroups = new Map();
  async ageGroup(userId) { return this.ageGroups.get(userId) ?? null; }
  async setAgeGroup(userId, group) { this.ageGroups.set(userId, group); }
  async purchasedProducts(userId, from, to) { return this.purchaseLog.filter((entry) => entry.userId === userId && entry.at >= from && entry.at < to).map((entry) => entry.productId); }
  async wallet(userId) { return { ...this.walletRows.get(userId), paidPulls: this.paidPullCounts.get(userId) ?? 0, refundDebt: this.refundDebts.get(userId) ?? 0 }; }
  async ownedPets(userId) { return { ...(this.owned.get(userId) ?? {}) }; }
  async chooseStarter(userId, petId) {
    const owned = this.owned.get(userId) ?? {};
    if (Object.keys(owned).length > 0) return false;
    this.owned.set(userId, { [petId]: 1 });
    return true;
  }
  async claimFreePull(userId, routeId) {
    const key = `${userId}:${routeId}`;
    if (this.freePullClaims.has(key)) return false;
    this.freePullClaims.add(key);
    this.walletRows.get(userId).free += 1;
    return true;
  }
  ops = new Map();
  async gachaOp(userId, opId) { return this.ops.get(`${userId}:${opId}`) ?? null; }
  async commitDraws(userId, draws, kind, paidPulls, options = {}) {
    if (this.failNextCommit) { this.failNextCommit = false; throw new Error("simulated transaction failure"); }
    if (kind === "paid" && options.previousPaidPulls !== undefined && (this.paidPullCounts.get(userId) ?? 0) !== options.previousPaidPulls) throw new Error("paid pull count moved on");
    if (options.opId && this.ops.has(`${userId}:${options.opId}`)) throw new Error("operation already recorded");
    const wallet = this.walletRows.get(userId);
    if (wallet[kind] < draws.length) throw new Error("insufficient balance");
    const owned = { ...(this.owned.get(userId) ?? {}) };
    for (const draw of draws) owned[draw.petId] = (owned[draw.petId] ?? 0) + 1;
    wallet[kind] -= draws.length;
    this.owned.set(userId, owned);
    this.pulls.push(...draws.map((draw) => ({ userId, ...draw })));
    if (kind === "paid") this.paidPullCounts.set(userId, paidPulls);
    if (options.opId && options.result) this.ops.set(`${userId}:${options.opId}`, options.result);
  }
  async friends(userId) {
    return [...this.friendRows].filter((row) => row.startsWith(`${userId}:`)).map((row) => this.users.get(row.split(":")[1]));
  }
  async deleteUser(userId) {
    this.users.delete(userId);
    this.hashes.delete(userId);
    this.walletRows.delete(userId);
    this.owned.delete(userId);
    this.saves.delete(userId);
    this.ageGroups.delete(userId);
    for (const [sub, id] of [...this.appleLinks]) if (id === userId) this.appleLinks.delete(sub);
    for (const row of [...this.friendRows]) if (row.split(":").includes(userId)) this.friendRows.delete(row);
    for (const [id, row] of [...this.requests]) if (row.fromId === userId || row.toId === userId) this.requests.delete(id);
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
  blocks = new Set();
  async purgeExpired() { return { rateLimitsRemoved: 0, rateLimitsRemaining: 0, expiredLeft: 0, oldestExpiredAgeMs: 0, reachedLimit: false }; }
  reports = [];
  async blockedEither(a, b) { return this.blocks.has(`${a}:${b}`) || this.blocks.has(`${b}:${a}`); }
  async blockUser(blockerId, blockedId) {
    this.blocks.add(`${blockerId}:${blockedId}`);
    this.friendRows.delete(`${blockerId}:${blockedId}`);
    this.friendRows.delete(`${blockedId}:${blockerId}`);
    for (const [id, row] of [...this.requests]) if ((row.fromId === blockerId && row.toId === blockedId) || (row.fromId === blockedId && row.toId === blockerId)) this.requests.delete(id);
  }
  async unblockUser(blockerId, blockedId) { this.blocks.delete(`${blockerId}:${blockedId}`); }
  async blockedUsers(userId) {
    return [...this.blocks].filter((key) => key.startsWith(`${userId}:`)).map((key) => { const user = this.users.get(key.split(":")[1]); return { id: user.id, name: user.name ?? "もびさん", petId: user.petId ?? null }; });
  }
  async reportUser(reporterId, reportedId, reason, note, id) { this.reports.push({ id, reporterId, reportedId, reason, note }); }
  async eventTeamMemberIdsByCode(eventId, code) {
    return [...this.teams.values()].find((team) => team.eventId === eventId && team.code === code)?.members ?? [];
  }
  refreshTokens = new Map();
  async appleRefreshToken(userId) { return this.refreshTokens.get(userId) ?? null; }
  async setAppleRefreshToken(userId, token) { this.refreshTokens.set(userId, token); }
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
  teams = new Map(); // teamId -> { id, eventId, code, status, members: [userId] (in joining order) }
  eventClaims = new Set();
  teamOf(userId, eventId) { return [...this.teams.values()].find((team) => team.eventId === eventId && team.members.includes(userId)) ?? null; }
  stepsOf(userId, eventId) {
    return [...this.steps.entries()].filter(([key]) => key.startsWith(`${userId}:${eventId}:`)).reduce((sum, [, value]) => sum + value, 0);
  }
  async eventTeam(userId, eventId) {
    const team = this.teamOf(userId, eventId);
    if (!team) return null;
    const members = team.members.map((id) => (id !== userId && (this.blocks.has(`${userId}:${id}`) || this.blocks.has(`${id}:${userId}`)))
      ? { id, name: "非表示のメンバー", petId: null, steps: this.stepsOf(id, eventId) }
      : { id, name: this.users.get(id)?.name ?? "もびさん", petId: this.users.get(id)?.petId ?? null, steps: this.stepsOf(id, eventId) });
    return { id: team.id, code: team.code, status: team.status, creatorId: team.members[0], members, startedAt: team.status === "recruiting" ? null : "2026-09-30T00:00:00.000Z", claimed: this.eventClaims.has(`${userId}:${eventId}`) };
  }
  async createEventTeam(userId, eventId, teamId, code) {
    if (this.teamOf(userId, eventId)) return "already_member";
    if ([...this.teams.values()].some((team) => team.eventId === eventId && team.code === code)) return "code_taken";
    this.teams.set(teamId, { id: teamId, eventId, code, status: "recruiting", members: [userId] });
    return "ok";
  }
  async joinEventTeam(userId, eventId, code, maxMembers) {
    const team = [...this.teams.values()].find((row) => row.eventId === eventId && row.code === code);
    if (!team) return "not_found";
    if (this.teamOf(userId, eventId)) return "already_member";
    if (team.status !== "recruiting") return "already_started";
    if (team.members.length >= maxMembers) return "full";
    team.members.push(userId);
    return "ok";
  }
  joinRequests = new Map();
  async requestJoinEventTeam(userId, eventId, code, maxMembers) {
    const team = [...this.teams.values()].find((row) => row.eventId === eventId && row.code === code);
    if (!team) return { result: "not_found" };
    if (this.teamOf(userId, eventId)) return { result: "already_member" };
    const open = [...this.joinRequests.values()].find((row) => row.eventId === eventId && row.userId === userId);
    if (open) return open.teamId === team.id ? { result: "already_requested", request: { id: open.id } } : { result: "request_pending" };
    if (team.members.length >= maxMembers) return { result: "full" };
    const id = `req-${this.joinRequests.size + 1}-${userId}`;
    this.joinRequests.set(id, { id, eventId, teamId: team.id, userId });
    return { result: "ok", request: { id } };
  }
  async eventJoinRequests(creatorId, eventId) {
    const team = this.teamOf(creatorId, eventId);
    if (!team || team.members[0] !== creatorId) return [];
    return [...this.joinRequests.values()].filter((row) => row.teamId === team.id && !this.blocks.has(`${creatorId}:${row.userId}`) && !this.blocks.has(`${row.userId}:${creatorId}`))
      .map((row) => ({ id: row.id, userId: row.userId, name: this.users.get(row.userId)?.name ?? "もびさん", petId: this.users.get(row.userId)?.petId ?? null }));
  }
  async pendingJoinRequest(userId, eventId) {
    const row = [...this.joinRequests.values()].find((entry) => entry.eventId === eventId && entry.userId === userId);
    if (!row) return null;
    const team = this.teams.get(row.teamId);
    return { id: row.id, creatorName: this.users.get(team?.members[0])?.name ?? "もびさん" };
  }
  async answerJoinRequest(creatorId, eventId, requestId, accept, maxMembers, minMembers) {
    const row = this.joinRequests.get(requestId);
    if (!row || row.eventId !== eventId) return { result: "not_found" };
    const team = this.teams.get(row.teamId);
    if (!team || team.members[0] !== creatorId) return { result: "not_creator" };
    this.joinRequests.delete(requestId);
    if (accept && team.members.some((id) => this.blocks.has(`${id}:${row.userId}`) || this.blocks.has(`${row.userId}:${id}`))) return { result: "declined", requesterId: row.userId };
    if (!accept) return { result: "declined", requesterId: row.userId };
    if (team.members.length >= maxMembers || this.teamOf(row.userId, eventId)) return { result: "full" };
    team.members.push(row.userId);
    if (team.status === "recruiting" && team.members.length >= minMembers) team.status = "active";
    if (team.members.length >= maxMembers) for (const [id, other] of [...this.joinRequests]) if (other.teamId === team.id) this.joinRequests.delete(id);
    return { result: "accepted", requesterId: row.userId };
  }
  async cancelJoinRequest(userId, eventId) {
    const row = [...this.joinRequests.values()].find((entry) => entry.eventId === eventId && entry.userId === userId);
    if (!row) return false;
    this.joinRequests.delete(row.id);
    return true;
  }
  async startEventTeam(userId, eventId, minMembers) {
    const team = this.teamOf(userId, eventId);
    if (!team) return "no_team";
    if (team.status !== "recruiting") return "not_recruiting";
    if (team.members[0] !== userId) return "not_creator";
    if (team.members.length < minMembers) return "too_few";
    team.status = "active";
    return "ok";
  }
  async leaveEventTeam(userId, eventId) {
    const team = this.teamOf(userId, eventId);
    if (!team) return "no_team";
    if (team.status !== "recruiting") return "already_started";
    team.members = team.members.filter((id) => id !== userId);
    if (team.members.length === 0) { this.teams.delete(team.id); for (const [id, row] of [...this.joinRequests]) if (row.teamId === team.id) this.joinRequests.delete(id); }
    return "ok";
  }
  async claimEvent(userId, eventId) {
    const key = `${userId}:${eventId}`;
    if (this.eventClaims.has(key)) return false;
    this.eventClaims.add(key);
    return true;
  }
  async makeFriends(userId, otherId) {
    this.friendRows.add(`${userId}:${otherId}`);
    this.friendRows.add(`${otherId}:${userId}`);
  }
}

const env = {
  DB: {},
  APPLE_ROOT_CERTIFICATES: "test-root",
  APPLE_BUNDLE_ID: "com.example.mobidou",
  PRODUCT_CATALOG_JSON: JSON.stringify({ "plus.monthly": { plan: "plus", monthlyTickets: 10 }, "plus.pulls": { plan: "plus", monthlyPulls: 1 }, "gacha.ticket": { paidPulls: 1 } }),
  GIFTS_JSON: JSON.stringify([{ id: "welcome", title: "Welcome", tickets: 4, freePulls: 1 }, { id: "paid-test", title: "Paid test", paidPulls: 1 }]),
  CATALOG_JSON: JSON.stringify([{ id: "mobby_sample_01", name: "Sample" }]),
  EVENT_STEPS_WINDOW_START: "20:00",
  EVENT_STEPS_DAILY_MAX: "100000"
};

const createContext = () => ({ store: new MemoryStore(), credentials: new Map() });
const EVENT_WINDOW_NOW = new Date("2026-09-30T11:10:00.000Z");
/** The player makes a team, a second player asks to join and is accepted: that sets the team out. */
async function setOut(context, account, eventId) {
  await call(context, "POST", `/profile`, { name: "Tester" }, account.userId);
  const created = await call(context, "POST", `/events/${eventId}/teams`, {}, account.userId, EVENT_WINDOW_NOW);
  assert.equal(created.status, 201);
  const code = (await created.json()).team.code;
  const helper = await register(context, "Helper");
  await call(context, "POST", `/profile`, { name: "Helper" }, helper.userId);
  const answered = await joinAndApprove(context, eventId, code, helper, account);
  assert.equal(answered.status, 200);
}
/** Asks to join with the code, then the maker accepts. Returns the maker's answer. */
async function joinAndApprove(context, eventId, code, joiner, maker, now = EVENT_WINDOW_NOW) {
  const asked = await call(context, "POST", `/events/${eventId}/teams/join`, { code }, joiner.userId, now);
  assert.equal(asked.status, 202);
  const requestId = (await asked.json()).request.id;
  return call(context, "POST", `/events/${eventId}/requests/${requestId}/answer`, { accept: true }, maker.userId, now);
}
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
  }), env, context.store, now, random, context.notify);
}
/** Records what the server would have told people. */
function recordNotifications(context) {
  const sent = [];
  context.notify = async (userIds, category, content, key) => { sent.push({ userIds: [...userIds], category, body: content.body, type: content.data?.type, key }); };
  return sent;
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

async function createCertificate(subjectName, issuerName, publicKey, signingKey, serialNumber, isCa, markerOid = null, notAfter = "20350101000000Z") {
  const spki = Buffer.from(await crypto.subtle.exportKey("spki", publicKey));
  const validity = sequence(timeValue(new Date("2025-01-01T00:00:00.000Z")), der(0x18, Buffer.from(notAfter)));
  const signatureAlgorithm = sequence(oid("1.2.840.10045.4.3.2"));
  const basicConstraints = sequence(oid("2.5.29.19"), der(0x01, Buffer.from([0xff])), der(0x04, sequence(...(isCa ? [der(0x01, Buffer.from([0xff]))] : []))));
  const keyUsageBits = isCa ? Buffer.from([2, 4]) : Buffer.from([7, 0x80]);
  const keyUsage = [sequence(oid("2.5.29.15"), der(0x01, Buffer.from([0xff])), der(0x04, der(0x03, keyUsageBits)))];
  const marker = markerOid ? [sequence(oid(markerOid), der(0x04, Buffer.from([5, 0])))] : [];
  const extensions = der(0xa3, sequence(basicConstraints, ...keyUsage, ...marker));
  const tbs = sequence(der(0xa0, der(0x02, Buffer.from([2]))), integer(Buffer.from([serialNumber])), signatureAlgorithm, issuerName, validity, subjectName, spki, extensions);
  const signature = Buffer.from(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, tbs));
  return sequence(tbs, signatureAlgorithm, der(0x03, Buffer.concat([Buffer.from([0]), ecdsaDerSignature(signature)])));
}

const APPLE_LEAF_OID = "1.2.840.113635.100.6.11.1";
const APPLE_INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1";

/** A root, an intermediate and a signing leaf. `markers: false` leaves out Apple's App Store marker extensions, like any other certificate the same root could issue. */
async function selfSignedTestRoot({ markers = true, leafNotAfter, leafMarker = true, middleMarker = true } = {}) {
  const name = (text) => sequence(der(0x31, sequence(oid("2.5.4.3"), der(0x0c, Buffer.from(text)))));
  const keyPair = () => crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const rootPair = await keyPair();
  const rootName = name("Self-Signed Test Root");
  const rootDer = await createCertificate(rootName, rootName, rootPair.publicKey, rootPair.privateKey, 1, true);
  const middlePair = await keyPair();
  const middleName = name("Test Intermediate");
  const middleDer = await createCertificate(middleName, rootName, middlePair.publicKey, rootPair.privateKey, 3, true, markers && middleMarker ? APPLE_INTERMEDIATE_OID : null);
  const leafPair = await keyPair();
  const leafDer = await createCertificate(name("StoreKit Test Signer"), middleName, leafPair.publicKey, middlePair.privateKey, 2, false, markers && leafMarker ? APPLE_LEAF_OID : null, leafNotAfter);
  const pem = `-----BEGIN CERTIFICATE-----\n${rootDer.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END CERTIFICATE-----`;
  return { pair: leafPair, certificate: leafDer, x5c: [leafDer.toString("base64"), middleDer.toString("base64"), rootDer.toString("base64")], pem };
}

async function signedTransaction(root, overrides = {}) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "ES256", x5c: root.x5c });
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

test("purchases are accepted by environment: Production only unless Sandbox is switched on", async () => {
  const root = await selfSignedTestRoot();
  const context = createContext();
  const account = await register(context, "Alice");
  const verify = (testEnv, jws) => handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: jws })
  }), testEnv, context.store);
  const sandbox = await signedTransaction(root, { transactionId: "tx-sandbox", productId: "gacha.ticket", appAccountToken: account.userId, environment: "Sandbox", expiresDate: undefined });
  const production = await signedTransaction(root, { transactionId: "tx-production", productId: "gacha.ticket", appAccountToken: account.userId, environment: "Production", expiresDate: undefined });
  const base = { ...env, APPLE_ROOT_CERTIFICATES: root.pem };
  // Without any setting a Sandbox purchase is refused; a real one is credited.
  const unset = { ...base, PURCHASE_ENVIRONMENTS: undefined };
  assert.equal((await verify(unset, sandbox)).status, 403);
  assert.equal((await verify(unset, production)).status, 200);
  // While testing, Sandbox is switched on explicitly.
  assert.equal((await verify({ ...base, PURCHASE_ENVIRONMENTS: "Production,Sandbox" }, sandbox)).status, 200);
  // Production only: a Sandbox purchase is refused, a real one is still credited.
  const strict = { ...base, PURCHASE_ENVIRONMENTS: "Production" };
  const another = await signedTransaction(root, { transactionId: "tx-sandbox-2", productId: "gacha.ticket", appAccountToken: account.userId, environment: "Sandbox", expiresDate: undefined });
  const refused = await verify(strict, another);
  assert.deepEqual([refused.status, (await refused.json()).error], [403, "environment_not_accepted"]);
  const real = await signedTransaction(root, { transactionId: "tx-production-2", productId: "gacha.ticket", appAccountToken: account.userId, environment: "Production", expiresDate: undefined });
  assert.equal((await verify(strict, real)).status, 200);
});

test("blocking ends a friendship, hides both players from each other, and reports are kept for the operator", async () => {
  const context = createContext();
  const alice = await namedAccount(context, "Alice");
  const bob = await namedAccount(context, "Bob");
  const request = await call(context, "POST", "/friend-requests", { friendCode: bob.friendCode }, alice.userId);
  const id = context.store.requests.keys().next().value;
  await call(context, "POST", `/friend-requests/${id}/answer`, { answer: "accepted" }, bob.userId);
  assert.equal((await (await call(context, "GET", "/friends", undefined, alice.userId)).json()).friends.length, 1);

  const blocked = await call(context, "POST", "/blocks", { userId: bob.userId }, alice.userId);
  assert.equal(blocked.status, 200);
  assert.equal((await (await call(context, "GET", "/friends", undefined, alice.userId)).json()).friends.length, 0);
  assert.equal((await (await call(context, "GET", "/friends", undefined, bob.userId)).json()).friends.length, 0);
  assert.deepEqual((await (await call(context, "GET", "/blocks", undefined, alice.userId)).json()).blocked.map((user) => user.name), ["Bob"]);

  // Neither can ask the other again; it looks like the code does not exist.
  const askedBack = await call(context, "POST", "/friend-requests", { friendCode: alice.friendCode }, bob.userId);
  assert.deepEqual([askedBack.status, (await askedBack.json()).error], [404, "friend_not_found"]);
  const askedAgain = await call(context, "POST", "/friend-requests", { friendCode: bob.friendCode }, alice.userId);
  assert.equal(askedAgain.status, 404);

  // Unblocking lets them find each other again.
  assert.equal((await call(context, "POST", "/blocks/remove", { userId: bob.userId }, alice.userId)).status, 200);
  assert.equal((await call(context, "POST", "/friend-requests", { friendCode: bob.friendCode }, alice.userId)).status, 201);

  const cannotSelf = await call(context, "POST", "/blocks", { userId: alice.userId }, alice.userId);
  assert.equal(cannotSelf.status, 400);
  const noUser = await call(context, "POST", "/blocks", { userId: "no-such-user" }, alice.userId);
  assert.equal(noUser.status, 404);

  const report = await call(context, "POST", "/reports", { userId: bob.userId, reason: "name", note: "  不適切な名前  " }, alice.userId);
  assert.equal(report.status, 201);
  assert.deepEqual(context.store.reports.map((row) => [row.reporterId, row.reportedId, row.reason, row.note]), [[alice.userId, bob.userId, "name", "不適切な名前"]]);
  assert.equal((await call(context, "POST", "/reports", { userId: bob.userId, reason: "spam" }, alice.userId)).status, 400);
});

test("a blocked player cannot join the team of the one who blocked them", async () => {
  const context = createContext();
  context.store.events.set("toki", { id: "toki", name: "Toki", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z", mapId: "m", minMembers: 2, maxMembers: 4, goalSteps: 1000 });
  const maker = await namedAccount(context, "Maker");
  const other = await namedAccount(context, "Other");
  const code = (await (await call(context, "POST", "/events/toki/teams", {}, maker.userId, EVENT_WINDOW_NOW)).json()).team.code;
  await call(context, "POST", "/blocks", { userId: other.userId }, maker.userId);
  const refused = await call(context, "POST", "/events/toki/teams/join", { code }, other.userId, EVENT_WINDOW_NOW);
  assert.deepEqual([refused.status, (await refused.json()).error], [404, "not_found"]);
});

test("a display name with an offensive word is refused, ordinary names and disguised ones are handled", async () => {
  const context = createContext();
  const account = await register(context);
  const save = (name) => call(context, "POST", "/profile", { name }, account.userId);
  for (const ok of ["かすみ", "しょうた", "シネマ", "えっちゃん", "Taro"]) assert.equal((await save(ok)).status, 200, ok);
  for (const bad of ["ころす", "コロス!!", "ち ん こ", "ＦＵＣＫ", "死ね"]) {
    const response = await save(bad);
    assert.deepEqual([response.status, (await response.json()).error], [400, "inappropriate_name"], bad);
  }
  // The operator's own list is added to the built-in one.
  const extended = await handleWithStore(new Request("https://server.test/profile", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${context.credentials.get(account.userId)}` }, body: JSON.stringify({ name: "ばなな" })
  }), { ...env, NG_WORDS: "ばなな" }, context.store);
  assert.equal(extended.status, 400);
});

test("write routes are limited per player: too many friend requests in a day get a 429", async () => {
  const context = createContext();
  const alice = await namedAccount(context, "Alice");
  const results = [];
  for (let attempt = 0; attempt < 42; attempt += 1) {
    results.push((await call(context, "POST", "/friend-requests", { friendCode: "ZZZZZZZZZZ" }, alice.userId, EVENT_WINDOW_NOW)).status);
  }
  assert.equal(results.filter((status) => status === 404).length, 40);
  assert.deepEqual(results.slice(-2), [429, 429]);
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
  assert.equal(odds.paidPityInterval, undefined);
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
  assert.equal((await (await call(context, "POST", "/free-pulls/claim", { routeId: "sanctuary" }, account.userId)).json()).status, "claimed");
  assert.equal((await (await call(context, "POST", "/free-pulls/claim", { routeId: "sanctuary" }, account.userId)).json()).status, "already_claimed");
  assert.equal((await context.store.wallet(account.userId)).free, 1);
  assert.equal((await call(context, "POST", "/gacha/pull", { count: 5, kind: "free" }, account.userId)).status, 400);
});

test("free pulls do not advance the paid pull count and duplicate copies set isNew correctly", async () => {
  const context = createContext();
  const account = await register(context);
  await call(context, "POST", "/pets/starter", { petId: GACHA_PET_IDS[0] }, account.userId);
  await call(context, "POST", "/free-pulls/claim", { routeId: "sanctuary" }, account.userId);
  context.store.paidPullCounts.set(account.userId, 24);
  const response = await call(context, "POST", "/gacha/pull", { count: 1, kind: "free" }, account.userId, undefined, () => 0);
  const result = (await response.json()).results[0];
  assert.deepEqual(result, { petId: GACHA_PET_IDS[0], kind: "free", isNew: false, guaranteed: false });
  assert.equal((await context.store.wallet(account.userId)).paidPulls, 24);
  assert.equal((await context.store.ownedPets(account.userId))[GACHA_PET_IDS[0]], 2);
});

test("paid pulls are never guaranteed: the 25th and 50th draw like any other", async () => {
  const context = createContext();
  const account = await register(context);
  const owned = Object.fromEntries(GACHA_PET_IDS.slice(0, -2).map((petId) => [petId, 1]));
  context.store.owned.set(account.userId, owned);
  context.store.walletRows.get(account.userId).paid = 3;
  for (const count of [24, 49, 99]) {
    context.store.paidPullCounts.set(account.userId, count);
    const result = (await (await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid" }, account.userId, undefined, () => 0)).json()).results[0];
    assert.equal(result.guaranteed, false);
    assert.equal(result.petId, GACHA_PET_IDS[0]);
    assert.equal(result.isNew, false);
  }
});

test("a draw asked for again with the same operation id gives the same answer and is paid for once", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.walletRows.get(account.userId).paid = 3;
  const send = () => call(context, "POST", "/gacha/pull", { count: 1, kind: "paid", opId: "op-lost-reply-1" }, account.userId, undefined, () => 0);
  const first = await (await send()).json();
  const again = await (await send()).json();
  assert.deepEqual(again, first);
  assert.equal((await context.store.wallet(account.userId)).paid, 2);
  assert.equal(context.store.pulls.length, 1);
  // A different id is a different draw.
  const other = await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid", opId: "op-lost-reply-2" }, account.userId, undefined, () => 0);
  assert.equal(other.status, 200);
  assert.equal((await context.store.wallet(account.userId)).paid, 1);
  const bad = await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid", opId: "x" }, account.userId);
  assert.equal(bad.status, 400);
});

test("a draw that lost a race to another draw is refused and spends nothing", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.walletRows.get(account.userId).paid = 2;
  const realCommit = context.store.commitDraws.bind(context.store);
  context.store.commitDraws = async (...args) => {
    context.store.paidPullCounts.set(account.userId, 5); // another request committed first
    return realCommit(...args);
  };
  const response = await call(context, "POST", "/gacha/pull", { count: 1, kind: "paid" }, account.userId, undefined, () => 0);
  assert.equal(response.status, 409);
  assert.equal((await context.store.wallet(account.userId)).paid, 2);
  assert.equal(context.store.pulls.length, 0);
});

test("a failed five-pull commits no balance, ownership, history, or paid-pity changes", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.walletRows.get(account.userId).paid = 5;
  context.store.paidPullCounts.set(account.userId, 22);
  context.store.failNextCommit = true;
  const response = await call(context, "POST", "/gacha/pull", { count: 5, kind: "paid" }, account.userId, undefined, () => 0);
  assert.equal(response.status, 409);
  assert.deepEqual(await context.store.wallet(account.userId), { paid: 5, free: 0, paidPulls: 22, refundDebt: 0 });
  assert.deepEqual(await context.store.ownedPets(account.userId), {});
  assert.equal(context.store.pulls.length, 0);
});

test("event step submissions use Tokyo time and replace same-day cumulative values", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.events.set("autumn", { id: "autumn", name: "Autumn", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z", mapId: "map-a", minMembers: 1, maxMembers: 4, goalSteps: 360000 });
  await setOut(context, account, "autumn");
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
  context.store.events.set("autumn", { id: "autumn", name: "Autumn", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z", mapId: "map-a", minMembers: 1, maxMembers: 4, goalSteps: 360000 });
  await setOut(context, account, "autumn");
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

async function namedAccount(context, name) {
  const account = await register(context, name);
  const profile = await call(context, "POST", "/profile", { name }, account.userId);
  assert.equal(profile.status, 200);
  return account;
}
const teamEvent = { id: "toki", name: "Toki", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z", mapId: "map", minMembers: 2, maxMembers: 3, goalSteps: 1000 };

test("a team is made, joined by asking its maker, and sets out when the second member is accepted", async () => {
  const context = createContext();
  context.store.events.set("toki", teamEvent);
  const maker = await namedAccount(context, "Maker");
  const friend = await namedAccount(context, "Friend");
  const empty = await (await call(context, "GET", "/events/toki/team", undefined, maker.userId, EVENT_WINDOW_NOW)).json();
  assert.equal(empty.team, null);
  assert.equal(empty.event.maxMembers, 3);

  const made = await call(context, "POST", "/events/toki/teams", {}, maker.userId, EVENT_WINDOW_NOW);
  assert.equal(made.status, 201);
  const team = (await made.json()).team;
  assert.match(team.code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(team.status, "recruiting");
  assert.equal(team.members.length, 1);

  // There is no start button any more: the team sets out by itself.
  const gone = await call(context, "POST", "/events/toki/teams/start", {}, maker.userId, EVENT_WINDOW_NOW);
  assert.equal(gone.status, 404);

  // Asking does not add anyone. The asker sees who will answer; the maker sees the request.
  const asked = await call(context, "POST", "/events/toki/teams/join", { code: team.code.toLowerCase().replace(/(...)(...)/, "$1-$2") }, friend.userId, EVENT_WINDOW_NOW);
  assert.equal(asked.status, 202);
  const askedBody = await asked.json();
  assert.equal(askedBody.team, null);
  assert.equal(askedBody.request.creatorName, "Maker");
  assert.equal(await context.store.friendshipExists(friend.userId, maker.userId), false);
  const waiting = await (await call(context, "GET", "/events/toki/team", undefined, maker.userId, EVENT_WINDOW_NOW)).json();
  assert.equal(waiting.team.status, "recruiting");
  assert.deepEqual(waiting.team.members.map((member) => member.name), ["Maker"]);
  assert.deepEqual(waiting.team.requests.map((row) => row.name), ["Friend"]);
  // The same request again changes nothing.
  assert.equal((await call(context, "POST", "/events/toki/teams/join", { code: team.code }, friend.userId, EVENT_WINDOW_NOW)).status, 202);

  // Only the maker answers.
  const notMaker = await call(context, "POST", `/events/toki/requests/${askedBody.request.id}/answer`, { accept: true }, friend.userId, EVENT_WINDOW_NOW);
  assert.deepEqual([notMaker.status, (await notMaker.json()).error], [403, "not_creator"]);

  const accepted = await call(context, "POST", `/events/toki/requests/${askedBody.request.id}/answer`, { accept: true }, maker.userId, EVENT_WINDOW_NOW);
  assert.equal(accepted.status, 200);
  const view = (await accepted.json()).team;
  assert.equal(view.status, "active", "two members: the team sets out");
  assert.deepEqual(view.members.map((member) => member.name), ["Maker", "Friend"]);
  assert.equal(await context.store.friendshipExists(friend.userId, maker.userId), true);

  // After setting out a third player may still ask and be accepted; nobody can leave.
  const late = await namedAccount(context, "Late");
  assert.equal((await joinAndApprove(context, "toki", team.code, late, maker)).status, 200);
  const leave = await call(context, "POST", "/events/toki/leave", {}, friend.userId, EVENT_WINDOW_NOW);
  assert.deepEqual([leave.status, (await leave.json()).error], [409, "already_started"]);
});

test("a team has a limit on its size, a player is in one team only, and has one open request", async () => {
  const context = createContext();
  context.store.events.set("toki", teamEvent);
  const accounts = [];
  for (const name of ["A", "B", "C", "D", "E"]) accounts.push(await namedAccount(context, name));
  const code = (await (await call(context, "POST", "/events/toki/teams", {}, accounts[0].userId, EVENT_WINDOW_NOW)).json()).team.code;
  // D asks early; the maker answers B and C first, so the team (3 at most) is full when D's turn comes.
  const early = await call(context, "POST", "/events/toki/teams/join", { code }, accounts[3].userId, EVENT_WINDOW_NOW);
  assert.equal(early.status, 202);
  for (const account of accounts.slice(1, 3)) assert.equal((await joinAndApprove(context, "toki", code, account, accounts[0])).status, 200);
  const pendingId = (await context.store.pendingJoinRequest(accounts[3].userId, "toki"));
  assert.equal(pendingId, null, "a team with no room drops the requests still open");
  const full = await call(context, "POST", "/events/toki/teams/join", { code }, accounts[3].userId, EVENT_WINDOW_NOW);
  assert.deepEqual([full.status, (await full.json()).error], [409, "full"]);
  const again = await call(context, "POST", "/events/toki/teams/join", { code }, accounts[1].userId, EVENT_WINDOW_NOW);
  assert.deepEqual([again.status, (await again.json()).error], [409, "already_member"]);
  const second = await call(context, "POST", "/events/toki/teams", {}, accounts[1].userId, EVENT_WINDOW_NOW);
  assert.deepEqual([second.status, (await second.json()).error], [409, "already_member"]);
  const nobody = await call(context, "POST", "/events/toki/teams/join", { code: "ZZZZZZ" }, accounts[3].userId, EVENT_WINDOW_NOW);
  assert.deepEqual([nobody.status, (await nobody.json()).error], [404, "not_found"]);
  const bad = await call(context, "POST", "/events/toki/teams/join", { code: "ABC" }, accounts[3].userId, EVENT_WINDOW_NOW);
  assert.equal(bad.status, 400);

  // One open request at a time: D makes a team and E asks it; E cannot ask another team until that is answered or taken back.
  const otherCode = (await (await call(context, "POST", "/events/toki/teams", {}, accounts[3].userId, EVENT_WINDOW_NOW)).json()).team.code;
  const toFirst = await call(context, "POST", "/events/toki/teams/join", { code: otherCode }, accounts[4].userId, EVENT_WINDOW_NOW);
  assert.equal(toFirst.status, 202);
  const toSecond = await call(context, "POST", "/events/toki/teams/join", { code }, accounts[4].userId, EVENT_WINDOW_NOW);
  assert.deepEqual([toSecond.status, (await toSecond.json()).error], [409, "request_pending"]);
  assert.equal((await call(context, "POST", "/events/toki/requests/cancel", {}, accounts[4].userId, EVENT_WINDOW_NOW)).status, 200);
  const nowFull = await call(context, "POST", "/events/toki/teams/join", { code }, accounts[4].userId, EVENT_WINDOW_NOW);
  assert.deepEqual([nowFull.status, (await nowFull.json()).error], [409, "full"]);
  assert.equal((await call(context, "POST", "/events/toki/teams/join", { code: otherCode }, accounts[4].userId, EVENT_WINDOW_NOW)).status, 202);
});

test("the maker can decline a request, and the asker can take it back", async () => {
  const context = createContext();
  context.store.events.set("toki", teamEvent);
  const maker = await namedAccount(context, "Maker");
  const asker = await namedAccount(context, "Asker");
  const code = (await (await call(context, "POST", "/events/toki/teams", {}, maker.userId, EVENT_WINDOW_NOW)).json()).team.code;
  const asked = await call(context, "POST", "/events/toki/teams/join", { code }, asker.userId, EVENT_WINDOW_NOW);
  const id = (await asked.json()).request.id;
  const declined = await call(context, "POST", `/events/toki/requests/${id}/answer`, { accept: false }, maker.userId, EVENT_WINDOW_NOW);
  assert.equal(declined.status, 200);
  assert.deepEqual((await declined.json()).team.members.map((member) => member.name), ["Maker"]);
  const none = await (await call(context, "GET", "/events/toki/team", undefined, asker.userId, EVENT_WINDOW_NOW)).json();
  assert.deepEqual([none.team, none.request], [null, null]);
  assert.equal(await context.store.friendshipExists(asker.userId, maker.userId), false);
  // A request that is gone cannot be answered, and a bad body is refused.
  const gone = await call(context, "POST", `/events/toki/requests/${id}/answer`, { accept: true }, maker.userId, EVENT_WINDOW_NOW);
  assert.equal(gone.status, 404);
  const bad = await call(context, "POST", "/events/toki/requests/x/answer", { accept: "yes" }, maker.userId, EVENT_WINDOW_NOW);
  assert.equal(bad.status, 400);
});

test("teams need a profile name and an event that is running", async () => {
  const context = createContext();
  context.store.events.set("toki", teamEvent);
  const noName = await register(context, "");
  context.store.users.get(noName.userId).name = null;
  const refused = await call(context, "POST", "/events/toki/teams", {}, noName.userId, EVENT_WINDOW_NOW);
  assert.deepEqual([refused.status, (await refused.json()).error], [400, "profile_required"]);
  const named = await namedAccount(context, "Named");
  const early = await call(context, "POST", "/events/toki/teams", {}, named.userId, new Date("2026-08-01T00:00:00.000Z"));
  assert.deepEqual([early.status, (await early.json()).error], [409, "event_not_active"]);
  const unknown = await call(context, "POST", "/events/nothing/teams", {}, named.userId, EVENT_WINDOW_NOW);
  assert.equal(unknown.status, 404);
});

test("a maker who is still alone can leave, and the requests to that team go with it", async () => {
  const context = createContext();
  context.store.events.set("toki", teamEvent);
  const first = await namedAccount(context, "First");
  const second = await namedAccount(context, "Second");
  const code = (await (await call(context, "POST", "/events/toki/teams", {}, first.userId, EVENT_WINDOW_NOW)).json()).team.code;
  assert.equal((await call(context, "POST", "/events/toki/teams/join", { code }, second.userId, EVENT_WINDOW_NOW)).status, 202);
  assert.equal((await call(context, "POST", "/events/toki/leave", {}, first.userId, EVENT_WINDOW_NOW)).status, 200);
  const none = await (await call(context, "GET", "/events/toki/team", undefined, second.userId, EVENT_WINDOW_NOW)).json();
  assert.deepEqual([none.team, none.request], [null, null]);
});

test("steps count for the team: only after setting out, summed, and the reward is taken once", async () => {
  const context = createContext();
  context.store.events.set("toki", teamEvent);
  const one = await namedAccount(context, "One");
  const two = await namedAccount(context, "Two");
  const code = (await (await call(context, "POST", "/events/toki/teams", {}, one.userId, EVENT_WINDOW_NOW)).json()).team.code;

  // Before the second member is accepted there is no active team to count for.
  const early = await call(context, "POST", "/events/toki/steps", { cumulative: 100 }, one.userId, EVENT_WINDOW_NOW);
  assert.deepEqual([early.status, (await early.json()).error], [409, "no_active_team"]);
  assert.equal((await joinAndApprove(context, "toki", code, two, one)).status, 200);
  assert.equal((await call(context, "POST", "/events/toki/steps", { cumulative: 600 }, one.userId, EVENT_WINDOW_NOW)).status, 200);

  // Not cleared yet: no reward.
  const notYet = await call(context, "POST", "/events/toki/claim", {}, one.userId, EVENT_WINDOW_NOW);
  assert.deepEqual([notYet.status, (await notYet.json()).error], [409, "not_cleared"]);
  assert.equal((await call(context, "POST", "/events/toki/steps", { cumulative: 500 }, two.userId, EVENT_WINDOW_NOW)).status, 200);

  const view = await (await call(context, "GET", "/events/toki/team", undefined, two.userId, EVENT_WINDOW_NOW)).json();
  assert.equal(view.totalSteps, 1100);
  assert.equal(view.team.status, "cleared");
  assert.deepEqual(view.team.members.map((member) => member.steps), [600, 500]);

  const claim = await call(context, "POST", "/events/toki/claim", {}, one.userId, EVENT_WINDOW_NOW);
  assert.deepEqual(await claim.json(), { status: "claimed" });
  const again = await call(context, "POST", "/events/toki/claim", {}, one.userId, EVENT_WINDOW_NOW);
  assert.deepEqual(await again.json(), { status: "already_claimed" });
  // The other member has not claimed theirs yet.
  const other = await (await call(context, "GET", "/events/toki/team", undefined, two.userId, EVENT_WINDOW_NOW)).json();
  assert.equal(other.team.claimed, false);
  assert.equal(await context.store.claimEvent(two.userId, "toki"), true);
});

test("Apple notification route validates its signed envelope and handles revocation", async () => {
  const root = await selfSignedTestRoot();
  const transaction = await signedTransaction(root, { revocationDate: Date.now() });
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "ES256", x5c: root.x5c });
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
  const header = encode({ alg: "ES256", x5c: root.x5c });
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

test("pets/sync never grants what the app claims: it only returns the server's own record", async () => {
  const context = createContext();
  const account = await register(context);
  const [first, second] = GACHA_PET_IDS;
  const synced = await call(context, "POST", "/pets/sync", { owned: { [first]: 2, [second]: 999, "not-a-pet": 5 } }, account.userId);
  assert.equal(synced.status, 200);
  assert.deepEqual((await synced.json()).owned, {});
  assert.deepEqual(await context.store.ownedPets(account.userId), {});
  await call(context, "POST", "/pets/starter", { petId: first }, account.userId);
  assert.deepEqual((await (await call(context, "POST", "/pets/sync", { owned: { [second]: 1 } }, account.userId)).json()).owned, { [first]: 1 });
  assert.equal((await call(context, "POST", "/pets/sync", { owned: { [first]: 0 } }, account.userId)).status, 400);
  assert.equal((await call(context, "POST", "/pets/sync", { owned: [] }, account.userId)).status, 400);
  assert.equal((await call(context, "POST", "/pets/sync", { owned: {} })).status, 401);
});

test("free pulls are only paid for the app's own routes, and the list matches the app's pilgrimages", async () => {
  const context = createContext();
  const account = await register(context);
  const invented = await call(context, "POST", "/free-pulls/claim", { routeId: "made-up-route-1" }, account.userId);
  assert.deepEqual([invented.status, (await invented.json()).error], [400, "unknown_route"]);
  assert.equal((await context.store.wallet(account.userId)).free, 0);
  const source = readFileSync(new URL("../../src/data/pilgrimages.ts", import.meta.url), "utf8");
  const ids = [...source.matchAll(/^  \{ id: '([A-Za-z0-9_-]+)'/gm)].map((match) => match[1]);
  assert.ok(ids.length >= 10);
  for (const id of ids) assert.equal((await call(context, "POST", "/free-pulls/claim", { routeId: id }, account.userId)).status, 200, id);
});

test("a refund that arrives before its purchase leaves the later purchase uncredited", async () => {
  const root = await selfSignedTestRoot();
  const context = createContext();
  const account = await register(context, "Alice");
  const verify = (jws) => handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: jws })
  }), { ...env, APPLE_ROOT_CERTIFICATES: root.pem }, context.store);
  await context.store.revokePurchase("tx-early-refund", 1);
  const late = await signedTransaction(root, { transactionId: "tx-early-refund", productId: "gacha.ticket", appAccountToken: account.userId, environment: "Production", expiresDate: undefined });
  const reply = await verify(late);
  assert.deepEqual([reply.status, (await reply.json()).status], [200, "revoked"]);
  assert.equal((await context.store.wallet(account.userId)).paid, 0);
});

test("a signature from another Apple-issued certificate (without the App Store markers) is refused", async () => {
  const root = await selfSignedTestRoot({ markers: false });
  const context = createContext();
  const account = await register(context, "Alice");
  const jws = await signedTransaction(root, { transactionId: "tx-foreign", productId: "gacha.ticket", appAccountToken: account.userId, environment: "Production", expiresDate: undefined });
  const reply = await handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: jws })
  }), { ...env, APPLE_ROOT_CERTIFICATES: root.pem }, context.store);
  assert.deepEqual([reply.status, (await reply.json()).error], [400, "invalid_storekit_transaction"]);
  assert.equal((await context.store.wallet(account.userId)).paid, 0);
});

test("GET /wallet reports the balances of the signed-in user", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.walletRows.get(account.userId).paid = 3;
  const response = await call(context, "GET", "/wallet", undefined, account.userId);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { paid: 3, free: 0, paidPulls: 0, refundDebt: 0 });
});

test("the support page is public and gives the contact address and where to cancel", async () => {
  const context = createContext();
  const response = await handleWithStore(new Request("https://server.test/support"), env, context.store, new Date("2026-10-15T00:00:00Z"));
  const page = await response.text();
  assert.equal(response.status, 200);
  assert.match(page, /info@mobby.online/);
  assert.match(page, /サブスクリプション/);
  assert.match(page, /<h3>/);
});

test("monthly spending cap by age group: set once, can be lowered but not raised, counted per Tokyo month", async () => {
  const context = createContext();
  const account = await register(context);
  const priced = { ...env, PRODUCT_CATALOG_JSON: JSON.stringify({ "gacha.ticket": { paidPulls: 1, priceYen: 300 }, "gacha.five": { paidPulls: 5, priceYen: 1200 } }) };
  const limits = async (now) => (await handleWithStore(new Request("https://server.test/limits", { headers: { authorization: "Bearer " + context.credentials.get(account.userId) } }), priced, context.store, now)).json();
  const setGroup = (ageGroup) => call(context, "POST", "/profile/age-group", { ageGroup }, account.userId);
  const october = new Date("2026-10-15T03:00:00Z");

  assert.deepEqual(await limits(october), { ageGroup: null, capYen: 5000, spentYen: 0, remainingYen: 5000, restricted: false });
  assert.equal((await setGroup("teenager")).status, 400);
  assert.equal((await setGroup("16to19")).status, 200);
  assert.equal((await limits(october)).capYen, 10000);
  assert.equal((await setGroup("adult")).status, 409);
  assert.equal((await setGroup("under16")).status, 200);

  for (const [id, productId, purchaseDate] of [["t1", "gacha.five", "2026-10-02T00:00:00Z"], ["t2", "gacha.ticket", "2026-10-10T00:00:00Z"], ["t3", "gacha.five", "2026-09-30T14:59:00Z"], ["t4", "gacha.five", "2026-11-01T00:00:00Z"]]) {
    await context.store.recordPurchase(account.userId, { transactionId: id, productId, purchaseDate: Date.parse(purchaseDate) }, { paidPulls: 1 });
  }
  // 2026-09-30T14:59Z is 23:59 on 30 September in Tokyo; 2026-11-01T00:00Z is 09:00 on 1 November.
  assert.deepEqual(await limits(october), { ageGroup: "under16", capYen: 5000, spentYen: 1500, remainingYen: 3500, restricted: false });

  assert.equal((await setGroup("adult")).status, 409);
  context.store.ageGroups.set(account.userId, "adult");
  assert.deepEqual(await limits(october), { ageGroup: "adult", capYen: null, spentYen: 1500, remainingYen: null, restricted: false });

  // Two refunds that came after tickets were spent pause buying; a refund of unspent tickets does not count.
  assert.equal((await limits(october)).restricted, false);
  const at = new Date(october.getTime() - 86_400_000).toISOString();
  context.store.shortfalls.push({ userId: account.userId, at });
  assert.equal((await limits(october)).restricted, false);
  context.store.shortfalls.push({ userId: account.userId, at });
  assert.equal((await limits(october)).restricted, true);
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

test("account deletion revokes Apple's token first, and keeps the account when Apple does not accept the revocation", async () => {
  const context = createContext();
  const { token, appleEnv } = await appleFixture();
  const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pkcs8 = Buffer.from(await webcrypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
  const signInEnv = { ...appleEnv, APPLE_TEAM_ID: "TEAM123456", APPLE_SIGN_IN_KEY_ID: "KEY1234567", APPLE_SIGN_IN_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
${pkcs8}
-----END PRIVATE KEY-----` };
  const realFetch = globalThis.fetch;
  const asked = [];
  let revokeAnswer = false;
  globalThis.fetch = async (url, init) => {
    const form = Object.fromEntries(new URLSearchParams(String(init.body)));
    asked.push({ url: String(url), form });
    if (String(url).endsWith("/auth/token")) return new Response(JSON.stringify({ refresh_token: "refresh-abc" }), { status: 200 });
    return new Response("{}", { status: revokeAnswer ? 200 : 400 });
  };
  try {
    const account = await register(context);
    const send = (path, body, user) => handleWithStore(new Request("https://server.test" + path, {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + context.credentials.get(user) }, body: JSON.stringify(body)
    }), signInEnv, context.store);
    assert.equal((await send("/account/apple/link", { identityToken: await token(), authorizationCode: "code-from-the-sign-in" }, account.userId)).status, 200);
    // The code was traded for a refresh token, with a client secret signed for this app.
    assert.equal(asked[0].url, "https://appleid.apple.com/auth/token");
    assert.equal(asked[0].form.code, "code-from-the-sign-in");
    assert.equal(asked[0].form.client_id, "com.example.mobidou");
    assert.equal(asked[0].form.client_secret.split(".").length, 3);
    assert.equal(await context.store.appleRefreshToken(account.userId), "refresh-abc");

    // Apple refuses the revocation: the account stays so it can be tried again.
    const refused = await send("/account/delete", { confirm: "delete" }, account.userId);
    assert.deepEqual([refused.status, (await refused.json()).error], [502, "apple_revoke_failed"]);
    assert.ok(await context.store.user(account.userId));

    revokeAnswer = true;
    const done = await send("/account/delete", { confirm: "delete" }, account.userId);
    assert.equal(done.status, 200);
    assert.equal(asked.at(-1).url, "https://appleid.apple.com/auth/revoke");
    assert.equal(asked.at(-1).form.token, "refresh-abc");
    assert.equal(await context.store.user(account.userId), null);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("an Apple-linked account is not deleted until Apple has been told: no key (503), no token (409), then a fresh code works", async () => {
  const context = createContext();
  const { token, appleEnv } = await appleFixture();
  const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pkcs8 = Buffer.from(await webcrypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
  const signInEnv = { ...appleEnv, APPLE_TEAM_ID: "TEAM123456", APPLE_SIGN_IN_KEY_ID: "KEY1234567", APPLE_SIGN_IN_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
${pkcs8}
-----END PRIVATE KEY-----` };
  const realFetch = globalThis.fetch;
  let exchangeWorks = false;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/auth/token")) return exchangeWorks ? new Response(JSON.stringify({ refresh_token: "refresh-xyz" }), { status: 200 }) : new Response("{}", { status: 400 });
    return new Response("{}", { status: 200 });
  };
  try {
    const account = await register(context);
    const send = (path, body, env) => handleWithStore(new Request("https://server.test" + path, {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + context.credentials.get(account.userId) }, body: JSON.stringify(body)
    }), env, context.store);
    // Linked while the exchange does not work, so no token is held.
    assert.equal((await send("/account/apple/link", { identityToken: await token(), authorizationCode: "code-from-the-sign-in" }, signInEnv)).status, 200);
    assert.equal(await context.store.appleRefreshToken(account.userId), null);

    const noKey = await send("/account/delete", { confirm: "delete" }, appleEnv);
    assert.deepEqual([noKey.status, (await noKey.json()).error], [503, "apple_revocation_unavailable"]);
    const noToken = await send("/account/delete", { confirm: "delete" }, signInEnv);
    assert.deepEqual([noToken.status, (await noToken.json()).error], [409, "apple_reauth_required"]);
    assert.ok(await context.store.user(account.userId), "still there");

    exchangeWorks = true;
    const done = await send("/account/delete", { confirm: "delete", authorizationCode: "fresh-code-from-apple" }, signInEnv);
    assert.equal(done.status, 200);
    assert.equal(await context.store.user(account.userId), null);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("account deletion without the Sign in with Apple key set up still deletes (nothing to revoke there)", async () => {
  const context = createContext();
  const account = await register(context);
  const response = await call(context, "POST", "/account/delete", { confirm: "delete" }, account.userId);
  assert.equal(response.status, 200);
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

test("account deletion needs the confirmation word, removes everything of the account, and signs it out at once", async () => {
  const context = createContext();
  const { token, appleEnv } = await appleFixture();
  const asAppleUser = (path, body, user) => handleWithStore(new Request("https://server.test" + path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + context.credentials.get(user) },
    body: JSON.stringify(body)
  }), appleEnv, context.store);
  const ann = await register(context);
  const ben = await register(context);
  const [pet] = GACHA_PET_IDS;
  await call(context, "POST", "/profile", { name: "アン", petId: pet }, ann.userId);
  await call(context, "POST", "/profile", { name: "ベン", petId: pet }, ben.userId);
  await call(context, "POST", "/friend-requests", { friendCode: ben.friendCode }, ann.userId);
  const request = (await (await call(context, "GET", "/friends", undefined, ben.userId)).json()).incomingRequests[0];
  await call(context, "POST", "/friend-requests/" + request.id + "/answer", { answer: "accepted" }, ben.userId);
  await asAppleUser("/account/apple/link", { identityToken: await token() }, ann.userId);
  await asAppleUser("/save", { data: "{\"steps\":1}", baseVersion: 0 }, ann.userId);

  assert.equal((await call(context, "POST", "/account/delete", {}, ann.userId)).status, 400);
  assert.equal((await call(context, "POST", "/account/delete", { confirm: "yes" }, ann.userId)).status, 400);
  assert.equal((await call(context, "GET", "/profile", undefined, ann.userId)).status, 200, "still there");
  assert.equal((await call(context, "POST", "/account/delete", { confirm: "delete" })).status, 401);

  // Ann is tied to an Apple ID, so Apple is told first (the key is set up and Apple answers).
  const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pkcs8 = Buffer.from(await webcrypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
  const signInEnv = { ...appleEnv, APPLE_TEAM_ID: "TEAM123456", APPLE_SIGN_IN_KEY_ID: "KEY1234567", APPLE_SIGN_IN_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
${pkcs8}
-----END PRIVATE KEY-----` };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => String(url).endsWith("/auth/token") ? new Response(JSON.stringify({ refresh_token: "refresh-ann" }), { status: 200 }) : new Response("{}", { status: 200 });
  let deleted;
  try {
    deleted = await handleWithStore(new Request("https://server.test/account/delete", {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + context.credentials.get(ann.userId) }, body: JSON.stringify({ confirm: "delete", authorizationCode: "fresh-code-from-apple" })
    }), signInEnv, context.store);
  } finally { globalThis.fetch = realFetch; }
  assert.equal(deleted.status, 200);
  assert.equal((await call(context, "GET", "/profile", undefined, ann.userId)).status, 401, "signed out at once");
  assert.equal(await context.store.cloudSave(ann.userId), null);
  assert.equal(await context.store.userByApple("apple-person-1"), null, "the Apple ID is free again");
  assert.deepEqual((await (await call(context, "GET", "/friends", undefined, ben.userId)).json()).friends, [], "gone from friends' lists");
  assert.equal((await call(context, "GET", "/profile", undefined, ben.userId)).status, 200, "other accounts are untouched");
});

test("the privacy policy page is public, shows the operator and contact, and matches the copy in docs", async () => {
  const { readFileSync } = await import("node:fs");
  const { PRIVACY_MARKDOWN, markdownToHtml } = await import("../src/privacyPolicy.ts");
  const context = createContext();
  const page = await call(context, "GET", "/privacy");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  const html = await page.text();
  assert.match(html, /<h1>プライバシーポリシー<\/h1>/);
  assert.match(html, /Mobby/);
  assert.match(html, /info@mobby\.online/);
  assert.equal((html.match(/<h2>/g) ?? []).length, 12, "all twelve sections");
  assert.match(html, /<table>/);
  assert.equal(readFileSync(new URL("../../docs/privacy-policy.md", import.meta.url), "utf8").replace(/\r\n/g, "\n"), PRIVACY_MARKDOWN, "docs/privacy-policy.md must be the same text");
  assert.equal(markdownToHtml("## <script>alert(1)</script>\n**bold** & more"), "<h2>&lt;script&gt;alert(1)&lt;/script&gt;</h2>\n<p><strong>bold</strong> &amp; more</p>");
});

test("the legal notice page is public, says name, address and phone are given on request, and matches the copy in docs", async () => {
  const { readFileSync } = await import("node:fs");
  const { LEGAL_MARKDOWN } = await import("../src/legalNotice.ts");
  const context = createContext();
  const page = await call(context, "GET", "/legal");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  const html = await page.text();
  assert.match(html, /<h1>特定商取引法に基づく表記<\/h1>/);
  assert.equal((html.match(/請求があった場合、遅滞なく開示します/g) ?? []).length, 3, "operator, address and phone are given on request");
  for (const needle of ["info@mobby.online", "木札1枚 300円", "木札5枚セット 1,200円", "iOS 15.1以上", "返品・キャンセルはお受けできません", "Appleの規約と手続き", "5,000円", "10,000円"]) assert.ok(html.includes(needle), needle);
  assert.equal(readFileSync(new URL("../../docs/legal-notice.md", import.meta.url), "utf8").replace(/\r\n/g, "\n"), LEGAL_MARKDOWN, "docs/legal-notice.md must be the same text");
});

test("a plan purchase credits one gacha 木札 per period once and /plan reports it until the period ends", async () => {
  const root = await selfSignedTestRoot();
  const testEnv = { ...env, APPLE_ROOT_CERTIFICATES: root.pem };
  const context = createContext();
  const account = await register(context);
  const verify = async (jws) => handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: jws })
  }), testEnv, context.store);
  const planOf = async () => (await (await call(context, "GET", "/plan", undefined, account.userId)).json()).plan;
  assert.equal(await planOf(), "none");
  const jws = await signedTransaction(root, { appAccountToken: account.userId, productId: "plus.pulls", transactionId: "plan-001" });
  assert.equal((await (await verify(jws)).json()).status, "verified");
  await verify(jws);
  assert.equal((await context.store.wallet(account.userId)).paid, 1);
  assert.equal(await planOf(), "plus");
  const renewal = await signedTransaction(root, { appAccountToken: account.userId, productId: "plus.pulls", transactionId: "plan-002", purchaseDate: Date.now() + 30 * 86400000, expiresDate: Date.now() + 60 * 86400000 });
  await verify(renewal);
  assert.equal((await context.store.wallet(account.userId)).paid, 2);
});

const verifyWith = async (root, jwsOptions) => {
  const context = createContext();
  const account = await register(context, "Alice");
  const jws = await signedTransaction(root, { transactionId: "tx-edge", productId: "gacha.ticket", appAccountToken: account.userId, environment: "Production", expiresDate: undefined, ...jwsOptions });
  const reply = await handleWithStore(new Request("https://server.test/purchases/verify", {
    method: "POST", headers: { authorization: `Bearer ${context.credentials.get(account.userId)}`, "content-type": "application/json" },
    body: JSON.stringify({ signedTransactionInfo: jws })
  }), { ...env, APPLE_ROOT_CERTIFICATES: root.pem }, context.store);
  return { status: reply.status, body: await reply.json(), context, account };
};

test("a purchase signed while the certificate was valid is still accepted after the certificate expired; one signed after expiry is not", async () => {
  const expired = await selfSignedTestRoot({ leafNotAfter: "20260101000000Z" });
  const old = await verifyWith(expired, { signedDate: Date.parse("2025-06-01T00:00:00Z") });
  assert.equal(old.status, 200);
  assert.equal((await old.context.store.purchaseLog.length), 1);
  // No signing date (or one after the expiry) is judged at the current time, when the certificate has expired.
  assert.equal((await verifyWith(expired, {})).status, 400);
  assert.equal((await verifyWith(expired, { signedDate: Date.parse("2026-06-01T00:00:00Z") })).status, 400);
  // A date in the future cannot make an expired certificate look valid.
  assert.equal((await verifyWith(expired, { signedDate: Date.now() + 86_400_000 })).status, 400);
  // A signing date before the certificate began is refused too.
  assert.equal((await verifyWith(await selfSignedTestRoot(), { signedDate: Date.parse("2024-06-01T00:00:00Z") })).status, 400);
});

test("the signing chain must be leaf, intermediate and root, each with Apple's marker", async () => {
  const good = await selfSignedTestRoot();
  assert.equal((await verifyWith(good, {})).status, 200);
  for (const options of [{ leafMarker: false }, { middleMarker: false }]) {
    const broken = await selfSignedTestRoot(options);
    assert.equal((await verifyWith(broken, {})).status, 400, JSON.stringify(options));
  }
  for (const x5c of [good.x5c.slice(0, 2), [...good.x5c, good.x5c[2]], good.x5c.slice(0, 1)]) {
    assert.equal((await verifyWith({ ...good, x5c }, {})).status, 400, String(x5c.length));
  }
});

test("a name given at sign-up passes the same checks as a profile name", async () => {
  const context = createContext();
  const post = (name) => handleWithStore(new Request("https://server.test/auth/register", { method: "POST", body: JSON.stringify({ name }) }), env, context.store);
  assert.equal((await post("かすみ")).status, 201);
  assert.equal((await handleWithStore(new Request("https://server.test/auth/register", { method: "POST", body: JSON.stringify({}) }), env, context.store)).status, 201);
  const bad = await post("ころす");
  assert.deepEqual([bad.status, (await bad.json()).error], [400, "inappropriate_name"]);
  const long = await post("あ".repeat(13));
  assert.deepEqual([long.status, (await long.json()).error], [400, "invalid_name"]);
});

test("a join request is not accepted after its sender was blocked, and a blocked member is shown without a name", async () => {
  const context = createContext();
  context.store.events.set("toki", { id: "toki", name: "Toki", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z", mapId: "m", minMembers: 2, maxMembers: 4, goalSteps: 1000 });
  const maker = await namedAccount(context, "Maker");
  const asker = await namedAccount(context, "Asker");
  const member = await namedAccount(context, "Member");
  const code = (await (await call(context, "POST", "/events/toki/teams", {}, maker.userId, EVENT_WINDOW_NOW)).json()).team.code;
  // Member joins and is accepted first, so the team is a real one.
  const memberAsked = await (await call(context, "POST", "/events/toki/teams/join", { code }, member.userId, EVENT_WINDOW_NOW)).json();
  const memberRequest = [...context.store.joinRequests.values()].find((row) => row.userId === member.userId).id;
  await call(context, "POST", `/events/toki/requests/${memberRequest}/answer`, { accept: true }, maker.userId, EVENT_WINDOW_NOW);
  assert.ok(memberAsked);
  // Asker asks, then is blocked before being answered: accepting changes nothing.
  await call(context, "POST", "/events/toki/teams/join", { code }, asker.userId, EVENT_WINDOW_NOW);
  const askerRequest = [...context.store.joinRequests.values()].find((row) => row.userId === asker.userId).id;
  await call(context, "POST", "/blocks", { userId: asker.userId }, maker.userId);
  const view = await (await call(context, "GET", "/events/toki/team", undefined, maker.userId, EVENT_WINDOW_NOW)).json();
  assert.equal(view.team.requests.length, 0);
  await call(context, "POST", `/events/toki/requests/${askerRequest}/answer`, { accept: true }, maker.userId, EVENT_WINDOW_NOW);
  const after = await (await call(context, "GET", "/events/toki/team", undefined, maker.userId, EVENT_WINDOW_NOW)).json();
  assert.deepEqual(after.team.members.map((row) => row.id).sort(), [maker.userId, member.userId].sort());
  // A member who is blocked later stays in the count, but is shown without a name or Mobby.
  await call(context, "POST", "/blocks", { userId: member.userId }, maker.userId);
  const hidden = await (await call(context, "GET", "/events/toki/team", undefined, maker.userId, EVENT_WINDOW_NOW)).json();
  const shown = hidden.team.members.find((row) => row.id === member.userId);
  assert.deepEqual([shown.name, shown.petId], ["非表示のメンバー", null]);
  assert.equal(hidden.team.members.length, 2);
});

test("a device token can be released by the device that holds it, from another account, and only with a valid token", async () => {
  const context = createContext();
  const a = await register(context);
  const b = await register(context);
  const token = "ExponentPushToken[releasereleaserelease]";
  await call(context, "POST", "/push/token", { token }, a.userId);
  assert.equal(context.store.pushRows.get(token).userId, a.userId);
  assert.equal((await call(context, "POST", "/push/token/release", { token: "nope" }, b.userId)).status, 400);
  assert.equal((await call(context, "POST", "/push/token/release", { token })).status, 401);
  assert.equal((await call(context, "POST", "/push/token/release", { token }, b.userId)).status, 200);
  assert.equal(context.store.pushRows.has(token), false);
});

test("a device token is kept for the signed-in player, checked, and can be taken away", async () => {
  const context = createContext();
  const account = await register(context);
  const token = "ExponentPushToken[abcdefghijklmnop]";
  assert.equal((await call(context, "POST", "/push/token", { token, team: true, friend: false }, account.userId)).status, 200);
  assert.deepEqual(context.store.pushRows.get(token), { userId: account.userId, team: true, friend: false });
  assert.equal((await call(context, "POST", "/push/token", { token: "not-a-token" }, account.userId)).status, 400);
  assert.equal((await call(context, "POST", "/push/token", { token })).status, 401);
  assert.equal((await call(context, "POST", "/push/token/remove", { token }, account.userId)).status, 200);
  assert.equal(context.store.pushRows.has(token), false);
});

test("friend requests and answers tell the other player", async () => {
  const context = createContext();
  const sent = recordNotifications(context);
  const alice = await namedAccount(context, "Alice");
  const bob = await namedAccount(context, "Bob");
  await call(context, "POST", "/friend-requests", { friendCode: bob.friendCode }, alice.userId);
  assert.deepEqual(sent.map((row) => [row.userIds, row.category]), [[[bob.userId], "friend"]]);
  const id = context.store.requests.keys().next().value;
  await call(context, "POST", `/friend-requests/${id}/answer`, { answer: "accepted" }, bob.userId);
  assert.deepEqual(sent.slice(1).map((row) => [row.userIds, row.category]), [[[alice.userId], "friend"]]);
});

test("a team request tells the maker, the answer tells the asker, and reaching the goal tells the rest once", async () => {
  const context = createContext();
  const sent = recordNotifications(context);
  context.store.events.set("toki", { ...teamEvent });
  const maker = await namedAccount(context, "Maker");
  const member = await namedAccount(context, "Member");
  const code = (await (await call(context, "POST", "/events/toki/teams", {}, maker.userId, EVENT_WINDOW_NOW)).json()).team.code;
  await call(context, "POST", "/events/toki/teams/join", { code }, member.userId, EVENT_WINDOW_NOW);
  assert.deepEqual(sent.map((row) => [row.userIds, row.category, row.type]), [[[maker.userId], "team", "team"]]);
  const requestId = [...context.store.joinRequests.values()][0].id;
  await call(context, "POST", `/events/toki/requests/${requestId}/answer`, { accept: true }, maker.userId, EVENT_WINDOW_NOW);
  assert.deepEqual(sent[1].userIds, [member.userId]);
  // Two members set the team out; nobody else is left to be told it started.
  assert.equal(sent.length, 2);
  const steps = await call(context, "POST", "/events/toki/steps", { cumulative: 1000 }, maker.userId, EVENT_WINDOW_NOW);
  assert.equal(steps.status, 200);
  const cleared = sent.filter((row) => row.key?.startsWith("cleared:"));
  assert.equal(cleared.length, 1);
  assert.deepEqual(cleared[0].userIds, [member.userId]);
});

test("steps can be sent for the open day and the two days before it, not for later or older days or days before the team set out", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.events.set("autumn", { id: "autumn", name: "Autumn", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-10-31T00:00:00.000Z", mapId: "map-a", minMembers: 1, maxMembers: 4, goalSteps: 100000 });
  await setOut(context, account, "autumn");
  const now = new Date("2026-10-05T11:00:00.000Z"); // 20:00 JST 10-05: day 10-05 is open
  const send = (day, cumulative = 500) => call(context, "POST", "/events/autumn/steps", { cumulative, day }, account.userId, now);
  for (const day of ["2026-10-05", "2026-10-04", "2026-10-03"]) assert.equal((await send(day)).status, 200, day);
  for (const day of ["2026-10-02", "2026-10-06"]) {
    const refused = await send(day);
    assert.deepEqual([refused.status, (await refused.json()).error], [409, "steps_day_mismatch"], day);
  }
  assert.equal((await send("yesterday")).status, 400);
  // The team set out on 09-30: an earlier day is not the team's, even inside the grace.
  const early = await call(context, "POST", "/events/autumn/steps", { cumulative: 500, day: "2026-09-29" }, account.userId, new Date("2026-10-01T11:00:00.000Z"));
  assert.equal(early.status, 409);
  // A client that sends no day still files under the open day.
  assert.deepEqual(await (await call(context, "POST", "/events/autumn/steps", { cumulative: 600 }, account.userId, now)).json(), { day: "2026-10-05", cumulative: 600 });
});

test("the push sender sends once per key, drops tokens the device refused, honours the player's choices and a daily cap", async () => {
  const store = new MemoryStore();
  const player = { id: "p1" };
  const calls = [];
  const work = [];
  let reply = (count) => ({ data: Array.from({ length: count }, () => ({ status: "ok" })) });
  const fetchImpl = async (url, init) => {
    const messages = JSON.parse(init.body);
    calls.push({ url, messages });
    return new Response(JSON.stringify(reply(messages.length)), { status: 200 });
  };
  const notify = createExpoNotifier({}, store, (promise) => work.push(promise), { fetchImpl, now: () => new Date("2026-10-05T00:00:00.000Z") });
  const settle = async () => { await Promise.all(work.splice(0)); };
  await store.savePushToken(player.id, "ExponentPushToken[tokentokentoken1]", { team: true, friend: false });

  await notify([player.id], "team", { title: "t", body: "b" }, "once");
  await notify([player.id], "team", { title: "t", body: "b" }, "once");
  await settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://exp.host/--/api/v2/push/send");
  assert.deepEqual(calls[0].messages.map((message) => message.to), ["ExponentPushToken[tokentokentoken1]"]);

  await notify([player.id], "friend", { title: "t", body: "b" });
  await settle();
  assert.equal(calls.length, 1, "friend notifications were turned off");

  reply = () => ({ data: [{ status: "error", details: { error: "DeviceNotRegistered" } }] });
  await notify([player.id], "team", { title: "t", body: "b" });
  await settle();
  assert.equal(store.pushRows.size, 0);

  await store.savePushToken(player.id, "ExponentPushToken[tokentokentoken2]", { team: true, friend: true });
  reply = (count) => ({ data: Array.from({ length: count }, () => ({ status: "ok" })) });
  const before = calls.length;
  for (let i = 0; i < 30; i += 1) await notify([player.id], "team", { title: "t", body: String(i) });
  await settle();
  assert.ok(calls.length - before <= 20 - 2, "no more than the daily cap is sent");
});

test("steps are taken only for days that exist and are open: 02-30 is never one of them", async () => {
  const context = createContext();
  const account = await register(context);
  context.store.events.set("spring", { id: "spring", name: "Spring", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2027-04-30T00:00:00.000Z", mapId: "map-a", minMembers: 1, maxMembers: 4, goalSteps: 100000 });
  await setOut(context, account, "spring");
  const now = new Date("2027-03-01T12:00:00.000Z"); // 21:00 JST 03-01: the open day is 03-01
  const send = (day) => call(context, "POST", "/events/spring/steps", { cumulative: 100, day }, account.userId, now);
  for (const day of ["2027-03-01", "2027-02-28", "2027-02-27"]) assert.equal((await send(day)).status, 200, day);
  for (const day of ["2027-02-29", "2027-02-30", "2027-02-31", "2027-02-26", "2027-03-02"]) {
    const refused = await send(day);
    assert.deepEqual([refused.status, (await refused.json()).error], [409, "steps_day_mismatch"], day);
  }
});

test("a request body over the limit is refused with 413 before it is parsed, by header or by what is really sent", async () => {
  const context = createContext();
  const account = await register(context);
  const credential = context.credentials.get(account.userId);
  const send = (path, text, headers = {}) => handleWithStore(new Request(`https://server.test${path}`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${credential}`, ...headers }, body: text
  }), env, context.store);
  const padded = (bytes) => JSON.stringify({ name: "a", pad: "x".repeat(bytes) });
  // An ordinary call: up to 16 KiB passes, one byte over does not, and the answer is 413, not "invalid JSON".
  const limit = 16_384;
  const fine = padded(limit - 30);
  assert.ok(Buffer.byteLength(fine) <= limit);
  assert.equal((await send("/profile", fine)).status, 200);
  const big = padded(limit + 100);
  const refused = await send("/profile", big);
  assert.deepEqual([refused.status, (await refused.json()).error], [413, "payload_too_large"]);
  // A false Content-Length does not get a large body through: what is read is counted.
  const lying = await send("/profile", big, { "content-length": "10" });
  assert.equal(lying.status, 413);
  // The header alone is enough to refuse, without reading anything.
  const declared = await send("/profile", "{}", { "content-length": "999999" });
  assert.equal(declared.status, 413);
  // Broken JSON within the limit is still 400.
  assert.deepEqual([(await send("/profile", "{not json")).status], [400]);
  // Multi-byte text counts in bytes.
  const japanese = JSON.stringify({ name: "あ", pad: "あ".repeat(6_000) });
  assert.equal(Buffer.byteLength(japanese) > limit, true);
  assert.equal((await send("/profile", japanese)).status, 413);
  // The larger kinds: a signed transaction has room (it fails as a transaction, not as a size), a body past 256 KiB does not.
  const signed = await send("/purchases/verify", JSON.stringify({ signedTransactionInfo: "a".repeat(150_000) }));
  assert.notEqual(signed.status, 413);
  const tooBig = await send("/purchases/verify", JSON.stringify({ signedTransactionInfo: "a".repeat(270_000) }));
  assert.equal(tooBig.status, 413);
  // Nothing was changed by the refused calls.
  assert.equal((await context.store.user(account.userId)).name, "a");
});
