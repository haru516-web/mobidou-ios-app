import { getPilgrimage } from '../data/pilgrimages.ts';
// Pure progression rules, shared by the device and the isolated demo book.
export const SHRINE_IDS = [
  'star', 'moon', 'rain', 'forest', 'cloud', 'flower',
  'akatsuki', 'shionagi', 'kazewatari', 'sunamoon', 'yukishiro', 'mizusumi', 'kirikakushi',
  'nijiayumu', 'mebuki', 'hibikiishi', 'takekaze', 'kinboshi', 'gindrop', 'tsubaki',
  'aoba', 'wakaba', 'akane', 'asatsuyu', 'yume', 'amenagi',
  'tsubasa', 'morika', 'kujira', 'hagoromo', 'sabaku', 'mine', 'hikari',
  'yumeakari', 'tsukikage', 'morikage', 'negaiishi', 'hoshifune', 'kanadeboshi',
  'asagiri', 'kodama', 'shakunage', 'takimori', 'shigure',
  'iwakura', 'kuroiwa', 'haneishi', 'suzumori', 'tenryu',
  'sazanami', 'minamo', 'hotarubi', 'kawaoto', 'hasunomi', 'shiosai', 'yanagi', 'mizunagi',
  'yasuragi', 'megumi', 'kokorone', 'negai',
  'ichibanboshi', 'tsukishirabe', 'kibou', 'kokoroseki', 'hoshimizu', 'yorunagi', 'musubihoshi',
  'kawakagami', 'hoshinooto', 'funeakari', 'sorashiori', 'natsukage', 'tsuzuri',
] as const;
export const DAILY_TARGETS = [1000, 3000, 5000] as const;
export type Reward = { id: string; date: string; steps: number; threshold: number };
export type Progress = { day: string; steps: number; totalSteps: number; dayStart: number; rewards: Reward[]; pending: string[]; routeId?: string; baseline?: number; highWater?: number; completedAt?: string };
export const routeTargets = (p: Progress): readonly number[] => getPilgrimage(p.routeId)?.targets ?? DAILY_TARGETS;
export const routeIds = (p: Progress): readonly string[] => getPilgrimage(p.routeId)?.ids ?? SHRINE_IDS;
export const creditedSteps = (p: Progress) => Math.max(0, (p.highWater ?? p.steps) - (p.baseline ?? 0));

function estimateHistoricalSteps(day: string, steps: number, rewards: readonly Reward[]) {
  const byDay = new Map<string, number>();
  for (const reward of rewards) {
    // Older saves did not retain a cumulative counter. Use the recorded reading
    // when available, and the reward threshold as a safe lower-bound fallback.
    byDay.set(reward.date, Math.max(byDay.get(reward.date) ?? 0, reward.steps, reward.threshold));
  }
  if (steps > 0) byDay.set(day, Math.max(byDay.get(day) ?? 0, steps));
  return [...byDay.values()].reduce((total, value) => total + value, 0);
}

