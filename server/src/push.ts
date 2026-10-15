import type { Env, Store } from "./types.ts";

export type PushCategory = "team" | "friend";
export type PushContent = { title: string; body: string; data?: Record<string, string> };

/**
 * Tells these players something. It never throws and never makes the request wait: a notification that cannot be sent is
 * simply not sent. `dedupeKey` makes a notification go out once, however many times the moment that causes it comes round.
 */
export type Notify = (userIds: readonly string[], category: PushCategory, content: PushContent, dedupeKey?: string) => Promise<void>;
export const noNotify: Notify = async () => undefined;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** A player is never sent more than this many in a day, whatever happens. */
export const PUSH_PER_PLAYER_PER_DAY = 20;
const BATCH = 100;

type Ticket = { status?: string; details?: { error?: string } };

export function createExpoNotifier(
  env: Pick<Env, "EXPO_PUSH_ACCESS_TOKEN">,
  store: Store,
  keepAlive: (work: Promise<unknown>) => void,
  options: { fetchImpl?: typeof fetch; now?: () => Date } = {}
): Notify {
  const send = options.fetchImpl ?? fetch;
  const clock = options.now ?? (() => new Date());
  return async (userIds, category, content, dedupeKey) => {
    keepAlive((async () => {
      try {
        if (dedupeKey && !(await store.markPushSent(dedupeKey))) return;
        const day = Math.floor(clock().getTime() / 86_400_000);
        const allowed: string[] = [];
        for (const id of new Set(userIds)) if ((await store.hitRateLimit(`push:${id}`, day, 86_400_000)) <= PUSH_PER_PLAYER_PER_DAY) allowed.push(id);
        if (allowed.length === 0) return;
        const tokens = await store.pushTokens(allowed, category);
        for (let from = 0; from < tokens.length; from += BATCH) {
          const chunk = tokens.slice(from, from + BATCH);
          const response = await send(EXPO_PUSH_URL, {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              ...(env.EXPO_PUSH_ACCESS_TOKEN ? { authorization: `Bearer ${env.EXPO_PUSH_ACCESS_TOKEN}` } : {})
            },
            body: JSON.stringify(chunk.map((to) => ({ to, title: content.title, body: content.body, data: content.data ?? {}, sound: "default", priority: "high" })))
          });
          if (!response.ok) continue;
          const tickets = ((await response.json().catch(() => null)) as { data?: Ticket[] } | null)?.data ?? [];
          // A token the device no longer accepts is dropped, so it is not tried again.
          for (let i = 0; i < tickets.length; i += 1) {
            if (tickets[i]?.status === "error" && tickets[i]?.details?.error === "DeviceNotRegistered") await store.removePushToken(chunk[i]);
          }
        }
      } catch { /* a notification is never worth failing for */ }
    })());
  };
}

/**
 * An announcement to every device that wants notifications. Unlike `Notify` this waits for the sends and reports them:
 * the operator is looking at the answer. A token the device no longer accepts is dropped.
 */
export async function broadcastPush(
  env: Pick<Env, "EXPO_PUSH_ACCESS_TOKEN">,
  store: Store,
  tokens: readonly string[],
  content: PushContent,
  fetchImpl: typeof fetch = fetch
): Promise<{ targets: number; accepted: number; failed: number }> {
  let accepted = 0;
  let failed = 0;
  for (let from = 0; from < tokens.length; from += BATCH) {
    const chunk = tokens.slice(from, from + BATCH);
    try {
      const response = await fetchImpl(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(env.EXPO_PUSH_ACCESS_TOKEN ? { authorization: `Bearer ${env.EXPO_PUSH_ACCESS_TOKEN}` } : {})
        },
        body: JSON.stringify(chunk.map((to) => ({ to, title: content.title, body: content.body, data: content.data ?? {}, sound: "default", priority: "high" })))
      });
      if (!response.ok) { failed += chunk.length; continue; }
      const tickets = ((await response.json().catch(() => null)) as { data?: Ticket[] } | null)?.data ?? [];
      for (let i = 0; i < chunk.length; i += 1) {
        const ticket = tickets[i];
        if (ticket?.status === "ok") accepted += 1;
        else {
          failed += 1;
          if (ticket?.details?.error === "DeviceNotRegistered") await store.removePushToken(chunk[i]);
        }
      }
    } catch { failed += chunk.length; }
  }
  return { targets: tokens.length, accepted, failed };
}
