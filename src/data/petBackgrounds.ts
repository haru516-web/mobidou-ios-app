import type { ImageSourcePropType } from 'react-native';
import type { PetId } from '../petCatalog';

// Scenic card backdrops keep the character picker in the same washi-and-ink
// world as the rest of Mobidou. The three generated scenes are used as the
// anchor textures, while the seasonal scenes add quiet variety across the
// full roster without competing with the character artwork.
export const PET_BACKGROUNDS: Record<PetId, ImageSourcePropType> = {
  mobirin: require('../../assets/ui-round3/backgrounds/mobirin.webp'),
  mobichi: require('../../assets/ui-round3/backgrounds/mobichi.webp'),
  yami: require('../../assets/ui-round3/backgrounds/yami.webp'),
  mobiyan: require('../../assets/ui-round3/backgrounds/summer-evening.webp'),
  mobiyura: require('../../assets/ui-round3/backgrounds/winter-snow.webp'),
  reomoby: require('../../assets/ui-round3/backgrounds/spring-dawn.webp'),
  potemoby: require('../../assets/ui-round3/backgrounds/autumn-mist.webp'),
  mobibou: require('../../assets/ui-round3/backgrounds/summer-green.webp'),
  babumoby: require('../../assets/ui-round3/backgrounds/spring-rain.webp'),
  bearmobby: require('../../assets/ui-round3/backgrounds/autumn-mist.webp'),
  boymobby: require('../../assets/ui-round3/backgrounds/summer-green.webp'),
  dogmobby: require('../../assets/ui-round3/backgrounds/summer-green.webp'),
  lanimobby: require('../../assets/ui-round3/backgrounds/spring-rain.webp'),
  ojimobby: require('../../assets/ui-round3/backgrounds/autumn-mist.webp'),
  reamobby: require('../../assets/ui-round3/backgrounds/autumn-maple.webp'),
  shikamobby: require('../../assets/ui-round3/backgrounds/summer-green.webp'),
  uyumobby: require('../../assets/ui-round3/backgrounds/spring-dawn.webp'),
  wolfmobby: require('../../assets/ui-round3/backgrounds/winter-clear.webp'),
};
