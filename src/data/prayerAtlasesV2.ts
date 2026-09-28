import type { ImageSourcePropType } from 'react-native';

export const PRAYER_ACTION_ORDER = ['rei', 'rei', 'hakushu', 'hakushu', 'rei'] as const;
export const PRAYER_FRAME_COUNT = 40;
// Packed 4112 x 514 atlases; eight equal cells with a transparent one-pixel
// gutter, matched to the idle artwork.
export const PRAYER_ATLASES: Record<string, { rei: ImageSourcePropType; hakushu: ImageSourcePropType }> = {
  mobirin: { rei: require('../../assets/mobies/prayer-v2/mobirin/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/mobirin/hakushu.webp') },
  mobichi: { rei: require('../../assets/mobies/prayer-v2/mobichi/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/mobichi/hakushu.webp') },
  yami: { rei: require('../../assets/mobies/prayer-v2/yami/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/yami/hakushu.webp') },
  mobiyan: { rei: require('../../assets/mobies/prayer-v2/mobiyan/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/mobiyan/hakushu.webp') },
  mobiyura: { rei: require('../../assets/mobies/prayer-v2/mobiyura/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/mobiyura/hakushu.webp') },
  reomoby: { rei: require('../../assets/mobies/prayer-v2/reomoby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/reomoby/hakushu.webp') },
  potemoby: { rei: require('../../assets/mobies/prayer-v2/potemoby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/potemoby/hakushu.webp') },
  mobibou: { rei: require('../../assets/mobies/prayer-v2/mobibou/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/mobibou/hakushu.webp') },
  babumoby: { rei: require('../../assets/mobies/prayer-v2/babumoby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/babumoby/hakushu.webp') },
  bearmobby: { rei: require('../../assets/mobies/prayer-v2/bearmobby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/bearmobby/hakushu.webp') },
  boymobby: { rei: require('../../assets/mobies/prayer-v2/boymobby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/boymobby/hakushu.webp') },
  dogmobby: { rei: require('../../assets/mobies/prayer-v2/dogmobby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/dogmobby/hakushu.webp') },
  lanimobby: { rei: require('../../assets/mobies/prayer-v2/lanimobby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/lanimobby/hakushu.webp') },
  ojimobby: { rei: require('../../assets/mobies/prayer-v2/ojimobby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/ojimobby/hakushu.webp') },
  reamobby: { rei: require('../../assets/mobies/prayer-v2/reamobby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/reamobby/hakushu.webp') },
  shikamobby: { rei: require('../../assets/mobies/prayer-v2/shikamobby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/shikamobby/hakushu.webp') },
  uyumobby: { rei: require('../../assets/mobies/prayer-v2/uyumobby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/uyumobby/hakushu.webp') },
  wolfmobby: { rei: require('../../assets/mobies/prayer-v2/wolfmobby/rei.webp'), hakushu: require('../../assets/mobies/prayer-v2/wolfmobby/hakushu.webp') },
};
