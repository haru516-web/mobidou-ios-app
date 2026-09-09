// Pure progression rules, shared by the device and the isolated demo book.
export const SHRINE_IDS = ['star', 'moon', 'rain', 'forest', 'cloud', 'flower'] as const;
export const DAILY_TARGETS = [1000, 3000, 5000] as const;
export type Reward = { id: string; date: string; steps: number; threshold: number };
export type Progress = { day: string; steps: number; dayStart: number; rewards: Reward[]; pending: string[] };
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function freshProgress(date = new Date()): Progress {
  return { day: localDay(date), steps: 0, dayStart: 0, rewards: [], pending: [] };
}
export function rollDay(progress: Progress, date = new Date()): Progress {
  return progress.day === localDay(date) ? progress : { ...progress, day: localDay(date), steps: 0, dayStart: progress.rewards.length };
}
export function updateSteps(progress: Progress, steps: number, date = new Date()): Progress {
  const next = rollDay(progress, date);
  if (!Number.isFinite(steps) || steps < 0) return next;
  const value = Math.floor(steps);
  const rewards = [...next.rewards];
  const pending = [...next.pending];
  DAILY_TARGETS.forEach((threshold, offset) => {
    const id = SHRINE_IDS[next.dayStart + offset];
    if (id && value >= threshold && !rewards.some(item => item.id === id)) {
      rewards.push({ id, date: next.day, steps: value, threshold });
      pending.push(id);
    }
  });
  return { ...next, steps: value, rewards, pending };
}
export function normalizeProgress(value: unknown, now = new Date()): Progress {
  if (!value || typeof value !== 'object') return freshProgress(now);
  const p = value as Partial<Progress>;
  if (!Array.isArray(p.rewards) || !Array.isArray(p.pending) || typeof p.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.day)) throw new Error('Invalid saved progress');
  const rewards: Reward[] = [];
  for (const r of p.rewards) {
    if (!r || r.id !== SHRINE_IDS[rewards.length] || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !Number.isFinite(r.steps) || r.steps < 0 || !DAILY_TARGETS.includes(r.threshold as 1000)) throw new Error('Invalid saved reward');
    rewards.push(r);
  }
  if (!Number.isInteger(p.dayStart) || p.dayStart! < 0 || p.dayStart! > rewards.length || rewards.length - p.dayStart! > 3 || !Number.isFinite(p.steps) || p.steps! < 0) throw new Error('Invalid saved day');
  return rollDay({ day: p.day, steps: p.steps!, dayStart: p.dayStart!, rewards, pending: [...new Set(p.pending.filter(id => rewards.some(r => r.id === id)))] }, now);
}
