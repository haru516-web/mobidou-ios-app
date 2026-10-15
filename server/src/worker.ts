import { GACHA_PET_IDS, validateGachaPetIds } from "./config/gacha.ts";
import { isFreePullRoute } from "./config/freePullRoutes.ts";
import { createExpoNotifier, noNotify, type Notify } from "./push.ts";
import { isNameAllowed } from "./config/ngWords.ts";
import { appleRevocationConfigured, equalSecretHash, exchangeAppleAuthorizationCode, hashSecret, randomToken, revokeAppleToken, verifyAppleIdentityToken, verifySignedPayload, verifySignedTransaction } from "./crypto.ts";
import { D1Store } from "./store.ts";
import { documentPageHtml, privacyPageHtml } from "./privacyPolicy.ts";
import { SUPPORT_MARKDOWN, SUPPORT_TITLE } from "./supportPage.ts";
import { LEGAL_MARKDOWN, LEGAL_NOTICE_TITLE } from "./legalNotice.ts";
import type { AgeGroup, Env, EventRecord, EventTeamView, ExecutionContext, Gift, JoinRequestView, ProductDefinition, Store, User, VerifiedTransaction } from "./types.ts";

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

/** The page a team link opens: shows the team code and hands it to the app. Nothing about the team is looked up or shown. */
function teamInvitePage(code: string): Response {
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>もび道 イベントのチーム招待</title>
<style>body{font-family:sans-serif;background:#f6efe0;color:#4a2f22;margin:0;padding:48px 24px;text-align:center}h1{font-size:22px}.code{font-size:26px;letter-spacing:3px;margin:20px 0;font-weight:bold}a.open{display:inline-block;background:#8c3b30;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:16px}p{line-height:1.7}</style></head>
<body><h1>もび道のイベントへのご招待</h1><p>チームコード</p><div class="code">${code}</div>
<a class="open" href="mobidou://team?code=${code}">もび道で開く</a>
<p>開けないときは、もび道のイベント画面で、このコードを入力してください。</p></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } });
}

/** Shown to other players: short, no control characters, nothing obviously offensive. Null when the name is fine. */
function displayNameProblem(name: string, ngWords: string | undefined): "invalid_name" | "inappropriate_name" | null {
  if (name.length < 1 || name.length > 12 || /[\u0000-\u001f\u007f]/.test(name)) return "invalid_name";
  return isNameAllowed(name, ngWords) ? null : "inappropriate_name";
}

/** The largest record kept for one account. A real record is a few kilobytes. */
const MAX_SAVE_CHARS = 200_000;

/** Anonymous sign-ups allowed from one source address. */
const REGISTER_PER_MINUTE = 5;
const REGISTER_PER_DAY = 30;

/** Team codes use the same alphabet as friend codes (no 0/O/1/I), six characters. */
const TEAM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newTeamCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => TEAM_CODE_ALPHABET[byte % TEAM_CODE_ALPHABET.length]).join("");
}
const normalizeTeamCode = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();
const isTeamCode = (value: string) => /^[A-HJ-NP-Z2-9]{6}$/.test(value);

/** What the app needs to draw the event screens: the limits, and the player's team with its total. */
function teamResponse(event: EventRecord, team: EventTeamView | null, extras: { requests?: readonly JoinRequestView[]; request?: { id: string; creatorName: string } | null } = {}) {
  const info = { id: event.id, name: event.name, startsAt: event.startsAt, endsAt: event.endsAt, minMembers: event.minMembers, maxMembers: event.maxMembers, goalSteps: event.goalSteps };
  if (!team) return { event: info, team: null, totalSteps: 0, request: extras.request ?? null };
  const totalSteps = team.members.reduce((sum, member) => sum + member.steps, 0);
  const cleared = team.status === "active" && event.goalSteps > 0 && totalSteps >= event.goalSteps;
  return {
    event: info,
    team: { code: team.code, status: cleared ? "cleared" : team.status, creatorId: team.creatorId, members: team.members, startedAt: team.startedAt, claimed: team.claimed, requests: (extras.requests ?? []).map((row) => ({ id: row.id, name: row.name, petId: row.petId })) },
    totalSteps
  };
}

/** Whether purchases from this StoreKit environment are credited. TestFlight and App Review buy in the Sandbox. */
function environmentAccepted(env: Env, transaction: VerifiedTransaction): boolean {
  const accepted = (env.PURCHASE_ENVIRONMENTS ?? "Production").split(",").map((name) => name.trim()).filter(Boolean);
  return accepted.includes(transaction.environment ?? "Production");
}

