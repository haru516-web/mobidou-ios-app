/**
 * The collection room picture (collection-room-harmony-v6, 1024x2240) fills the whole screen behind the top buttons and the bottom bar.
 * The rail the keychains hang from and the shelf top the goshuin stand on sit at fixed heights of the picture.
 */
/** Where the wall between the two pillars starts and ends, as fractions of the picture width. */
export const ROOM_WALL_LEFT = 0.082;
export const ROOM_WALL_RIGHT = 0.914;

export const ROOM_ART = { width: 1024, height: 2240, railY: 0.2824, shelfY: 0.82 } as const;

/** Where the picture lies in a window of the given size: scaled to the width (or up to the height), centred, and squeezed a little on short screens. */
export function roomArtGeometry(viewportWidth: number, windowHeight: number) {
  const width = Math.max(viewportWidth, windowHeight * ROOM_ART.width / ROOM_ART.height);
  const natural = width * ROOM_ART.height / ROOM_ART.width;
  const height = natural > windowHeight ? Math.max(windowHeight, natural * 0.82) : natural;
  const top = (windowHeight - height) / 2;
  return { width, height, left: (viewportWidth - width) / 2, top, railY: top + height * ROOM_ART.railY, shelfY: top + height * ROOM_ART.shelfY };
}
