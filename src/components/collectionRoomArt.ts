/**
 * The collection room picture (collection-room-harmony-v6, 1024x2240) fills the whole screen behind the top buttons and the bottom bar.
 * The rail the keychains hang from and the shelf top the goshuin stand on sit at fixed heights of the picture.
 */
/** Where the wall between the two pillars starts and ends, as fractions of the picture width. */
export const ROOM_WALL_LEFT = 0.082;
export const ROOM_WALL_RIGHT = 0.914;

export const ROOM_ART ={ width: 1024, height: 2240, railY: 0.2824, shelfY: 0.82 } as const;

export type CollectionDisplayBounds = { top: number; bottom: number };
export type CollectionRoomGeometry = ReturnType<typeof roomArtGeometry>;

/** Fit the rail and shelf inside the measured content area, above the navigation.
 * Bounds use the app container's coordinates, just like the background image.
 */
export function roomArtGeometry(viewportWidth: number, windowHeight: number, display?: CollectionDisplayBounds) {
  const width = Math.max(viewportWidth, windowHeight * ROOM_ART.width / ROOM_ART.height);
  const natural = width * ROOM_ART.height / ROOM_ART.width;
  let height = natural > windowHeight ? Math.max(windowHeight, natural * 0.82) : natural;
  const railMin = display ? display.top + Math.min(112, (display.bottom - display.top) * .35) : 0;
  const shelfMax = display ? Math.max(railMin + 1, display.bottom - 12) : windowHeight;
  if (display) height = Math.min(height, (shelfMax - railMin) / (ROOM_ART.shelfY - ROOM_ART.railY));
  const centred = (windowHeight - height) / 2;
  const top = display
    ? Math.max(railMin - height * ROOM_ART.railY, Math.min(centred, shelfMax - height * ROOM_ART.shelfY))
    : centred;
  return { width, height, left: (viewportWidth - width) / 2, top, railY: top + height * ROOM_ART.railY, shelfY: top + height * ROOM_ART.shelfY };
}
