import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { D1Store } from "../src/store.ts";

class SQLiteStatement {
  constructor(database, query, values = []) { this.database = database; this.query = query; this.values = values; }
  bind(...values) { return new SQLiteStatement(this.database, this.query, values); }
  async first() { return this.database.prepare(this.query).get(...this.values) ?? null; }
  async all() { return { success: true, results: this.database.prepare(this.query).all(...this.values) }; }
  async run() {
    const result = this.database.prepare(this.query).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SQLiteD1 {
  constructor(database) { this.database = database; }
  prepare(query) { return new SQLiteStatement(this.database, query); }
  async batch(statements) {
    this.database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

test("D1 schema and ledger operations enforce idempotency and wallet constraints in SQLite", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const now = new Date().toISOString();
  const alice = { id: "alice", friendCode: "ALICE12345", name: "Alice", petId: null, goshuinCount: 0, routeName: null };
  const bob = { id: "bob", friendCode: "BOB1234567", name: "Bob", petId: null, goshuinCount: 0, routeName: null };
  await store.registerUser(alice, "hash-a");
  await store.registerUser(bob, "hash-b");

  assert.equal(await store.claimGift(alice.id, { id: "welcome", title: "Welcome", tickets: 3, freePulls: 1 }), true);
  assert.equal(await store.claimGift(alice.id, { id: "welcome", title: "Welcome", tickets: 3, freePulls: 1 }), false);
  assert.equal(await store.ticketBalance(alice.id), 3);
  assert.deepEqual(await store.wallet(alice.id), { paid: 0, free: 1, paidPulls: 0, refundDebt: 0 });

  assert.equal(await store.grantMonthlyTickets(alice.id, "plus", "2026-09", "2026-10", 10), true);
  assert.equal(await store.grantMonthlyTickets(alice.id, "plus", "2026-09", "2026-10", 10), false);
  assert.equal(await store.ticketBalance(alice.id), 13);
  assert.equal(await store.consumeTickets(alice.id, 14, "not-enough"), false);
  assert.equal(await store.consumeTickets(alice.id, 13, "consume-once"), true);
  assert.equal(await store.ticketBalance(alice.id), 0);

  const transaction = { transactionId: "apple-tx-1", originalTransactionId: "apple-original", productId: "plus", bundleId: "test.bundle", purchaseDate: Date.parse("2026-09-01T00:00:00Z"), expiresDate: Date.parse("2026-10-01T00:00:00Z") };
  assert.equal(await store.recordPurchase(alice.id, transaction, { plan: "plus", monthlyTickets: 10 }), true);
  assert.equal(await store.recordPurchase(alice.id, transaction, { plan: "plus", monthlyTickets: 10 }), false);
  assert.equal(await store.ticketBalance(alice.id), 10);
  const paidTransaction = { ...transaction, transactionId: "apple-tx-2", productId: "gacha" };
  assert.equal(await store.recordPurchase(alice.id, paidTransaction, { paidPulls: 5 }), true);
  assert.deepEqual(await store.wallet(alice.id), { paid: 5, free: 1, paidPulls: 0, refundDebt: 0 });

  assert.equal(await store.chooseStarter(alice.id, "mobibou"), true);
  assert.equal(await store.chooseStarter(alice.id, "mobirin"), false);
  assert.deepEqual(await store.ownedPets(alice.id), { mobibou: 1 });
  assert.equal(await store.claimFreePull(alice.id, "sanctuary"), true);
  assert.equal(await store.claimFreePull(alice.id, "sanctuary"), false);
  assert.deepEqual(await store.wallet(alice.id), { paid: 5, free: 2, paidPulls: 0, refundDebt: 0 });

  await store.commitDraws(alice.id, [{ petId: "mobibou", kind: "free", isNew: false, guaranteed: false }], "free", 0);
  assert.deepEqual(await store.wallet(alice.id), { paid: 5, free: 1, paidPulls: 0, refundDebt: 0 });
  assert.deepEqual(await store.ownedPets(alice.id), { mobibou: 2 });
  await assert.rejects(() => store.commitDraws(alice.id, [
    { petId: "mobirin", kind: "paid", isNew: true, guaranteed: false },
    { petId: "mobirin", kind: "paid", isNew: false, guaranteed: false },
    { petId: null, kind: "paid", isNew: true, guaranteed: false },
    { petId: "mobichi", kind: "paid", isNew: true, guaranteed: false },
    { petId: "mobibou", kind: "paid", isNew: false, guaranteed: false }
  ], "paid", 5));
  assert.deepEqual(await store.wallet(alice.id), { paid: 5, free: 1, paidPulls: 0, refundDebt: 0 });
  assert.deepEqual(await store.ownedPets(alice.id), { mobibou: 2 });
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM gacha_pulls WHERE user_id = ?").get(alice.id).count, 1);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM gacha_wallet_ledger WHERE reason = 'gacha_pull' AND currency = 'paid'").get().count, 0);

  await database.prepare("INSERT INTO events (id, name, starts_at, ends_at, map_id) VALUES (?, ?, ?, ?, ?)")
    .run("autumn", "Autumn", "2026-09-01", "2026-10-01", "map-a");
  assert.equal((await store.event("autumn")).name, "Autumn");
  assert.equal(await store.saveEventSteps(alice.id, "autumn", "2026-09-30", 800), 800);
  assert.equal(await store.saveEventSteps(alice.id, "autumn", "2026-09-30", 600), 800);
  assert.deepEqual(await store.eventStatus("autumn"), { totalCumulative: 800, members: 1 });

  await store.requestFriend(alice.id, bob.id, "request-1");
  assert.equal((await store.friendRequests(bob.id)).length, 1);
  assert.equal(await store.answerFriendRequest(bob.id, "request-1", "accepted"), true);
  assert.equal(await store.answerFriendRequest(bob.id, "request-1", "accepted"), false);
  assert.equal((await store.friends(alice.id)).length, 1);
  database.close();
});

test("D1 rate limit counts within a window, and each counter carries the time it expires", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  assert.equal(await store.hitRateLimit("register:minute:a", 100, 60_000), 1);
  assert.equal(await store.hitRateLimit("register:minute:a", 100, 60_000), 2);
  assert.equal(await store.hitRateLimit("register:minute:b", 100, 60_000), 1);
  assert.equal(await store.hitRateLimit("register:minute:a", 101, 60_000), 1);
  // A hit does nothing but count: older windows stay until the clean-up, which finds them by their expiry.
  assert.deepEqual(database.prepare("SELECT key, window, count, expires_at FROM rate_limits ORDER BY key, window").all().map((row) => ({ ...row })), [
    { key: "register:minute:a", window: 100, count: 2, expires_at: 102 * 60_000 },
    { key: "register:minute:a", window: 101, count: 1, expires_at: 103 * 60_000 },
    { key: "register:minute:b", window: 100, count: 1, expires_at: 102 * 60_000 }
  ]);
  // The day counters expire two days after their day began.
  await store.hitRateLimit("register:day:a", 5, 86_400_000);
  assert.equal(database.prepare("SELECT expires_at FROM rate_limits WHERE key = 'register:day:a'").get().expires_at, 7 * 86_400_000);
});

