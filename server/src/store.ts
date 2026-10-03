import type { AgeGroup, AppleLinkResult, CloudSave, D1Database, Draw, EventRecord, Gift, ProductDefinition, Store, User, VerifiedTransaction } from "./types.ts";
import { randomToken } from "./crypto.ts";

const nowIso = (): string => new Date().toISOString();
const ledgerId = (): string => crypto.randomUUID();

export class D1Store implements Store {
  private readonly db: D1Database;
  constructor(db: D1Database) { this.db = db; }

  async updateProfile(userId: string, name: string, petId: string | null): Promise<void> {
    await this.db.prepare("UPDATE users SET name = ?, pet_id = ? WHERE id = ?").bind(name, petId, userId).run();
  }

  async friendshipExists(userId: string, friendId: string): Promise<boolean> {
    return !!(await this.db.prepare("SELECT 1 AS found FROM friendships WHERE user_id = ? AND friend_id = ?").bind(userId, friendId).first());
  }

  async pendingRequestExists(fromId: string, toId: string): Promise<boolean> {
    return !!(await this.db.prepare("SELECT 1 AS found FROM friend_requests WHERE from_id = ? AND to_id = ? AND status = 'pending'").bind(fromId, toId).first());
  }

  async cloudSave(userId: string): Promise<CloudSave | null> {
    const row = await this.db.prepare("SELECT data, version, updated_at FROM cloud_saves WHERE user_id = ?").bind(userId).first<{ data: string; version: number; updated_at: string }>();
    return row ? { data: row.data, version: row.version, updatedAt: row.updated_at } : null;
  }

  async putCloudSave(userId: string, data: string, baseVersion: number): Promise<number | null> {
    const now = nowIso();
    const result = baseVersion === 0
      ? await this.db.prepare("INSERT INTO cloud_saves (user_id, data, version, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT (user_id) DO NOTHING").bind(userId, data, now).run()
      : await this.db.prepare("UPDATE cloud_saves SET data = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND version = ?").bind(data, now, userId, baseVersion).run();
    return (result.meta?.changes ?? 0) > 0 ? baseVersion + 1 : null;
  }

  async linkApple(userId: string, appleSub: string): Promise<AppleLinkResult> {
    const bySub = await this.db.prepare("SELECT user_id FROM apple_links WHERE apple_sub = ?").bind(appleSub).first<{ user_id: string }>();
    if (bySub) return bySub.user_id === userId ? "already_linked" : "apple_in_use";
    if (await this.db.prepare("SELECT 1 AS found FROM apple_links WHERE user_id = ?").bind(userId).first()) return "account_has_other_apple";
    await this.db.prepare("INSERT INTO apple_links (apple_sub, user_id, linked_at) VALUES (?, ?, ?)").bind(appleSub, userId, nowIso()).run();
    return "linked";
  }

  async userByApple(appleSub: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT user_id FROM apple_links WHERE apple_sub = ?").bind(appleSub).first<{ user_id: string }>();
    return row?.user_id ?? null;
  }

  async appleLinked(userId: string): Promise<boolean> {
    return !!(await this.db.prepare("SELECT 1 AS found FROM apple_links WHERE user_id = ?").bind(userId).first());
  }

  async rotateSecret(userId: string, secretHash: string): Promise<void> {
    await this.db.prepare("UPDATE users SET secret_hash = ? WHERE id = ?").bind(secretHash, userId).run();
  }

  async ageGroup(userId: string): Promise<AgeGroup | null> {
    const row = await this.db.prepare("SELECT age_group FROM user_limits WHERE user_id = ?").bind(userId).first<{ age_group: AgeGroup }>();
    return row?.age_group ?? null;
  }

  async setAgeGroup(userId: string, group: AgeGroup): Promise<void> {
    await this.db.prepare("INSERT INTO user_limits (user_id, age_group, set_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET age_group = excluded.age_group, set_at = excluded.set_at")
      .bind(userId, group, nowIso()).run();
  }

  async purchasedProducts(userId: string, from: string, to: string): Promise<string[]> {
    const rows = await this.db.prepare("SELECT product_id FROM purchases WHERE user_id = ? AND revoked_at IS NULL AND granted_at >= ? AND granted_at < ?")
      .bind(userId, from, to).all<{ product_id: string }>();
    return (rows.results ?? []).map((row) => row.product_id);
  }

  async hitRateLimit(key: string, window: number): Promise<number> {
    const row = await this.db.prepare("INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1) ON CONFLICT (key, window) DO UPDATE SET count = count + 1 RETURNING count")
      .bind(key, window).first<{ count: number }>();
    // Day counters are numbered in days and minute counters in minutes, so only same-kind rows this old are safe to drop.
    await this.db.prepare("DELETE FROM rate_limits WHERE key = ? AND window < ?").bind(key, window).run();
    return row?.count ?? 1;
  }

