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
  assert.equal(await store.claimFreePull(alice.id, "route-a"), true);
  assert.equal(await store.claimFreePull(alice.id, "route-a"), false);
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

test("D1 rate limit counts within a window and drops every older window of the same kind", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  assert.equal(await store.hitRateLimit("register:minute:a", 100), 1);
  assert.equal(await store.hitRateLimit("register:minute:a", 100), 2);
  assert.equal(await store.hitRateLimit("register:minute:b", 100), 1);
  assert.equal(await store.hitRateLimit("register:minute:a", 101), 1);
  // b's window 100 is over by now (a is already in window 101), so it is gone too: no address is kept past its window.
  assert.deepEqual(database.prepare("SELECT key, window, count FROM rate_limits ORDER BY key, window").all().map((row) => ({ ...row })), [
    { key: "register:minute:a", window: 101, count: 1 }
  ]);
  // Another kind keeps its own numbering.
  assert.equal(await store.hitRateLimit("register:day:a", 5), 1);
  assert.equal(await store.hitRateLimit("register:minute:c", 102), 1);
  assert.deepEqual(database.prepare("SELECT key FROM rate_limits ORDER BY key").all().map((row) => row.key), ["register:day:a", "register:minute:c"]);
});

test("D1 mergeOwnedPets only raises copy counts", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  await store.registerUser({ id: "carol", friendCode: "CAROL12345", name: "Carol", petId: null, goshuinCount: 0, routeName: null }, "hash-c");
  await store.mergeOwnedPets("carol", { a: 2, b: 1 });
  await store.mergeOwnedPets("carol", { a: 1, c: 3 });
  await store.mergeOwnedPets("carol", {});
  assert.deepEqual(await store.ownedPets("carol"), { a: 2, b: 1, c: 3 });
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

  await store.claimFreePull("gone", "route-1");
  await store.chooseStarter("gone", "pet-a");
  await store.putCloudSave("gone", "{\"a\":1}", 0);
  await store.linkApple("gone", "apple-sub-gone");
  await store.setAgeGroup("gone", "adult");
  await store.requestFriend("gone", "stay", "req-1");
  await store.answerFriendRequest("stay", "req-1", "accepted");
  database.prepare("INSERT INTO purchases (apple_transaction_id, user_id, product_id, original_transaction_id, granted_at, revoked_at) VALUES ('tx-1', 'gone', 'p', NULL, '2026-10-01T00:00:00.000Z', NULL)").run();
  database.prepare("INSERT INTO gacha_pulls (id, user_id, result_pet_id, pulled_at, kind, is_new, guaranteed) VALUES ('pull-1', 'gone', 'pet-a', '2026-10-01T00:00:00.000Z', 'paid', 1, 0)").run();
  await store.claimFreePull("stay", "route-9");
  database.prepare("INSERT INTO refund_debt (user_id, pulls) VALUES ('gone', 2)").run();
  database.prepare("INSERT INTO refund_events (transaction_id, user_id, pulls, taken, debt, debt_applied, created_at) VALUES ('tx-r', 'gone', 5, 3, 2, 1, '2026-10-01T00:00:00.000Z')").run();
  database.prepare("INSERT INTO purchase_settlements (transaction_id, user_id, pulls, paid_off, credited, created_at) VALUES ('tx-s', 'gone', 5, 0, 5, '2026-10-01T00:00:00.000Z')").run();

  await store.deleteUser("gone");

  // Every table with a column that points at a user must have no row for the deleted user.
  const columns = { users: "id", friendships: "user_id", friend_requests: "from_id", purchases: "user_id", entitlements: "user_id", ticket_ledger: "user_id", gift_claims: "user_id", gacha_wallet: "user_id", gacha_wallet_ledger: "user_id", gacha_pulls: "user_id", gacha_state: "user_id", user_pets: "user_id", free_pull_claims: "user_id", event_members: "user_id", event_steps: "user_id", apple_links: "user_id", user_limits: "user_id", cloud_saves: "user_id", refund_debt: "user_id", refund_events: "user_id", purchase_settlements: "user_id" };
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

test("D1 refunds: unspent tickets are taken back, the spent part becomes a debt the next purchase pays off first, and repeats change nothing", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  const make = (id, code) => store.registerUser({ id, friendCode: code, name: id, petId: null, goshuinCount: 0, routeName: null }, "hash-" + id);
  await make("fay", "FAY1234567");
  const buy = (id, productId, purchaseDate = Date.parse("2026-10-04T00:00:00Z")) => store.recordPurchase("fay", { transactionId: id, productId, purchaseDate }, { paidPulls: productId === "five" ? 5 : 1 });
  const state = async () => { const w = await store.wallet("fay"); return [w.paid, w.refundDebt]; };
  const spend = (count) => store.commitDraws("fay", Array.from({ length: count }, () => ({ petId: "pet-a", kind: "paid", isNew: false, guaranteed: false })), "paid", count);

  // Buy five, spend three, get the purchase refunded: two unspent are taken back, three become a debt.
  assert.equal(await buy("tx1", "five"), true);
  assert.deepEqual(await state(), [5, 0]);
  await spend(3);
  assert.deepEqual(await state(), [2, 0]);
  await store.revokePurchase("tx1", 5);
  assert.deepEqual(await state(), [0, 3]);
  await store.revokePurchase("tx1", 5);
  await store.revokePurchase("tx1", 5);
  assert.deepEqual(await state(), [0, 3], "the same refund twice changes nothing");

  // The next purchase pays the debt first.
  assert.equal(await buy("tx2", "five"), true);
  assert.deepEqual(await state(), [2, 0]);
  assert.equal(await buy("tx2", "five"), false);
  assert.deepEqual(await state(), [2, 0], "the same purchase twice changes nothing");

  // Refunding that purchase puts things back as they were.
  await store.revokePurchase("tx2", 5);
  assert.deepEqual(await state(), [0, 3]);

  // A small purchase is absorbed by the debt entirely; refunding it adds the debt back.
  assert.equal(await buy("tx3", "single"), true);
  assert.deepEqual(await state(), [0, 2]);
  await store.revokePurchase("tx3", 1);
  assert.deepEqual(await state(), [0, 3]);

  // A refund of something never recorded does nothing.
  await store.revokePurchase("unknown", 5);
  assert.deepEqual(await state(), [0, 3]);

  // Refunding a purchase that was never spent takes it all back and owes nothing.
  await make("gus", "GUS1234567");
  await store.recordPurchase("gus", { transactionId: "g1", productId: "five", purchaseDate: 0 }, { paidPulls: 5 });
  await store.revokePurchase("g1", 5);
  const gus = await store.wallet("gus");
  assert.deepEqual([gus.paid, gus.refundDebt], [0, 0]);
  assert.equal(database.prepare("SELECT revoked_at IS NOT NULL AS revoked FROM purchases WHERE apple_transaction_id = 'g1'").get().revoked, 1);
});