test("D1 a refund that arrives before its purchase is remembered, so the purchase credits nothing", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  await store.registerUser({ id: "carol", friendCode: "CAROL12345", name: "Carol", petId: null, goshuinCount: 0, routeName: null }, "hash-c");
  const transaction = { transactionId: "tx-early", productId: "gacha.five", bundleId: "b", purchaseDate: Date.now(), appAccountToken: "carol", environment: "Production" };
  assert.equal(await store.isRevoked("tx-early"), false);
  await store.revokePurchase("tx-early", 5);
  assert.equal(await store.isRevoked("tx-early"), true);
  assert.equal(await store.recordPurchase("carol", transaction, { paidPulls: 5 }), false);
  assert.equal((await store.wallet("carol")).paid, 0);
  // A different, unrefunded transaction is credited as before.
  assert.equal(await store.recordPurchase("carol", { ...transaction, transactionId: "tx-ok" }, { paidPulls: 5 }), true);
  assert.equal((await store.wallet("carol")).paid, 5);
});

test("D1 the event, team, purchase, refund and friend-request lookups use an index", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const plan = (sql) => database.prepare("EXPLAIN QUERY PLAN " + sql).all().map((row) => row.detail).join(" | ");
  const queries = [
    "SELECT COALESCE(SUM(cumulative), 0), COUNT(DISTINCT user_id) FROM event_steps WHERE event_id = 'e'",
    "SELECT COUNT(*) FROM event_members WHERE team_id = 't'",
    "SELECT product_id FROM purchases WHERE user_id = 'u' AND granted_at >= 'a' AND granted_at < 'b'",
    "SELECT COUNT(*) FROM refund_events WHERE user_id = 'u' AND debt > 0 AND created_at >= 'a'",
    "SELECT 1 FROM friend_requests WHERE from_id = 'a' AND to_id = 'b' AND status = 'pending'"
  ];
  for (const sql of queries) assert.match(plan(sql), /USING (COVERING )?INDEX|USING PRIMARY KEY/, sql);
});

