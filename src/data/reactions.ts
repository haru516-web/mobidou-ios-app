export type ReactionKind = 'pet' | 'snack' | 'talk' | 'pull';
const common: Record<ReactionKind, string[]> = {
  pet: ['えへへ。もうちょっと、なでて。', 'きみの手、あったかいね。', '今日も会えて、うれしい！'],
  snack: ['おだんご！ 半分こ、しよ。', 'もぐもぐ…元気、戻ってきた！', 'おいしいね。次はきみの番！'],
  talk: ['今日はどんな空だった？', '寄り道したぶん、思い出が増えたね。', '疲れたら休もう。いっしょにいるよ。'],
  pull: ['びよーん！ ほっぺ、のびた？', 'そこはほっぺだよ〜。やさしくね。', 'ひっぱられた〜！ もう一回いく？'],
};
const special: Record<string, Partial<Record<ReactionKind, string[]>>> = {
  mobibou: { pet: ['へへっ、そこそこ！', 'な、なでられるの…悪くないな！'], snack: ['団子ゲット！ きみの分も残しとくぞ。'], talk: ['なあ、あの雲、団子っぽくない？', '次のご縁も、いっしょに見つけようぜ！'], pull: ['おい！ ほっぺは反則だぞ！', 'びよーんって…笑うなよな！'] },
  mobirin: { talk: ['寄り道にこそ発見がありますぞ。'], pet: ['ほほう…これは心地よいですな。'] },
  mobichi: { talk: ['今日の空、めっちゃよくない？♡'], pet: ['え〜、もっとなでてよ〜♡'], pull: ['ちょ、ほっぺ伸びてる〜！ かわいく撮って♡'] },
  yami: { talk: ['今日も、いっしょにいてくれる…？'], pet: ['…安心する。もう少しだけ。'], pull: ['……のびた。まだ、そばにいてね。'] },
  mobiyan: { talk: ['焦らんでええ。一歩ずつ行こや！'] },
  mobiyura: { talk: ['この道の先に…新たな契約が待つ。'], pet: ['くっ…我の弱点を知っているとは。'], pull: ['我が頬を引くとは…覚悟はあるな？'] },
  reomoby: { talk: ['君と歩く道は、どこでも特別さ。'] },
  potemoby: { talk: ['あのベンチで、ひと休みしよ〜。'], snack: ['食べて、休んで、またちょっと歩こ。'] },
  babumoby: { pet: ['きゃっきゃ！ すきだばぶ〜。'], talk: ['いっぽ、いっぽ、ばぶっ！'] },
  gamermobby: { talk: ['この寄り道、隠しルートかも。'] },
  koreamobby: { talk: ['次の角まで、一緒に行こう。いい光だね。'] },
  shikamobby: { talk: ['葉っぱの音、聞こえる？'] },
  wolfmobby: { talk: ['急がなくていい。隣にいる。'] },
};
export function reactionLine(id: string, kind: ReactionKind, count: number): string {
  const lines = special[id]?.[kind] ?? common[kind];
  return lines[count % lines.length];
}
