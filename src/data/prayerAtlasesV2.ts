import type { ImageSourcePropType } from 'react-native';

export const PRAYER_ACTION_ORDER = ['rei', 'rei', 'hakushu', 'hakushu', 'rei'] as const;
export const PRAYER_FRAME_COUNT = 40;
// Packed 4112 x 514 atlases; eight equal cells with a transparent one-pixel
// gutter, matched to the idle artwork.
export const PRAYER_ATLASES: Record<string, { rei: ImageSourcePropType; hakushu: ImageSourcePropType }> = {
  mobirin: { rei: require('../../assets/mobies/prayer-v2/mobirin/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/mobirin/hakushu.png') },
  mobichi: { rei: require('../../assets/mobies/prayer-v2/mobichi/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/mobichi/hakushu.png') },
  yami: { rei: require('../../assets/mobies/prayer-v2/yami/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/yami/hakushu.png') },
  mobiyan: { rei: require('../../assets/mobies/prayer-v2/mobiyan/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/mobiyan/hakushu.png') },
  mobiyura: { rei: require('../../assets/mobies/prayer-v2/mobiyura/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/mobiyura/hakushu.png') },
  reomoby: { rei: require('../../assets/mobies/prayer-v2/reomoby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/reomoby/hakushu.png') },
  potemoby: { rei: require('../../assets/mobies/prayer-v2/potemoby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/potemoby/hakushu.png') },
  mobibou: { rei: require('../../assets/mobies/prayer-v2/mobibou/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/mobibou/hakushu.png') },
  babumoby: { rei: require('../../assets/mobies/prayer-v2/babumoby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/babumoby/hakushu.png') },
  bearmobby: { rei: require('../../assets/mobies/prayer-v2/bearmobby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/bearmobby/hakushu.png') },
  boymobby: { rei: require('../../assets/mobies/prayer-v2/boymobby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/boymobby/hakushu.png') },
  dogmobby: { rei: require('../../assets/mobies/prayer-v2/dogmobby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/dogmobby/hakushu.png') },
  lanimobby: { rei: require('../../assets/mobies/prayer-v2/lanimobby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/lanimobby/hakushu.png') },
  ojimobby: { rei: require('../../assets/mobies/prayer-v2/ojimobby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/ojimobby/hakushu.png') },
  reamobby: { rei: require('../../assets/mobies/prayer-v2/reamobby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/reamobby/hakushu.png') },
  shikamobby: { rei: require('../../assets/mobies/prayer-v2/shikamobby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/shikamobby/hakushu.png') },
  uyumobby: { rei: require('../../assets/mobies/prayer-v2/uyumobby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/uyumobby/hakushu.png') },
  wolfmobby: { rei: require('../../assets/mobies/prayer-v2/wolfmobby/rei.png'), hakushu: require('../../assets/mobies/prayer-v2/wolfmobby/hakushu.png') },
};