test("D1 age group and monthly purchases", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  await store.registerUser({ id: "dave", friendCode: "DAVE123456", name: "Dave", petId: null, goshuinCount: 0, routeName: null }, "hash-d");
  assert.equal(await store.ageGroup("dave"), null);
  await store.setAgeGroup("dave", "adult");
  await store.setAgeGroup("dave", "under16");
  assert.equal(await store.ageGroup("dave"), "under16");
  const insert = database.prepare("INSERT INTO purchases (apple_transaction_id, user_id, product_id, original_transaction_id, granted_at, revoked_at) VALUES (?, ?, ?, NULL, ?, ?)");
  insert.run("a", "dave", "five", "2026-10-02T00:00:00.000Z", null);
  insert.run("b", "dave", "single", "2026-10-31T14:59:59.000Z", null);
  insert.run("c", "dave", "single", "2026-10-03T00:00:00.000Z", "2026-10-04T00:00:00.000Z");
  insert.run("d", "dave", "five", "2026-09-30T14:59:00.000Z", null);
  assert.deepEqual((await store.purchasedProducts("dave", "2026-09-30T15:00:00.000Z", "2026-10-31T15:00:00.000Z")).sort(), ["five", "single"]);
});

test("D1 cloud save is versioned: a stale base version is refused", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  await store.registerUser({ id: "erin", friendCode: "ERIN123456", name: "Erin", petId: null, goshuinCount: 0, routeName: null }, "hash-e");
  assert.equal(await store.cloudSave("erin"), null);
  assert.equal(await store.putCloudSave("erin", "{\"a\":1}", 0), 1);
  assert.equal(await store.putCloudSave("erin", "{\"a\":0}", 0), null);
  assert.equal(await store.putCloudSave("erin", "{\"a\":2}", 5), null);
  assert.equal(await store.putCloudSave("erin", "{\"a\":2}", 1), 2);
  const save = await store.cloudSave("erin");
  assert.equal(save?.data, "{\"a\":2}");
  assert.equal(save?.version, 2);
});

test("D1 deleting a user removes every row that belongs to the user and leaves others alone", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const make = (id, code) => store.registerUser({ id, friendCode: code, name: id, petId: null, goshuinCount: 0, routeName: null }, "hash-" + id);
  await make("gone", "GONE123456");
  await make("stay", "STAY123456");

  await store.claimFreePull("gone", "sanctuary");
  await store.chooseStarter("gone", "pet-a");
  await store.putCloudSave("gone", "{\"a\":1}", 0);
  await store.linkApple("gone", "apple-sub-gone");
  await store.setAgeGroup("gone", "adult");
  await store.requestFriend("gone", "stay", "req-1");
  await store.answerFriendRequest("stay", "req-1", "accepted");
  database.prepare("INSERT INTO purchases (apple_transaction_id, user_id, product_id, original_transaction_id, granted_at, revoked_at) VALUES ('tx-1', 'gone', 'p', NULL, '2026-10-01T00:00:00.000Z', NULL)").run();
  database.prepare("INSERT INTO gacha_pulls (id, user_id, result_pet_id, pulled_at, kind, is_new, guaranteed) VALUES ('pull-1', 'gone', 'pet-a', '2026-10-01T00:00:00.000Z', 'paid', 1, 0)").run();
  await store.claimFreePull("stay", "mountain");
  database.prepare("INSERT INTO refund_debt (user_id, pulls) VALUES ('gone', 2)").run();
  database.prepare("INSERT INTO refund_events (transaction_id, user_id, pulls, taken, debt, debt_applied, created_at) VALUES ('tx-r', 'gone', 5, 3, 2, 1, '2026-10-01T00:00:00.000Z')").run();
  database.prepare("INSERT INTO purchase_settlements (transaction_id, user_id, pulls, paid_off, credited, created_at) VALUES ('tx-s', 'gone', 5, 0, 5, '2026-10-01T00:00:00.000Z')").run();

  await store.deleteUser("gone");

  // Every table with a column that points at a user must have no row for the deleted user.
  const columns = { users: "id", friendships: "user_id", friend_requests: "from_id", purchases: "user_id", entitlements: "user_id", ticket_ledger: "user_id", gift_claims: "user_id", gacha_wallet: "user_id", gacha_wallet_ledger: "user_id", gacha_pulls: "user_id", gacha_state: "user_id", user_pets: "user_id", free_pull_claims: "user_id", event_members: "user_id", event_steps: "user_id", apple_links: "user_id", user_limits: "user_id", cloud_saves: "user_id", refund_debt: "user_id", refund_events: "user_id", purchase_settlements: "user_id", event_join_requests: "user_id" };
  for (const [table, column] of Object.entries(columns)) {
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM " + table + " WHERE " + column + " = 'gone'").get().n, 0, table);
  }
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM friendships WHERE friend_id = 'gone'").get().n, 0, "friendships (as the friend)");
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM friend_requests WHERE to_id = 'gone'").get().n, 0, "friend_requests (as the target)");
  assert.equal(await store.userByApple("apple-sub-gone"), null);
  // The other account keeps its own rows.
  assert.equal((await store.user("stay"))?.name, "stay");
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM free_pull_claims WHERE user_id = 'stay'").get().n, 1);
  assert.deepEqual(await store.friends("stay"), []);
});

