export type EventSpot = {
  id: string;
  /** 章 (era) shown above the spot. */
  chapter: '昭和' | '平成';
  name: string;
  /** The miniature enshrined here. All designs are original; no real makes, models or logos. */
  miniature: string;
  /** Team steps needed to reach this spot (cumulative). */
  at: number;
};

export type PilgrimageEvent = {
  id: string;
  name: string;
  status: 'locked' | 'open' | 'ended';
  startsAt?: string;
  endsAt?: string;
  tagline?: string;
  /** Teams are 2..4 friends; solo play is not possible. Every event sets its own limits. */
  minMembers?: number;
  maxMembers?: number;
  /** Fixed goal in team steps, the same however many people walk. */
  goalSteps?: number;
  /** Reward every member receives when the team clears the map. */
  reward?: string;
  spots?: EventSpot[];
};

const spot = (id: string, chapter: EventSpot['chapter'], name: string, miniature: string, at: number): EventSpot => ({ id, chapter, name, miniature, at });

/** Draft content for the first event; see docs/event-plan.md. Names and numbers may still change. */
export const TOKI_MEGURU: PilgrimageEvent = {
  id: 'toki-meguru',
  name: '時をめぐる道',
  status: 'open',
  tagline: '昭和から平成へ。時代の宝物を祀る社を、友だちと歩いてたどる旅。',
  minMembers: 2,
  maxMembers: 4,
  goalSteps: 360000,
  reward: '木札・ミニチュア・御朱印',
  spots: [
    spot('showa-car', '昭和', 'ひだまり商店街の小社', '旧車', 28000),
    spot('showa-bike', '昭和', '峠のカーブ祠', 'バイク', 56000),
    spot('showa-tv', '昭和', '街頭テレビ広場の社', 'ブラウン管テレビ', 84000),
    spot('showa-mirrorball', '昭和', 'ディスコ通りの社', 'ミラーボール', 112000),
    spot('showa-record', '昭和', 'レコード坂の御堂', 'レコード', 140000),
    spot('heisei-md', '平成', 'イヤホンの丘の祠', 'MDプレーヤー', 162000),
    spot('heisei-pager', '平成', 'ポケベル橋のたもと社', 'ポケベル', 184000),
    spot('heisei-cd', '平成', '歩道橋のたもと社', 'ポータブルCDプレーヤー', 206000),
    spot('heisei-sticker', '平成', '文房具屋の角の社', 'シール帳', 228000),
    spot('heisei-phs', '平成', 'アンテナ山の祠', 'PHS', 250000),
    spot('heisei-loose', '平成', '駅前ロータリーの社', 'ルーズソックス', 272000),
    spot('heisei-keitai', '平成', '放課後の公園ほこら', 'ガラケー', 294000),
    spot('heisei-boots', '平成', 'ファッションビル屋上の社', '厚底ブーツ', 316000),
    spot('heisei-digicam', '平成', '世紀末の見晴らし社', 'コンデジ', 338000),
    spot('heisei-strap', '平成', 'ミレニアムの星祭り社', 'デコストラップ', 360000),
  ],
};

/** Events the app knows about. The status becomes date-driven when the server is connected. */
export const EVENTS: PilgrimageEvent[] = [TOKI_MEGURU];
