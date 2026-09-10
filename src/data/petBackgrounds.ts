import type { ImageSourcePropType } from 'react-native';
import type { PetId } from '../petCatalog';

// Scenic card backdrops keep the character picker in the same washi-and-ink
// world as the rest of Mobidou. The three generated scenes are used as the
// anchor textures, while the seasonal scenes add quiet variety across the
// full roster without competing with the character artwork.
export const PET_BACKGROUNDS: Record<PetId, ImageSourcePropType> = {
  mobirin: require('../../assets/mobies/backgrounds/mobirin.png'),
  mobichi: require('../../assets/mobies/backgrounds/mobichi.png'),
  yami: require('../../assets/mobies/backgrounds/yami.png'),
  mobiyan: require('../../assets/backgrounds/summer-evening.png'),
  mobiyura: require('../../assets/backgrounds/winter-snow.png'),
  reomoby: require('../../assets/backgrounds/spring-dawn.png'),
  potemoby: require('../../assets/backgrounds/autumn-mist.png'),
  mobibou: require('../../assets/backgrounds/summer-green.png'),
  babumoby: require('../../assets/backgrounds/spring-rain.png'),
  bearmobby: require('../../assets/backgrounds/autumn-mist.png'),
  boymobby: require('../../assets/backgrounds/summer-green.png'),
  dogmobby: require('../../assets/backgrounds/summer-green.png'),
  lanimobby: require('../../assets/backgrounds/spring-rain.png'),
  ojimobby: require('../../assets/backgrounds/autumn-mist.png'),
  reamobby: require('../../assets/backgrounds/autumn-maple.png'),
  shikamobby: require('../../assets/backgrounds/summer-green.png'),
  uyumobby: require('../../assets/backgrounds/spring-dawn.png'),
  wolfmobby: require('../../assets/backgrounds/winter-clear.png'),
};
