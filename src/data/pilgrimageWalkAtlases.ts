import type { ImageSourcePropType } from 'react-native';
import type { PetId } from '../petCatalog';

export const PILGRIMAGE_WALK_FRAME_COUNT = 4;
export const PILGRIMAGE_WALK_ATLAS_WIDTH = 1536;
export const PILGRIMAGE_WALK_ATLAS_HEIGHT = 1024;
export const PILGRIMAGE_WALK_FRAME_WIDTH = PILGRIMAGE_WALK_ATLAS_WIDTH / PILGRIMAGE_WALK_FRAME_COUNT;
export const PILGRIMAGE_WALK_FRAME_HEIGHT = PILGRIMAGE_WALK_ATLAS_HEIGHT;
export const PILGRIMAGE_WALK_METRICS = {
  atlasWidth: PILGRIMAGE_WALK_ATLAS_WIDTH,
  atlasHeight: PILGRIMAGE_WALK_ATLAS_HEIGHT,
  frameCount: PILGRIMAGE_WALK_FRAME_COUNT,
  frameWidth: PILGRIMAGE_WALK_FRAME_WIDTH,
  frameHeight: PILGRIMAGE_WALK_FRAME_HEIGHT,
} as const;

// Horizontal four-frame sheets: contact, down, passing, up.
// Each frame is 384 x 1024 with one shared baseline and real alpha transparency.
export const PILGRIMAGE_WALK_ATLASES: Partial<Record<PetId, ImageSourcePropType>> = {
  babumoby: require('../../assets/mobies/pilgrimage-walk/babumoby.png'),
  bearmobby: require('../../assets/mobies/pilgrimage-walk/bearmobby.png'),
  boymobby: require('../../assets/mobies/pilgrimage-walk/boymobby.png'),
  dogmobby: require('../../assets/mobies/pilgrimage-walk/dogmobby.png'),
  lanimobby: require('../../assets/mobies/pilgrimage-walk/lanimobby.png'),
  mobibou: require('../../assets/mobies/pilgrimage-walk/mobibou.png'),
  mobichi: require('../../assets/mobies/pilgrimage-walk/mobichi.png'),
  mobirin: require('../../assets/mobies/pilgrimage-walk/mobirin.png'),
  mobiyan: require('../../assets/mobies/pilgrimage-walk/mobiyan.png'),
  mobiyura: require('../../assets/mobies/pilgrimage-walk/mobiyura.png'),
  potemoby: require('../../assets/mobies/pilgrimage-walk/potemoby.png'),
  reomoby: require('../../assets/mobies/pilgrimage-walk/reomoby.png'),
  yami: require('../../assets/mobies/pilgrimage-walk/yami.png'),
};
