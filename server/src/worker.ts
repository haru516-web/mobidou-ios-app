import { GACHA_PET_IDS, PAID_PITY_INTERVAL, validateGachaPetIds } from "./config/gacha.ts";
import { equalSecretHash, hashSecret, randomToken, verifyAppleIdentityToken, verifySignedPayload, verifySignedTransaction } from "./crypto.ts";
import { D1Store } from "./store.ts";
import { privacyPageHtml } from "./privacyPolicy.ts";
import type { AgeGroup, Env, ExecutionContext, Gift, ProductDefinition, Store, User, VerifiedTransaction } from "./types.ts";

/** Monthly spending caps in yen by self-declared age group, following the Japanese online-game industry guideline. null means no cap. */
const MONTHLY_CAP_YEN: Record<AgeGroup, number | null> = { under16: 5000, "16to19": 10000, adult: null };
const AGE_RANK: Record<AgeGroup, number> = { under16: 0, "16to19": 1, adult: 2 };
const isAgeGroup = (value: unknown): value is AgeGroup => value === "under16" || value === "16to19" || value === "adult";

/** The current calendar month in Tokyo, as UTC instants [from, to). */
function tokyoMonthRange(now: Date): { from: string; to: string } {
  const hour = 3_600_000;
  const shifted = new Date(now.getTime() + 9 * hour);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  return { from: new Date(Date.UTC(year, month, 1) - 9 * hour).toISOString(), to: new Date(Date.UTC(year, month + 1, 1) - 9 * hour).toISOString() };
}

/** The page a friend link opens: shows the code and hands it to the app. Nothing about the owner is looked up or shown. */
function invitePage(code: string): Response {
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>もび道 フレンド招待</title>
<style>body{font-family:sans-serif;background:#f6efe0;color:#4a2f22;margin:0;padding:48px 24px;text-align:center}h1{font-size:22px}.code{font-size:26px;letter-spacing:3px;margin:20px 0;font-weight:bold}a.open{display:inline-block;background:#8c3b30;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:18px}p{line-height:1.7;font-size:14px}</style></head>
<body><h1>もび道へのご招待</h1><p>フレンドコード</p><div class="code">${code}</div>
<a class="open" href="mobidou://friend?code=${code}">もび道で開く</a>
<p>開けないときは、もび道の「フレンド」画面でこのコードを入力してください。</p></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } });
}

/** The largest record kept for one account. A real record is a few kilobytes. */
const MAX_SAVE_CHARS = 200_000;

/** Anonymous sign-ups allowed from one source address. */
const REGISTER_PER_MINUTE = 5;
const REGISTER_PER_DAY = 30;

class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

const json = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("body must be an object");
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

function configuredJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { throw new HttpError(500, "invalid_server_configuration"); }
}

function configuredProducts(env: Env): Record<string, ProductDefinition> {
  const products = configuredJson<Record<string, ProductDefinition>>(env.PRODUCT_CATALOG_JSON, {});
  for (const [id, product] of Object.entries(products)) {
    const validAmount = (amount: number | undefined): boolean => amount === undefined || (Number.isSafeInteger(amount) && amount >= 0);
    if (!id || !product || (product.plan !== undefined && typeof product.plan !== "string") ||
        !validAmount(product.monthlyTickets) || !validAmount(product.paidPulls) || !validAmount(product.priceYen)) {
      throw new HttpError(500, "invalid_product_configuration");
    }
  }
  return products;
}

function configuredGifts(env: Env): Gift[] {
  const gifts = configuredJson<Gift[]>(env.GIFTS_JSON, []);
  const validAmount = (amount: number | undefined): boolean => amount === undefined || (Number.isSafeInteger(amount) && amount >= 0);
  if (!Array.isArray(gifts) || gifts.some((gift) => typeof gift.id !== "string" || !gift.id || typeof gift.title !== "string" || !gift.title ||
    !validAmount(gift.tickets) || !validAmount(gift.freePulls) || !validAmount(gift.paidPulls)) ||
    new Set(gifts.map((gift) => gift.id)).size !== gifts.length) {
    throw new HttpError(500, "invalid_gift_configuration");
  }
  return gifts;
}

