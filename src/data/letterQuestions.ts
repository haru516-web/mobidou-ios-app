/** Asked once at each shrine, right after its saying. Every question is one question with an answer of its own: nothing that can be settled with "yes". */
export const LETTER_QUESTIONS: readonly string[] = [
  '今一番夢中になってることは何ですか',
  '時間を忘れてしまうほど楽しいことは何ですか',
  '夢は何ですか',
  'いつかやってみたいことは何ですか',
  '好きで好きでたまらないものは何ですか',
  '気づくと続けてしまっていることは何ですか',
  '誰かに熱く語りたくなることは何ですか',
  '子どもの頃から好きなものは何ですか',
  '今いちばんわくわくしていることは何ですか',
  '一日中やっていても飽きないことは何ですか',
  '疲れていても元気になれることは何ですか',
  '心から笑えるのはどんなときですか',
  '休みの日にいちばんしたいことは何ですか',
  '叶えたい夢は何ですか',
  '絶対にあきらめたくないことは何ですか',
  '3年後の自分に叶えていてほしいことは何ですか',
  '必死に追いかけたいものは何ですか',
  '自分の中の「大きな目標」は何ですか',
  '死ぬまでに一度はやってみたいことは何ですか',
  '行ってみたい場所はどこですか',
  '時間もお金も気にしなくていいなら、何をしますか',
  '挑戦してみたいけれど、まだ踏み出せていないことは何ですか',
  'いつか身につけたい技術は何ですか',
  '今の自分を動かしている思いは何ですか',
  '憧れている人の、いちばん素敵だと思うところは何ですか',
  '自分らしくいられるのは、どんなときですか',
  '大切にしたい気持ちは何ですか',
  '未来の自分に伝えたいことは何ですか',
];

/** A question the player has not answered yet when one is left, so the letters do not repeat. */
export function pickLetterQuestion(answered: readonly string[], random: number = Math.random()): string {
  const fresh = LETTER_QUESTIONS.filter(question => !answered.includes(question));
  const pool = fresh.length ? fresh : LETTER_QUESTIONS;
  return pool[Math.min(pool.length - 1, Math.floor(random * pool.length))];
}
