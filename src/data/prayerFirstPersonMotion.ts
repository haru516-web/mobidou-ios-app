export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };
export type CameraSeries = 'entryWalk' | 'approachWalk' | 'returnWalk' | 'exitWalk' | 'innerTurn' | 'outerTurn' | 'innerBow' | 'outerBow';
export type CameraLayer = { series: CameraSeries; frame: number; zoom: number; opacity: number };
export function cameraLayers(index: number, progress: number): CameraLayer[] {
  const p = ease(progress), bow = Math.sin(Math.PI * p) * 45;
  const layer = (series: CameraSeries, frame: number): CameraLayer => ({ series, frame, zoom: 1, opacity: 1 });
  if (index === 0) return [layer('entryWalk', p * 90)];
  if (index === 1) return [layer('outerBow', bow)];
  if (index === 2) return [layer('approachWalk', p * 90)];
  if (index === 3 || index === 4 || index === 7) return [layer('innerBow', bow)];
  if (index === 5 || index === 6) return [layer('innerTurn', 0)];
  if (index === 8) return [layer('innerTurn', p * 96)];
  if (index === 9) return [layer('returnWalk', p * 90)];
  if (index === 10) return [layer('outerTurn', (1 - p) * 96)];
  if (index === 11) return [layer('outerBow', bow)];
  if (index === 12) return [layer('outerTurn', p * 96)];
  return [layer('exitWalk', p * 90)];
}
/** A complete stride is two alternating steps. The rear arm is genuinely outside the view. */
export function armPose(elapsed: number, side: number) {
  const phase = ((elapsed / 1160 + side * .5) % 1 + 1) % 1;
  const forward = phase < .5 ? Math.sin(phase * Math.PI * 2) : 0;
  return { visible: forward > .015, frame: clamp(phase * 2) * 7, forward };
}
export function clapFrame(elapsed: number, duration: number, wish: boolean) {
  if (wish) return Math.min(5, ease(elapsed / 460) * 5);
  const p = clamp(elapsed / duration);
  if (p < .42) return ease(p / .42) * 5;
  if (p < .54) return 5;
  return (1 - ease((p - .54) / .46)) * 5;
}