  async registerUser(user: User, secretHash: string): Promise<void> {
    const now = nowIso();
    await this.db.batch([
      this.db.prepare("INSERT INTO users (id, secret_hash, friend_code, name, pet_id, goshuin_count, route_name, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(user.id, secretHash, user.friendCode, user.name, user.petId, user.goshuinCount, user.routeName, now),
      this.db.prepare("INSERT INTO gacha_wallet (user_id) VALUES (?)").bind(user.id),
      this.db.prepare("INSERT INTO gacha_state (user_id) VALUES (?)").bind(user.id)
    ]);
  }

  async credentialHash(userId: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT secret_hash FROM users WHERE id = ?").bind(userId).first<{ secret_hash: string }>();
    return row?.secret_hash ?? null;
  }

  async user(userId: string): Promise<User | null> {
    const row = await this.db.prepare("SELECT id, friend_code, name, pet_id, goshuin_count, route_name FROM users WHERE id = ?")
      .bind(userId).first<{ id: string; friend_code: string; name: string; pet_id: string | null; goshuin_count: number; route_name: string | null }>();
    return row ? { id: row.id, friendCode: row.friend_code, name: row.name, petId: row.pet_id, goshuinCount: row.goshuin_count, routeName: row.route_name } : null;
  }

  async userByFriendCode(friendCode: string): Promise<User | null> {
    const row = await this.db.prepare("SELECT id FROM users WHERE friend_code = ?").bind(friendCode).first<{ id: string }>();
    return row ? this.user(row.id) : null;
  }

  async claimGift(userId: string, gift: Gift): Promise<boolean> {
    const now = nowIso();
    const statements = [
      this.db.prepare("INSERT OR IGNORE INTO gift_claims (user_id, gift_id, claimed_at) VALUES (?, ?, ?)").bind(userId, gift.id, now),
    ];
    if ((gift.tickets ?? 0) > 0) statements.push(this.db.prepare("INSERT OR IGNORE INTO ticket_ledger (id, user_id, delta, reason, ref, created_at) SELECT ?, ?, ?, 'gift', ?, ? WHERE changes() = 1")
      .bind(ledgerId(), userId, gift.tickets, gift.id, now));
    if ((gift.freePulls ?? 0) > 0) statements.push(this.db.prepare("INSERT OR IGNORE INTO gacha_wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) SELECT ?, ?, 'free', ?, 'gift', ?, ? WHERE changes() = 1")
      .bind(ledgerId(), userId, gift.freePulls, gift.id, now));
    if ((gift.paidPulls ?? 0) > 0) statements.push(this.db.prepare("INSERT OR IGNORE INTO gacha_wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) SELECT ?, ?, 'paid', ?, 'gift', ?, ? WHERE changes() = 1")
      .bind(ledgerId(), userId, gift.paidPulls, gift.id, now));
    const results = await this.db.batch(statements);
    return (results[0]?.meta?.changes ?? 0) > 0;
  }

  async ticketBalance(userId: string): Promise<number> {
    const row = await this.db.prepare("SELECT COALESCE(SUM(delta), 0) AS balance FROM ticket_ledger WHERE user_id = ?").bind(userId).first<{ balance: number }>();
    return row?.balance ?? 0;
  }

  async consumeTickets(userId: string, amount: number, ref: string): Promise<boolean> {
    const result = await this.db.prepare(`INSERT INTO ticket_ledger (id, user_id, delta, reason, ref, created_at)
      SELECT ?, ?, ?, 'consume', ?, ? WHERE COALESCE((SELECT SUM(delta) FROM ticket_ledger WHERE user_id = ?), 0) >= ?
      ON CONFLICT(user_id, reason, ref) DO NOTHING`)
      .bind(ledgerId(), userId, -amount, ref, nowIso(), userId, amount).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async grantMonthlyTickets(userId: string, plan: string, periodStart: string, periodEnd: string, amount: number): Promise<boolean> {
    if (amount <= 0) return false;
    const results = await this.db.batch([
      this.db.prepare("INSERT INTO entitlements (user_id, plan, period_start, period_end, tickets_granted_period) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, plan, period_start) DO NOTHING")
        .bind(userId, plan, periodStart, periodEnd, amount),
      this.db.prepare("INSERT INTO ticket_ledger (id, user_id, delta, reason, ref, created_at) SELECT ?, ?, ?, 'monthly_subscription', ?, ? WHERE changes() = 1 ON CONFLICT(user_id, reason, ref) DO NOTHING")
        .bind(ledgerId(), userId, amount, `${plan}:${periodStart}`, nowIso())
    ]);
    return (results[1]?.meta?.changes ?? 0) > 0;
  }

  async recordPurchase(userId: string, transaction: VerifiedTransaction, product: ProductDefinition): Promise<boolean> {
    const now = nowIso();
    const statements = [
      this.db.prepare("INSERT OR IGNORE INTO purchases (apple_transaction_id, user_id, product_id, original_transaction_id, granted_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)")
        .bind(transaction.transactionId, userId, transaction.productId, transaction.originalTransactionId ?? null, now)
    ];
    if ((product.paidPulls ?? 0) > 0) statements.push(this.db.prepare("INSERT OR IGNORE INTO gacha_wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) SELECT ?, ?, 'paid', ?, 'purchase', ?, ? WHERE changes() = 1")
      .bind(ledgerId(), userId, product.paidPulls, transaction.transactionId, now));
    if (product.plan && (product.monthlyTickets ?? 0) > 0 && transaction.expiresDate) {
      const start = new Date(transaction.purchaseDate).toISOString();
      const end = new Date(transaction.expiresDate).toISOString();
      statements.push(this.db.prepare("INSERT INTO entitlements (user_id, plan, period_start, period_end, tickets_granted_period) SELECT ?, ?, ?, ?, ? WHERE changes() = 1 ON CONFLICT(user_id, plan, period_start) DO NOTHING")
        .bind(userId, product.plan, start, end, product.monthlyTickets));
      statements.push(this.db.prepare("INSERT INTO ticket_ledger (id, user_id, delta, reason, ref, created_at) SELECT ?, ?, ?, 'monthly_subscription', ?, ? WHERE changes() = 1 ON CONFLICT(user_id, reason, ref) DO NOTHING")
        .bind(ledgerId(), userId, product.monthlyTickets, `${product.plan}:${start}`, now));
    } else if ((product.monthlyTickets ?? 0) > 0) {
      statements.push(this.db.prepare("INSERT OR IGNORE INTO ticket_ledger (id, user_id, delta, reason, ref, created_at) SELECT ?, ?, ?, 'purchase', ?, ? WHERE changes() = 1")
        .bind(ledgerId(), userId, product.monthlyTickets, transaction.transactionId, now));
    }
    const results = await this.db.batch(statements);
    const granted = (results[0]?.meta?.changes ?? 0) > 0;
    if (transaction.revocationDate) await this.revokePurchase(transaction.transactionId);
    return granted;
  }

  async revokePurchase(transactionId: string): Promise<void> {
    await this.db.prepare("UPDATE purchases SET revoked_at = ? WHERE apple_transaction_id = ?").bind(nowIso(), transactionId).run();
  }

  async wallet(userId: string): Promise<{ paid: number; free: number; paidPulls: number }> {
    const row = await this.db.prepare(`SELECT w.paid_balance, w.free_balance, COALESCE(s.paid_pull_count, 0) AS paid_pulls
      FROM gacha_wallet w LEFT JOIN gacha_state s ON s.user_id = w.user_id WHERE w.user_id = ?`)
      .bind(userId).first<{ paid_balance: number; free_balance: number; paid_pulls: number }>();
    return { paid: row?.paid_balance ?? 0, free: row?.free_balance ?? 0, paidPulls: row?.paid_pulls ?? 0 };
  }

  async ownedPets(userId: string): Promise<Record<string, number>> {
    const rows = await this.db.prepare("SELECT pet_id, copies FROM user_pets WHERE user_id = ?").bind(userId)
      .all<{ pet_id: string; copies: number }>();
    return Object.fromEntries((rows.results ?? []).map((row) => [row.pet_id, row.copies]));
  }

  async chooseStarter(userId: string, petId: string): Promise<boolean> {
    const result = await this.db.prepare(`INSERT INTO user_pets (user_id, pet_id, copies)
      SELECT ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM user_pets WHERE user_id = ?)`)
      .bind(userId, petId, userId).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async mergeOwnedPets(userId: string, owned: Record<string, number>): Promise<void> {
    const statements = Object.entries(owned).map(([petId, copies]) =>
      this.db.prepare(`INSERT INTO user_pets (user_id, pet_id, copies) VALUES (?, ?, ?)
        ON CONFLICT(user_id, pet_id) DO UPDATE SET copies = MAX(copies, excluded.copies)`).bind(userId, petId, copies));
    if (statements.length) await this.db.batch(statements);
  }

  async claimFreePull(userId: string, routeId: string): Promise<boolean> {
    const result = await this.db.prepare("INSERT OR IGNORE INTO free_pull_claims (user_id, route_id, claimed_at) VALUES (?, ?, ?)")
      .bind(userId, routeId, nowIso()).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async commitDraws(userId: string, draws: Draw[], kind: "free" | "paid", paidPulls: number): Promise<void> {
    const now = nowIso();
    const spent = draws.length;
    const statements = [
      this.db.prepare("INSERT INTO gacha_wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, 'gacha_pull', ?, ?)")
        .bind(ledgerId(), userId, kind, -spent, randomToken(16), now),
      ...draws.flatMap((draw) => [
        this.db.prepare("INSERT INTO gacha_pulls (id, user_id, result_pet_id, pulled_at, kind, is_new, guaranteed) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), userId, draw.petId, now, draw.kind, draw.isNew ? 1 : 0, draw.guaranteed ? 1 : 0),
        this.db.prepare(`INSERT INTO user_pets (user_id, pet_id, copies) VALUES (?, ?, 1)
          ON CONFLICT(user_id, pet_id) DO UPDATE SET copies = copies + 1`).bind(userId, draw.petId)
      ]),
      ...(kind === "paid" ? [this.db.prepare("UPDATE gacha_state SET paid_pull_count = ? WHERE user_id = ?").bind(paidPulls, userId)] : [])
    ];
    await this.db.batch(statements);
  }

  async friends(userId: string): Promise<unknown[]> {
    const result = await this.db.prepare(`SELECT u.id, u.name, u.pet_id AS petId FROM friendships f JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = ? ORDER BY f.created_at DESC`).bind(userId).all();
    return result.results ?? [];
  }

  async friendRequests(userId: string): Promise<unknown[]> {
    const result = await this.db.prepare(`SELECT r.id, r.from_id AS fromId, u.name AS fromName, u.pet_id AS fromPetId, r.created_at AS createdAt
      FROM friend_requests r JOIN users u ON u.id = r.from_id WHERE r.to_id = ? AND r.status = 'pending' ORDER BY r.created_at DESC`)
      .bind(userId).all();
    return result.results ?? [];
  }

  async requestFriend(fromId: string, toId: string, id: string): Promise<void> {
    await this.db.prepare("INSERT INTO friend_requests (id, from_id, to_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)")
      .bind(id, fromId, toId, nowIso()).run();
  }

  async answerFriendRequest(userId: string, requestId: string, answer: "accepted" | "declined"): Promise<boolean> {
    const request = await this.db.prepare("SELECT from_id FROM friend_requests WHERE id = ? AND to_id = ? AND status = 'pending'")
      .bind(requestId, userId).first<{ from_id: string }>();
    if (!request) return false;
    const now = nowIso();
    const results = await this.db.batch([
      this.db.prepare("UPDATE friend_requests SET status = ? WHERE id = ? AND to_id = ? AND status = 'pending'").bind(answer, requestId, userId),
      ...(answer === "accepted" ? [
        this.db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, ?)").bind(userId, request.from_id, now),
        this.db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, ?)").bind(request.from_id, userId, now)
      ] : [])
    ]);
    return (results[0]?.meta?.changes ?? 0) > 0;
  }

  async event(eventId: string): Promise<EventRecord | null> {
    const row = await this.db.prepare("SELECT id, name, starts_at, ends_at, map_id FROM events WHERE id = ?")
      .bind(eventId).first<{ id: string; name: string; starts_at: string; ends_at: string; map_id: string }>();
    return row ? { id: row.id, name: row.name, startsAt: row.starts_at, endsAt: row.ends_at, mapId: row.map_id } : null;
  }

  async saveEventSteps(userId: string, eventId: string, day: string, cumulative: number): Promise<number> {
    await this.db.prepare(`INSERT INTO event_steps (user_id, event_id, day, cumulative, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, event_id, day) DO UPDATE SET cumulative = MAX(event_steps.cumulative, excluded.cumulative), updated_at = excluded.updated_at`)
      .bind(userId, eventId, day, cumulative, nowIso()).run();
    const row = await this.db.prepare("SELECT cumulative FROM event_steps WHERE user_id = ? AND event_id = ? AND day = ?")
      .bind(userId, eventId, day).first<{ cumulative: number }>();
    return row?.cumulative ?? 0;
  }

  async eventStatus(eventId: string): Promise<{ totalCumulative: number; members: number }> {
    const row = await this.db.prepare("SELECT COALESCE(SUM(cumulative), 0) AS total, COUNT(DISTINCT user_id) AS members FROM event_steps WHERE event_id = ?")
      .bind(eventId).first<{ total: number; members: number }>();
    return { totalCumulative: row?.total ?? 0, members: row?.members ?? 0 };
  }
}
