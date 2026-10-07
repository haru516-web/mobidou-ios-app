/**
 * Web only: the browser scrolls a ScrollView on its own thread, so anything else that follows the scroll (the room picture) is always a frame behind.
 * This takes the scrolling over: wheel and drag move the position by hand, and the position is written to the ScrollView and to `onMove` in the same step,
 * so the displays and the picture are drawn together. It also settles on whole pages, one page at a time.
 */
export function attachSnapScroll(node: HTMLElement, options: { page: () => number; max: () => number; onMove: (x: number) => void }) {
  let position = node.scrollLeft;
  let frame = 0;
  let idle: ReturnType<typeof setTimeout> | null = null;
  const clamp = (x: number) => Math.max(0, Math.min(options.max(), x));
  const set = (x: number) => { position = clamp(x); node.scrollLeft = position; options.onMove(position); };
  const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
  const settle = (target: number) => {
    stop();
    const from = position;
    const to = clamp(target);
    const begun = performance.now();
    const duration = Math.max(120, Math.min(420, Math.abs(to - from) * 0.9));
    const step = (now: number) => {
      const t = Math.min(1, (now - begun) / duration);
      set(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      frame = t < 1 ? requestAnimationFrame(step) : 0;
    };
    frame = requestAnimationFrame(step);
  };
  const nearestPage = (x: number, from?: number) => {
    const page = options.page();
    let index = Math.round(x / page);
    if (from !== undefined) { const start = Math.round(from / page); index = Math.max(start - 1, Math.min(start + 1, index)); }
    return index * page;
  };

  const onWheel = (event: WheelEvent) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (!delta) return;
    event.preventDefault();
    stop();
    set(position + delta);
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => settle(nearestPage(position)), 120);
  };

  let drag: { id: number; startX: number; from: number; last: number; lastTime: number; velocity: number; moved: boolean } | null = null;
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    stop();
    drag = { id: event.pointerId, startX: event.clientX, from: position, last: event.clientX, lastTime: event.timeStamp, velocity: 0, moved: false };
  };
  const onMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) { drag.moved = true; try { node.setPointerCapture(event.pointerId); } catch { /* not capturable */ } }
    const dt = Math.max(1, event.timeStamp - drag.lastTime);
    drag.velocity = (event.clientX - drag.last) / dt;
    drag.last = event.clientX;
    drag.lastTime = event.timeStamp;
    set(drag.from - dx);
  };
  const onUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const finished = drag;
    drag = null;
    if (!finished.moved) return;
    settle(nearestPage(position - finished.velocity * 180, finished.from));
  };
  // A drag must not end as a tap on whatever lies under the pointer.
  const onClick = (event: MouseEvent) => { if (suppressClick) { event.stopPropagation(); event.preventDefault(); } };
  let suppressClick = false;
  const markDrag = () => { suppressClick = !!drag?.moved; };
  node.addEventListener('wheel', onWheel, { passive: false });
  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointermove', markDrag);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onUp);
  node.addEventListener('click', onClick, true);
  const previousOverflow = node.style.overflowX;
  const previousTouch = node.style.touchAction;
  node.style.overflowX = 'hidden';
  node.style.touchAction = 'pan-y';
  return () => {
    stop();
    if (idle) clearTimeout(idle);
    node.removeEventListener('wheel', onWheel);
    node.removeEventListener('pointerdown', onDown);
    node.removeEventListener('pointermove', onMove);
    node.removeEventListener('pointermove', markDrag);
    node.removeEventListener('pointerup', onUp);
    node.removeEventListener('pointercancel', onUp);
    node.removeEventListener('click', onClick, true);
    node.style.overflowX = previousOverflow;
    node.style.touchAction = previousTouch;
  };
}
