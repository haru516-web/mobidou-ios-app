// Content of the replayable feature tour that settings opens. It is plain data so it can be tested without React Native.
// The first-run tutorial is separate (it makes the player tap the real controls); this tour only explains.

export type TourTab = 'home' | 'book' | 'walk' | 'collection';
export type TourSectionId = 'home' | 'book' | 'gacha' | 'walk' | 'collection';
export type TourSelection = TourSectionId | 'all';

/** Places on screen a step can point at. Each is registered by a <TourAnchor>, except `nav*`, which are slices of the tab bar. */
export type TourAnchorId =
  | 'home-companion' | 'home-steps' | 'home-widgets' | 'header-settings'
  | 'book-top' | 'walk-top' | 'walk-ring' | 'walk-action' | 'collection-tabs'
  | 'nav-home' | 'nav-book' | 'nav-gacha' | 'nav-walk' | 'nav-collection';

export type TourStep = {
  title: string;
  detail: string;
  /** Spotlight target. Leave out when the thing explained moves around the screen (the floating Mobby). */
  anchor?: TourAnchorId;
  /** Screen laid over the tabs while this step shows. The gacha is a full-screen scene, so the tour opens it. */
  scene?: 'gacha';
};

export type TourSection = {
  id: TourSectionId;
  /** The tab shown behind the steps. The gacha has no screen of its own, so it keeps whichever tab is open. */
  tab: TourTab | null;
  title: string;
  /** Ionicons name, the same one the tab bar uses. */
  icon: string;
  /** What the picker says under the name. */
  summary: string;
  steps: readonly TourStep[];
};

export const TOUR_SECTIONS: readonly TourSection[] = [
  {
    id: 'home', tab: 'home', title: 'ホーム', icon: 'home-outline', summary: 'モビー・歩数・カード・メニュー',
    steps: [
      { anchor: 'home-companion', title: 'ホームのモビー', detail: 'ほっぺを引っぱると伸びるよ。タップすると二礼二拍手一礼のお参りをするよ。' },
      { anchor: 'home-steps', title: '歩数のカード', detail: '今日の歩数と、次の御朱印までの道のりが見られるよ。タップするとおでかけが開くよ。' },
      { anchor: 'home-widgets', title: 'ホームのカード', detail: 'おみくじは一日一回、タップで全画面で引けるよ。カードは長押しで、好きな並びに変えられるよ。' },
      { title: '画面のモビー', detail: '画面の端にいる小さなモビーをタップすると、キャラ変更・通知・プレゼント・フレンドのメニューが開くよ。ドラッグで好きな場所へ動かせるよ。' },
      { anchor: 'header-settings', title: '設定', detail: '歩数の連携やアカウント管理はここから。このチュートリアルもここで見返せるよ。' },
    ],
  },
  {
    id: 'book', tab: 'book', title: '御朱印帳', icon: 'book-outline', summary: 'ページをめくる・目次・御朱印の詳細',
    steps: [
      { anchor: 'nav-book', title: '御朱印帳', detail: '表紙をタップして開こう。ページをめくって、集めた御朱印をゆっくり眺められるよ。' },
      { anchor: 'book-top', title: '目次', detail: '「目次」を開くと、好きなページへジャンプできるよ。' },
      { title: '御朱印の詳細', detail: 'ページの御朱印をタップすると、由来の説明と拡大表示が見られるよ。' },
    ],
  },
  {
    id: 'gacha', tab: null, title: 'ガチャ', icon: 'gift-outline', summary: 'モビーとの新しい出会い',
    steps: [
      { anchor: 'nav-gacha', title: 'ガチャのボタン', detail: 'ナビバーの真ん中のボタンで、ガチャの画面が開くよ。' },
      { scene: 'gacha', title: 'ご縁を結ぶ', detail: '引く回数（1回・10回）を選んで、ひもを引っぱろう。箱が開いて、新しいモビーに会えるよ。' },
      { scene: 'gacha', title: '木札', detail: '1回につき木札を1枚使うよ。新しい巡礼を初めて結願すると、木札が1枚もらえるよ。' },
      { scene: 'gacha', title: 'プレミアム木札', detail: '購入した木札だよ。25回引くごとに、まだ出会っていないモビーが必ず出るよ。「とじる」でもどれるよ。' },
    ],
  },
  {
    id: 'walk', tab: 'walk', title: 'おでかけ', icon: 'footsteps-outline', summary: '歩数・巡礼絵図',
    steps: [
      { anchor: 'walk-ring', title: '今日の歩数', detail: '円は、次の御朱印までの進み具合。歩いた分だけ満ちていくよ。' },
      { anchor: 'walk-action', title: '歩数を更新', detail: '「今日の歩数を更新」で最新の歩数を読み込むよ。まだ連携していないときは、ここから連携できるよ。' },
      { anchor: 'walk-top', title: '巡礼絵図', detail: '右上のボタンで、歩数と巡礼絵図を切り替えられるよ。絵図の立ち寄り先をタップすると、御朱印の詳細が見られるよ。' },
    ],
  },
  {
    id: 'collection', tab: 'collection', title: 'コレクション', icon: 'albums-outline', summary: '展示室・御朱印・ミニチュア',
    steps: [
      { anchor: 'collection-tabs', title: '3つの部屋', detail: '展示室・御朱印・ミニチュアを切り替えて、集めたものを眺められるよ。' },
      { title: '展示室', detail: '指を広げたり閉じたりすると、近くで見たり、全体を見渡したりできるよ。' },
    ],
  },
];

export type TourPlanStep = TourStep & {
  section: TourSectionId;
  sectionTitle: string;
  tab: TourTab | null;
  /** Position inside the whole plan, 1-based, for the "3 / 12" badge. */
  index: number;
  total: number;
};

/**
 * The flat list of steps for a choice. "all" runs every section in tab-bar order, from the home.
 * The gacha is dropped while it is not on the tab bar (before the first Mobby is chosen).
 */
export function buildTourPlan(selection: TourSelection, options: { gacha: boolean }): TourPlanStep[] {
  const sections = TOUR_SECTIONS.filter(section => (selection === 'all' || section.id === selection) && (section.id !== 'gacha' || options.gacha));
  const steps = sections.flatMap(section => section.steps.map(step => ({ ...step, section: section.id, sectionTitle: section.title, tab: section.tab })));
  return steps.map((step, index) => ({ ...step, index: index + 1, total: steps.length }));
}

/** Picker rows, in tab-bar order. The gacha row is hidden along with its tab. */
export function tourPickerSections(options: { gacha: boolean }): readonly TourSection[] {
  return TOUR_SECTIONS.filter(section => section.id !== 'gacha' || options.gacha);
}

/** Which slice of the tab bar a nav anchor is, counted from the left, given whether the gacha tab is present. */
export function navSlice(anchor: TourAnchorId, options: { gacha: boolean }): { index: number; count: number } | null {
  const order: TourAnchorId[] = options.gacha
    ? ['nav-home', 'nav-book', 'nav-gacha', 'nav-walk', 'nav-collection']
    : ['nav-home', 'nav-book', 'nav-walk', 'nav-collection'];
  const index = order.indexOf(anchor);
  return index < 0 ? null : { index, count: order.length };
}
