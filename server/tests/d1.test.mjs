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
  assert.deepEqual(await store.wallet(alice.id), { paid: 0, free: 1, paidPulls: 0 });

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
  assert.deepEqual(await store.wallet(alice.id), { paid: 5, free: 1, paidPulls: 0 });

  assert.equal(await store.chooseStarter(alice.id, "mobibou"), true);
  assert.equal(await store.chooseStarter(alice.id, "mobirin"), false);
  assert.deepEqual(await store.ownedPets(alice.id), { mobibou: 1 });
  assert.equal(await store.claimFreePull(alice.id, "route-a"), true);
  assert.equal(await store.claimFreePull(alice.id, "route-a"), false);
  assert.deepEqual(await store.wallet(alice.id), { paid: 5, free: 2, paidPulls: 0 });

  await store.commitDraws(alice.id, [{ petId: "mobibou", kind: "free", isNew: false, guaranteed: false }], "free", 0);
  assert.deepEqual(await store.wallet(alice.id), { paid: 5, free: 1, paidPulls: 0 });
  assert.deepEqual(await store.ownedPets(alice.id), { mobibou: 2 });
  await assert.rejects(() => store.commitDraws(alice.id, [
    { petId: "mobirin", kind: "paid", isNew: true, guaranteed: false },
    { petId: "mobirin", kind: "paid", isNew: false, guaranteed: false },
    { petId: null, kind: "paid", isNew: true, guaranteed: false },
    { petId: "mobichi", kind: "paid", isNew: true, guaranteed: false },
    { petId: "mobibou", kind: "paid", isNew: false, guaranteed: false }
  ], "paid", 5));
  assert.deepEqual(await store.wallet(alice.id), { paid: 5, free: 1, paidPulls: 0 });
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

test("D1 rate limit counts within a window and drops older windows of the same key", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const store = new D1Store(new SQLiteD1(database));
  assert.equal(await store.hitRateLimit("register:minute:a", 100), 1);
  assert.equal(await store.hitRateLimit("register:minute:a", 100), 2);
  assert.equal(await store.hitRateLimit("register:minute:b", 100), 1);
  assert.equal(await store.hitRateLimit("register:minute:a", 101), 1);
  assert.deepEqual(database.prepare("SELECT key, window, count FROM rate_limits ORDER BY key, window").all().map((row) => ({ ...row })), [
    { key: "register:minute:a", window: 101, count: 1 },
    { key: "register:minute:b", window: 100, count: 1 }
  ]);
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
