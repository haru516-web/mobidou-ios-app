import { clearLostAccount, readLostAccount, readServerAccount, request, type ServerAccount } from './server.ts';

/*
 * Deleting the account.
 *
 * The server's copy goes first: if it cannot be reached, nothing is erased on this device either, so a player is
 * never left with data on the server that they can no longer reach or remove. A device that never used the server
 * has nothing there to delete.
 *
 * Deletion uses the keys the device holds and never goes through a call that drops an account on a 401: an account
 * the server stopped accepting is kept as "lost" until it has been deleted, so another call's 401, or a new
 * anonymous account made in between, cannot turn "not accepted" into "deleted".
 */

/** The word the player types at the last step. */
export const DELETE_CONFIRMATION_WORD = '削除';

export type DeletionResult = 'deleted' | 'offline' | 'failed' | 'apple_needed' | 'signed_out';

async function deleteWith(account: ServerAccount): Promise<DeletionResult> {
  let reply = await request('/account/delete', { body: { confirm: 'delete' }, account });
  // The server holds no Apple token for this Apple-linked account: sign in with Apple again and send the fresh code.
  if (reply?.status === 409 && reply.data?.error === 'apple_reauth_required') {
    // Loaded here, not at the top, because the Apple sign-in code pulls in react-native, which plain-Node tests cannot load.
    const { freshAuthorizationCode } = require('./appleAccount') as typeof import('./appleAccount');
    const authorizationCode = await freshAuthorizationCode();
    if (!authorizationCode) return 'apple_needed';
    reply = await request('/account/delete', { body: { confirm: 'delete', authorizationCode }, account });
  }
  if (!reply) return 'offline';
  // 401 only says this device's key is not accepted (another device signed in with Apple and took the account over,
  // or the account is gone): it is not a deletion, so nothing is erased until the player signs in again.
  if (reply.status === 401) return 'signed_out';
  if (reply.status === 200) return 'deleted';
  return 'failed';
}

export async function deleteServerAccount(): Promise<DeletionResult> {
  // An account that was dropped earlier still has to be deleted (or re-authorised) before anything is called deleted.
  const lost = await readLostAccount();
  if (lost) {
    const result = await deleteWith(lost);
    if (result !== 'deleted') return result;
    await clearLostAccount();
  }
  const account = await readServerAccount();
  if (!account) return 'deleted';
  return deleteWith(account);
}

/** Every key this app keeps on the device. */
export const isAppStorageKey = (key: string) => key.startsWith('@mobidou/');
