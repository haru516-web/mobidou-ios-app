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
  goalSteps: 300000,
  reward: 'イベント限定の木札・ミニチュア・御朱印',
  spots: [
    spot('showa-shoutengai', '昭和', 'ひだまり商店街の小社', 'ブリキの丸目セダン', 30000),
    spot('showa-toge', '昭和', '峠の見晴らし祠', '角ばったクーペ', 70000),
    spot('showa-drivein', '昭和', '夜明けドライブインの社', '流線型のスポーツカー', 110000),
    spot('showa-sento', '昭和', '銭湯煙突山の祠', '黒電話', 150000),
    spot('showa-record', '昭和', 'レコード坂の御堂', 'ラジカセ', 190000),
    spot('heisei-park', '平成', '放課後の公園ほこら', '折りたたみ式ガラケー', 230000),
    spot('heisei-pager', '平成', 'ポケベル橋のたもと社', 'ポケットベル', 265000),
    spot('heisei-century', '平成', '世紀末の見晴らし社', 'コンパクトデジカメ', 300000),
  ],
};

/** Events the app knows about. The status becomes date-driven when the server is connected. */
export const EVENTS: PilgrimageEvent[] = [TOKI_MEGURU];