test("D1 refunds: only unspent tickets are taken back, nothing is owed, repeats change nothing, and shortfalls are counted", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const make = (id, code) => store.registerUser({ id, friendCode: code, name: id, petId: null, goshuinCount: 0, routeName: null }, "hash-" + id);
  await make("fay", "FAY1234567");
  const buy = (id, productId, purchaseDate = Date.parse("2026-10-04T00:00:00Z")) => store.recordPurchase("fay", { transactionId: id, productId, purchaseDate }, { paidPulls: productId === "five" ? 5 : 1 });
  const state = async () => { const w = await store.wallet("fay"); return [w.paid, w.refundDebt]; };
  const spend = (count) => store.commitDraws("fay", Array.from({ length: count }, () => ({ petId: "pet-a", kind: "paid", isNew: false, guaranteed: false })), "paid", count);
  const since = "2026-01-01T00:00:00.000Z";

  // Buy five, spend three, get the purchase refunded: the two unspent are taken back and nothing is owed.
  assert.equal(await buy("tx1", "five"), true);
  await spend(3);
  assert.deepEqual(await state(), [2, 0]);
  await store.revokePurchase("tx1", 5);
  await store.revokePurchase("tx1", 5);
  assert.deepEqual(await state(), [0, 0], "the same refund twice changes nothing");
  assert.equal(await store.refundShortfalls("fay", since), 1, "the refund came after some were spent");

  // The next purchase arrives whole.
  assert.equal(await buy("tx2", "five"), true);
  assert.deepEqual(await state(), [5, 0]);

  // A refund of something never recorded does nothing.
  await store.revokePurchase("unknown", 5);
  assert.deepEqual(await state(), [5, 0]);

  // Refunding a purchase that was never spent takes it all back and is not a shortfall.
  await make("gus", "GUS1234567");
  await store.recordPurchase("gus", { transactionId: "g1", productId: "five", purchaseDate: 0 }, { paidPulls: 5 });
  await store.revokePurchase("g1", 5);
  assert.equal((await store.wallet("gus")).paid, 0);
  assert.equal(await store.refundShortfalls("gus", since), 0);
  assert.equal(database.prepare("SELECT revoked_at IS NOT NULL AS revoked FROM purchases WHERE apple_transaction_id = 'g1'").get().revoked, 1);
});

test("D1 refunds: a refunded plan period ends at once and its unspent monthly pull is taken back", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  await store.registerUser({ id: "hal", friendCode: "HAL1234567", name: "hal", petId: null, goshuinCount: 0, routeName: null }, "hash-hal");
  const start = "2026-10-04T00:00:00.000Z";
  const end = "2036-10-04T00:00:00.000Z";
  await store.recordPurchase("hal", { transactionId: "p1", productId: "plus", purchaseDate: Date.parse(start), expiresDate: Date.parse(end) }, { plan: "plus" });
  await store.recordPlanPeriod("hal", "plus", start, end, 1, "p1");
  assert.equal(await store.activePlan("hal", "2026-10-05T00:00:00.000Z"), "plus");
  assert.equal((await store.wallet("hal")).paid, 1);
  await store.revokePurchase("p1", 0, { name: "plus", periodStart: start });
  await store.revokePurchase("p1", 0, { name: "plus", periodStart: start });
  assert.equal(await store.activePlan("hal", new Date().toISOString()), null);
  assert.equal((await store.wallet("hal")).paid, 0);
});

