/**
 * Where the buttons of Mobby's menu go. They fan out from Mobby toward the
 * middle of the screen, then get pushed apart until none overlaps another, the
 * companion itself, or the screen edges; if that ever fails, they are laid out
 * as a tidy grid in the free band above or below Mobby.
 */
export type MenuSlot = { left: number; top: number };

type Box = { left: number; top: number; width: number; height: number };

type MenuLayoutOptions = {
  /** Mobby's top-left corner and size on the screen. */
  mobby: { x: number; y: number; size: number };
  screen: { width: number; height: number };
  /** Height reserved at the bottom (the tab bar). */
  bottomInset: number;
  count: number;
  itemWidth: number;
  itemHeight: number;
  /** Distance from Mobby's center to the arc the buttons start on. */
  radius: number;
  /** Space kept clear at the top of the screen (the header). */
  topClearance?: number;
  edge?: number;
  gap?: number;
};

const overlapAmount = (a: Box, b: Box, gap: number) => {
  const ox = Math.min(a.left + a.width + gap - b.left, b.left + b.width + gap - a.left);
  const oy = Math.min(a.top + a.height + gap - b.top, b.top + b.height + gap - a.top);
  return ox > 0 && oy > 0 ? { ox, oy } : null;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function layoutMenuSlots(options: MenuLayoutOptions): MenuSlot[] {
  const { mobby, screen, bottomInset, count, itemWidth, itemHeight, radius } = options;
  const edge = options.edge ?? 4;
  const gap = options.gap ?? 8;
  const minTop = Math.min(options.topClearance ?? 60, Math.max(edge, screen.height - bottomInset - itemHeight - edge));
  const bounds = {
    minLeft: edge,
    maxLeft: Math.max(edge, screen.width - itemWidth - edge),
    minTop,
    maxTop: Math.max(minTop, screen.height - bottomInset - itemHeight - edge),
  };
  const mobbyBox: Box = { left: mobby.x, top: mobby.y, width: mobby.size, height: mobby.size };
  const centerX = mobby.x + mobby.size / 2;
  const centerY = mobby.y + mobby.size / 2;
  if (count <= 0) return [];

  // Start on an arc opening toward the middle of the screen.
  const towardMiddle = Math.atan2(screen.height / 2 - centerY, screen.width / 2 - centerX);
  const spread = Math.min(Math.PI * .9, ((itemWidth + gap) / radius) * Math.max(0, count - 1));
  const boxes: Box[] = Array.from({ length: count }, (_, index) => {
    const angle = towardMiddle + (count === 1 ? 0 : (index / (count - 1) - .5) * spread);
    return {
      left: clamp(centerX + Math.cos(angle) * radius - itemWidth / 2, bounds.minLeft, bounds.maxLeft),
      top: clamp(centerY + Math.sin(angle) * radius - itemHeight / 2, bounds.minTop, bounds.maxTop),
      width: itemWidth,
      height: itemHeight,
    };
  });

  const settle = () => {
    for (let round = 0; round < 120; round += 1) {
      let moved = false;
      for (let i = 0; i < count; i += 1) {
        const hit = overlapAmount(boxes[i], mobbyBox, gap);
        if (hit) {
          // Mobby stays put; step out along the shorter way.
          if (hit.ox < hit.oy) boxes[i].left += boxes[i].left + itemWidth / 2 < centerX ? -hit.ox : hit.ox;
          else boxes[i].top += boxes[i].top + itemHeight / 2 < centerY ? -hit.oy : hit.oy;
          moved = true;
        }
        for (let j = i + 1; j < count; j += 1) {
          const both = overlapAmount(boxes[i], boxes[j], gap);
          if (!both) continue;
          const half = 0.5;
          if (both.ox < both.oy) {
            const direction = boxes[i].left + itemWidth / 2 <= boxes[j].left + itemWidth / 2 ? -1 : 1;
            boxes[i].left += direction * both.ox * half;
            boxes[j].left -= direction * both.ox * half;
          } else {
            const direction = boxes[i].top + itemHeight / 2 <= boxes[j].top + itemHeight / 2 ? -1 : 1;
            boxes[i].top += direction * both.oy * half;
            boxes[j].top -= direction * both.oy * half;
          }
          moved = true;
        }
        boxes[i].left = clamp(boxes[i].left, bounds.minLeft, bounds.maxLeft);
        boxes[i].top = clamp(boxes[i].top, bounds.minTop, bounds.maxTop);
      }
      if (!moved) return;
    }
  };
  settle();

  const clean = boxes.every((box, i) => !overlapAmount(box, mobbyBox, gap - 0.5) && boxes.every((other, j) => j <= i || !overlapAmount(box, other, gap - 0.5)));
  if (clean) return boxes.map(box => ({ left: Math.round(box.left), top: Math.round(box.top) }));
  return gridSlots(options, bounds, mobbyBox, gap);
}

function gridSlots(options: MenuLayoutOptions, bounds: { minLeft: number; maxLeft: number; minTop: number; maxTop: number }, mobbyBox: Box, gap: number): MenuSlot[] {
  const { count, itemWidth, itemHeight, screen } = options;
  const usable = screen.width - bounds.minLeft * 2;
  const columns = Math.max(1, Math.min(count, Math.floor((usable + gap) / (itemWidth + gap))));
  const rows = Math.ceil(count / columns);
  const blockHeight = rows * itemHeight + (rows - 1) * gap;
  const bandBottom = bounds.maxTop + itemHeight;
  const above = { from: bounds.minTop, to: mobbyBox.top - gap };
  const below = { from: mobbyBox.top + mobbyBox.height + gap, to: bandBottom };
  const fits = (band: { from: number; to: number }) => band.to - band.from >= blockHeight;
  const preferBelow = mobbyBox.top + mobbyBox.height / 2 < options.screen.height / 2;
  const order = preferBelow ? [below, above] : [above, below];
  const band = order.find(fits) ?? { from: bounds.minTop, to: bandBottom };
  const top = preferBelow && band === below ? band.from : band === above ? band.to - blockHeight : clamp(band.from, bounds.minTop, bounds.maxTop);
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const inRow = row === rows - 1 ? count - row * columns : columns;
    const column = index - row * columns;
    const rowWidth = inRow * itemWidth + (inRow - 1) * gap;
    const centerLeft = clamp(mobbyBox.left + mobbyBox.width / 2 - rowWidth / 2, bounds.minLeft, screen.width - bounds.minLeft - rowWidth);
    return { left: Math.round(centerLeft + column * (itemWidth + gap)), top: Math.round(top + row * (itemHeight + gap)) };
  });
}
