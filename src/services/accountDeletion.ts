import { freshAuthorizationCode } from './appleAccount.ts';
import { authedRequest, readServerAccount } from './server.ts';

/*
 * Deleting the account.
 *
 * The server's copy goes first: if it cannot be reached, nothing is erased on this device either, so a player is
 * never left with data on the server that they can no longer reach or remove. A device that never used the server
 * has nothing there to delete.
 */

/** The word the player types at the last step. */
export const DELETE_CONFIRMATION_WORD = '削除';

export type DeletionResult = 'deleted' | 'offline' | 'failed' | 'apple_needed';

export async function deleteServerAccount(): Promise<DeletionResult> {
  if (!(await readServerAccount())) return 'deleted';
  let reply = await authedRequest('/account/delete', { body: { confirm: 'delete' } });
  // The server holds no Apple token for this Apple-linked account: sign in with Apple again and send the fresh code.
  if (reply?.status === 409 && reply.data?.error === 'apple_reauth_required') {
    const authorizationCode = await freshAuthorizationCode();
    if (!authorizationCode) return 'apple_needed';
    reply = await authedRequest('/account/delete', { body: { confirm: 'delete', authorizationCode } });
  }
  if (!reply) return 'offline';
  // 401: the server no longer knows this account (already deleted), so there is nothing left to remove.
  if (reply.status === 200 || reply.status === 401) return 'deleted';
  return 'failed';
}

/** Every key this app keeps on the device. */
export const isAppStorageKey = (key: string) => key.startsWith('@mobidou/');
