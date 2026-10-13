import type { Shrine } from './shrines';
import { TOKI_MEGURU } from './events';

/**
 * The event's spots in the shape of an ordinary shrine, so the goshuin book (cover, page turn, index, detail)
 * shows the event with the same screen code. The picture is found by the spot id in STAMP_IMAGES.
 */
/** What each spot says on its page: where it is, and two lines about the miniature kept there. */
const SPOT_PAGE: Record<string, { place: string; lines: [string, string] }> = {
  'showa-car': { place: '商店街の路地', lines: ['商店街の角に、磨かれた旧車が一台。', 'エンジン音の記憶を、そっと祀る。'] },
  'showa-bike': { place: '峠道のカーブ', lines: ['風を切って峠を越えた、あの日の一台。', 'カーブの先で、ご縁を結ぶ。'] },
  'showa-tv': { place: '街頭テレビの広場', lines: ['街頭テレビの前に、人垣ができた夕方。', 'みんなで見上げた時間を祀る。'] },
  'showa-mirrorball': { place: 'ディスコ通り', lines: ['夜の通りで、ミラーボールが光をまく。', 'きらめきの記憶を、ここに祀る。'] },
  'showa-record': { place: 'レコード坂', lines: ['針を落とすと、坂道に歌が流れ出す。', 'レコードの溝に、ご縁を重ねる。'] },
  'heisei-md': { place: 'イヤホンの丘', lines: ['イヤホンの片方を、友だちと分け合った丘。', 'MDに詰めた曲を、ここに祀る。'] },
  'heisei-pager': { place: 'ポケベル橋', lines: ['数字だけのメッセージを待った橋のたもと。', 'ポケベルの合図で、ご縁を結ぶ。'] },
  'heisei-cd': { place: '歩道橋の上', lines: ['歩道橋の上で、CDの曲をくり返した。', '音が跳ねないよう、そっと歩く。'] },
  'heisei-sticker': { place: '文房具屋の角', lines: ['交換したシールで、帳面がにぎやかになる。', '角の文房具屋で、ご縁を貼る。'] },
  'heisei-phs': { place: 'アンテナ山', lines: ['アンテナ山で、やっと電波がつながる。', 'PHSの声を、ここに祀る。'] },
  'heisei-loose': { place: '駅前ロータリー', lines: ['ロータリーで、ルーズソックスがゆれる。', '放課後の笑い声を、ここに祀る。'] },
  'heisei-keitai': { place: '放課後の公園', lines: ['公園のベンチで、ガラケーを開いた放課後。', 'ストラップの音に、ご縁がゆれる。'] },
  'heisei-boots': { place: 'ビルの屋上', lines: ['屋上へ続く階段を、厚底で一段ずつ。', '背伸びした足音を、ここに祀る。'] },
  'heisei-digicam': { place: '世紀末の見晴らし', lines: ['世紀末の空を、コンデジにおさめた。', '小さな液晶に、ご縁を写す。'] },
  'heisei-strap': { place: '星祭りの広場', lines: ['ミレニアムの夜、ストラップが星のように光る。', 'きらめく飾りに、ご縁をつなぐ。'] },
};

export const EVENT_SHRINES: Shrine[] = (TOKI_MEGURU.spots ?? []).map(spot => {
  const page = SPOT_PAGE[spot.id] ?? { place: `${spot.chapter}の道`, lines: [`${spot.chapter}の宝物を祀る社。`, 'チームのみんなで歩いて、ご縁を結ぶ。'] as [string, string] };
  return {
    id: spot.id,
    name: spot.name,
    reading: `${spot.chapter} · ${spot.at.toLocaleString()}歩`,
    place: `${spot.chapter} · ${page.place}`,
    theme: `${spot.miniature}`,
    description: `${spot.miniature}
${page.lines[0]}
${page.lines[1]}`,
    blessing: '',
    stampLocation: '',
    color: '#2F4A6B',
    icon: 'star',
  } as unknown as Shrine;
});
