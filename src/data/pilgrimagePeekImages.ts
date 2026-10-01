import type { ImageSourcePropType } from 'react-native';
import type { PetId } from '../petCatalog';

// Each asset uses the character's original front-arm/hand design in the shared
// chest-up pose. Hind legs and foot-pad details are excluded from every cutout.
export const PILGRIMAGE_PEEK_IMAGES: Record<PetId, ImageSourcePropType> = {
  babumoby: require('../../assets/mobies/pilgrimage-walk/babumoby-map-peek.webp'),
  bearmobby: require('../../assets/mobies/pilgrimage-walk/bearmobby-map-peek.webp'),
  boymobby: require('../../assets/mobies/pilgrimage-walk/boymobby-map-peek.webp'),
  dogmobby: require('../../assets/mobies/pilgrimage-walk/dogmobby-map-peek.webp'),
  mobibou: require('../../assets/mobies/pilgrimage-walk/mobibou-map-peek.webp'),
  mobichi: require('../../assets/mobies/pilgrimage-walk/mobichi-map-peek.webp'),
  mobirin: require('../../assets/mobies/pilgrimage-walk/mobirin-map-peek.webp'),
  mobiyan: require('../../assets/mobies/pilgrimage-walk/mobiyan-map-peek.webp'),
  mobiyura: require('../../assets/mobies/pilgrimage-walk/mobiyura-map-peek.webp'),
  ojimobby: require('../../assets/mobies/pilgrimage-walk/ojimobby-map-peek.webp'),
  potemoby: require('../../assets/mobies/pilgrimage-walk/potemoby-map-peek.webp'),
  reamobby: require('../../assets/mobies/pilgrimage-walk/reamobby-map-peek.webp'),
  reomoby: require('../../assets/mobies/pilgrimage-walk/reomoby-map-peek.webp'),
  shikamobby: require('../../assets/mobies/pilgrimage-walk/shikamobby-map-peek.webp'),
  uyumobby: require('../../assets/mobies/pilgrimage-walk/uyumobby-map-peek.webp'),
  wolfmobby: require('../../assets/mobies/pilgrimage-walk/wolfmobby-map-peek.webp'),
  yami: require('../../assets/mobies/pilgrimage-walk/yami-map-peek.webp'),
};

// Natural dimensions and the normalized bottom of each cutout. The map
// component uses these values to keep every character's paws on the same map
// edge even though the generated PNG canvases have different proportions.
export const PILGRIMAGE_PEEK_METRICS: Record<PetId, { width: number; height: number; bottom: number }> = {
  babumoby: { width: 1312, height: 1199, bottom: 0.9691 },
  bearmobby: { width: 1312, height: 1199, bottom: 0.9983 },
  boymobby: { width: 1484, height: 1060, bottom: 0.9689 },
  dogmobby: { width: 1381, height: 1139, bottom: 0.9254 },
  mobibou: { width: 1216, height: 1294, bottom: 0.8269 },
  mobichi: { width: 1470, height: 1070, bottom: 0.9430 },
  mobirin: { width: 1381, height: 1139, bottom: 0.9649 },
  mobiyan: { width: 1536, height: 1024, bottom: 0.9658 },
  mobiyura: { width: 1402, height: 1122, bottom: 0.9474 },
  ojimobby: { width: 1536, height: 1024, bottom: 0.9512 },
  potemoby: { width: 1489, height: 1056, bottom: 0.9981 },
  reamobby: { width: 1402, height: 1122, bottom: 0.9314 },
  reomoby: { width: 1536, height: 1024, bottom: 0.9648 },
  shikamobby: { width: 1349, height: 1166, bottom: 0.9134 },
  uyumobby: { width: 1312, height: 1199, bottom: 0.8507 },
  wolfmobby: { width: 1402, height: 1122, bottom: 0.8984 },
  yami: { width: 1448, height: 1086, bottom: 0.9392 },
};