test("D1 event teams: make, join up to the limit, set out, count steps, claim once, and leave only while recruiting", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const users = ["u1", "u2", "u3", "u4"].map((id, index) => ({ id, friendCode: `CODE${index}${index}${index}${index}${index}${index}`, name: `Name${index}`, petId: null, goshuinCount: 0, routeName: null }));
  for (const user of users) await store.registerUser(user, `hash-${user.id}`);
  database.exec("INSERT INTO events (id, name, starts_at, ends_at, map_id, min_members, max_members, goal_steps) VALUES ('toki', 'Toki', '2026-09-01T00:00:00.000Z', '2026-10-31T00:00:00.000Z', 'map', 2, 3, 1000)");

  const event = await store.event("toki");
  assert.deepEqual([event.minMembers, event.maxMembers, event.goalSteps], [2, 3, 1000]);

  assert.equal(await store.createEventTeam("u1", "toki", "team-1", "ABCDEF"), "ok");
  assert.equal(await store.createEventTeam("u1", "toki", "team-x", "GGGGGG"), "already_member");
  assert.equal(await store.createEventTeam("u2", "toki", "team-y", "ABCDEF"), "code_taken");

  assert.equal(await store.joinEventTeam("u2", "toki", "ZZZZZZ", 3), "not_found");
  assert.equal(await store.joinEventTeam("u2", "toki", "ABCDEF", 3), "ok");
  assert.equal(await store.joinEventTeam("u2", "toki", "ABCDEF", 3), "already_member");
  assert.equal(await store.joinEventTeam("u3", "toki", "ABCDEF", 3), "ok");
  assert.equal(await store.joinEventTeam("u4", "toki", "ABCDEF", 3), "full");

  const recruiting = await store.eventTeam("u2", "toki");
  assert.deepEqual(recruiting.members.map((member) => member.id), ["u1", "u2", "u3"]);
  assert.equal(recruiting.creatorId, "u1");
  assert.equal(recruiting.status, "recruiting");

  assert.equal(await store.startEventTeam("u2", "toki", 2), "not_creator");
  assert.equal(await store.startEventTeam("u1", "toki", 4), "too_few");
  assert.equal(await store.startEventTeam("u1", "toki", 2), "ok");
  assert.equal(await store.startEventTeam("u1", "toki", 2), "not_recruiting");
  assert.equal(await store.leaveEventTeam("u2", "toki"), "already_started");
  assert.equal(await store.joinEventTeam("u4", "toki", "ABCDEF", 3), "already_started");

  await store.saveEventSteps("u1", "toki", "2026-09-30", 400);
  await store.saveEventSteps("u1", "toki", "2026-10-01", 100);
  await store.saveEventSteps("u2", "toki", "2026-10-01", 300);
  const active = await store.eventTeam("u3", "toki");
  assert.deepEqual(active.members.map((member) => member.steps), [500, 300, 0]);
  assert.equal(active.status, "active");

  assert.equal(await store.claimEvent("u1", "toki"), true);
  assert.equal(await store.claimEvent("u1", "toki"), false);
  assert.equal((await store.eventTeam("u1", "toki")).claimed, true);
  assert.equal((await store.eventTeam("u2", "toki")).claimed, false);

  // Friends both ways, and a recruiting team that empties disappears.
  await store.makeFriends("u2", "u1");
  assert.equal(await store.friendshipExists("u1", "u2"), true);
  assert.equal(await store.friendshipExists("u2", "u1"), true);
  assert.equal(await store.createEventTeam("u4", "toki", "team-4", "QQQQQQ"), "ok");
  assert.equal(await store.leaveEventTeam("u4", "toki"), "ok");
  assert.equal(await store.eventTeam("u4", "toki"), null);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM event_teams WHERE id = 'team-4'").get().n, 0);
  assert.equal(await store.leaveEventTeam("u4", "toki"), "no_team");
});

test("D1 join requests: asked, answered by the maker, set out at two members, full at the limit, gone with the team", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  for (const [index, id] of ["m", "a", "b", "c", "d"].entries()) await store.registerUser({ id, friendCode: `REQ${index}${index}${index}${index}${index}${index}${index}`, name: `N-${id}`, petId: null, goshuinCount: 0, routeName: null }, `hash-${id}`);
  database.exec("INSERT INTO events (id, name, starts_at, ends_at, map_id, min_members, max_members, goal_steps) VALUES ('toki', 'Toki', '2026-09-01T00:00:00.000Z', '2026-10-31T00:00:00.000Z', 'map', 2, 3, 1000)");
  assert.equal(await store.createEventTeam("m", "toki", "team-m", "ABCDEF"), "ok");

  const asked = await store.requestJoinEventTeam("a", "toki", "ABCDEF", 3);
  assert.equal(asked.result, "ok");
  assert.equal((await store.requestJoinEventTeam("a", "toki", "ABCDEF", 3)).result, "already_requested");
  assert.equal((await store.requestJoinEventTeam("a", "toki", "ZZZZZZ", 3)).result, "not_found");
  assert.equal((await store.requestJoinEventTeam("m", "toki", "ABCDEF", 3)).result, "already_member");
  assert.deepEqual((await store.pendingJoinRequest("a", "toki")), { id: asked.request.id, creatorName: "N-m" });
  assert.deepEqual((await store.eventJoinRequests("m", "toki")).map((row) => row.name), ["N-a"]);
  assert.deepEqual(await store.eventJoinRequests("a", "toki"), [], "only the maker sees the requests");
  assert.equal((await store.eventTeam("m", "toki")).members.length, 1, "asking adds nobody");

  assert.equal((await store.answerJoinRequest("a", "toki", asked.request.id, true, 3, 2)).result, "not_creator");
  const accepted = await store.answerJoinRequest("m", "toki", asked.request.id, true, 3, 2);
  assert.deepEqual([accepted.result, accepted.requesterId], ["accepted", "a"]);
  assert.equal((await store.eventTeam("m", "toki")).status, "active", "the second member sets the team out");
  assert.equal(await store.pendingJoinRequest("a", "toki"), null);

  // Members may still be added after setting out, up to the limit; then the requests left over are dropped.
  const b = await store.requestJoinEventTeam("b", "toki", "ABCDEF", 3);
  const c = await store.requestJoinEventTeam("c", "toki", "ABCDEF", 3);
  assert.equal((await store.answerJoinRequest("m", "toki", b.request.id, true, 3, 2)).result, "accepted");
  assert.equal((await store.eventTeam("m", "toki")).members.length, 3);
  assert.equal(await store.pendingJoinRequest("c", "toki"), null, "no room left, so the open request is gone");
  assert.equal((await store.answerJoinRequest("m", "toki", c.request.id, true, 3, 2)).result, "not_found");
  assert.equal((await store.requestJoinEventTeam("d", "toki", "ABCDEF", 3)).result, "full");

  // Declining removes the request and adds nobody; taking one back works once.
  await store.createEventTeam("d", "toki", "team-d", "GHJKLM");
  assert.equal(await store.leaveEventTeam("d", "toki"), "ok");
  await store.createEventTeam("d", "toki", "team-d2", "NPQRST");
  assert.equal(await store.cancelJoinRequest("d", "toki"), false);
});

