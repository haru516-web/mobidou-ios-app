import type { ImageSourcePropType } from 'react-native';
import type { PetId } from '../petCatalog';

// Scenic card backdrops keep the character picker in the same washi-and-ink
// world as the rest of Mobidou. The three generated scenes are used as the
// anchor textures, while the seasonal scenes add quiet variety across the
// full roster without competing with the character artwork.
export const PET_BACKGROUNDS: Record<PetId, ImageSourcePropType> = {
  mobirin: require('../../assets/mobies/backgrounds/mobirin.webp'),
  mobichi: require('../../assets/mobies/backgrounds/mobichi.webp'),
  yami: require('../../assets/mobies/backgrounds/yami.webp'),
  mobiyan: require('../../assets/backgrounds/summer-evening.webp'),
  mobiyura: require('../../assets/backgrounds/winter-snow.webp'),
  reomoby: require('../../assets/backgrounds/spring-dawn.webp'),
  potemoby: require('../../assets/backgrounds/autumn-mist.webp'),
  mobibou: require('../../assets/backgrounds/summer-green.webp'),
  babumoby: require('../../assets/backgrounds/spring-rain.webp'),
  bearmobby: require('../../assets/backgrounds/autumn-mist.webp'),
  boymobby: require('../../assets/backgrounds/summer-green.webp'),
  dogmobby: require('../../assets/backgrounds/summer-green.webp'),
  lanimobby: require('../../assets/backgrounds/spring-rain.webp'),
  ojimobby: require('../../assets/backgrounds/autumn-mist.webp'),
  reamobby: require('../../assets/backgrounds/autumn-maple.webp'),
  shikamobby: require('../../assets/backgrounds/summer-green.webp'),
  uyumobby: require('../../assets/backgrounds/spring-dawn.webp'),
  wolfmobby: require('../../assets/backgrounds/winter-clear.webp'),
};