/** After a sign-in, trade its authorization code for Apple's refresh token and keep it, so it can be revoked on deletion. */
async function keepAppleRefreshToken(env: Env, store: Store, userId: string, authorizationCode: unknown, now: Date): Promise<void> {
  if (!appleRevocationConfigured(env) || typeof authorizationCode !== "string" || authorizationCode.length < 8 || authorizationCode.length > 2000) return;
  try {
    const token = await exchangeAppleAuthorizationCode(authorizationCode, env, now.getTime());
    if (token) await store.setAppleRefreshToken(userId, token);
  } catch { /* the sign-in itself succeeded; the token is only needed at deletion */ }
}

/** At most `max` calls of one kind from one player in the window; the 429 is the same everywhere. */
async function limit(store: Store, kind: string, userId: string, windowMs: number, max: number, now: Date): Promise<void> {
  const count = await store.hitRateLimit(`${kind}:${userId}`, Math.floor(now.getTime() / windowMs), windowMs);
  if (count > max) throw new HttpError(429, "rate_limited");
}

class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

const json = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

/**
 * The largest request body each kind of call may send, in bytes. An ordinary call is a few hundred bytes; a signed
 * transaction or notification is at most 200,000 characters of base64 plus its wrapper; a save is at most 200,000
 * characters of text, which in UTF-8 and with the escaping of quotes can be several times that many bytes.
 */
const BODY_BYTES = { ordinary: 16_384, signed: 262_144, save: 1_000_000 } as const;

/** The body as bytes, refusing (413) one that is larger than `maxBytes` before it is held or parsed, whatever the header says. */
async function readBodyBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, "payload_too_large");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel().catch(() => undefined); throw new HttpError(413, "payload_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function body(request: Request, maxBytes: number = BODY_BYTES.ordinary): Promise<Record<string, unknown>> {
  // Too large is 413 and is not turned into "invalid JSON" below.
  const bytes = await readBodyBytes(request, maxBytes);
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
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
        !validAmount(product.monthlyTickets) || !validAmount(product.monthlyPulls) || !validAmount(product.paidPulls) || !validAmount(product.priceYen) ||
        // Tickets and a plan in one product are not supported: a refund could not tell which part to take back.
        ((product.paidPulls ?? 0) > 0 && ((product.monthlyTickets ?? 0) > 0 || product.plan !== undefined))) {
      throw new HttpError(500, "invalid_product_configuration");
    }
  }
  return products;
}

function configuredGifts(env: Env): Gift[] {
  const gifts = configuredJson<Gift[]>(env.GIFTS_JSON, []);
  const validAmount = (amount: number | undefined): boolean => amount === undefined || (Number.isSafeInteger(amount) && amount >= 0);
  if (!Array.isArray(gifts) || gifts.some((gift) => typeof gift.id !== "string" || !gift.id || typeof gift.title !== "string" || !gift.title ||
    !validAmount(gift.tickets) || !validAmount(gift.freePulls) || !validAmount(gift.paidPulls) ||
    (gift.items !== undefined && (!Array.isArray(gift.items) || gift.items.some((item) => (item?.kind !== "gachaTicket" && item?.kind !== "keychainDrop") || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)))) ||
    new Set(gifts.map((gift) => gift.id)).size !== gifts.length) {
    throw new HttpError(500, "invalid_gift_configuration");
  }
  return gifts;
}

/** A plan's billing period: remembered, and its monthly 木札 credited once (an expired period grants nothing). */
/** The plan period a transaction opened, so a refund can end it. */
function planOf(product: ProductDefinition | undefined, transaction: VerifiedTransaction): { name: string; periodStart: string } | undefined {
  return product?.plan && transaction.expiresDate ? { name: product.plan, periodStart: new Date(transaction.purchaseDate).toISOString() } : undefined;
}

// Two refunds that came after the tickets were spent, within half a year, stop further purchases.
const REFUND_RESTRICT_COUNT = 2;
const REFUND_RESTRICT_WINDOW_MS = 180 * 86_400_000;

