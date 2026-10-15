import { markAccountLost, readLostAccounts, readServerAccount, removeLostAccounts, request, type ServerAccount } from './server.ts';

/*
 * Deleting the account.
 *
 * The server's copy goes first: if it cannot be reached, nothing is erased on this device either, so a player is
 * never left with data on the server that they can no longer reach or remove. A device that never used the server
 * has nothing there to delete.
 *
 * Deletion uses the keys the device holds and never goes through a call that drops an account on a 401: an account
 * the server stopped accepting is kept as "lost" until deletion has been tried for it, so another call's 401, or a
 * new anonymous account made in between, cannot turn "not accepted" into "deleted". Each account that is deleted is
 * struck off at once, so a retry after a failure does not ask the server about it again.
 *
 * A lost account whose key the server still refuses cannot be deleted from this device (the key is the only proof
 * there is). It does not block the account the player is using now: that one is deleted, and the result says that
 * an older account was left ('partly'); its number is kept for the screen to show, so the player can quote it to support.
 */

/** The word the player types at the last step. */
export const DELETE_CONFIRMATION_WORD = '削除';

/**
 * 'partly': the current account was deleted, but an older one could not be (its key is no longer accepted).
 * 'apple_mismatch': the Apple ID signed in with is not the one this account is linked to.
 */
export type DeletionResult = 'deleted' | 'partly' | 'offline' | 'failed' | 'apple_needed' | 'apple_mismatch' | 'signed_out';

/** The numbers of the accounts the last deletion could not reach, for the player to give to support. */
let leftBehind: string[] = [];
export const leftBehindAccounts = (): readonly string[] => leftBehind;

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
  if (reply.status === 409 && reply.data?.error === 'apple_account_mismatch') return 'apple_mismatch';
  // 401 only says this device's key is not accepted (another device signed in with Apple and took the account over,
  // or the account is gone): it is not a deletion.
  if (reply.status === 401) return 'signed_out';
  if (reply.status === 200) return 'deleted';
  return 'failed';
}

export async function deleteServerAccount(): Promise<DeletionResult> {
  leftBehind = [];
  const givenUp: string[] = [];
  for (const lost of await readLostAccounts()) {
    const result = await deleteWith(lost);
    if (result === 'deleted') await removeLostAccounts([lost.userId]);
    else if (result === 'signed_out') givenUp.push(lost.userId);
    else return result;
  }
  const account = await readServerAccount();
  if (account) {
    const result = await deleteWith(account);
    if (result === 'signed_out') {
      // Not accepted: it is kept as lost (so a sign-in with another Apple ID cannot swap what is being deleted).
      await markAccountLost(account);
      return result;
    }
    if (result !== 'deleted') return result;
  }
  await removeLostAccounts(givenUp);
  leftBehind = givenUp;
  return givenUp.length > 0 ? 'partly' : 'deleted';
}

/** Every key this app keeps on the device. */
export const isAppStorageKey = (key: string) => key.startsWith('@mobidou/');
