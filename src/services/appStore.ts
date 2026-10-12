import { Platform } from 'react-native';
import { PLUS_PRODUCT, PULL_PRODUCTS, type PurchasedItem, type PurchaseStore } from './purchase';

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
    finish: async () => { await iap.finishTransaction({ purchase, isConsumable: purchase.productId !== PLUS_PRODUCT.sku }); },
  });
  return {
    async purchase(sku, accountToken, kind = 'in-app') {
      await connect();
      const products = await withTimeout(iap.fetchProducts({ skus: [sku], type: kind }), 15000, 'fetchProducts');
      if (!products || products.length === 0) throw new Error(`product_not_found: ${sku}`);
      // Purchases an earlier run left unfinished are replayed by the store; they are settled at the next start and must not be
      // mistaken for the purchase being made now.
      const leftOver = new Set((await withTimeout(iap.getAvailablePurchases(), 5000, 'getAvailablePurchases').catch(() => [] as import('expo-iap').Purchase[])).filter(purchase => purchase.productId === sku).map(purchase => purchase.id));
      if (__DEV__) console.log(`[iap] buying ${sku}; ${leftOver.size} unfinished from before`);
      return new Promise<PurchasedItem | 'cancelled'>((resolve, reject) => {
        const startedAt = Date.now();
        let seen = 0;
        let ignored = 0;
        // The sheet may stay open while someone types a password, but two minutes with no word from the store at all is a stall.
        // It is said out loud; a purchase that does complete later is settled by the next start.
        const giveUp = setTimeout(() => { done(); reject(new Error(`no_answer: events=${seen} ignored=${ignored}`)); }, 120000);
        const done = () => { clearTimeout(giveUp); updated.remove(); failed.remove(); };
        const updated = iap.purchaseUpdatedListener(purchase => {
          seen += 1;
          if (__DEV__) console.log(`[iap] update ${purchase.productId} id=${purchase.id} token=${purchase.purchaseToken ? 'yes' : 'no'} old=${leftOver.has(purchase.id)}`);
          if (purchase.productId !== sku || !purchase.purchaseToken || leftOver.has(purchase.id)) { ignored += 1; return; }
          done(); resolve(item(purchase));
        });
        const failed = iap.purchaseErrorListener(error => {
          done();
          // The code's spelling differs between library versions, so the message is checked as well.
          if (error.code === iap.ErrorCode.UserCancelled || /cancel/i.test(`${error.code} ${error.message}`)) {
            // A person cancelling takes a moment. A "cancel" that comes back at once means the sheet never opened, which must not look like a choice.
            if (Date.now() - startedAt < 2500) reject(new Error(`cancelled_at_once: ${error.code} ${error.message}`)); else resolve('cancelled');
          } else reject(new Error(error.message));
        });
        iap.requestPurchase({ type: kind, request: { apple: { sku, appAccountToken: accountToken } } }).catch(error => { done(); reject(error); });
      });
    },
    async prices() {
      try {
        await connect();
        const inApp = await withTimeout(iap.fetchProducts({ skus: [...Object.values(PULL_PRODUCTS).map(product => product.sku)], type: 'in-app' }), 10000, 'fetchProducts(in-app)');
        const subs = await withTimeout(iap.fetchProducts({ skus: [PLUS_PRODUCT.sku], type: 'subs' }), 10000, 'fetchProducts(subs)');
        const result: Record<string, string> = {};
        for (const product of [...(inApp ?? []), ...(subs ?? [])]) {
          const label = (product as { displayPrice?: string }).displayPrice;
          if (typeof label === 'string' && label) result[product.id] = label;
        }
        return result;
      } catch { return {}; }
    },
    async unfinished() {
      await connect();
      const purchases = await withTimeout(iap.getAvailablePurchases(), 10000, 'getAvailablePurchases');
      return purchases.filter(purchase => !!purchase.purchaseToken).map(item);
    },
  };
}
