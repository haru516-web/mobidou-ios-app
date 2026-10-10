// One short saying per shrine, in the voice of that shrine's blessing (docs/shrine-descriptions-tiktok.md).
// They are original lines for the Mobidou world, not quotations from real people, so none of them needs a source.
// Keep each one on a single line (about 24 characters at most) so it fits under the stamp and on a card.

export const SHRINE_SAYINGS: Readonly<Record<string, string>> = {
  hatsumobi: 'はじめの一歩は、いちばん小さくていい。',
  rain: '雨の日にしか育たない芽がある。',
  forest: '木漏れ日は、立ち止まった人にだけ届く。',
  takekaze: 'しなる強さは、折れない強さ。',
  morika: '気配に気づけるのは、静かに歩く人。',
  morikage: '歩いた日々は、ちゃんと自分を支えている。',
  hibikiishi: '自分の足音が、いちばんの励ましになる。',
  kazewatari: '迷いは、風に預けて歩こう。',
  yukishiro: '静かな日は、心の根が伸びる日。',
  mine: '頂で結んだ縁は、ほどけにくい。',
  akatsuki: '夜明け前がいちばん、空は深い青。',
  flower: '縁は、咲く前から根を張っている。',
  mebuki: 'まだ何もできない日は、芽吹きの日。',
  aoba: '大きな海の前では、悩みも小さくなる。',
  wakaba: '休んだ分だけ、また葉は伸びる。',
  asatsuyu: '朝の十分は、一日でいちばんやわらかい。',
  mizusumi: '濁りは、静かにしておけば沈んでいく。',
  gindrop: 'ありがとうは、歩いて届けに行くもの。',
  cloud: '落ち込んだ日にも、明かりはちゃんとある。',
  sabaku: '遠回りした分だけ、景色は増える。',
  amenagi: '雨音を聞けば、怒りも静かになる。',
  moon: '離れていても、同じ月を見ている。',
  nijiayumu: '縁は一色じゃない。七色あっていい。',
  shionagi: '何もしない時間にも、意味がある。',
  tsubaki: '凛と立つのに、大きな声はいらない。',
  kirikakushi: '霧の向こうは、行ってみて初めて見える。',
  hikari: '不安な朝は、小さな光をひとつ持って出よう。',
  kinboshi: '子どもの頃の夢は、まだ空にある。',
  sunamoon: '眠れない夜は、月に足元を預けよう。',
  akane: '今日を終えるのも、立派な仕事。',
  kujira: '大きな夢ほど、ゆっくり泳げばいい。',
  negaiishi: '願いは、一歩にして初めて重みが出る。',
  hoshifune: '新しい場所も、歩けば道になる。',
  kanadeboshi: '毎日の拍子が整えば、心も整う。',
  yume: 'やさしい夜は、よい夢の入口。',
  tsubasa: '飛ぶ前に、まず足を地面につけて。',
  hagoromo: '肩の力は、息と一緒に抜けていく。',
  tsukikage: '夜道は、一歩ぶんだけ見えればいい。',
  yumeakari: '小さな灯りは、小さな勇気から。',
  star: '点だった星も、歩けば道になる。',
  asagiri: 'やり直す朝は、いつでもやってくる。',
  kodama: '自分の足音に、自分が返事をする。',
  shakunage: '咲く時期は、花ごとに違っていい。',
  takimori: '疲れは、流してから眠ろう。',
  shigure: '叶わなくても、歩いた時間は消えない。',
  iwakura: '覚悟は、静かに腰を据えること。',
  kuroiwa: '座ることも、歩みの一部。',
  haneishi: '手放すと、手が空いて次を持てる。',
  suzumori: '迷ったら、鈴の音に耳を澄ませて。',
  tenryu: '頂の鐘は、登ってきた道に鳴る。',
  sazanami: '完璧な計画より、最初のひと跨ぎ。',
  minamo: '水に映る自分に、まずおはよう。',
  hotarubi: '小さな光は、暗い所でいちばん見える。',
  kawaoto: '早い流れも、遅い流れも、海へ行く。',
  hasunomi: '泥の中の時間も、花の一部。',
  shiosai: '戻ることは、負けではなく助走。',
  yanagi: '風に逆らわない枝は、折れない。',
  mizunagi: '一周して見える景色が、今のあなた。',
  yasuragi: '疲れたと気づけたら、半分は癒えている。',
  megumi: 'もらった優しさは、回すほど増える。',
  kokorone: '迷ったら、胸の音に耳を澄ませて。',
  negai: '自分の願いの隣に、誰かの願いも置く。',
  ichibanboshi: '声に出した願いは、一歩目になる。',
  tsukishirabe: '本当に欲しいものは、静かな夜に分かる。',
  kibou: '大きな炎より、消えない小さな火。',
  kokoroseki: '決めるのは、石を置くように静かに。',
  hoshimizu: '飾りを洗えば、本当の一言が残る。',
  yorunagi: '待つ間にも、願いは根を張る。',
  musubihoshi: '叶う前から、もう受け取っているものがある。',
  kawakagami: '物語は、ふと映った星から始まる。',
  hoshinooto: '耳を澄ませば、星にも音がある。',
  funeakari: '選ばなかった道も、誰かの道しるべ。',
  sorashiori: '今日の空を、一枚の栞にして帰ろう。',
  natsukage: '過ぎた日の声は、前へ歩く力になる。',
  tsuzuri: '最後の一行は、次の散歩への予告。',
};

/** The most characters one column of a vertically written saying holds. */
export const SAYING_MAX_PER_COLUMN = 12;

/** Splits a saying into columns at its commas and full stops; a column longer than the limit is cut into even parts. */
export function sayingColumns(text: string): string[][] {
  const pieces = text.split(/(?<=[、。])/).map(piece => piece.trim()).filter(Boolean);
  const columns: string[][] = [];
  for (const piece of pieces) {
    const chars = Array.from(piece);
    const parts = Math.max(1, Math.ceil(chars.length / SAYING_MAX_PER_COLUMN));
    const size = Math.ceil(chars.length / parts);
    for (let i = 0; i < chars.length; i += size) columns.push(chars.slice(i, i + size));
  }
  return columns;
}