export function resumeRoute(active: Progress, saved: Progress): Progress {
  const steps = Math.max(active.steps, active.highWater ?? 0);
  const credit = creditedSteps(saved);
  // Preserve earned partial steps, even when the device corrected its count downward.
  return { ...saved, steps: active.steps, totalSteps: saved.totalSteps ?? active.totalSteps ?? active.steps, highWater: Math.max(steps, credit), baseline: Math.max(0, steps - credit) };
}
export function startRoute(routeId: string, steps = 0, date = new Date(), totalSteps = steps): Progress {
  if (!getPilgrimage(routeId)) throw new Error('Unknown pilgrimage');
  return { ...freshProgress(date), routeId, steps, totalSteps: Math.max(0, totalSteps), baseline: steps, highWater: steps };
}
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function freshProgress(date = new Date()): Progress {
  return { day: localDay(date), steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] };
}
export function rollDay(progress: Progress, date = new Date()): Progress {
  return progress.day === localDay(date) ? progress : { ...progress, day: localDay(date), steps: 0, dayStart: progress.rewards.length, ...(progress.routeId ? { baseline: 0, highWater: 0 } : {}) };
}
export function updateSteps(progress: Progress, steps: number, date = new Date()): Progress {
  const next = rollDay(progress, date);
  if (!Number.isFinite(steps) || steps < 0) return next;
  const value = Math.floor(steps);
  const previousTotal = Number.isFinite(next.totalSteps) && next.totalSteps >= 0 ? next.totalSteps : Math.max(0, next.steps);
  const addedSteps = Math.max(0, value - next.steps);
  const rewards = [...next.rewards];
  const pending = [...next.pending];
  const credited = next.routeId ? Math.max(value, next.highWater ?? 0) - (next.baseline ?? 0) : value;
  routeTargets(next).forEach((threshold, offset) => {
    const id = routeIds(next)[next.dayStart + offset];
    if (id && credited >= threshold && !rewards.some(item => item.id === id)) {
      rewards.push({ id, date: next.day, steps: value, threshold });
      pending.push(id);
    }
  });
  return { ...next, steps: value, totalSteps: previousTotal + addedSteps, rewards, pending, ...(next.routeId ? { highWater: Math.max(value, next.highWater ?? 0), ...(rewards.length === routeIds(next).length ? { completedAt: next.completedAt ?? next.day } : {}) } : {}) };
}
export function normalizeProgress(value: unknown, now = new Date()): Progress {
  if (!value || typeof value !== 'object') return freshProgress(now);
  const p = value as Partial<Progress>;
  if (p.routeId !== undefined && !getPilgrimage(p.routeId)) throw new Error('Invalid saved route');
  const ids = getPilgrimage(p.routeId)?.ids ?? SHRINE_IDS;
  // The seven-visit route used numbered placeholder IDs in an earlier build.
  // Accept those saved rewards and rewrite them to the named shrine IDs so an
  // upgrade does not discard a user's already completed visits.
  const legacyIds: readonly string[] = p.routeId === 'vow' ? ids.map((_, index) => `kinboshi~${index + 1}`) : ids;
  const targets: readonly number[] = getPilgrimage(p.routeId)?.targets ?? DAILY_TARGETS;
  if (!Array.isArray(p.rewards) || !Array.isArray(p.pending) || typeof p.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.day)) throw new Error('Invalid saved progress');
  const rewards: Reward[] = [];
  for (const r of p.rewards) {
    const index = rewards.length;
    if (!r || (r.id !== ids[index] && r.id !== legacyIds[index]) || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !Number.isFinite(r.steps) || r.steps < 0 || !targets.includes(r.threshold)) throw new Error('Invalid saved reward');
    rewards.push({ ...r, id: ids[index] });
  }
  if (!Number.isInteger(p.dayStart) || p.dayStart! < 0 || p.dayStart! > rewards.length || rewards.length - p.dayStart! > targets.length || !Number.isFinite(p.steps) || p.steps! < 0 || (p.totalSteps !== undefined && (!Number.isFinite(p.totalSteps) || p.totalSteps < 0))) throw new Error('Invalid saved day');
  if (p.routeId && (![p.baseline ?? 0, p.highWater ?? p.steps].every(n => Number.isFinite(n) && n! >= 0))) throw new Error('Invalid route steps');
  const pending = p.pending.map(id => {
    const index = legacyIds.indexOf(id);
    return index >= 0 ? ids[index] : id;
  });
  const estimatedTotalSteps = estimateHistoricalSteps(p.day, p.steps!, rewards);
  return rollDay({ day: p.day, steps: p.steps!, totalSteps: Math.max(p.totalSteps ?? 0, estimatedTotalSteps), dayStart: p.dayStart!, rewards, pending: [...new Set(pending.filter(id => rewards.some(r => r.id === id)))], ...(p.routeId ? { routeId: p.routeId, baseline: p.baseline ?? 0, highWater: p.highWater ?? p.steps, ...(rewards.length === ids.length ? { completedAt: p.completedAt ?? rewards[rewards.length - 1].date } : {}) } : {}) }, now);
}