test("D1 draws: a stale paid-pull count writes nothing, and an operation id keeps the answer", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  await store.registerUser({ id: "gina", friendCode: "GINA123456", name: "Gina", petId: null, goshuinCount: 0, routeName: null }, "hash");
  database.exec("INSERT INTO gacha_wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) VALUES ('seed', 'gina', 'paid', 5, 'seed', 'seed', 'now')");
  const draw = { petId: "pet-a", kind: "paid", isNew: true, guaranteed: false };

  await store.commitDraws("gina", [draw], "paid", 1, { opId: "op-first-0001", result: '{"results":[1]}', previousPaidPulls: 0 });
  assert.equal(await store.gachaOp("gina", "op-first-0001"), '{"results":[1]}');
  assert.equal(await store.gachaOp("gina", "nothing-here"), null);
  assert.equal((await store.wallet("gina")).paidPulls, 1);

  // A second draw still working from the old count must not write anything.
  await assert.rejects(() => store.commitDraws("gina", [draw], "paid", 1, { opId: "op-stale-0002", result: "{}", previousPaidPulls: 0 }));
  assert.equal((await store.wallet("gina")).paid, 4);
  assert.equal((await store.wallet("gina")).paidPulls, 1);
  assert.equal(await store.gachaOp("gina", "op-stale-0002"), null);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM gacha_pulls WHERE user_id = 'gina'").get().n, 1);

  // The same operation id cannot be recorded twice.
  await assert.rejects(() => store.commitDraws("gina", [draw], "paid", 2, { opId: "op-first-0001", result: "{}", previousPaidPulls: 1 }));
  assert.equal((await store.wallet("gina")).paid, 4);
  // And the guard is ready for the next draw.
  await store.commitDraws("gina", [draw], "paid", 2, { opId: "op-next-0003", result: "{}", previousPaidPulls: 1 });
  assert.equal((await store.wallet("gina")).paid, 3);
});

test("D1 blocks: end the friendship and pending requests, hide both players from each other, and take reports", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  for (const [id, code] of [["ann", "ANN1234567"], ["ben", "BEN1234567"], ["cat", "CAT1234567"]]) {
    await store.registerUser({ id, friendCode: code, name: id.toUpperCase(), petId: null, goshuinCount: 0, routeName: null }, `hash-${id}`);
  }
  await store.makeFriends("ann", "ben");
  await store.makeFriends("ann", "cat");
  await store.requestFriend("ben", "ann", "req-1");
  assert.equal((await store.friends("ann")).length, 2);

  await store.blockUser("ann", "ben");
  assert.equal(await store.blockedEither("ann", "ben"), true);
  assert.equal(await store.blockedEither("ben", "ann"), true);
  assert.equal(await store.blockedEither("ann", "cat"), false);
  assert.deepEqual((await store.friends("ann")).map((friend) => friend.id), ["cat"]);
  assert.equal((await store.friends("ben")).length, 0);
  assert.equal((await store.friendRequests("ann")).length, 0);
  assert.deepEqual((await store.blockedUsers("ann")).map((user) => user.id), ["ben"]);
  assert.deepEqual(await store.blockedUsers("ben"), []);

  // Blocking twice changes nothing; unblocking removes the block.
  await store.blockUser("ann", "ben");
  await store.unblockUser("ann", "ben");
  assert.equal(await store.blockedEither("ann", "ben"), false);

  await store.reportUser("ann", "ben", "name", "メモ", "report-1");
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM user_reports WHERE reported_id = 'ben'").get().n, 1);
  assert.equal(database.prepare("SELECT reason FROM user_reports WHERE id = 'report-1'").get().reason, "name");
  // Deleting the reported player removes the report with them.
  await store.deleteUser("ben");
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM user_reports").get().n, 0);
});

