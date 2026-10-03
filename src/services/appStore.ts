import { Platform } from 'react-native';
import type { PurchasedItem, PurchaseStore } from './purchase';

/** The App Store (StoreKit 2) through expo-iap. `null` where it cannot work: the web build, or a build without the native module. */
export function createAppStore(): PurchaseStore | null {
  if (Platform.OS !== 'ios') return null;
  let iap: typeof import('expo-iap');
  try { iap = require('expo-iap'); } catch { return null; }
  let connected: Promise<unknown> | null = null;
  const connect = () => connected ??= iap.initConnection().catch(error => { connected = null; throw error; });
  const item = (purchase: import('expo-iap').Purchase): PurchasedItem => ({
    sku: purchase.productId,
    jws: purchase.purchaseToken ?? '',
    finish: async () => { await iap.finishTransaction({ purchase, isConsumable: true }); },
  });
  return {
    async purchase(sku, accountToken) {
      await connect();
      const products = await iap.fetchProducts({ skus: [sku], type: 'in-app' });
      if (!products || products.length === 0) throw new Error(`product_not_found: ${sku}`);
      return new Promise<PurchasedItem | 'cancelled'>((resolve, reject) => {
        const done = () => { updated.remove(); failed.remove(); };
        const updated = iap.purchaseUpdatedListener(purchase => {
          if (purchase.productId !== sku || !purchase.purchaseToken) return;
          done(); resolve(item(purchase));
        });
        const failed = iap.purchaseErrorListener(error => {
          done();
          if (error.code === iap.ErrorCode.UserCancelled) resolve('cancelled'); else reject(new Error(error.message));
        });
        iap.requestPurchase({ type: 'in-app', request: { apple: { sku, appAccountToken: accountToken } } }).catch(error => { done(); reject(error); });
      });
    },
    async unfinished() {
      await connect();
      const purchases = await iap.getAvailablePurchases();
      return purchases.filter(purchase => !!purchase.purchaseToken).map(item);
    },
  };
}