function requireString(value: unknown, code: string, maxLength = 160): string {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) throw new HttpError(400, code);
  return value;
}

function newFriendCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((byte) => alphabet[byte & 31]).join("");
}

async function authenticatedUser(request: Request, store: Store): Promise<string> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^.]+)\.([A-Za-z0-9_-]{32,})$/.exec(authorization);
  if (!match) throw new HttpError(401, "unauthorized");
  const [, userId, secret] = match;
  const storedHash = await store.credentialHash(userId);
  if (!storedHash || !equalSecretHash(storedHash, await hashSecret(secret))) throw new HttpError(401, "unauthorized");
  return userId;
}

function tokyoDateAndMinute(now: Date): { day: string; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const part = (type: string): string => parts.find((entry) => entry.type === type)?.value ?? "00";
  return { day: `${part("year")}-${part("month")}-${part("day")}`, minute: Number(part("hour")) * 60 + Number(part("minute")) };
}

function parseClock(value: string | undefined, fallback: string): number {
  const clock = value ?? fallback;
  const match = /^(\d{2}):(\d{2})$/.exec(clock);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new HttpError(500, "invalid_event_window_configuration");
  return Number(match[1]) * 60 + Number(match[2]);
}

type RandomSource = () => number;

const secureRandom: RandomSource = () => crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000;

function drawItem(candidates: readonly string[], random: RandomSource): string {
  if (candidates.length === 0) throw new HttpError(500, "invalid_gacha_configuration");
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new HttpError(500, "invalid_random_source");
  return candidates[Math.min(candidates.length - 1, Math.floor(value * candidates.length))];
}

function gachaPetIds(): readonly string[] {
  validateGachaPetIds();
  return GACHA_PET_IDS;
}

