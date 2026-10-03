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
  shikamobby: { talk: ['葉っぱの音、聞こえる？'] },
  wolfmobby: { talk: ['急がなくていい。隣にいる。'] },
};
/** What the app knows right now. The caller supplies it; nothing here reads the clock or saved data. */
export type ReactionContext = {
  hour?: number;
  daysSinceLastOpen?: number;
  justReceivedGoshuin?: boolean;
  justCompletedPilgrimage?: boolean;
  /** Steps left to the next stop. */
  remainingSteps?: number;
  affinityStage?: 'new' | 'friendly' | 'partner';
};
/** Bond taps so far -> how close the pair feels. */
export function affinityStageFor(bonds: number): NonNullable<ReactionContext['affinityStage']> {
  return bonds >= 100 ? 'partner' : bonds >= 20 ? 'friendly' : 'new';
}
const situational = {
  completed: ['ここまで歩いたね。いっしょに来られてうれしい。', '旅の証が増えたね。今日は、ゆっくり余韻を楽しもう。'],
  goshuin: ['新しい御朱印、いっしょに眺めよう。', '今日の一歩が、旅の証になったね。'],
  returned: ['おかえり。会えてうれしいよ。', '久しぶりだね。また、きみのペースで歩こう。'],
  nearStop: ['次の場所まで、あと少し。急がず行こう。', 'もうすぐだね。疲れていたら、続きはまた今度でも。'],
  new: ['きみの好きな道、少しずつ教えてね。', 'これから、いっしょの思い出を増やそう。'],
  friendly: ['きみとの寄り道、楽しみになってきたよ。', '今日も、いつもの場所でひと息つこう。'],
  partner: ['きみの歩幅、すっかりおなじみだね。', '歩く日も休む日も、きみと過ごすのが好き。'],
  morning: ['おはよう。今日の一歩、ゆっくり始めよう。', '朝の空気、どんな感じかな。'],
  noon: ['こんにちは。お昼のひと息、いっしょにしよう。', '今の空、少し眺めてみようか。'],
  evening: ['今日もここまで、おつかれさま。', '夕方の道、帰りはのんびりね。'],
  night: ['こんばんは。今夜はゆっくり休もうね。', '今日の小さな発見、ひとつ聞かせて。'],
};
/** The situation worth mentioning right now, most notable first. */
function situationLines(context: ReactionContext): { lines: string[]; always: boolean } | null {
  if (context.justCompletedPilgrimage) return { lines: situational.completed, always: true };
  if (context.justReceivedGoshuin) return { lines: situational.goshuin, always: true };
  if ((context.daysSinceLastOpen ?? 0) >= 7) return { lines: situational.returned, always: false };
  if (context.remainingSteps !== undefined && context.remainingSteps >= 1 && context.remainingSteps <= 100) return { lines: situational.nearStop, always: false };
  if (context.affinityStage && context.hour === undefined) return { lines: situational[context.affinityStage], always: false };
  const h = context.hour;
  if (h !== undefined) {
    const time = h >= 5 && h <= 10 ? situational.morning : h >= 11 && h <= 16 ? situational.noon : h >= 17 && h <= 19 ? situational.evening : situational.night;
    return { lines: context.affinityStage ? [...time, ...situational[context.affinityStage]] : time, always: false };
  }
  return null;
}
const commonExtra: Record<ReactionKind, string[]> = {
  pet: ['ほっとしたら、肩の力も抜いてね。', 'ゆっくりでいいよ。ここにいるから。', 'えへへ。きみもひと息つこ。'],
  snack: ['ひと口ずつ、のんびり食べよう。', '歩いたあとのおやつ、楽しみだったんだ。', 'お茶もあると、うれしいね。'],
  talk: ['道ばたに、何か小さな発見あった？', '歩かない日も、話しに来ていいんだよ。', '今日は、どこでひと息つこうか。'],
  pull: ['あはは、そんなにのびるかな？', 'ぷにっとした？ きみ、楽しそうだね。', 'ほっぺの体操、おしまい。ひと息つこ！'],
};
// More things to say when talking, per character. Their original lines (above) come first.
const extraTalk: Record<string, string[]> = {
  mobibou: ['へへっ、今日はどんな寄り道した？', 'ちょっと休もうぜ。団子の話でもしよう。', '一歩ずつでも、ちゃんと進んでるな！', 'きみと歩くと、いつもの道もおもしろいぞ。'],
  mobirin: ['今日の小さな発見、聞かせてくだされ。', 'ひと休みも、旅の大切な一頁ですな。', '同じ道でも、季節が変われば趣が違いますぞ。', '一歩を重ねた記録、じっくり眺めたいですな。', 'きみとなら、散歩の話も尽きませんぞ。'],
  mobichi: ['この道、かわいいお花あったよ〜♡', '今日はのんびりでもよくない？ お茶しよ♡', 'ちょっと歩いた自分も、ほめちゃお〜！', '寄り道の話、聞かせてよ〜♡', 'きみと見つけた景色、覚えときたいな♡'],
  yami: ['……来てくれて、うれしい。', '静かな道、いっしょに歩きたいな。', '今日は休んでもいいよ。ここで話そ……。', 'あの小さな花、きみも見てた？', 'きみと見た空、覚えておきたい……。'],
  mobiyan: ['今日もよう来たな。ちょっと話そか。', '疲れたら座ろ。休むんも大事やで。', 'あの道、ええ風が吹いとったな。', '少し歩けたんやったら、それでええやん。', 'おまえとの寄り道、けっこう楽しみやねん。'],
  mobiyura: ['今日の空にも、我らだけの物語がある。', '今は力を蓄える時……ひと休みとしよう。', '小さき一歩も、旅の書には刻まれる。', '道ばたの花……見過ごせぬ存在だな。', '我が相棒よ。今日の発見を聞かせるがよい。'],
  reomoby: ['今日の景色、君にはどう見えたかな。', '急がなくていいよ。君の歩幅で行こう。', 'お茶にしようか。少し話を聞かせて。', '小さな一歩も、君の旅の大切な記録さ。', '君と見つけた花を、覚えておきたいな。'],
  potemoby: ['今日はどこで、のんびりする〜？', 'ちょっと歩いて、ちょっと休む。いい感じ〜。', 'あの雲、ふかふかの枕みたいだね。', '話しに来ただけでも、うれしいよ〜。', 'きみとぼんやりする時間、好きだな〜。'],
  babumoby: ['おそら、みたばぶ？', 'ひとやすみ、いっしょだばぶ〜。', 'おはな、ちっちゃいばぶ！', 'きょうのおはなし、きくばぶ〜。', 'いっしょ、うれしいばぶっ！'],
  bearmobby: ['ぼくは、ゆっくり歩くのが好きだな。', '今日の道で、何か見つけた？', '疲れたら、ここでひと休みしようね。', '小さな一歩も、思い出になるんだね。', 'あの木の影、涼しそうだよ。', 'きみと話していると、ほっとするな。'],
  boymobby: ['今日の散歩、どんな発見あった？', 'あの曲がり角、ちょっと気になるね！', 'ひと息ついてから、また行こうよ。', '少しずつでも、思い出が増えてくね！', '空を見上げたら、おもしろい雲があったよ。', 'きみと歩く時間、楽しみにしてたんだ！'],
  dogmobby: ['来てくれた！ いっしょに話そうよ。', '今日の道、どんなにおいがしたかな？', '休むときも、隣にいるよ！', '少し歩いたんだね。しっぽ振っちゃう！', 'あの木のところ、また行きたいな。', 'きみと歩くと、うれしくなるんだ！'],
  ojimobby: ['いつもの道にも、見つけるものはあるんじゃよ。', '今日はどんな空じゃった？', 'お茶でも飲んで、ひと息つこうか。', '歩いた記録は、少しずつ眺めるのもええな。', '急がずにな。休みながらでええんじゃ。', 'きみの寄り道の話、聞くのが楽しみじゃよ。'],
  reamobby: ['森の道、今日はどんな音がするかな。', '気になる葉っぱ、ひとつ見つけたよ。', '今は木陰で、のんびりしたい気分。', 'いつもの道にも、不思議が隠れてるね。', '今日は話だけ？ それもいいね。', 'きみと見つけた景色、ちょっと特別だね。'],
  shikamobby: ['今日の風、やわらかいね。', '木陰で少し、休んでいこう。', '道ばたの芽、少し伸びたみたい。', 'きみの歩いた道の話、聞きたいな。', 'いっしょだと、森の音も楽しいね。'],
  uyumobby: ['今日は、ゆっくりお話ししよう。', '空の色、少しずつ変わっていくね。', '疲れたら、ひと息ついていいんだよ。', '小さな発見、ひとつ聞かせて。', 'いつもの道も、きみと見ると新鮮だね。', '歩く日も休む日も、会えてうれしいな。'],
  wolfmobby: ['今日の道は、どうだった。', '疲れたら休もう。ここで待つ。', '風の音、少し聞いていこう。', '一歩ずつ、記録が増えているな。', 'おまえと歩く時間、悪くない。'],
};
export function reactionLine(id: string, kind: ReactionKind, count: number, context?: ReactionContext): string {
  const own = [...(special[id]?.[kind] ?? common[kind])];
  const lines = [...own, ...(kind === 'talk' ? (extraTalk[id] ?? []) : []), ...commonExtra[kind]];
  if (kind === 'talk' && context) {
    const situation = situationLines(context);
    // Moments that just happened are always mentioned; the rest take every other turn.
    if (situation && (situation.always || count % 2 === 0)) return situation.lines[Math.floor(count / 2) % situation.lines.length];
  }
  return lines[count % lines.length];
}