test("D1 purge drops finished counters of every clock and old stored draw answers, and keeps current ones", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const now = new Date("2026-10-10T12:00:00.000Z");
  const minute = Math.floor(now.getTime() / 60_000), hour = Math.floor(now.getTime() / 3_600_000), day = Math.floor(now.getTime() / 86_400_000);
  // Counters written by the current code carry their expiry; older rows have none and go by their window number.
  const put = (key, window, windowMs) => database.prepare("INSERT INTO rate_limits (key, window, count, expires_at) VALUES (?, ?, 1, ?)").run(key, window, windowMs ? (window + 2) * windowMs : null);
  put("register:minute:old", minute - 60, 60_000); put("register:minute:new", minute, 60_000);
  put("team-join:old", hour - 10, 3_600_000); put("team-join:new", hour, 3_600_000);
  put("report:old", day - 5, 86_400_000); put("report:new", day, 86_400_000);
  put("legacy:minute:old", minute - 60); put("legacy:minute:new", minute);
  const outcome = await store.purgeExpired(now);
  const left = database.prepare("SELECT key FROM rate_limits ORDER BY key").all().map((row) => row.key);
  assert.deepEqual(left, ["legacy:minute:new", "register:minute:new", "report:new", "team-join:new"]);
  assert.deepEqual(outcome, { rateLimitsRemoved: 4, rateLimitsRemaining: 4, expiredLeft: 0, oldestExpiredAgeMs: 0, reachedLimit: false });
});

test("D1 a plan period is not written for a transaction that is already refunded", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  await store.registerUser({ id: "dana", friendCode: "DANA123456", name: "Dana", petId: null, goshuinCount: 0, routeName: null }, "hash-d");
  const start = new Date(Date.now() - 1000).toISOString();
  const end = new Date(Date.now() + 30 * 86_400_000).toISOString();
  await store.revokePurchase("plan-tx", 0, { name: "plus", periodStart: start });
  await store.recordPlanPeriod("dana", "plus", start, end, 1, "plan-tx");
  assert.equal(await store.activePlan("dana", new Date().toISOString()), null);
  assert.equal((await store.wallet("dana")).paid, 0);
  await store.recordPlanPeriod("dana", "plus", start, end, 1, "plan-ok");
  assert.equal(await store.activePlan("dana", new Date().toISOString()), "plus");
  assert.equal((await store.wallet("dana")).paid, 1);
});

test("D1 sending the same plan period twice credits it once, and a refund after that takes it back and ends the plan", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  await store.registerUser({ id: "erin", friendCode: "ERIN123456", name: "Erin", petId: null, goshuinCount: 0, routeName: null }, "hash-e");
  const start = new Date(Date.now() - 1000).toISOString();
  const end = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const transaction = { transactionId: "plan-twice", productId: "plus.monthly", bundleId: "b", purchaseDate: Date.parse(start), expiresDate: Date.parse(end), appAccountToken: "erin", environment: "Production" };
  await store.recordPurchase("erin", transaction, { plan: "plus", monthlyPulls: 1 });
  await store.recordPlanPeriod("erin", "plus", start, end, 1, "plan-twice");
  await store.recordPlanPeriod("erin", "plus", start, end, 1, "plan-twice");
  assert.equal((await store.wallet("erin")).paid, 1);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM entitlements WHERE user_id = 'erin'").get().n, 1);
  await store.revokePurchase("plan-twice", 0, { name: "plus", periodStart: start });
  assert.equal(await store.activePlan("erin", new Date().toISOString()), null);
  assert.equal((await store.wallet("erin")).paid, 0);
  await store.recordPlanPeriod("erin", "plus", start, end, 1, "plan-twice");
  assert.equal((await store.wallet("erin")).paid, 0);
});

test("D1 push tokens: kept per player (the latest few), moved with the device, chosen by category, and gone with the player", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  for (const id of ["fay", "gus"]) await store.registerUser({ id, friendCode: id.toUpperCase().padEnd(10, "0"), name: id, petId: null, goshuinCount: 0, routeName: null }, "hash-" + id);
  for (let i = 1; i <= 7; i += 1) await store.savePushToken("fay", "ExponentPushToken[device" + i + "device]", { team: true, friend: i % 2 === 0 });
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM push_tokens WHERE user_id = 'fay'").get().n, 5);
  assert.equal((await store.pushTokens(["fay"], "team")).length, 5);
  assert.ok((await store.pushTokens(["fay"], "friend")).length < 5);
  // The same device signing in as someone else moves the token.
  await store.savePushToken("gus", "ExponentPushToken[device7device]", { team: true, friend: true });
  assert.deepEqual(await store.pushTokens(["gus"], "team"), ["ExponentPushToken[device7device]"]);
  // Someone else cannot remove a token that is not theirs.
  await store.removePushToken("ExponentPushToken[device7device]", "fay");
  assert.equal((await store.pushTokens(["gus"], "team")).length, 1);
  await store.removePushToken("ExponentPushToken[device7device]", "gus");
  assert.equal((await store.pushTokens(["gus"], "team")).length, 0);
  assert.deepEqual(await store.pushTokens([], "team"), []);
  assert.equal(await store.markPushSent("cleared:t1"), true);
  assert.equal(await store.markPushSent("cleared:t1"), false);
  await store.deleteUser("fay");
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM push_tokens WHERE user_id = 'fay'").get().n, 0);
});

