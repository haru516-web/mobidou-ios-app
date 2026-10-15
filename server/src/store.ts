import type { AgeGroup, AppleLinkResult, CloudSave, D1Database, Draw, EventJoinResult, EventRecord, EventStartResult, EventTeamView, Gift, JoinRequestAnswerResult, JoinRequestRequestResult, JoinRequestView, ProductDefinition, Store, User, VerifiedTransaction } from "./types.ts";
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

  async deleteUser(userId: string): Promise<void> {
    // Every table that refers to a user deletes its rows along with the user (ON DELETE CASCADE).
    await this.db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
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

  async appleRefreshToken(userId: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT refresh_token FROM apple_links WHERE user_id = ?").bind(userId).first<{ refresh_token: string | null }>();
    return row?.refresh_token ?? null;
  }

  async setAppleRefreshToken(userId: string, token: string): Promise<void> {
    await this.db.prepare("UPDATE apple_links SET refresh_token = ? WHERE user_id = ?").bind(token, userId).run();
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
    // Counters of one kind ("register:minute:", "register:day:", ...) share a window numbering, so every older window of that kind is
    // finished: drop them all, so a source address is not kept after its window has passed.
    const kind = key.slice(0, key.lastIndexOf(":") + 1);
    await this.db.prepare("DELETE FROM rate_limits WHERE substr(key, 1, ?) = ? AND window < ?").bind(kind.length, kind, window).run();
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
      // Nothing is granted for a transaction whose refund is already on record: the statements below follow `changes()`.
      this.db.prepare(`INSERT OR IGNORE INTO purchases (apple_transaction_id, user_id, product_id, original_transaction_id, granted_at, revoked_at, environment)
        SELECT ?, ?, ?, ?, ?, NULL, ? WHERE NOT EXISTS (SELECT 1 FROM revoked_transactions WHERE transaction_id = ?)`)
        .bind(transaction.transactionId, userId, transaction.productId, transaction.originalTransactionId ?? null, now, transaction.environment ?? "Production", transaction.transactionId)
    ];
    if ((product.paidPulls ?? 0) > 0) {
      // The tickets first pay off any refund debt; only the rest reaches the wallet. Every step is repeat-safe, and the batch is atomic.
      const pulls = product.paidPulls as number;
      const debt = "COALESCE((SELECT pulls FROM refund_debt WHERE user_id = ?), 0)";
      statements.push(
        this.db.prepare(`INSERT OR IGNORE INTO purchase_settlements (transaction_id, user_id, pulls, paid_off, credited, created_at)
          SELECT ?, ?, ?, MIN(?, ${debt}), ? - MIN(?, ${debt}), ? WHERE changes() = 1`)
          .bind(transaction.transactionId, userId, pulls, pulls, userId, pulls, pulls, userId, now),
        this.db.prepare("UPDATE refund_debt SET pulls = pulls - (SELECT paid_off FROM purchase_settlements WHERE transaction_id = ?) WHERE user_id = ? AND changes() = 1")
          .bind(transaction.transactionId, userId),
        this.db.prepare(`INSERT OR IGNORE INTO gacha_wallet_ledger (id, user_id, currency, delta, reason, ref, created_at)
          SELECT 'purchase:' || transaction_id, user_id, 'paid', credited, 'purchase', transaction_id, ? FROM purchase_settlements WHERE transaction_id = ? AND credited > 0`)
          .bind(now, transaction.transactionId)
      );
    }
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
    if (transaction.revocationDate) await this.revokePurchase(transaction.transactionId, product.paidPulls ?? 0);
    return granted;
  }

  async recordPlanPeriod(userId: string, plan: string, periodStart: string, periodEnd: string, pulls: number, transactionId: string): Promise<void> {
    // The refund check is part of each statement, so a refund that lands between the caller's check and this write still wins.
    const notRefunded = "WHERE NOT EXISTS (SELECT 1 FROM revoked_transactions WHERE transaction_id = ?)";
    const statements = [
      this.db.prepare(`INSERT OR IGNORE INTO entitlements (user_id, plan, period_start, period_end, tickets_granted_period) SELECT ?, ?, ?, ?, ? ${notRefunded}`)
        .bind(userId, plan, periodStart, periodEnd, pulls, transactionId),
      ...(pulls > 0 ? [this.db.prepare(`INSERT OR IGNORE INTO gacha_wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) SELECT ?, ?, 'paid', ?, 'plan_monthly', ?, ? ${notRefunded}`)
        .bind(`plan:${transactionId}`, userId, pulls, transactionId, nowIso(), transactionId)] : []),
    ];
    await this.db.batch(statements);
  }

  async activePlan(userId: string, at: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT plan FROM entitlements WHERE user_id = ? AND period_start <= ? AND period_end > ? ORDER BY period_end DESC LIMIT 1")
      .bind(userId, at, at).first<{ plan: string }>();
    return row?.plan ?? null;
  }

  async revokePurchase(transactionId: string, paidPulls = 0, plan?: { name: string; periodStart: string }): Promise<void> {
    const now = nowIso();
    const statements = [
      // Remembered even when the purchase has not been seen yet, so a purchase that arrives later is not credited.
      this.db.prepare("INSERT OR IGNORE INTO revoked_transactions (transaction_id, revoked_at) VALUES (?, ?)").bind(transactionId, now),
      this.db.prepare("UPDATE purchases SET revoked_at = ? WHERE apple_transaction_id = ? AND revoked_at IS NULL").bind(now, transactionId)
    ];
    // Only what is still unspent is taken back, up to what this purchase put in the wallet. What was already spent is not
    // charged to anyone (no debt); a shortfall is only recorded so that repeated refunds can restrict buying.
    if (paidPulls > 0) {
      statements.push(
        this.db.prepare(`INSERT OR IGNORE INTO refund_events (transaction_id, user_id, pulls, taken, debt, debt_applied, created_at)
          SELECT p.apple_transaction_id, p.user_id, ?, MIN(?, w.paid_balance), ? - MIN(?, w.paid_balance), 1, ?
          FROM purchases p JOIN gacha_wallet w ON w.user_id = p.user_id WHERE p.apple_transaction_id = ?`)
          .bind(paidPulls, paidPulls, paidPulls, paidPulls, now, transactionId)
      );
    } else if (plan) {
      // A refunded plan period ends now, and its monthly pull is taken back if it is still unspent.
      statements.push(
        this.db.prepare("UPDATE entitlements SET period_end = ? WHERE plan = ? AND period_start = ? AND period_end > ? AND user_id = (SELECT user_id FROM purchases WHERE apple_transaction_id = ?)")
          .bind(now, plan.name, plan.periodStart, now, transactionId),
        this.db.prepare(`INSERT OR IGNORE INTO refund_events (transaction_id, user_id, pulls, taken, debt, debt_applied, created_at)
          SELECT p.apple_transaction_id, p.user_id, l.delta, MIN(l.delta, w.paid_balance), l.delta - MIN(l.delta, w.paid_balance), 1, ?
          FROM purchases p JOIN gacha_wallet w ON w.user_id = p.user_id
          JOIN gacha_wallet_ledger l ON l.id = 'plan:' || p.apple_transaction_id AND l.delta > 0
          WHERE p.apple_transaction_id = ?`)
          .bind(now, transactionId)
      );
    }
    if (paidPulls > 0 || plan) {
      statements.push(
        this.db.prepare(`INSERT OR IGNORE INTO gacha_wallet_ledger (id, user_id, currency, delta, reason, ref, created_at)
          SELECT 'refund:' || transaction_id, user_id, 'paid', -taken, 'refund', transaction_id, ? FROM refund_events WHERE transaction_id = ? AND taken > 0`)
          .bind(now, transactionId)
      );
    }
    await this.db.batch(statements);
  }

  async savePushToken(userId: string, token: string, prefs: { team: boolean; friend: boolean }): Promise<void> {
    await this.db.batch([
      this.db.prepare(`INSERT INTO push_tokens (token, user_id, team_notify, friend_notify, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, team_notify = excluded.team_notify, friend_notify = excluded.friend_notify, updated_at = excluded.updated_at`)
        .bind(token, userId, prefs.team ? 1 : 0, prefs.friend ? 1 : 0, nowIso()),
      // A player keeps the latest few devices; older ones are dropped.
      this.db.prepare("DELETE FROM push_tokens WHERE user_id = ? AND token NOT IN (SELECT token FROM push_tokens WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5)").bind(userId, userId)
    ]);
  }

  async removePushToken(token: string, userId?: string): Promise<void> {
    if (userId) await this.db.prepare("DELETE FROM push_tokens WHERE token = ? AND user_id = ?").bind(token, userId).run();
    else await this.db.prepare("DELETE FROM push_tokens WHERE token = ?").bind(token).run();
  }

  async pushTokens(userIds: readonly string[], category: "team" | "friend"): Promise<string[]> {
    if (userIds.length === 0) return [];
    const column = category === "team" ? "team_notify" : "friend_notify";
    const marks = userIds.map(() => "?").join(", ");
    const rows = await this.db.prepare(`SELECT token FROM push_tokens WHERE user_id IN (${marks}) AND ${column} = 1`).bind(...userIds).all<{ token: string }>();
    return (rows.results ?? []).map((row) => row.token);
  }

  async markPushSent(key: string): Promise<boolean> {
    const result = await this.db.prepare("INSERT OR IGNORE INTO push_sent (key, created_at) VALUES (?, ?)").bind(key, nowIso()).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async isRevoked(transactionId: string): Promise<boolean> {
    return !!(await this.db.prepare("SELECT 1 AS found FROM revoked_transactions WHERE transaction_id = ?").bind(transactionId).first());
  }

  /** How many refunds since `since` came after some of the tickets were already spent. */
  async refundShortfalls(userId: string, since: string): Promise<number> {
    const row = await this.db.prepare("SELECT COUNT(*) AS n FROM refund_events WHERE user_id = ? AND debt > 0 AND created_at >= ?")
      .bind(userId, since).first<{ n: number }>();
    return row?.n ?? 0;
  }

  async wallet(userId: string): Promise<{ paid: number; free: number; paidPulls: number; refundDebt: number }> {
    const row = await this.db.prepare(`SELECT w.paid_balance, w.free_balance, COALESCE(s.paid_pull_count, 0) AS paid_pulls,
        COALESCE((SELECT pulls FROM refund_debt WHERE user_id = w.user_id), 0) AS refund_debt
      FROM gacha_wallet w LEFT JOIN gacha_state s ON s.user_id = w.user_id WHERE w.user_id = ?`)
      .bind(userId).first<{ paid_balance: number; free_balance: number; paid_pulls: number; refund_debt: number }>();
    return { paid: row?.paid_balance ?? 0, free: row?.free_balance ?? 0, paidPulls: row?.paid_pulls ?? 0, refundDebt: row?.refund_debt ?? 0 };
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

  async claimFreePull(userId: string, routeId: string): Promise<boolean> {
    const result = await this.db.prepare("INSERT OR IGNORE INTO free_pull_claims (user_id, route_id, claimed_at) VALUES (?, ?, ?)")
      .bind(userId, routeId, nowIso()).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async gachaOp(userId: string, opId: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT result FROM gacha_ops WHERE user_id = ? AND op_id = ?").bind(userId, opId).first<{ result: string }>();
    return row?.result ?? null;
  }

  async commitDraws(userId: string, draws: Draw[], kind: "free" | "paid", paidPulls: number, options: { opId?: string; result?: string; previousPaidPulls?: number } = {}): Promise<void> {
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
      ...(kind === "paid" ? [this.db.prepare("UPDATE gacha_state SET paid_pull_count = ? WHERE user_id = ?" + (options.previousPaidPulls === undefined ? "" : " AND paid_pull_count = ?"))
        .bind(...(options.previousPaidPulls === undefined ? [paidPulls, userId] : [paidPulls, userId, options.previousPaidPulls]))] : []),
      // If the count had moved on, the UPDATE above changed nothing: this makes the whole batch fail, so no draw is half-written.
      ...(kind === "paid" && options.previousPaidPulls !== undefined ? [this.db.prepare("UPDATE gacha_guard SET ok = CASE WHEN changes() > 0 THEN 1 ELSE NULL END WHERE id = 1")] : []),
      ...(options.opId && options.result ? [this.db.prepare("INSERT INTO gacha_ops (user_id, op_id, result, created_at) VALUES (?, ?, ?, ?)").bind(userId, options.opId, options.result, now)] : [])
    ];
    await this.db.batch(statements);
  }

  async friends(userId: string): Promise<unknown[]> {
    const result = await this.db.prepare(`SELECT u.id, u.name, u.pet_id AS petId FROM friendships f JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = ? AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = f.user_id AND b.blocked_id = f.friend_id) OR (b.blocker_id = f.friend_id AND b.blocked_id = f.user_id))
      ORDER BY f.created_at DESC`).bind(userId).all();
    return result.results ?? [];
  }

  async friendRequests(userId: string): Promise<unknown[]> {
    const result = await this.db.prepare(`SELECT r.id, r.from_id AS fromId, u.name AS fromName, u.pet_id AS fromPetId, r.created_at AS createdAt
      FROM friend_requests r JOIN users u ON u.id = r.from_id WHERE r.to_id = ? AND r.status = 'pending'
      AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = r.to_id AND b.blocked_id = r.from_id) OR (b.blocker_id = r.from_id AND b.blocked_id = r.to_id))
      ORDER BY r.created_at DESC`)
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
    const row = await this.db.prepare("SELECT id, name, starts_at, ends_at, map_id, min_members, max_members, goal_steps FROM events WHERE id = ?")
      .bind(eventId).first<{ id: string; name: string; starts_at: string; ends_at: string; map_id: string; min_members: number; max_members: number; goal_steps: number }>();
    return row ? { id: row.id, name: row.name, startsAt: row.starts_at, endsAt: row.ends_at, mapId: row.map_id, minMembers: row.min_members, maxMembers: row.max_members, goalSteps: row.goal_steps } : null;
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

  async eventTeam(userId: string, eventId: string): Promise<EventTeamView | null> {
    const mine = await this.db.prepare(`SELECT t.id, t.invite_code, t.status, t.started_at FROM event_members m JOIN event_teams t ON t.id = m.team_id
      WHERE m.event_id = ? AND m.user_id = ?`).bind(eventId, userId).first<{ id: string; invite_code: string | null; status: "recruiting" | "active"; started_at: string | null }>();
    if (!mine) return null;
    const rows = await this.db.prepare(`SELECT u.id, u.name, u.pet_id AS petId, m.joined_at AS joinedAt,
        COALESCE((SELECT SUM(s.cumulative) FROM event_steps s WHERE s.user_id = u.id AND s.event_id = m.event_id), 0) AS steps
      FROM event_members m JOIN users u ON u.id = m.user_id
      WHERE m.team_id = ? ORDER BY m.joined_at ASC, u.id ASC`).bind(mine.id)
      .all<{ id: string; name: string | null; petId: string | null; joinedAt: string; steps: number }>();
    // Someone blocked in either direction stays in the count (their steps are the team's) but is shown without a name or Mobby.
    const hidden = new Set((await this.db.prepare("SELECT blocked_id AS id FROM user_blocks WHERE blocker_id = ? UNION SELECT blocker_id AS id FROM user_blocks WHERE blocked_id = ?")
      .bind(userId, userId).all<{ id: string }>()).results?.map((row) => row.id) ?? []);
    const members = (rows.results ?? []).map((row) => hidden.has(row.id)
      ? { id: row.id, name: "非表示のメンバー", petId: null, steps: row.steps, joinedAt: row.joinedAt }
      : { id: row.id, name: row.name ?? "もびさん", petId: row.petId, steps: row.steps, joinedAt: row.joinedAt });
    const claimed = !!(await this.db.prepare("SELECT 1 AS found FROM event_claims WHERE user_id = ? AND event_id = ?").bind(userId, eventId).first());
    return { id: mine.id, code: mine.invite_code ?? "", status: mine.status, creatorId: members[0]?.id ?? userId, members, startedAt: mine.started_at, claimed };
  }

  async createEventTeam(userId: string, eventId: string, teamId: string, code: string): Promise<"ok" | "already_member" | "code_taken"> {
    if (await this.db.prepare("SELECT 1 AS found FROM event_members WHERE event_id = ? AND user_id = ?").bind(eventId, userId).first()) return "already_member";
    if (await this.db.prepare("SELECT 1 AS found FROM event_teams WHERE event_id = ? AND invite_code = ?").bind(eventId, code).first()) return "code_taken";
    const now = nowIso();
    try {
      await this.db.batch([
        this.db.prepare("INSERT INTO event_teams (id, event_id, name, created_at, invite_code, status) VALUES (?, ?, ?, ?, ?, 'recruiting')").bind(teamId, eventId, code, now, code),
        this.db.prepare("INSERT INTO event_members (event_id, team_id, user_id, joined_at) VALUES (?, ?, ?, ?)").bind(eventId, teamId, userId, now)
      ]);
    } catch { return "code_taken"; }
    return "ok";
  }

  async joinEventTeam(userId: string, eventId: string, code: string, maxMembers: number): Promise<EventJoinResult> {
    const team = await this.db.prepare("SELECT id, status FROM event_teams WHERE event_id = ? AND invite_code = ?").bind(eventId, code).first<{ id: string; status: string }>();
    if (!team) return "not_found";
    if (await this.db.prepare("SELECT 1 AS found FROM event_members WHERE event_id = ? AND user_id = ?").bind(eventId, userId).first()) return "already_member";
    if (team.status !== "recruiting") return "already_started";
    // One statement checks the room and inserts, so two people cannot take the last place together.
    const result = await this.db.prepare(`INSERT INTO event_members (event_id, team_id, user_id, joined_at)
      SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM event_members WHERE team_id = ?) < ?
        AND (SELECT status FROM event_teams WHERE id = ?) = 'recruiting'`).bind(eventId, team.id, userId, nowIso(), team.id, maxMembers, team.id).run();
    if ((result.meta?.changes ?? 0) > 0) return "ok";
    const again = await this.db.prepare("SELECT status FROM event_teams WHERE id = ?").bind(team.id).first<{ status: string }>();
    return again?.status === "recruiting" ? "full" : "already_started";
  }

  async requestJoinEventTeam(userId: string, eventId: string, code: string, maxMembers: number): Promise<{ result: JoinRequestRequestResult; request?: { id: string } }> {
    const team = await this.db.prepare("SELECT id FROM event_teams WHERE event_id = ? AND invite_code = ?").bind(eventId, code).first<{ id: string }>();
    if (!team) return { result: "not_found" };
    if (await this.db.prepare("SELECT 1 AS found FROM event_members WHERE event_id = ? AND user_id = ?").bind(eventId, userId).first()) return { result: "already_member" };
    const open = await this.db.prepare("SELECT id, team_id FROM event_join_requests WHERE event_id = ? AND user_id = ?").bind(eventId, userId).first<{ id: string; team_id: string }>();
    if (open) return open.team_id === team.id ? { result: "already_requested", request: { id: open.id } } : { result: "request_pending" };
    const count = await this.db.prepare("SELECT COUNT(*) AS n FROM event_members WHERE team_id = ?").bind(team.id).first<{ n: number }>();
    if ((count?.n ?? 0) >= maxMembers) return { result: "full" };
    const id = crypto.randomUUID();
    await this.db.prepare("INSERT INTO event_join_requests (id, event_id, team_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, eventId, team.id, userId, nowIso()).run();
    return { result: "ok", request: { id } };
  }

  async eventJoinRequests(creatorId: string, eventId: string): Promise<JoinRequestView[]> {
    const rows = await this.db.prepare(`SELECT r.id, u.id AS userId, u.name AS name, u.pet_id AS petId
      FROM event_join_requests r JOIN users u ON u.id = r.user_id
      WHERE r.event_id = ? AND r.team_id = (SELECT m.team_id FROM event_members m WHERE m.event_id = ? AND m.user_id = ?)
        AND ? = (SELECT m2.user_id FROM event_members m2 WHERE m2.team_id = r.team_id ORDER BY m2.joined_at ASC, m2.user_id ASC LIMIT 1)
        AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ? AND b.blocked_id = r.user_id) OR (b.blocker_id = r.user_id AND b.blocked_id = ?))
      ORDER BY r.created_at ASC`).bind(eventId, eventId, creatorId, creatorId, creatorId, creatorId).all<{ id: string; userId: string; name: string | null; petId: string | null }>();
    return (rows.results ?? []).map((row) => ({ id: row.id, userId: row.userId, name: row.name ?? "もびさん", petId: row.petId }));
  }

  async pendingJoinRequest(userId: string, eventId: string): Promise<{ id: string; creatorName: string } | null> {
    const row = await this.db.prepare(`SELECT r.id AS id, (SELECT u.name FROM users u WHERE u.id = (SELECT m.user_id FROM event_members m WHERE m.team_id = r.team_id ORDER BY m.joined_at ASC, m.user_id ASC LIMIT 1)) AS creatorName
      FROM event_join_requests r WHERE r.event_id = ? AND r.user_id = ?`).bind(eventId, userId).first<{ id: string; creatorName: string | null }>();
    return row ? { id: row.id, creatorName: row.creatorName ?? "もびさん" } : null;
  }

  async answerJoinRequest(creatorId: string, eventId: string, requestId: string, accept: boolean, maxMembers: number, minMembers: number): Promise<{ result: JoinRequestAnswerResult; requesterId?: string }> {
    const request = await this.db.prepare("SELECT id, team_id, user_id FROM event_join_requests WHERE id = ? AND event_id = ?").bind(requestId, eventId).first<{ id: string; team_id: string; user_id: string }>();
    if (!request) return { result: "not_found" };
    const creator = await this.db.prepare("SELECT user_id FROM event_members WHERE team_id = ? ORDER BY joined_at ASC, user_id ASC LIMIT 1").bind(request.team_id).first<{ user_id: string }>();
    if (!creator || creator.user_id !== creatorId) return { result: "not_creator" };
    // A block made after the request was sent still counts: the request is dropped, as if it had been declined.
    if (accept && await this.blockedWithTeam(request.team_id, request.user_id)) {
      await this.db.prepare("DELETE FROM event_join_requests WHERE id = ?").bind(request.id).run();
      return { result: "declined", requesterId: request.user_id };
    }
    if (!accept) {
      await this.db.prepare("DELETE FROM event_join_requests WHERE id = ?").bind(request.id).run();
      return { result: "declined", requesterId: request.user_id };
    }
    // One statement checks the room and inserts, so two answers cannot take the last place together.
    const added = await this.db.prepare(`INSERT INTO event_members (event_id, team_id, user_id, joined_at)
      SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM event_members WHERE team_id = ?) < ?
        AND NOT EXISTS (SELECT 1 FROM event_members WHERE event_id = ? AND user_id = ?)
        AND NOT EXISTS (SELECT 1 FROM event_members m JOIN user_blocks b ON (b.blocker_id = m.user_id AND b.blocked_id = ?) OR (b.blocker_id = ? AND b.blocked_id = m.user_id)
          WHERE m.team_id = ?)`)
      .bind(eventId, request.team_id, request.user_id, nowIso(), request.team_id, maxMembers, eventId, request.user_id, request.user_id, request.user_id, request.team_id).run();
    if ((added.meta?.changes ?? 0) === 0) {
      await this.db.prepare("DELETE FROM event_join_requests WHERE id = ?").bind(request.id).run();
      return { result: "full" };
    }
    await this.db.batch([
      this.db.prepare("DELETE FROM event_join_requests WHERE id = ?").bind(request.id),
      // The team sets out as soon as it has the least number of members it needs.
      this.db.prepare("UPDATE event_teams SET status = 'active', started_at = ? WHERE id = ? AND status = 'recruiting' AND (SELECT COUNT(*) FROM event_members WHERE team_id = ?) >= ?")
        .bind(nowIso(), request.team_id, request.team_id, minMembers),
      // A team with no room left has no use for the requests that are still open.
      this.db.prepare("DELETE FROM event_join_requests WHERE team_id = ? AND (SELECT COUNT(*) FROM event_members WHERE team_id = ?) >= ?").bind(request.team_id, request.team_id, maxMembers),
    ]);
    return { result: "accepted", requesterId: request.user_id };
  }

  async cancelJoinRequest(userId: string, eventId: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM event_join_requests WHERE event_id = ? AND user_id = ?").bind(eventId, userId).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async startEventTeam(userId: string, eventId: string, minMembers: number): Promise<EventStartResult> {
    const view = await this.eventTeam(userId, eventId);
    if (!view) return "no_team";
    if (view.status !== "recruiting") return "not_recruiting";
    if (view.creatorId !== userId) return "not_creator";
    if (view.members.length < minMembers) return "too_few";
    const result = await this.db.prepare("UPDATE event_teams SET status = 'active', started_at = ? WHERE id = ? AND status = 'recruiting'")
      .bind(nowIso(), view.id).run();
    return (result.meta?.changes ?? 0) > 0 ? "ok" : "not_recruiting";
  }

  async leaveEventTeam(userId: string, eventId: string): Promise<"ok" | "no_team" | "already_started"> {
    const mine = await this.db.prepare(`SELECT t.id, t.status FROM event_members m JOIN event_teams t ON t.id = m.team_id
      WHERE m.event_id = ? AND m.user_id = ?`).bind(eventId, userId).first<{ id: string; status: string }>();
    if (!mine) return "no_team";
    if (mine.status !== "recruiting") return "already_started";
    await this.db.batch([
      this.db.prepare("DELETE FROM event_members WHERE event_id = ? AND user_id = ?").bind(eventId, userId),
      this.db.prepare("DELETE FROM event_teams WHERE id = ? AND NOT EXISTS (SELECT 1 FROM event_members WHERE team_id = ?)").bind(mine.id, mine.id)
    ]);
    return "ok";
  }

  async claimEvent(userId: string, eventId: string): Promise<boolean> {
    const result = await this.db.prepare("INSERT OR IGNORE INTO event_claims (user_id, event_id, claimed_at) VALUES (?, ?, ?)").bind(userId, eventId, nowIso()).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async makeFriends(userId: string, otherId: string): Promise<void> {
    if (userId === otherId) return;
    const now = nowIso();
    await this.db.batch([
      this.db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, ?)").bind(userId, otherId, now),
      this.db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, ?)").bind(otherId, userId, now)
    ]);
  }

  /** Whether anyone in this team has blocked this player, or been blocked by them. */
  private async blockedWithTeam(teamId: string, userId: string): Promise<boolean> {
    return !!(await this.db.prepare(`SELECT 1 AS found FROM event_members m JOIN user_blocks b
      ON (b.blocker_id = m.user_id AND b.blocked_id = ?) OR (b.blocker_id = ? AND b.blocked_id = m.user_id) WHERE m.team_id = ? LIMIT 1`).bind(userId, userId, teamId).first());
  }

  async blockedEither(a: string, b: string): Promise<boolean> {
    return !!(await this.db.prepare("SELECT 1 AS found FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)").bind(a, b, b, a).first());
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.db.batch([
      this.db.prepare("INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)").bind(blockerId, blockedId, nowIso()),
      this.db.prepare("DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)").bind(blockerId, blockedId, blockedId, blockerId),
      this.db.prepare("DELETE FROM friend_requests WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)").bind(blockerId, blockedId, blockedId, blockerId)
    ]);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.db.prepare("DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?").bind(blockerId, blockedId).run();
  }

  async blockedUsers(userId: string): Promise<{ id: string; name: string; petId: string | null }[]> {
    const rows = await this.db.prepare("SELECT u.id, u.name, u.pet_id AS petId FROM user_blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = ? ORDER BY b.created_at DESC")
      .bind(userId).all<{ id: string; name: string | null; petId: string | null }>();
    return (rows.results ?? []).map((row) => ({ id: row.id, name: row.name ?? "もびさん", petId: row.petId }));
  }

  async reportUser(reporterId: string, reportedId: string, reason: "name" | "behavior" | "other", note: string | null, id: string): Promise<void> {
    await this.db.prepare("INSERT INTO user_reports (id, reporter_id, reported_id, reason, note, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, reporterId, reportedId, reason, note, nowIso()).run();
  }

  async eventTeamMemberIdsByCode(eventId: string, code: string): Promise<string[]> {
    const rows = await this.db.prepare(`SELECT m.user_id AS id FROM event_teams t JOIN event_members m ON m.team_id = t.id
      WHERE t.event_id = ? AND t.invite_code = ? ORDER BY m.joined_at ASC, m.user_id ASC`).bind(eventId, code).all<{ id: string }>();
    return (rows.results ?? []).map((row) => row.id);
  }

  async purgeExpired(now: Date): Promise<void> {
    // Counters are numbered by their own clock: minutes (about 29 million now), hours (about 490 thousand) and days (about 20 thousand).
    // The three ranges do not overlap, so each can be cleared against its own clock.
    const minute = Math.floor(now.getTime() / 60_000);
    const hour = Math.floor(now.getTime() / 3_600_000);
    const day = Math.floor(now.getTime() / 86_400_000);
    await this.db.batch([
      this.db.prepare("DELETE FROM rate_limits WHERE (window >= 1000000 AND window < ?) OR (window >= 100000 AND window < 1000000 AND window < ?) OR (window < 100000 AND window < ?)")
        .bind(minute - 10, hour - 3, day - 2),
      this.db.prepare("DELETE FROM gacha_ops WHERE created_at < ?").bind(new Date(now.getTime() - 30 * 86_400_000).toISOString()),
      this.db.prepare("DELETE FROM push_sent WHERE created_at < ?").bind(new Date(now.getTime() - 30 * 86_400_000).toISOString())
    ]);
  }
}
