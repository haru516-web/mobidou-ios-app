/** What the server said to a Sign in with Apple call, as the screens need it. Pure so it can be tested. */

export type AppleFailure = 'cancelled' | 'unavailable' | 'offline' | 'apple_in_use' | 'account_has_other_apple' | 'no_account' | 'failed';
/** `recordRestored`: on a restore, the saved record came back too (not only the account). */
export type AppleOutcome = { ok: true; status: 'linked' | 'already_linked' | 'restored'; recordRestored?: boolean } | { ok: false; reason: AppleFailure };

type Reply = { status: number; data: Record<string, unknown> | null } | null;

export function appleOutcome(kind: 'link' | 'restore', reply: Reply): AppleOutcome {
  if (!reply) return { ok: false, reason: 'offline' };
  if (kind === 'restore') {
    if (reply.status === 200) return { ok: true, status: 'restored' };
    if (reply.status === 404) return { ok: false, reason: 'no_account' };
    return { ok: false, reason: 'failed' };
  }
  if (reply.status === 200) return { ok: true, status: reply.data?.status === 'already_linked' ? 'already_linked' : 'linked' };
  if (reply.status === 409 && (reply.data?.error === 'apple_in_use' || reply.data?.error === 'account_has_other_apple')) return { ok: false, reason: reply.data.error };
  return { ok: false, reason: 'failed' };
}

export const appleMessages: Record<AppleFailure, string> = {
  cancelled: '',
  unavailable: 'この環境では、Appleでサインインを使えません。iPhoneの「設定」でApple Accountにサインインしているか確認してください。',
  offline: 'サーバーにつながりませんでした。電波のよいところで、もう一度お試しください。',
  apple_in_use: 'このApple IDは、すでに別のアカウントとつながっています。別の端末のアカウントを引き継ぐには、「はじめの画面」からサインインしてください。',
  account_has_other_apple: 'この端末のアカウントは、すでに別のApple IDとつながっています。',
  no_account: 'このApple IDにつながったアカウントが見つかりませんでした。前の端末で、先に「Appleでサインイン」から連携してください。',
  failed: 'サインインできませんでした。しばらくしてから、もう一度お試しください。',
};
