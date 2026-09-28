import type { ImageSourcePropType } from 'react-native';

export type PrayerAction = 'rei' | 'hakushu';

export const PRAYER_ACTIONS: readonly PrayerAction[] = [
  'rei', 'rei', 'hakushu', 'hakushu', 'rei',
];

export const PRAYER_FRAMES_PER_ACTION = 8;
export const PRAYER_FRAME_COUNT = PRAYER_ACTIONS.length * PRAYER_FRAMES_PER_ACTION;

// The source character images are rendered into a 210px square on the home
// screen. These per-character factors compensate for the different amount of
// transparent padding in each generated 8-frame sheet so the upright action
// frames match that character's normal display size.
export const PRAYER_SPRITE_SCALES: Record<string, number> = {
  mobirin: 0.62,
  mobichi: 0.73,
  yami: 0.74,
  mobiyan: 0.62,
  mobiyura: 0.70,
  reomoby: 0.40,
  potemoby: 0.35,
  mobibou: 0.67,
  babumoby: 0.58,
  bearmobby: 0.62,
  boymobby: 0.53,
  dogmobby: 0.49,
  lanimobby: 0.63,
  ojimobby: 0.90,
  reamobby: 0.38,
  shikamobby: 0.46,
  uyumobby: 0.65,
  wolfmobby: 0.68,
};

export const PRAYER_SPRITE_ATLASES: Record<string, { rei: ImageSourcePropType; hakushu: ImageSourcePropType }> = {
  mobirin: { rei: require('../../assets/mobies/actions/mobirin/mobirin-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/mobirin/mobirin-hakushu-storyboard.webp') },
  mobichi: { rei: require('../../assets/mobies/actions/mobichi/mobichi-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/mobichi/mobichi-hakushu-storyboard.webp') },
  yami: { rei: require('../../assets/mobies/actions/yami/yami-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/yami/yami-hakushu-storyboard.webp') },
  mobiyan: { rei: require('../../assets/mobies/actions/mobiyan/mobiyan-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-storyboard.webp') },
  mobiyura: { rei: require('../../assets/mobies/actions/mobiyura/mobiyura-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-storyboard.webp') },
  reomoby: { rei: require('../../assets/mobies/actions/reomoby/reomoby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/reomoby/reomoby-hakushu-storyboard.webp') },
  potemoby: { rei: require('../../assets/mobies/actions/potemoby/potemoby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/potemoby/potemoby-hakushu-storyboard.webp') },
  mobibou: { rei: require('../../assets/mobies/actions/mobibou/mobibou-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/mobibou/mobibou-hakushu-storyboard.webp') },
  babumoby: { rei: require('../../assets/mobies/actions/babumoby/babumoby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/babumoby/babumoby-hakushu-storyboard.webp') },
  bearmobby: { rei: require('../../assets/mobies/actions/bearmobby/bearmobby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-storyboard.webp') },
  boymobby: { rei: require('../../assets/mobies/actions/boymobby/boymobby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/boymobby/boymobby-hakushu-storyboard.webp') },
  dogmobby: { rei: require('../../assets/mobies/actions/dogmobby/dogmobby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-storyboard.webp') },
  lanimobby: { rei: require('../../assets/mobies/actions/lanimobby/lanimobby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-storyboard.webp') },
  ojimobby: { rei: require('../../assets/mobies/actions/ojimobby/ojimobby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-storyboard.webp') },
  reamobby: { rei: require('../../assets/mobies/actions/reamobby/reamobby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/reamobby/reamobby-hakushu-storyboard.webp') },
  shikamobby: { rei: require('../../assets/mobies/actions/shikamobby/shikamobby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-storyboard.webp') },
  uyumobby: { rei: require('../../assets/mobies/actions/uyumobby/uyumobby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-storyboard.webp') },
  wolfmobby: { rei: require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-storyboard.webp'), hakushu: require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-storyboard.webp') },
};
