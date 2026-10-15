import type { Env, Store } from "./types.ts";
import { broadcastPush } from "./push.ts";

/** An admin key shorter than this is treated as not set: the page and the API stay switched off. */
const MIN_TOKEN_LENGTH = 24;
const TITLE_MAX = 40;
const BODY_MAX = 200;
/** Admin calls per address per hour (a person using the page makes a handful). */
const CALLS_PER_HOUR = 60;

const HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

/** Compares without stopping at the first difference. */
export function sameSecret(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/**
 * The operator's pages: GET /admin (a static page, no data in it) and POST /admin/push/preview, /admin/push/send.
 * Everything but the page needs `Authorization: Bearer <ADMIN_TOKEN>`. Without ADMIN_TOKEN none of it exists (404).
 * Returns null when the path is not an admin one.
 */
export async function handleAdmin(request: Request, env: Env, store: Store, path: string, now: Date, fetchImpl?: typeof fetch): Promise<Response | null> {
  if (path !== "/admin" && !path.startsWith("/admin/")) return null;
  const method = request.method.toUpperCase();
  const token = env.ADMIN_TOKEN ?? "";
  if (token.length < MIN_TOKEN_LENGTH) return reply({ error: "not_found" }, 404);

  if (method === "GET" && path === "/admin") {
    return new Response(ADMIN_PAGE_HTML, { headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    } });
  }
  if (method !== "POST" || (path !== "/admin/push/preview" && path !== "/admin/push/send")) return reply({ error: "not_found" }, 404);

  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (await store.hitRateLimit(`admin:${address}`, Math.floor(now.getTime() / 3_600_000), 3_600_000) > CALLS_PER_HOUR) return reply({ error: "rate_limited" }, 429);
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || !sameSecret(authorization.slice(7), token)) return reply({ error: "unauthorized" }, 401);

  const tokens = await store.broadcastPushTokens();
  if (path === "/admin/push/preview") return reply({ count: tokens.length });

  const body = await request.json().catch(() => null) as { title?: unknown; body?: unknown; key?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const key = typeof body?.key === "string" ? body.key : "";
  if (!title || title.length > TITLE_MAX) return reply({ error: "invalid_title" }, 400);
  if (!text || text.length > BODY_MAX) return reply({ error: "invalid_body" }, 400);
  if (!/^[A-Za-z0-9-]{8,64}$/.test(key)) return reply({ error: "invalid_key" }, 400);
  // The same composition (the same key) goes out once, however many times the button is pressed.
  if (!(await store.markPushSent(`broadcast:${key}`))) return reply({ error: "already_sent" }, 409);
  const outcome = await broadcastPush(env, store, tokens, { title, body: text, data: { type: "announcement" } }, fetchImpl);
  console.log(JSON.stringify({ event: "broadcast", ...outcome, titleLength: title.length }));
  return reply({ ok: true, ...outcome });
}

const ADMIN_PAGE_HTML = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>もび道 運営</title>
<style>
body{font-family:system-ui,"Hiragino Sans","Yu Gothic",sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#f7f3ea;color:#2b2420}
h1{font-size:20px}label{display:block;margin:16px 0 4px;font-weight:600}
input,textarea{width:100%;box-sizing:border-box;padding:10px;font-size:16px;border:1px solid #b9ad98;border-radius:6px;background:#fff}
textarea{min-height:110px}button{margin-top:16px;padding:12px 18px;font-size:16px;border:0;border-radius:6px;background:#8c3b2e;color:#fff}
button.secondary{background:#6d6455}button:disabled{opacity:.5}
.box{margin-top:16px;padding:12px;border-radius:6px;background:#fff;border:1px solid #b9ad98}#summary,#result{white-space:pre-wrap}
.small{font-size:13px;color:#6d6455}.error{color:#a3231a}
</style></head><body>
<h1>もび道 運営:お知らせ通知</h1>
<p class="small">このページは運営者専用です。通知を許可している全員に送ります。送った通知は取り消せません。</p>
<label for="token">運営用の鍵</label><input id="token" type="password" autocomplete="off">
<label for="title">タイトル(40字まで)</label><input id="title" maxlength="40">
<label for="body">本文(200字まで)</label><textarea id="body" maxlength="200"></textarea>
<button id="preview">送信先を確認する</button>
<div id="confirm" class="box" hidden>
  <div id="summary"></div>
  <button id="send">この内容で送信する</button> <button id="cancel" class="secondary">やめる</button>
</div>
<div id="result" class="box" hidden></div>
<script>
const $ = (id) => document.getElementById(id);
let key = null;
const show = (text, isError) => { const r = $('result'); r.hidden = false; r.textContent = text; r.className = 'box' + (isError ? ' error' : ''); };
const errors = { unauthorized: '鍵が違います。', rate_limited: '操作が多すぎます。しばらくしてからお試しください。', invalid_title: 'タイトルを入力してください(40字まで)。', invalid_body: '本文を入力してください(200字まで)。', already_sent: 'この内容は、すでに送信されています。', not_found: '運営用の設定がまだ有効になっていません。' };
async function call(path, payload) {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + $('token').value.trim() }, body: JSON.stringify(payload || {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errors[data.error] || ('失敗しました(' + (data.error || response.status) + ')'));
  return data;
}
$('preview').onclick = async () => {
  $('result').hidden = true; $('confirm').hidden = true;
  if (!$('title').value.trim() || !$('body').value.trim()) { show('タイトルと本文を入力してください。', true); return; }
  try {
    const data = await call('/admin/push/preview');
    key = crypto.randomUUID();
    $('summary').textContent = data.count + ' 台に送ります。\\n\\n' + $('title').value.trim() + '\\n' + $('body').value.trim();
    $('confirm').hidden = false;
  } catch (error) { show(error.message, true); }
};
$('cancel').onclick = () => { $('confirm').hidden = true; key = null; };
$('send').onclick = async () => {
  $('send').disabled = true;
  try {
    const data = await call('/admin/push/send', { title: $('title').value, body: $('body').value, key });
    $('confirm').hidden = true;
    show('送信しました。対象 ' + data.targets + ' 台、受け付け ' + data.accepted + ' 台、失敗 ' + data.failed + ' 台。');
    key = null;
  } catch (error) { show(error.message, true); }
  $('send').disabled = false;
};
</script></body></html>`;
