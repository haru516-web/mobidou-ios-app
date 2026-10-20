import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from './AppImage';
import type { PetCharacter } from '../petCatalog';

const MAX_SIZE = 44;
const MIN_SIZE = 12;
const MIN_ROW_SIZE = 24;
const AREA_HEIGHT = 120;
const SIDE_MARGIN = 16;
// Where their feet rest, measured from the bottom of the stage: on the top edge of the steps card.
const FOOT_OVERLAP = 12;

/** The largest tile (up to MAX_SIZE) such that `count` tiles fit a width x height area without touching each other. */
function fitSize(count: number, width: number, height: number) {
  let size = MAX_SIZE;
  while (size > MIN_SIZE && Math.floor(width / size) * Math.floor(height / size) < count) size -= 1;
  return size;
}

/** The Mobbies met again, small, standing in a row from the middle outward in front of the main Mobby's feet, on the card below: one for each time past the first. They never overlap each other. */
export function MobbyCopiesBeside({ pet, extra }: { pet: PetCharacter; extra: number }) {
  const { width: windowWidth } = useWindowDimensions();
  if (extra <= 0) return null;
  const width = Math.min(windowWidth, 480) - SIDE_MARGIN * 2;
  // One row while they stay big enough; only then do they pile up in rows.
  const rowSize = Math.min(MAX_SIZE, Math.floor(width / extra));
  const size = rowSize >= MIN_ROW_SIZE ? rowSize : fitSize(extra, width, AREA_HEIGHT);
  const columns = Math.max(1, Math.floor(width / size));
  const rows = Math.ceil(extra / columns);
  return <View pointerEvents="none" accessible={false} style={[S.area, { height: rows * size }]}>
    {Array.from({ length: extra }, (_, index) => {
      const row = Math.floor(index / columns);
      const inRow = Math.min(columns, extra - row * columns);
      // Each row is centred, so the first ones are in the middle and the rest spread to both sides.
      const left = (width - inRow * size) / 2 + (index % columns) * size;
      return <Image key={index} accessible={false} source={pet.image} contentFit="contain" style={{ position: 'absolute', bottom: row * size, left, width: size, height: size }} />;
    })}
  </View>;
}

const S = StyleSheet.create({
  area: { position: 'absolute', left: SIDE_MARGIN, right: SIDE_MARGIN, bottom: FOOT_OVERLAP, zIndex: 2 },
});