test("D1 a join request is not accepted when anyone already in the team has a block with the asker", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  for (const [index, id] of ["m", "b", "c"].entries()) await store.registerUser({ id, friendCode: `BLK${index}${index}${index}${index}${index}${index}${index}`, name: `N-${id}`, petId: null, goshuinCount: 0, routeName: null }, `hash-${id}`);
  database.exec("INSERT INTO events (id, name, starts_at, ends_at, map_id, min_members, max_members, goal_steps) VALUES ('toki', 'Toki', '2026-09-01T00:00:00.000Z', '2026-10-31T00:00:00.000Z', 'map', 2, 4, 1000)");
  await store.createEventTeam("m", "toki", "team-m", "ABCDEF");
  const later = () => new Promise((resolve) => setTimeout(resolve, 5));
  await later();
  const askedB = await store.requestJoinEventTeam("b", "toki", "ABCDEF", 4);
  const askedC = await store.requestJoinEventTeam("c", "toki", "ABCDEF", 4);
  assert.equal((await store.answerJoinRequest("m", "toki", askedB.request.id, true, 4, 2)).result, "accepted");
  await later();
  // B (already in) blocks C after C asked: the maker has no block with C, but the team does.
  await store.blockUser("b", "c");
  const answered = await store.answerJoinRequest("m", "toki", askedC.request.id, true, 4, 2);
  assert.equal(answered.result, "declined");
  assert.deepEqual((await store.eventTeam("m", "toki")).members.map((member) => member.id).sort(), ["b", "m"]);
  // The other direction: C blocking a member counts the same.
  await store.registerUser({ id: "d", friendCode: "BLKDDDDDDD", name: "N-d", petId: null, goshuinCount: 0, routeName: null }, "hash-d");
  const askedD = await store.requestJoinEventTeam("d", "toki", "ABCDEF", 4);
  await store.blockUser("d", "b");
  assert.equal((await store.answerJoinRequest("m", "toki", askedD.request.id, true, 4, 2)).result, "declined");
});

test("D1 clean-up removes a large pile of expired counters in slices, keeps current ones, and reports what is left", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const now = new Date("2026-10-10T12:00:00.000Z");
  const insert = database.prepare("INSERT INTO rate_limits (key, window, count, expires_at) VALUES (?, ?, 1, ?)");
  for (let i = 0; i < 1_300; i += 1) insert.run(`register:minute:${i}`, 1, now.getTime() - 1_000 - i);
  for (let i = 0; i < 5; i += 1) insert.run(`register:minute:live${i}`, 2, now.getTime() + 60_000);
  const outcome = await store.purgeExpired(now);
  assert.deepEqual(outcome, { rateLimitsRemoved: 1_300, rateLimitsRemaining: 5, expiredLeft: 0, oldestExpiredAgeMs: 0, reachedLimit: false });
  // The expiry is searched by its index, not by scanning the table.
  const plan = database.prepare("EXPLAIN QUERY PLAN SELECT rowid FROM rate_limits WHERE expires_at IS NOT NULL AND expires_at < 1 LIMIT 500").all().map((row) => row.detail).join(" | ");
  assert.match(plan, /USING (COVERING )?INDEX rate_limits_expiry/);
});

test("D1 many hits on one counter in the same moment all count (no lost update)", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const counts = await Promise.all(Array.from({ length: 25 }, () => store.hitRateLimit("steps:p", 7, 3_600_000)));
  assert.deepEqual([...counts].sort((a, b) => a - b), Array.from({ length: 25 }, (_, index) => index + 1));
});

test("D1 clean-up that reaches its slice limit says it is behind, and the next run catches up", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const now = new Date("2026-10-10T12:00:00.000Z");
  const insert = database.prepare("INSERT INTO rate_limits (key, window, count, expires_at) VALUES (?, 1, 1, ?)");
  database.exec("BEGIN");
  for (let i = 0; i < 10_600; i += 1) insert.run(`register:minute:${i}`, now.getTime() - 60_000 - i);
  database.exec("COMMIT");
  const first = await store.purgeExpired(now);
  assert.equal(first.rateLimitsRemoved, 10_000);
  assert.equal(first.reachedLimit, true);
  assert.equal(first.expiredLeft, 600);
  assert.ok(first.oldestExpiredAgeMs >= 60_000);
  const second = await store.purgeExpired(now);
  assert.deepEqual([second.rateLimitsRemoved, second.expiredLeft, second.reachedLimit, second.oldestExpiredAgeMs], [600, 0, false, 0]);
});
