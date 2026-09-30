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
export const DAILY_TARGETS = [5000, 7000, 9000] as const;
export type Reward = { id: string; date: string; steps: number; threshold: number };
export type Progress = { day: string; steps: number; totalSteps: number; dayStart: number; rewards: Reward[]; pending: string[]; routeId?: string; baseline?: number; highWater?: number; routeSteps?: number; completedAt?: string;
  /**
   * Set while a finished route is being walked again. The route's clear
   * (rewards, completedAt) is never reset; the lap counts steps from this
   * point, so `creditedSteps - lapBase` is how far the current lap has gone.
   */
  lapBase?: number };
export function expandPointTargets(pointCount: number, pattern: readonly number[]): number[] {
  const cycleTotal = pattern.at(-1) ?? 0;
  return Array.from({ length: pointCount }, (_, index) => Math.floor(index / pattern.length) * cycleTotal + (pattern[index % pattern.length] ?? cycleTotal));
}
export const routeTargets = (p: Progress): readonly number[] => {
  const route = getPilgrimage(p.routeId);
  return route ? expandPointTargets(route.ids.length, route.targets) : DAILY_TARGETS;
};
export const routeIds = (p: Progress): readonly string[] => getPilgrimage(p.routeId)?.ids ?? SHRINE_IDS;
export const creditedSteps = (p: Progress) => Math.max(0, p.routeSteps ?? ((p.highWater ?? p.steps) - (p.baseline ?? 0)));

function estimateHistoricalSteps(day: string, steps: number, rewards: readonly Reward[], includeThreshold = true) {
  const byDay = new Map<string, number>();
  for (const reward of rewards) {
    // Older saves did not retain a cumulative counter. Use the recorded reading
    // when available, and the reward threshold as a safe lower-bound fallback.
    byDay.set(reward.date, Math.max(byDay.get(reward.date) ?? 0, reward.steps, includeThreshold ? reward.threshold : 0));
  }
  if (steps > 0) byDay.set(day, Math.max(byDay.get(day) ?? 0, steps));
  return [...byDay.values()].reduce((total, value) => total + value, 0);
}

/** Steps walked in the current lap of a route that is being walked again. */
export const lapCredited = (p: Progress) => p.lapBase === undefined ? 0 : Math.max(0, creditedSteps(p) - p.lapBase);

/**
 * Begin walking a finished route again. The clear is kept and the lap starts
 * from zero. A lap that is still in progress is left alone.
 */
export function startReplay(p: Progress): Progress {
  if (!p.routeId || !p.completedAt) return p;
  const lastTarget = routeTargets(p).at(-1) ?? 0;
  if (p.lapBase !== undefined && lapCredited(p) < lastTarget) return p;
  return { ...p, lapBase: creditedSteps(p) };
}

/**
 * The progress the screens should draw: for a lap of a finished route, only
 * the stops reached in this lap count. Otherwise the record itself.
 */
export function lapView(p: Progress): Progress {
  if (p.lapBase === undefined || !p.routeId) return p;
  const lap = lapCredited(p);
  const targets = routeTargets(p);
  const reached = targets.filter(target => lap >= target).length;
  return { ...p, rewards: p.rewards.slice(0, reached), routeSteps: lap, completedAt: reached >= targets.length ? p.completedAt : undefined };
}

