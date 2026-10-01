import type { ImageSourcePropType } from 'react-native';
import type { PetId } from '../petCatalog';

export const PILGRIMAGE_WALK_FRAME_COUNT = 4;
export const PILGRIMAGE_WALK_ATLAS_WIDTH = 1536;
export const PILGRIMAGE_WALK_ATLAS_HEIGHT = 1024;
export const PILGRIMAGE_WALK_FRAME_WIDTH = PILGRIMAGE_WALK_ATLAS_WIDTH / PILGRIMAGE_WALK_FRAME_COUNT;
export const PILGRIMAGE_WALK_FRAME_HEIGHT = PILGRIMAGE_WALK_ATLAS_HEIGHT;
// Horizontal four-frame sheets: contact, down, passing, up.
// Each frame is 384 x 1024 with one shared baseline and real alpha transparency.
export const PILGRIMAGE_WALK_ATLASES: Record<PetId, ImageSourcePropType> = {
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
};
