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

/** The two sections of the shop. Each says in plain words what the buyer gets, so the list can be understood at a glance. */
export const SHOP_GROUPS: readonly { kind: ShopProduct['kind']; heading: string; summary: string }[] = [
  { kind: 'pull', heading: 'ガチャ木札を買う', summary: '木札1枚で、ひもを1回引いて新しいモビーに出会えます。' },
  { kind: 'plan', heading: '毎月のお得プラン', summary: '巡礼で寺社に着いたとき、ミニチュアがもらえる確率が上がります。月ごとに自動更新。' },
];

export const SHOP_PRODUCTS: readonly ShopProduct[] = [
  { id: 'pull1', kind: 'pull', title: '木札1枚', detail: 'ひもを1回引いて、モビーを1体迎えます', price: '250円' },
  { id: 'pull5', kind: 'pull', title: '木札5枚セット', detail: '5回続けて引けて、1回200円とお得。購入分25回ごとに、まだ出会っていないモビーが必ず1体来ます', price: '1,000円' },
  { id: 'light', kind: 'plan', title: 'ライトプラン', detail: 'ミニチュアがもらえる確率が、10%から50%に', price: '120円/月' },
  { id: 'plus', kind: 'plan', title: 'プラスプラン', detail: '確率が10%から50%に。さらにハズレのとき使える交換券が、毎月10枚つきます（翌月へは持ち越せません）', price: '300円/月' },
];