async function recordPlanPeriod(store: Store, userId: string, transaction: VerifiedTransaction, product: ProductDefinition, now: Date): Promise<void> {
  if (!product.plan || !transaction.expiresDate || transaction.revocationDate) return;
  // A refund can reach the server before the purchase does: its pull is not credited afterwards.
  if (await store.isRevoked(transaction.transactionId)) return;
  const expired = transaction.expiresDate <= now.getTime();
  await store.recordPlanPeriod(userId, product.plan, new Date(transaction.purchaseDate).toISOString(), new Date(transaction.expiresDate).toISOString(), expired ? 0 : product.monthlyPulls ?? 0, transaction.transactionId);
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

/** The calendar day (YYYY-MM-DD) `days` after (or before, when negative) the given one. */
const shiftDay = (day: string, days: number): string => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

const PUSH_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/;

async function handle(request: Request, env: Env, store: Store, now = new Date(), random: RandomSource = secureRandom, notify: Notify = noNotify): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (method === "GET" && path === "/health") return json({ ok: true });
  if (method === "GET" && path === "/support") {
    return new Response(documentPageHtml(SUPPORT_TITLE, SUPPORT_MARKDOWN), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } });
  }
  if (method === "GET" && path === "/legal") {
    return new Response(documentPageHtml(LEGAL_NOTICE_TITLE, LEGAL_MARKDOWN), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } });
  }
  if (method === "GET" && path === "/privacy") {
    return new Response(privacyPageHtml(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } });
  }
  const inviteMatch = /^\/f\/([A-Z2-9]{10})$/.exec(path);
  if (method === "GET" && inviteMatch) return invitePage(inviteMatch[1]);
  const teamInviteMatch = /^\/t\/([A-HJ-NP-Z2-9]{6})$/.exec(path);
  if (method === "GET" && teamInviteMatch) return teamInvitePage(teamInviteMatch[1]);
  if (method === "GET" && path === "/gifts.json") return json(configuredGifts(env));
  if (method === "GET" && path === "/catalog.json") return json(configuredJson(env.CATALOG_JSON, []));
  if (method === "GET" && path === "/gacha/odds") {
    const petIds = gachaPetIds();
    return json({
      pets: petIds.map((petId) => ({ petId, rate: 1 / petIds.length }))
    });
  }

  if (method === "POST" && path === "/auth/register") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const perMinute = await store.hitRateLimit(`register:minute:${ip}`, Math.floor(now.getTime() / 60_000), 60_000);
    const perDay = await store.hitRateLimit(`register:day:${ip}`, Math.floor(now.getTime() / 86_400_000), 86_400_000);
    if (perMinute > REGISTER_PER_MINUTE || perDay > REGISTER_PER_DAY) throw new HttpError(429, "rate_limited");
    const input = await body(request);
    const id = crypto.randomUUID();
    const secret = randomToken(32);
    // A name given at sign-up is shown to others like any other, so it passes the same checks (no name at all is allowed).
    const given = typeof input.name === "string" ? input.name.trim() : "";
    if (given) { const problem = displayNameProblem(given, env.NG_WORDS); if (problem) throw new HttpError(400, problem); }
    const user: User = { id, friendCode: newFriendCode(), name: given, petId: null, goshuinCount: 0, routeName: null };
    await store.registerUser(user, await hashSecret(secret));
    return json({ userId: id, secret, friendCode: user.friendCode }, 201);
  }

  if (method === "POST" && path === "/auth/apple") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const perMinute = await store.hitRateLimit(`apple:minute:${ip}`, Math.floor(now.getTime() / 60_000), 60_000);
    if (perMinute > REGISTER_PER_MINUTE) throw new HttpError(429, "rate_limited");
    const input = await body(request);
    const token = requireString(input.identityToken, "missing_identity_token", 8000);
    let appleSub: string;
    try { appleSub = (await verifyAppleIdentityToken(token, env, now.getTime())).sub; }
    catch { throw new HttpError(401, "invalid_apple_token"); }
    const userId = await store.userByApple(appleSub);
    if (!userId) throw new HttpError(404, "no_linked_account");
    await keepAppleRefreshToken(env, store, userId, input.authorizationCode, now);
    // A new device takes the account over: the old device's secret stops working.
    const secret = randomToken(32);
    await store.rotateSecret(userId, await hashSecret(secret));
    const user = await store.user(userId);
    return json({ userId, secret, friendCode: user?.friendCode ?? "" });
  }

  if (method === "POST" && path === "/apple/notifications") {
    const input = await body(request, BODY_BYTES.signed);
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
        const refunded = configuredProducts(env)[transaction.productId];
        await store.revokePurchase(transaction.transactionId, refunded?.paidPulls ?? 0, planOf(refunded, transaction));
      } else if (transaction.appAccountToken && environmentAccepted(env, transaction)) {
        const user = await store.user(transaction.appAccountToken);
        const product = configuredProducts(env)[transaction.productId];
        if (user && product) {
          const activeProduct = transaction.expiresDate && transaction.expiresDate <= now.getTime() ? { ...product, monthlyTickets: 0 } : product;
          await store.recordPurchase(user.id, transaction, activeProduct);
          await recordPlanPeriod(store, user.id, transaction, product, now);
        }
      }
    }
    return new Response(null, { status: 204 });
  }

  const userId = await authenticatedUser(request, store);

  // The device that may be sent notifications. The app asks the player first; this only records the answer.
  if (method === "POST" && path === "/push/token") {
    await limit(store, "push-token", userId, 3_600_000, 30, now);
    const input = await body(request);
    const token = requireString(input.token, "invalid_push_token", 300);
    if (!PUSH_TOKEN.test(token)) throw new HttpError(400, "invalid_push_token");
    await store.savePushToken(userId, token, { team: input.team !== false, friend: input.friend !== false });
    return json({ status: "registered" });
  }
  if (method === "POST" && path === "/push/token/remove") {
    await limit(store, "push-token", userId, 3_600_000, 30, now);
    const input = await body(request);
    await store.removePushToken(requireString(input.token, "invalid_push_token", 300), userId);
    return json({ status: "removed" });
  }

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
    await keepAppleRefreshToken(env, store, userId, input.authorizationCode, now);
    return json({ status: result });
  }

  // The whole record, kept only for accounts tied to an Apple ID, so a new device can pick it up.
  // Deleting the account is final: it needs the exact confirmation word, and the credentials stop working at once.
  if (method === "POST" && path === "/account/delete") {
    const input = await body(request);
    if (input.confirm !== "delete") throw new HttpError(400, "confirmation_required");
    // An account tied to an Apple ID is never erased without telling Apple that the app no longer holds that authorization.
    // If that cannot be done the account is kept, so it can be tried again: no key set up (503), no token held and no
    // fresh authorization code sent (409: the app signs in with Apple again and repeats), or Apple refusing (502).
    if (await store.appleLinked(userId)) {
      if (!appleRevocationConfigured(env)) throw new HttpError(503, "apple_revocation_unavailable");
      let refreshToken = await store.appleRefreshToken(userId);
      if (!refreshToken && typeof input.authorizationCode === "string" && input.authorizationCode.length >= 8 && input.authorizationCode.length <= 2000) {
        try { refreshToken = await exchangeAppleAuthorizationCode(input.authorizationCode, env, now.getTime()); } catch { refreshToken = null; }
      }
      if (!refreshToken) throw new HttpError(409, "apple_reauth_required");
      let revoked = false;
      try { revoked = await revokeAppleToken(refreshToken, env, now.getTime()); } catch { revoked = false; }
      if (!revoked) throw new HttpError(502, "apple_revoke_failed");
    }
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
    const input = await body(request, BODY_BYTES.save);
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
    await limit(store, "profile", userId, 3_600_000, 30, now);
    const input = await body(request);
    const name = typeof input.name === "string" ? input.name.trim() : "";
    // Other players read this name, so an obviously offensive one is refused (reports and blocks cover the rest).
    const problem = displayNameProblem(name, env.NG_WORDS);
    if (problem) throw new HttpError(400, problem);
    const petId = input.petId === undefined || input.petId === null ? null : input.petId;
    if (petId !== null && (typeof petId !== "string" || !gachaPetIds().includes(petId as typeof GACHA_PET_IDS[number]))) throw new HttpError(400, "unknown_pet");
    await store.updateProfile(userId, name, petId);
    return json({ name, petId });
  }

  if (method === "GET" && path === "/blocks") return json({ blocked: await store.blockedUsers(userId) });

  if (method === "POST" && (path === "/blocks" || path === "/blocks/remove")) {
    await limit(store, "block", userId, 86_400_000, 60, now);
    const input = await body(request);
    const targetId = requireString(input.userId, "invalid_user_id", 64);
    if (targetId === userId) throw new HttpError(400, "cannot_block_self");
    if (path === "/blocks") {
      if (!(await store.user(targetId))) throw new HttpError(404, "user_not_found");
      await store.blockUser(userId, targetId);
      return json({ status: "blocked" });
    }
    await store.unblockUser(userId, targetId);
    return json({ status: "unblocked" });
  }

  if (method === "POST" && path === "/reports") {
    const input = await body(request);
    const targetId = requireString(input.userId, "invalid_user_id", 64);
    const reason = input.reason;
    if (reason !== "name" && reason !== "behavior" && reason !== "other") throw new HttpError(400, "invalid_reason");
    const note = typeof input.note === "string" ? input.note.trim().slice(0, 300) : null;
    if (targetId === userId) throw new HttpError(400, "cannot_report_self");
    if (!(await store.user(targetId))) throw new HttpError(404, "user_not_found");
    // Reports are read by a person: a few a day is plenty, and it keeps the box from being flooded.
    const sent = await store.hitRateLimit(`report:${userId}`, Math.floor(now.getTime() / 86_400_000), 86_400_000);
    if (sent > 10) throw new HttpError(429, "too_many_reports");
    await store.reportUser(userId, targetId, reason, note || null, crypto.randomUUID());
    return json({ status: "received" }, 201);
  }

  if (method === "GET" && path === "/friends") {
    return json({ friends: await store.friends(userId), incomingRequests: await store.friendRequests(userId) });
  }

  if (method === "POST" && path === "/friend-requests") {
    const input = await body(request);
    await limit(store, "friend-request", userId, 86_400_000, 40, now);
    const friendCode = requireString(input.friendCode, "invalid_friend_code", 20).replace(/[\s-]/g, "").toUpperCase();
    const me = await store.user(userId);
    if (!me?.name) throw new HttpError(400, "profile_required");
    const recipient = await store.userByFriendCode(friendCode);
    if (!recipient) throw new HttpError(404, "friend_not_found");
    if (recipient.id === userId) throw new HttpError(400, "cannot_add_self");
    // Someone who blocked you, or whom you blocked, looks the same as a code nobody has.
    if (await store.blockedEither(userId, recipient.id)) throw new HttpError(404, "friend_not_found");
    if (await store.friendshipExists(userId, recipient.id)) throw new HttpError(409, "already_friends");
    if (await store.pendingRequestExists(userId, recipient.id)) throw new HttpError(409, "already_requested");
    if (await store.pendingRequestExists(recipient.id, userId)) throw new HttpError(409, "they_already_asked");
    await store.requestFriend(userId, recipient.id, crypto.randomUUID());
    await notify([recipient.id], "friend", { title: "もび道", body: "フレンド申請が届いています。", data: { type: "friend" } });
    return json({ status: "pending" }, 201);
  }

  const answerMatch = /^\/friend-requests\/([^/]+)\/answer$/.exec(path);
  if (method === "POST" && answerMatch) {
    const input = await body(request);
    if (input.answer !== "accepted" && input.answer !== "declined") throw new HttpError(400, "invalid_answer");
    const requestId = decodeURIComponent(answerMatch[1]);
    const incoming = (await store.friendRequests(userId)) as { id: string; fromId: string }[];
    const fromId = incoming.find((row) => row.id === requestId)?.fromId;
    const answered = await store.answerFriendRequest(userId, requestId, input.answer);
    if (!answered) throw new HttpError(404, "friend_request_not_found");
    if (input.answer === "accepted" && fromId) await notify([fromId], "friend", { title: "もび道", body: "フレンド申請が承認されました。", data: { type: "friend" } });
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
    await limit(store, "verify", userId, 3_600_000, 60, now);
    const input = await body(request, BODY_BYTES.signed);
    const signedTransaction = requireString(input.signedTransactionInfo ?? input.jws, "missing_signed_transaction", 200_000);
    let transaction: VerifiedTransaction;
    try { transaction = await verifySignedTransaction(signedTransaction, env); }
    catch { throw new HttpError(400, "invalid_storekit_transaction"); }
    const product = configuredProducts(env)[transaction.productId];
    if (!product) throw new HttpError(400, "unknown_product");
    if (!environmentAccepted(env, transaction)) throw new HttpError(403, "environment_not_accepted");
    if (!transaction.appAccountToken) throw new HttpError(400, "missing_app_account_token");
    if (transaction.appAccountToken !== userId) throw new HttpError(403, "app_account_token_mismatch");
    if (transaction.revocationDate) {
      await store.revokePurchase(transaction.transactionId, product.paidPulls ?? 0, planOf(product, transaction));
      return json({ status: "revoked" });
    }
    // A refund that arrived first is remembered: the older, still validly signed purchase credits nothing.
    if (await store.isRevoked(transaction.transactionId)) return json({ status: "revoked" });
    const effectiveProduct = transaction.expiresDate && transaction.expiresDate <= now.getTime()
      ? { ...product, monthlyTickets: 0 }
      : product;
    const granted = await store.recordPurchase(userId, transaction, effectiveProduct);
    await recordPlanPeriod(store, userId, transaction, product, now);
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

  // What a player owns is decided by the server's own draws and starter choice, never by what the app says it has:
  // the body is still checked (older apps keep working), but only the server's record is returned.
  if (method === "POST" && path === "/pets/sync") {
    const input = await body(request);
    const sent = input.owned && typeof input.owned === "object" && !Array.isArray(input.owned) ? input.owned as Record<string, unknown> : null;
    if (!sent) throw new HttpError(400, "invalid_owned");
    const pool = gachaPetIds();
    for (const [petId, copies] of Object.entries(sent)) {
      if (!pool.includes(petId as typeof GACHA_PET_IDS[number])) continue;
      if (typeof copies !== "number" || !Number.isSafeInteger(copies) || copies < 1 || copies > 999) throw new HttpError(400, "invalid_owned");
    }
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
    const restricted = await store.refundShortfalls(userId, new Date(now.getTime() - REFUND_RESTRICT_WINDOW_MS).toISOString()) >= REFUND_RESTRICT_COUNT;
    return json({ ageGroup, capYen, spentYen, remainingYen: capYen === null ? null : Math.max(0, capYen - spentYen), restricted });
  }

  if (method === "GET" && path === "/wallet") return json(await store.wallet(userId));

  if (method === "GET" && path === "/plan") return json({ plan: (await store.activePlan(userId, now.toISOString())) ?? "none" });

  if (method === "POST" && path === "/free-pulls/claim") {
    const input = await body(request);
    const routeId = requireString(input.routeId, "invalid_route_id", 160);
    // Only a route the app really has can pay out, so an invented id is not a free draw.
    if (!isFreePullRoute(routeId)) throw new HttpError(400, "unknown_route");
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
    // An operation id makes the draw safe to ask for again: the app keeps it until it has the answer.
    const opId = input.opId === undefined ? undefined : input.opId;
    if (opId !== undefined && (typeof opId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(opId))) throw new HttpError(400, "invalid_op_id");
    const sameAnswer = async () => {
      const stored = opId ? await store.gachaOp(userId, opId) : null;
      return stored ? new Response(stored, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }) : null;
    };
    const replay = await sameAnswer();
    if (replay) return replay;
    const wallet = await store.wallet(userId);
    if (wallet[pullKind] < count) throw new HttpError(409, `insufficient_${pullKind}_gacha_balance`);
    const pool = gachaPetIds();
    const owned = await store.ownedPets(userId);
    let paidPulls = wallet.paidPulls;
    const draws = Array.from({ length: count }, () => {
      if (pullKind === "paid") paidPulls += 1;
      const petId = drawItem(pool, random);
      const isNew = (owned[petId] ?? 0) === 0;
      owned[petId] = (owned[petId] ?? 0) + 1;
      // The result keeps its `guaranteed` field (always false now) so an app that still reads it is not disturbed.
      return { petId, kind: pullKind, isNew, guaranteed: false };
    });
    const answer = { results: draws, paidPulls, remaining: wallet[pullKind] - count };
    try {
      await store.commitDraws(userId, draws, pullKind, paidPulls, { opId, result: JSON.stringify(answer), previousPaidPulls: wallet.paidPulls });
    } catch {
      // Two copies of the same request can race: the loser reads what the winner stored.
      const raced = await sameAnswer();
      if (raced) return raced;
      throw new HttpError(409, "gacha_balance_changed_retry");
    }
    return json(answer);
  }

  const eventStepsMatch = /^\/events\/([^/]+)\/steps$/.exec(path);
  if (method === "POST" && eventStepsMatch) {
    await limit(store, "steps", userId, 3_600_000, 120, now);
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
    const { day: openDay } = tokyoDateAndMinute(new Date(now.getTime() - start * 60_000));
    const grace = Number(env.EVENT_STEPS_GRACE_DAYS ?? "2");
    if (!Number.isSafeInteger(grace) || grace < 0 || grace > 7) throw new HttpError(500, "invalid_event_step_grace_configuration");
    // Clients name the day their cumulative belongs to. That is the open day, or one of the last few days before it (a day
    // the app was not opened is not lost). A later day, or one past the grace, is refused instead of filed under another date.
    let day = openDay;
    if (input.day !== undefined) {
      if (typeof input.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.day)) throw new HttpError(400, "invalid_day");
      // Only the days that are open, built here: a date that does not exist (02-30) is never one of them.
      const open = Array.from({ length: grace + 1 }, (_, index) => shiftDay(openDay, index - grace));
      if (!open.includes(input.day)) return json({ error: "steps_day_mismatch", openDay }, 409);
      day = input.day;
    }
    // Steps count for the team the player has set out with; before that (or without a team) there is nothing to add them to.
    const team = await store.eventTeam(userId, eventId);
    if (!team || team.status !== "active") throw new HttpError(409, "no_active_team");
    // A day before the team set out is not the team's.
    if (input.day !== undefined && team.startedAt && day < tokyoDateAndMinute(new Date(team.startedAt)).day) return json({ error: "steps_day_mismatch", openDay }, 409);
    const saved = await store.saveEventSteps(userId, eventId, day, cumulative);
    // The team's total may have reached the goal with these steps: its other members hear it once.
    const after = await store.eventTeam(userId, eventId);
    if (after && teamResponse(event, after).team?.status === "cleared") {
      const others = after.members.map((member) => member.id).filter((id) => id !== userId);
      if (others.length > 0) await notify(others, "team", { title: "もび道", body: "チームが目標に着きました。報酬を受け取れます。", data: { type: "team", eventId } }, `cleared:${after.id}`);
    }
    return json({ day, cumulative: saved });
  }

  const eventTeamMatch = /^\/events\/([^/]+)\/(team|teams|teams\/join|leave|claim|requests\/cancel|requests\/[^/]+\/answer)$/.exec(path);
  if (eventTeamMatch) {
    const eventId = decodeURIComponent(eventTeamMatch[1]);
    const action = eventTeamMatch[2];
    const event = await store.event(eventId);
    if (!event) throw new HttpError(404, "event_not_found");
    const inWindow = now.getTime() >= Date.parse(event.startsAt) && now.getTime() < Date.parse(event.endsAt);

    const teamView = async (status = 200): Promise<Response> => {
      const team = await store.eventTeam(userId, eventId);
      if (team) return json(teamResponse(event, team, { requests: team.creatorId === userId ? await store.eventJoinRequests(userId, eventId) : [] }), status);
      return json(teamResponse(event, null, { request: await store.pendingJoinRequest(userId, eventId) }), status);
    };
    if (method === "GET" && action === "team") return teamView();

    if (method === "POST" && action === "teams") {
      await limit(store, "team-create", userId, 3_600_000, 10, now);
      if (!inWindow) throw new HttpError(409, "event_not_active");
      const me = await store.user(userId);
      if (!me?.name) throw new HttpError(400, "profile_required");
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = await store.createEventTeam(userId, eventId, crypto.randomUUID(), newTeamCode());
        if (result === "already_member") throw new HttpError(409, "already_member");
        if (result === "ok") return json(teamResponse(event, await store.eventTeam(userId, eventId)), 201);
      }
      throw new HttpError(503, "team_code_unavailable");
    }

    if (method === "POST" && action === "teams/join") {
      if (!inWindow) throw new HttpError(409, "event_not_active");
      const me = await store.user(userId);
      if (!me?.name) throw new HttpError(400, "profile_required");
      // A code has about a billion values; limit the guesses of one player anyway.
      const attempts = await store.hitRateLimit(`team-join:${userId}`, Math.floor(now.getTime() / 3_600_000), 3_600_000);
      if (attempts > 30) throw new HttpError(429, "too_many_attempts");
      const input = await body(request);
      const code = normalizeTeamCode(requireString(input.code, "invalid_team_code", 20));
      if (!isTeamCode(code)) throw new HttpError(400, "invalid_team_code");
      const present = await store.eventTeamMemberIdsByCode(eventId, code);
      for (const memberId of present) if (await store.blockedEither(userId, memberId)) throw new HttpError(404, "not_found");
      // Asking only: the player who made the team answers, and nobody is added before that.
      const asked = await store.requestJoinEventTeam(userId, eventId, code, event.maxMembers);
      if (asked.result === "not_found") throw new HttpError(404, "not_found");
      if (asked.result !== "ok" && asked.result !== "already_requested") throw new HttpError(409, asked.result);
      // The one who made the team answers; they hear about a new request (not about one asked again).
      if (asked.result === "ok" && present[0]) await notify([present[0]], "team", { title: "もび道", body: "チームへの参加の申請が届いています。", data: { type: "team", eventId } });
      return teamView(202);
    }

    const answerMatch = /^requests\/([^/]+)\/answer$/.exec(action);
    if (method === "POST" && answerMatch) {
      const input = await body(request);
      if (typeof input.accept !== "boolean") throw new HttpError(400, "invalid_answer");
      const result = await store.answerJoinRequest(userId, eventId, decodeURIComponent(answerMatch[1]), input.accept, event.maxMembers, event.minMembers);
      if (result.result === "not_found") throw new HttpError(404, "request_not_found");
      if (result.result === "not_creator") throw new HttpError(403, "not_creator");
      if (result.result === "full") throw new HttpError(409, "full");
      // Accepted: the two become friends, as joining a team always has done.
      if (result.result === "accepted" && result.requesterId) await store.makeFriends(userId, result.requesterId);
      if (result.requesterId && (result.result === "accepted" || result.result === "declined")) {
        await notify([result.requesterId], "team", { title: "もび道", body: "チームへの参加の申請に、返事が届いています。", data: { type: "team", eventId } });
      }
      if (result.result === "accepted") {
        const team = await store.eventTeam(userId, eventId);
        if (team?.status === "active") {
          const others = team.members.map((member) => member.id).filter((id) => id !== userId && id !== result.requesterId);
          if (others.length > 0) await notify(others, "team", { title: "もび道", body: "チームが出発しました。歩いた分が、チームの歩数になります。", data: { type: "team", eventId } }, `started:${team.id}`);
        }
      }
      return teamView();
    }

    if (method === "POST" && action === "requests/cancel") {
      await store.cancelJoinRequest(userId, eventId);
      return teamView();
    }

    if (method === "POST" && action === "leave") {
      const result = await store.leaveEventTeam(userId, eventId);
      if (result === "no_team") throw new HttpError(404, "no_team");
      if (result === "already_started") throw new HttpError(409, "already_started");
      return json({ status: "left" });
    }

    if (method === "POST" && action === "claim") {
      const team = await store.eventTeam(userId, eventId);
      if (!team) throw new HttpError(404, "no_team");
      const view = teamResponse(event, team);
      if (view.team?.status !== "cleared") throw new HttpError(409, "not_cleared");
      const claimed = await store.claimEvent(userId, eventId);
      return json({ status: claimed ? "claimed" : "already_claimed" });
    }
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

