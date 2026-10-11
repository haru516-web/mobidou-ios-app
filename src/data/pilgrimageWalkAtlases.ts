import type { ImageSourcePropType } from 'react-native';
import type { EventPetId, RegularPetId } from '../petCatalog';
import walkMetrics from './pilgrimageSpriteMetrics.json';

/** The count a sheet is assumed to have when its measured metrics do not say (the original four-pose sheets). */
export const PILGRIMAGE_WALK_FRAME_COUNT = 4;
export const PILGRIMAGE_WALK_ATLAS_HEIGHT = 1024;
// One cell is always 384 x 1024; a sheet is as wide as it has cells.
export const PILGRIMAGE_WALK_FRAME_WIDTH = 384;
export const PILGRIMAGE_WALK_FRAME_HEIGHT = PILGRIMAGE_WALK_ATLAS_HEIGHT;
// Horizontal sheets of 384 x 1024 frames with one shared baseline and real alpha transparency.
// The original sheets have four poses (contact, down, passing, up); the regenerated ones have eight,
// a full gait cycle with each foot leading in turn. How many a sheet has is read from its metrics.
// The event Mobbies are optional here: a Mobby without a sheet is drawn as its still picture.
export const PILGRIMAGE_WALK_ATLASES: Record<RegularPetId, ImageSourcePropType> & Partial<Record<EventPetId, ImageSourcePropType>> = {
  babumoby: require('../../assets/mobies/pilgrimage-walk/babumoby.webp'),
  bearmobby: require('../../assets/mobies/pilgrimage-walk/bearmobby.webp'),
  boymobby: require('../../assets/mobies/pilgrimage-walk/boymobby.webp'),
  dogmobby: require('../../assets/mobies/pilgrimage-walk/dogmobby.webp'),
  mobibou: require('../../assets/mobies/pilgrimage-walk/mobibou.webp'),
  mobichi: require('../../assets/mobies/pilgrimage-walk/mobichi.webp'),
  mobirin: require('../../assets/mobies/pilgrimage-walk/mobirin.webp'),
  mobiyan: require('../../assets/mobies/pilgrimage-walk/mobiyan.webp'),
  mobiyura: require('../../assets/mobies/pilgrimage-walk/mobiyura.webp'),
  ojimobby: require('../../assets/mobies/pilgrimage-walk/ojimobby.webp'),
  potemoby: require('../../assets/mobies/pilgrimage-walk/potemoby.webp'),
  reamobby: require('../../assets/mobies/pilgrimage-walk/reamobby.webp'),
  reomoby: require('../../assets/mobies/pilgrimage-walk/reomoby.webp'),
  shikamobby: require('../../assets/mobies/pilgrimage-walk/shikamobby.webp'),
  uyumobby: require('../../assets/mobies/pilgrimage-walk/uyumobby.webp'),
  wolfmobby: require('../../assets/mobies/pilgrimage-walk/wolfmobby.webp'),
  yami: require('../../assets/mobies/pilgrimage-walk/yami.webp'),
  shotamobby: require('../../assets/mobies/pilgrimage-walk/shotamobby.webp'),
  satomimobby: require('../../assets/mobies/pilgrimage-walk/satomimobby.webp'),
  norikomobby: require('../../assets/mobies/pilgrimage-walk/norikomobby.webp'),
  yasumobby: require('../../assets/mobies/pilgrimage-walk/yasumobby.webp'),
};

/** Number of poses in a Mobby's walk sheet, so four- and eight-pose sheets can sit side by side. */
export function walkFrameCount(petId: string): number {
  const columns = (walkMetrics as Record<string, { columns?: number }>)[`${petId}/walk`]?.columns;
  return typeof columns === 'number' && Number.isInteger(columns) && columns > 0 ? columns : PILGRIMAGE_WALK_FRAME_COUNT;
}
