/**
 * What the shop tab of the gacha screen lists (see docs/design-v3-monetization-server.md §3 and §5).
 * Prices here are display values; the App Store product ids and the amounts that are actually
 * granted live in the server's PRODUCT_CATALOG_JSON.
 */
export type ShopProduct = {
  id: 'pull1' | 'pull5' | 'plus';
  kind: 'pull' | 'plan';
  title: string;
  detail: string;
  price: string;
};

/** The two sections of the shop. Each says in plain words what the buyer gets, so the list can be understood at a glance. */
export const SHOP_GROUPS: readonly { kind: ShopProduct['kind']; heading: string; summary: string }[] = [
  { kind: 'pull', heading: 'プレミアム木札を買う', summary: 'プレミアム木札1枚で、ひもを1回引けます。25回引くごとに、まだ出会っていないモビーが必ず出ます。' },
  { kind: 'plan', heading: '毎月のお得プラン', summary: '巡礼で寺社に着くたび、ミニチュアが必ずもらえます。月ごとに自動更新。' },
];

export const SHOP_PRODUCTS: readonly ShopProduct[] = [
  { id: 'pull1', kind: 'pull', title: 'プレミアム木札1枚', detail: 'ひもを1回引いて、モビーを1体迎えます', price: '300円' },
  { id: 'pull5', kind: 'pull', title: 'プレミアム木札5枚セット', detail: 'プレミアム木札が5枚まとまり、1枚あたり240円とお得。引くタイミングは自由で、好きなときに1枚ずつ使えます', price: '1,200円' },
  { id: 'plus', kind: 'plan', title: 'プラスプラン', detail: 'ミニチュアがもらえる確率が、10%から100%に。さらに毎月、ガチャの木札が1枚つきます（持ち越せます）', price: '300円/月' },
];
