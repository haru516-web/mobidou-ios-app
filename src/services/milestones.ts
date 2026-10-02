/**
 * 道しるべ: a small marker every 1,000 steps on a route, so progress is felt long before the next shrine.
 * Derived from the route's credited steps, so nothing about it is stored in the save.
 */
export const MILESTONE_STEPS = 1000;

export const milestoneCount = (routeSteps: number) => Math.floor(Math.max(0, Number.isFinite(routeSteps) ? routeSteps : 0) / MILESTONE_STEPS);

const LINES = [
  '足どりが軽いね。',
  '道ばたの花が咲いていたよ。',
  'いい風だ。この調子。',
  'ここまで来たんだね。',
  '小さな一歩が、道になるよ。',
  '鳥の声が聞こえるね。',
  '空が少し近くなったよ。',
  '社が、ちかづいてきたよ。',
];

/** The line for the nth marker; it cycles so neighbouring markers differ. */
export const milestoneLine = (count: number) => LINES[Math.max(0, count - 1) % LINES.length];

/** What the marker says: how far, and how much is left to the next shrine (null once the route is done). */
export function milestoneMessage(count: number, stepsToNextShrine: number | null) {
  const walked = `${(count * MILESTONE_STEPS).toLocaleString('ja-JP')}歩 道しるべ`;
  return stepsToNextShrine === null ? walked : `${walked} · 次の社まであと${Math.max(0, stepsToNextShrine).toLocaleString('ja-JP')}歩`;
}
