import { Platform } from 'react-native';
import type { PurchasedItem, PurchaseStore } from './purchase';

/** Turn a call that never answers into an error that can be shown, so a purchase can never just sit there silently. */
function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${what} did not answer in ${ms / 1000}s`)), ms);
    work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

/** The App Store (StoreKit 2) through expo-iap. `null` where it cannot work: the web build, or a build without the native module. */
export function createAppStore(): PurchaseStore | null {
  if (Platform.OS !== 'ios') return null;
  let iap: typeof import('expo-iap');
  try { iap = require('expo-iap'); } catch { return null; }
  let connected: Promise<unknown> | null = null;
  const connect = () => connected ??= withTimeout(iap.initConnection(), 15000, 'initConnection').catch(error => { connected = null; throw error; });
  const item = (purchase: import('expo-iap').Purchase): PurchasedItem => ({
    sku: purchase.productId,
    jws: purchase.purchaseToken ?? '',
    finish: async () => { await iap.finishTransaction({ purchase, isConsumable: true }); },
  });
  return {
    async purchase(sku, accountToken) {
      await connect();
      const products = await withTimeout(iap.fetchProducts({ skus: [sku], type: 'in-app' }), 15000, 'fetchProducts');
      if (!products || products.length === 0) throw new Error(`product_not_found: ${sku}`);
      // Purchases an earlier run left unfinished are replayed by the store; they are settled at the next start and must not be
      // mistaken for the purchase being made now.
      const leftOver = new Set((await withTimeout(iap.getAvailablePurchases(), 5000, 'getAvailablePurchases').catch(() => [] as import('expo-iap').Purchase[])).filter(purchase => purchase.productId === sku).map(purchase => purchase.id));
      if (__DEV__) console.log(`[iap] buying ${sku}; ${leftOver.size} unfinished from before`);
      return new Promise<PurchasedItem | 'cancelled'>((resolve, reject) => {
        const done = () => { updated.remove(); failed.remove(); };
        const updated = iap.purchaseUpdatedListener(purchase => {
          if (__DEV__) console.log(`[iap] update ${purchase.productId} id=${purchase.id} token=${purchase.purchaseToken ? 'yes' : 'no'} old=${leftOver.has(purchase.id)}`);
          if (purchase.productId !== sku || !purchase.purchaseToken || leftOver.has(purchase.id)) return;
          done(); resolve(item(purchase));
        });
        const failed = iap.purchaseErrorListener(error => {
          done();
          // The code's spelling differs between library versions, so the message is checked as well.
          if (error.code === iap.ErrorCode.UserCancelled || /cancel/i.test(`${error.code} ${error.message}`)) resolve('cancelled'); else reject(new Error(error.message));
        });
        iap.requestPurchase({ type: 'in-app', request: { apple: { sku, appAccountToken: accountToken } } }).catch(error => { done(); reject(error); });
      });
    },
    async unfinished() {
      await connect();
      const purchases = await withTimeout(iap.getAvailablePurchases(), 10000, 'getAvailablePurchases');
      return purchases.filter(purchase => !!purchase.purchaseToken).map(item);
    },
  };
}