async function respond(request: Request, env: Env, store: Store, now: Date, random: RandomSource, notify: Notify): Promise<Response> {
  try { return await handle(request, env, store, now, random, notify); }
  catch (error) {
    if (error instanceof HttpError) return json({ error: error.code }, error.status);
    console.error("Request failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "internal_error" }, 500);
  }
}

export async function handleWithStore(request: Request, env: Env, store: Store, now = new Date(), random: RandomSource = secureRandom, notify: Notify = noNotify): Promise<Response> {
  if (request.method.toUpperCase() === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  const response = await respond(request, env, store, now, random, notify);
  for (const [name, value] of Object.entries(CORS_HEADERS)) response.headers.set(name, value);
  return response;
}

const worker = {
  fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const store = new D1Store(env.DB);
    // Notifications go out after the answer is sent: the request never waits for them.
    const notify = createExpoNotifier(env, store, (work) => { if (context.waitUntil) context.waitUntil(work); else void work; });
    return handleWithStore(request, env, store, new Date(), secureRandom, notify);
  },
  /** Runs every hour (wrangler.toml [triggers]): drops counters and answers that have passed their time. */
  async scheduled(_event: unknown, env: Env, _context: ExecutionContext): Promise<void> {
    const outcome = await new D1Store(env.DB).purgeExpired(new Date());
    // Seen in the logs: how many counters were removed, and how many are left (a number that keeps growing means the clean-up is behind).
    // A warning when it is behind: expired counters are left, or the run used all its slices.
    const behind = outcome.expiredLeft > 0 || outcome.reachedLimit;
    (behind ? console.warn : console.log)(JSON.stringify({ event: "purge", behind, ...outcome }));
  }
};

export default worker;
