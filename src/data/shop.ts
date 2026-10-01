/**
 * What the shop tab of the gacha screen lists (see docs/design-v3-monetization-server.md §3 and §5).
 * Prices here are display values; the App Store product ids and the amounts that are actually
 * granted live in the server's PRODUCT_CATALOG_JSON.
 */
export type ShopProduct = {
  id: 'pull1' | 'pull5' | 'light' | 'plus';
  kind: 'pull' | 'plan';
  title: string;
  detail: string;
  price: string;
};

export const SHOP_PRODUCTS: readonly ShopProduct[] = [
  { id: 'pull1', kind: 'pull', title: 'ご縁を1回', detail: 'モビーを1体、ひもを引いて迎えます', price: '250円' },
  { id: 'pull5', kind: 'pull', title: 'ご縁を5回', detail: '5回続けて迎えます。25回ごとに、まだ出会っていないモビーが必ず来ます', price: '1,000円' },
  { id: 'light', kind: 'plan', title: 'ライト', detail: '毎月。ミニチュアが授与される確率が50%に', price: '120円/月' },
  { id: 'plus', kind: 'plan', title: 'プラス', detail: '毎月。確率50%に加えて、授与札を10枚（繰越なし）', price: '300円/月' },
];
