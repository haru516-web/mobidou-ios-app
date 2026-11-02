export function prayerWalkZ(index: number, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  if (index === 0) return 15.6 - 9.6 * p;
  if (index === 2) return 6 - 8.5 * p;
  if (index === 9) return -2.5 + 8.5 * p;
  return 6 + 9.6 * p;
}

export function prayerWalkRate(index: number, strength: number, duration: number) {
  const distance = index === 0 || index === 13 ? 9.6 : 8.5;
  const speed = 1.9;
  return Math.max(0, Math.min(1, strength)) * speed / (distance / (duration / 1000));
}

/** Limit angular movement per frame so the view turns gradually, even after a dropped frame. */
export function smoothViewAngle(current: number, target: number, deltaSeconds: number) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const frameSeconds = Math.max(0, Math.min(deltaSeconds, .05));
  const maxTurn = 2.8 * frameSeconds;
  return current + Math.max(-maxTurn, Math.min(maxTurn, difference));
}