export function resumeRoute(active: Progress, saved: Progress): Progress {
  const steps = Math.max(active.steps, active.highWater ?? 0);
  const credit = creditedSteps(saved);
  // Preserve earned partial steps, even when the device corrected its count downward.
  return { ...saved, steps: active.steps, totalSteps: saved.totalSteps ?? active.totalSteps ?? active.steps, routeSteps: credit, highWater: Math.max(steps, credit), baseline: Math.max(0, steps - credit) };
}
export function startRoute(routeId: string, steps = 0, date = new Date(), totalSteps = steps): Progress {
  if (!getPilgrimage(routeId)) throw new Error('Unknown pilgrimage');
  return { ...freshProgress(date), routeId, steps, totalSteps: Math.max(0, totalSteps), baseline: steps, highWater: steps, routeSteps: 0 };
}
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function freshProgress(date = new Date()): Progress {
  return { day: localDay(date), steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] };
}
export function rollDay(progress: Progress, date = new Date()): Progress {
  return progress.day === localDay(date) ? progress : { ...progress, day: localDay(date), steps: 0, highWater: 0, dayStart: progress.rewards.length, ...(progress.routeId ? { baseline: 0 } : {}) };
}
export function updateSteps(progress: Progress, steps: number, date = new Date()): Progress {
  const next = rollDay(progress, date);
  if (!Number.isFinite(steps) || steps < 0) return next;
  const value = Math.floor(steps);
  const previousTotal = Number.isFinite(next.totalSteps) && next.totalSteps >= 0 ? next.totalSteps : Math.max(0, next.steps);
  // A device correction (HealthKit resync, source switch) can report a lower
  // reading than before. Crediting against the day's peak reading so far —
  // rather than the last stored value — stops a later rebound from being
  // double-counted into totalSteps/routeSteps.
  const dayPeakSoFar = Math.max(next.steps, next.highWater ?? 0);
  const addedSteps = Math.max(0, value - dayPeakSoFar);
  const highWater = Math.max(value, dayPeakSoFar);
  const rewards = [...next.rewards];
  const pending = [...next.pending];
  const credited = next.routeId ? creditedSteps(next) + addedSteps : value;
  routeTargets(next).forEach((threshold, index) => {
    const id = routeIds(next)[next.routeId ? index : next.dayStart + index];
    if (id && credited >= threshold && !rewards.some(item => item.id === id)) {
      rewards.push({ id, date: next.day, steps: value, threshold });
      pending.push(id);
    }
  });
  if (next.routeId && next.lapBase !== undefined) {
    // Walking a finished route again: every stop is already owned, so a stop
    // reached in this lap only queues its arrival ceremony.
    const before = creditedSteps(next) - next.lapBase;
    const after = credited - next.lapBase;
    routeTargets(next).forEach((threshold, index) => {
      const id = routeIds(next)[index];
      if (id && before < threshold && after >= threshold && !pending.includes(id)) pending.push(id);
    });
  }
  return { ...next, steps: value, totalSteps: previousTotal + addedSteps, highWater, rewards, pending, ...(next.routeId ? { routeSteps: credited, ...(rewards.length === routeIds(next).length ? { completedAt: next.completedAt ?? next.day } : {}) } : {}) };
}
export function normalizeProgress(value: unknown, now = new Date()): Progress {
  if (!value || typeof value !== 'object') return freshProgress(now);
  const p = value as Partial<Progress>;
  if (p.routeId !== undefined && !getPilgrimage(p.routeId)) throw new Error('Invalid saved route');
  const ids = getPilgrimage(p.routeId)?.ids ?? SHRINE_IDS;
  const targets: readonly number[] = getPilgrimage(p.routeId)?.targets ?? DAILY_TARGETS;
  // The seven-visit route used numbered placeholder IDs in an earlier build.
  // Accept those saved rewards and rewrite them to the named shrine IDs so an
  // upgrade does not discard a user's already completed visits.
  const legacyIds: readonly string[] = p.routeId === 'vow' ? ids.map((_, index) => `kinboshi~${index + 1}`) : ids;
  if (!Array.isArray(p.rewards) || !Array.isArray(p.pending) || typeof p.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.day)) throw new Error('Invalid saved progress');
  const rewards: Reward[] = [];
  for (const r of p.rewards) {
    const index = rewards.length;
    // Thresholds are historical metadata. Accept positive integer values from
    // older saves so raising today's route targets does not discard already
    // earned rewards.
    if (!r || (r.id !== ids[index] && r.id !== legacyIds[index]) || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !Number.isFinite(r.steps) || r.steps < 0 || !Number.isInteger(r.threshold) || r.threshold <= 0) throw new Error('Invalid saved reward');
    rewards.push({ ...r, id: ids[index] });
  }
  const maximumSameDayRewards = p.routeId ? ids.length : targets.length;
  if (!Number.isInteger(p.dayStart) || p.dayStart! < 0 || p.dayStart! > rewards.length || rewards.length - p.dayStart! > maximumSameDayRewards || !Number.isFinite(p.steps) || p.steps! < 0 || (p.totalSteps !== undefined && (!Number.isFinite(p.totalSteps) || p.totalSteps < 0))) throw new Error('Invalid saved day');
  if (p.highWater !== undefined && (!Number.isFinite(p.highWater) || p.highWater < 0)) throw new Error('Invalid saved day');
  if (p.routeId && (![p.baseline ?? 0, p.routeSteps ?? 0].every(n => Number.isFinite(n) && n! >= 0))) throw new Error('Invalid route steps');
  const lapBase = p.routeId && rewards.length === ids.length && Number.isFinite(p.lapBase) && p.lapBase! >= 0 ? p.lapBase : undefined;
  const pending = p.pending.map(id => {
    const index = legacyIds.indexOf(id);
    return index >= 0 ? ids[index] : id;
  });
  const estimatedTotalSteps = estimateHistoricalSteps(p.day, p.steps!, rewards, !p.routeId);
  const migratedRouteSteps = p.routeId ? Math.max(p.routeSteps ?? 0, rewards.length === 0 ? 0 : (routeTargets({ ...freshProgress(now), routeId: p.routeId })[rewards.length - 1] ?? 0)) : undefined;
  return rollDay({ day: p.day, steps: p.steps!, totalSteps: Math.max(p.totalSteps ?? 0, estimatedTotalSteps), dayStart: p.dayStart!, highWater: p.highWater ?? p.steps!, rewards, pending: [...new Set(pending.filter(id => rewards.some(r => r.id === id)))], ...(p.routeId ? { routeId: p.routeId, baseline: p.baseline ?? 0, routeSteps: migratedRouteSteps, ...(rewards.length === ids.length ? { completedAt: p.completedAt ?? rewards[rewards.length - 1].date } : {}), ...(lapBase !== undefined ? { lapBase } : {}) } : {}) }, now);
}