async function handle(request: Request, env: Env, store: Store, now = new Date(), random: RandomSource = secureRandom): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (method === "GET" && path === "/health") return json({ ok: true });
  if (method === "GET" && path === "/privacy") {
    return new Response(privacyPageHtml(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } });
  }
  const inviteMatch = /^\/f\/([A-Z2-9]{10})$/.exec(path);
  if (method === "GET" && inviteMatch) return invitePage(inviteMatch[1]);
  if (method === "GET" && path === "/gifts.json") return json(configuredGifts(env));
  if (method === "GET" && path === "/catalog.json") return json(configuredJson(env.CATALOG_JSON, []));
  if (method === "GET" && path === "/gacha/odds") {
    const petIds = gachaPetIds();
    return json({
      pets: petIds.map((petId) => ({ petId, rate: 1 / petIds.length })),
      paidPityInterval: PAID_PITY_INTERVAL,
      pityDescription: "Every 25th paid pull is guaranteed to be an unowned Mobby while any remain. Free pulls do not count."
    });
  }

  if (method === "POST" && path === "/auth/register") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const perMinute = await store.hitRateLimit(`register:minute:${ip}`, Math.floor(now.getTime() / 60_000));
    const perDay = await store.hitRateLimit(`register:day:${ip}`, Math.floor(now.getTime() / 86_400_000));
    if (perMinute > REGISTER_PER_MINUTE || perDay > REGISTER_PER_DAY) throw new HttpError(429, "rate_limited");
    const input = await body(request);
    const id = crypto.randomUUID();
    const secret = randomToken(32);
    const user: User = { id, friendCode: newFriendCode(), name: typeof input.name === "string" ? input.name.slice(0, 40) : "", petId: null, goshuinCount: 0, routeName: null };
    await store.registerUser(user, await hashSecret(secret));
    return json({ userId: id, secret, friendCode: user.friendCode }, 201);
  }

  if (method === "POST" && path === "/auth/apple") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const perMinute = await store.hitRateLimit(`apple:minute:${ip}`, Math.floor(now.getTime() / 60_000));
    if (perMinute > REGISTER_PER_MINUTE) throw new HttpError(429, "rate_limited");
    const input = await body(request);
    const token = requireString(input.identityToken, "missing_identity_token", 8000);
    let appleSub: string;
    try { appleSub = (await verifyAppleIdentityToken(token, env, now.getTime())).sub; }
    catch { throw new HttpError(401, "invalid_apple_token"); }
    const userId = await store.userByApple(appleSub);
    if (!userId) throw new HttpError(404, "no_linked_account");
    // A new device takes the account over: the old device's secret stops working.
    const secret = randomToken(32);
    await store.rotateSecret(userId, await hashSecret(secret));
    const user = await store.user(userId);
    return json({ userId, secret, friendCode: user?.friendCode ?? "" });
  }

  if (method === "POST" && path === "/apple/notifications") {
    const input = await body(request);
    const signedPayload = requireString(input.signedPayload, "missing_signed_payload", 200_000);
    let notification: Record<string, unknown>;
    try { notification = await verifySignedPayload(signedPayload, env); }
    catch { throw new HttpError(400, "invalid_notification_signature"); }
    const data = notification.data && typeof notification.data === "object" ? notification.data as Record<string, unknown> : {};
    if (typeof notification.notificationType !== "string") throw new HttpError(400, "invalid_notification_payload");
    if (notification.notificationType === "TEST") return new Response(null, { status: 204 });
    if (typeof data.bundleId !== "string" || data.bundleId !== env.APPLE_BUNDLE_ID) throw new HttpError(400, "unexpected_bundle_id");
    if (typeof data.signedTransactionInfo === "string") {
      let transaction: VerifiedTransaction;
      try {
        transaction = await verifySignedTransaction(data.signedTransactionInfo, env);
      } catch { throw new HttpError(400, "invalid_notification_transaction"); }
      if (transaction.revocationDate || notification.notificationType === "REFUND" || notification.notificationType === "REVOKE") {
        await store.revokePurchase(transaction.transactionId);
      } else if (transaction.appAccountToken) {
        const user = await store.user(transaction.appAccountToken);
        const product = configuredProducts(env)[transaction.productId];
        if (user && product) {
          const activeProduct = transaction.expiresDate && transaction.expiresDate <= now.getTime() ? { ...product, monthlyTickets: 0 } : product;
          await store.recordPurchase(user.id, transaction, activeProduct);
        }
      }
    }
    return new Response(null, { status: 204 });
  }

  const userId = await authenticatedUser(request, store);

  if (method === "GET" && path === "/profile") {
    const me = await store.user(userId);
    if (!me) throw new HttpError(401, "unauthorized");
    return json({ name: me.name, petId: me.petId, friendCode: me.friendCode, appleLinked: await store.appleLinked(userId) });
  }

  if (method === "POST" && path === "/account/apple/link") {
    const input = await body(request);
    const token = requireString(input.identityToken, "missing_identity_token", 8000);
    let appleSub: string;
    try { appleSub = (await verifyAppleIdentityToken(token, env, now.getTime())).sub; }
    catch { throw new HttpError(401, "invalid_apple_token"); }
    const result = await store.linkApple(userId, appleSub);
    if (result === "apple_in_use" || result === "account_has_other_apple") throw new HttpError(409, result);
    return json({ status: result });
  }

  // The whole record, kept only for accounts tied to an Apple ID, so a new device can pick it up.
  // Deleting the account is final: it needs the exact confirmation word, and the credentials stop working at once.
  if (method === "POST" && path === "/account/delete") {
    const input = await body(request);
    if (input.confirm !== "delete") throw new HttpError(400, "confirmation_required");
    await store.deleteUser(userId);
    return json({ status: "deleted" });
  }

  if (method === "GET" && path === "/save") {
    if (!(await store.appleLinked(userId))) throw new HttpError(403, "apple_required");
    const save = await store.cloudSave(userId);
    if (!save) throw new HttpError(404, "no_save");
    return json(save);
  }

  if (method === "POST" && path === "/save") {
    if (!(await store.appleLinked(userId))) throw new HttpError(403, "apple_required");
    const input = await body(request);
    const data = input.data;
    if (typeof data !== "string" || data.length < 2) throw new HttpError(400, "invalid_save");
    if (data.length > MAX_SAVE_CHARS) throw new HttpError(413, "save_too_large");
    const baseVersion = input.baseVersion;
    if (typeof baseVersion !== "number" || !Number.isSafeInteger(baseVersion) || baseVersion < 0) throw new HttpError(400, "invalid_base_version");
    const version = await store.putCloudSave(userId, data, baseVersion);
    if (version === null) throw new HttpError(409, "save_changed_elsewhere");
    return json({ version });
  }

  if (method === "POST" && path === "/profile") {
    const input = await body(request);
    const name = typeof input.name === "string" ? input.name.trim() : "";
    // Shown to friends: short, and no control characters.
    if (name.length < 1 || name.length > 12 || /[\u0000-\u001f\u007f]/.test(name)) throw new HttpError(400, "invalid_name");
    const petId = input.petId === undefined || input.petId === null ? null : input.petId;
    if (petId !== null && (typeof petId !== "string" || !gachaPetIds().includes(petId as typeof GACHA_PET_IDS[number]))) throw new HttpError(400, "unknown_pet");
    await store.updateProfile(userId, name, petId);
    return json({ name, petId });
  }

  if (method === "GET" && path === "/friends") {
    return json({ friends: await store.friends(userId), incomingRequests: await store.friendRequests(userId) });
  }

  if (method === "POST" && path === "/friend-requests") {
    const input = await body(request);
    const friendCode = requireString(input.friendCode, "invalid_friend_code", 20).replace(/[\s-]/g, "").toUpperCase();
    const me = await store.user(userId);
    if (!me?.name) throw new HttpError(400, "profile_required");
    const recipient = await store.userByFriendCode(friendCode);
    if (!recipient) throw new HttpError(404, "friend_not_found");
    if (recipient.id === userId) throw new HttpError(400, "cannot_add_self");
    if (await store.friendshipExists(userId, recipient.id)) throw new HttpError(409, "already_friends");
    if (await store.pendingRequestExists(userId, recipient.id)) throw new HttpError(409, "already_requested");
    if (await store.pendingRequestExists(recipient.id, userId)) throw new HttpError(409, "they_already_asked");
    await store.requestFriend(userId, recipient.id, crypto.randomUUID());
    return json({ status: "pending" }, 201);
  }

  const answerMatch = /^\/friend-requests\/([^/]+)\/answer$/.exec(path);
  if (method === "POST" && answerMatch) {
    const input = await body(request);
    if (input.answer !== "accepted" && input.answer !== "declined") throw new HttpError(400, "invalid_answer");
    const answered = await store.answerFriendRequest(userId, decodeURIComponent(answerMatch[1]), input.answer);
    if (!answered) throw new HttpError(404, "friend_request_not_found");
    return json({ status: input.answer });
  }

  const giftMatch = /^\/gifts\/([^/]+)\/claim$/.exec(path);
  if (method === "POST" && giftMatch) {
    const giftId = decodeURIComponent(giftMatch[1]);
    const gift = configuredGifts(env).find((candidate) => candidate.id === giftId);
    if (!gift) throw new HttpError(404, "gift_not_found");
    const claimed = await store.claimGift(userId, gift);
    return json({ status: claimed ? "claimed" : "already_claimed" });
  }

  if (method === "POST" && path === "/purchases/verify") {
    const input = await body(request);
    const signedTransaction = requireString(input.signedTransactionInfo ?? input.jws, "missing_signed_transaction", 200_000);
    let transaction: VerifiedTransaction;
    try { transaction = await verifySignedTransaction(signedTransaction, env); }
    catch { throw new HttpError(400, "invalid_storekit_transaction"); }
    const product = configuredProducts(env)[transaction.productId];
    if (!product) throw new HttpError(400, "unknown_product");
    if (!transaction.appAccountToken) throw new HttpError(400, "missing_app_account_token");
    if (transaction.appAccountToken !== userId) throw new HttpError(403, "app_account_token_mismatch");
    if (transaction.revocationDate) {
      await store.revokePurchase(transaction.transactionId);
      return json({ status: "revoked" });
    }
    const effectiveProduct = transaction.expiresDate && transaction.expiresDate <= now.getTime()
      ? { ...product, monthlyTickets: 0 }
      : product;
    const granted = await store.recordPurchase(userId, transaction, effectiveProduct);
    return json({ status: granted ? "verified" : "already_processed" });
  }

  if (method === "POST" && path === "/tickets/consume") {
    const input = await body(request);
    const amount = input.amount;
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000) throw new HttpError(400, "invalid_amount");
    const ref = requireString(input.requestId, "missing_request_id", 128);
    const consumed = await store.consumeTickets(userId, amount, ref);
    if (!consumed) throw new HttpError(409, "insufficient_tickets_or_duplicate_request");
    return json({ consumed: amount, remaining: await store.ticketBalance(userId) });
  }

  if (method === "POST" && path === "/pets/starter") {
    const input = await body(request);
    const petId = requireString(input.petId, "invalid_pet_id", 80);
    if (!gachaPetIds().includes(petId as typeof GACHA_PET_IDS[number])) throw new HttpError(400, "unknown_pet");
    const chosen = await store.chooseStarter(userId, petId);
    if (!chosen) throw new HttpError(409, "starter_already_chosen");
    return json({ petId, copies: 1 }, 201);
  }

  if (method === "POST" && path === "/pets/sync") {
    const input = await body(request);
    const sent = input.owned && typeof input.owned === "object" && !Array.isArray(input.owned) ? input.owned as Record<string, unknown> : null;
    if (!sent) throw new HttpError(400, "invalid_owned");
    const pool = gachaPetIds();
    const owned: Record<string, number> = {};
    for (const [petId, copies] of Object.entries(sent)) {
      if (!pool.includes(petId as typeof GACHA_PET_IDS[number])) continue;
      if (typeof copies !== "number" || !Number.isSafeInteger(copies) || copies < 1 || copies > 999) throw new HttpError(400, "invalid_owned");
      owned[petId] = copies;
    }
    await store.mergeOwnedPets(userId, owned);
    return json({ owned: await store.ownedPets(userId) });
  }

  if (method === "POST" && path === "/profile/age-group") {
    const input = await body(request);
    if (!isAgeGroup(input.ageGroup)) throw new HttpError(400, "invalid_age_group");
    const current = await store.ageGroup(userId);
    // A mistaken choice can be lowered at any time; raising it would lift the cap, so it is not allowed from the app.
    if (current && AGE_RANK[input.ageGroup] > AGE_RANK[current]) throw new HttpError(409, "age_group_cannot_be_raised");
    await store.setAgeGroup(userId, input.ageGroup);
    return json({ ageGroup: input.ageGroup });
  }

  if (method === "GET" && path === "/limits") {
    const ageGroup = await store.ageGroup(userId);
    const { from, to } = tokyoMonthRange(now);
    const products = configuredProducts(env);
    const spentYen = (await store.purchasedProducts(userId, from, to)).reduce((sum, productId) => sum + (products[productId]?.priceYen ?? 0), 0);
    // Until an age group is chosen the strictest cap applies.
    const capYen = MONTHLY_CAP_YEN[ageGroup ?? "under16"];
    return json({ ageGroup, capYen, spentYen, remainingYen: capYen === null ? null : Math.max(0, capYen - spentYen) });
  }

  if (method === "GET" && path === "/wallet") return json(await store.wallet(userId));

  if (method === "POST" && path === "/free-pulls/claim") {
    const input = await body(request);
    const routeId = requireString(input.routeId, "invalid_route_id", 160);
    const claimed = await store.claimFreePull(userId, routeId);
    return json({ status: claimed ? "claimed" : "already_claimed" });
  }

  if (method === "POST" && path === "/gacha/pull") {
    const input = await body(request);
    const count = input.count;
    const kind = input.kind;
    if (count !== 1 && count !== 5) throw new HttpError(400, "count_must_be_1_or_5");
    if (kind !== "free" && kind !== "paid") throw new HttpError(400, "kind_must_be_free_or_paid");
    const pullKind: "free" | "paid" = kind;
    if (pullKind === "free" && count !== 1) throw new HttpError(400, "free_pull_count_must_be_1");
    const wallet = await store.wallet(userId);
    if (wallet[pullKind] < count) throw new HttpError(409, `insufficient_${pullKind}_gacha_balance`);
    const pool = gachaPetIds();
    const owned = await store.ownedPets(userId);
    let paidPulls = wallet.paidPulls;
    const draws = Array.from({ length: count }, () => {
      if (pullKind === "paid") paidPulls += 1;
      const unowned = pool.filter((petId) => (owned[petId] ?? 0) === 0);
      const guaranteed = pullKind === "paid" && paidPulls % PAID_PITY_INTERVAL === 0 && unowned.length > 0;
      const petId = drawItem(guaranteed ? unowned : pool, random);
      const isNew = (owned[petId] ?? 0) === 0;
      owned[petId] = (owned[petId] ?? 0) + 1;
      return { petId, kind: pullKind, isNew, guaranteed };
    });
    try { await store.commitDraws(userId, draws, pullKind, paidPulls); }
    catch { throw new HttpError(409, "gacha_balance_changed_retry"); }
    return json({ results: draws, paidPulls, remaining: wallet[pullKind] - count });
  }

  const eventStepsMatch = /^\/events\/([^/]+)\/steps$/.exec(path);
  if (method === "POST" && eventStepsMatch) {
    const input = await body(request);
    const cumulative = input.cumulative;
    const max = Number(env.EVENT_STEPS_DAILY_MAX ?? "100000");
    if (!Number.isSafeInteger(max) || max < 1) throw new HttpError(500, "invalid_event_step_limit_configuration");
    if (typeof cumulative !== "number" || !Number.isSafeInteger(cumulative) || cumulative < 0 || cumulative > max) {
      throw new HttpError(400, "invalid_cumulative_steps");
    }
    const eventId = decodeURIComponent(eventStepsMatch[1]);
    const event = await store.event(eventId);
    if (!event) throw new HttpError(404, "event_not_found");
    const startsAt = Date.parse(event.startsAt);
    const endsAt = Date.parse(event.endsAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt) throw new HttpError(500, "invalid_event_schedule");
    if (now.getTime() < startsAt || now.getTime() >= endsAt) throw new HttpError(409, "event_not_active");
    // Each Tokyo day's window runs from START that day to START the next day, so exactly one day is open at any moment.
    const start = parseClock(env.EVENT_STEPS_WINDOW_START, "20:00");
    const { day } = tokyoDateAndMinute(new Date(now.getTime() - start * 60_000));
    // Clients name the day their cumulative belongs to, so a morning send of "today so far" is rejected instead of filed under yesterday.
    if (input.day !== undefined && input.day !== day) return json({ error: "steps_day_mismatch", openDay: day }, 409);
    const saved = await store.saveEventSteps(userId, eventId, day, cumulative);
    return json({ day, cumulative: saved });
  }

  const eventMatch = /^\/events\/([^/]+)$/.exec(path);
  if (method === "GET" && eventMatch) {
    const eventId = decodeURIComponent(eventMatch[1]);
    const event = await store.event(eventId);
    if (!event) throw new HttpError(404, "event_not_found");
    const openDay = tokyoDateAndMinute(new Date(now.getTime() - parseClock(env.EVENT_STEPS_WINDOW_START, "20:00") * 60_000)).day;
    return json({ ...event, ...(await store.eventStatus(eventId)), openDay });
  }

  throw new HttpError(404, "not_found");
}

// Credentials travel in the Authorization header, never in cookies, so any origin (such as the web build) may call the API.
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400"
};

async function respond(request: Request, env: Env, store: Store, now: Date, random: RandomSource): Promise<Response> {
  try { return await handle(request, env, store, now, random); }
  catch (error) {
    if (error instanceof HttpError) return json({ error: error.code }, error.status);
    console.error("Request failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "internal_error" }, 500);
  }
}

export async function handleWithStore(request: Request, env: Env, store: Store, now = new Date(), random: RandomSource = secureRandom): Promise<Response> {
  if (request.method.toUpperCase() === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  const response = await respond(request, env, store, now, random);
  for (const [name, value] of Object.entries(CORS_HEADERS)) response.headers.set(name, value);
  return response;
}

const worker = {
  fetch(request: Request, env: Env, _context: ExecutionContext): Promise<Response> {
    return handleWithStore(request, env, new D1Store(env.DB));
  }
};

export default worker;
