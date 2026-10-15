import { readLostAccounts, readServerAccount, removeLostAccounts, request, type ServerAccount } from './server.ts';

/*
 * Deleting the account.
 *
 * The server's copy goes first: if it cannot be reached, nothing is erased on this device either, so a player is
 * never left with data on the server that they can no longer reach or remove. A device that never used the server
 * has nothing there to delete.
 *
 * Deletion uses the keys the device holds and never goes through a call that drops an account on a 401: an account
 * the server stopped accepting is kept as "lost" until deletion has been tried for it, so another call's 401, or a
 * new anonymous account made in between, cannot turn "not accepted" into "deleted".
 *
 * A lost account whose key the server still refuses cannot be deleted from this device (the key is the only proof
 * there is). It does not block the account the player is using now: that one is deleted, and the result says that
 * an older account was left ('partly'), so the player is told rather than shown a plain success.
 */

/** The word the player types at the last step. */
export const DELETE_CONFIRMATION_WORD = '削除';

/** 'partly': the current account was deleted, but an older one could not be (its key is no longer accepted). */
export type DeletionResult = 'deleted' | 'partly' | 'offline' | 'failed' | 'apple_needed' | 'signed_out';

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
  // or the account is gone): it is not a deletion.
  if (reply.status === 401) return 'signed_out';
  if (reply.status === 200) return 'deleted';
  return 'failed';
}

export async function deleteServerAccount(): Promise<DeletionResult> {
  const done: string[] = [];
  const given_up: string[] = [];
  for (const lost of await readLostAccounts()) {
    const result = await deleteWith(lost);
    if (result === 'deleted') done.push(lost.userId);
    else if (result === 'signed_out') given_up.push(lost.userId);
    else return result;
  }
  const account = await readServerAccount();
  if (account) {
    const result = await deleteWith(account);
    if (result !== 'deleted') return result;
  }
  // Everything that could be reached is deleted: the losses are settled (the refused ones are reported, not kept forever).
  await removeLostAccounts([...done, ...given_up]);
  return given_up.length > 0 ? 'partly' : 'deleted';
}

/** Every key this app keeps on the device. */
export const isAppStorageKey = (key: string) => key.startsWith('@mobidou/');
