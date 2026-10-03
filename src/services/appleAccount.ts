import { Platform } from 'react-native';
import { adoptServerAccount, authedRequest, request } from './server.ts';
import { appleOutcome, type AppleOutcome } from './appleOutcome.ts';

/*
 * Sign in with Apple, used to keep the anonymous account (木札, friends, profile) across devices.
 *
 * - `linkApple`: on a device that already has an account, tie it to the Apple ID.
 * - `restoreWithApple`: on a new device, sign in and take the linked account over (the old device is signed out).
 * Apple's token is checked by the server, never trusted by the app.
 */

export type { AppleOutcome };

type Token = { token: string } | { reason: 'cancelled' | 'unavailable' | 'failed' };

async function identityToken(): Promise<Token> {
  if (Platform.OS !== 'ios') return { reason: 'unavailable' };
  let apple: typeof import('expo-apple-authentication');
  try { apple = require('expo-apple-authentication'); } catch { return { reason: 'unavailable' }; }
  try {
    if (!(await apple.isAvailableAsync())) return { reason: 'unavailable' };
    const credential = await apple.signInAsync({ requestedScopes: [] });
    return credential.identityToken ? { token: credential.identityToken } : { reason: 'failed' };
  } catch (error) {
    return { reason: (error as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED' ? 'cancelled' : 'failed' };
  }
}

export async function linkApple(): Promise<AppleOutcome> {
  const got = await identityToken();
  if ('reason' in got) return { ok: false, reason: got.reason };
  const reply = await authedRequest('/account/apple/link', { body: { identityToken: got.token } });
  return appleOutcome('link', reply);
}

export async function restoreWithApple(): Promise<AppleOutcome> {
  const got = await identityToken();
  if ('reason' in got) return { ok: false, reason: got.reason };
  const reply = await request('/auth/apple', { body: { identityToken: got.token } });
  const outcome = appleOutcome('restore', reply);
  const data = reply?.data;
  if (outcome.ok && data && typeof data.userId === 'string' && typeof data.secret === 'string') await adoptServerAccount({ userId: data.userId, secret: data.secret });
  else if (outcome.ok) return { ok: false, reason: 'failed' };
  return outcome;
}

/** Whether this device's account is tied to an Apple ID; null when the server cannot say. */
export async function isAppleLinked(): Promise<boolean | null> {
  const reply = await authedRequest('/profile', { method: 'GET' });
  return reply?.status === 200 && typeof reply.data?.appleLinked === 'boolean' ? reply.data.appleLinked : null;
}
