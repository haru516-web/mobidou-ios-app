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
  mobirin: { rei: require('../../assets/mobies/actions/mobirin/mobirin-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/mobirin/mobirin-hakushu-storyboard.png') },
  mobichi: { rei: require('../../assets/mobies/actions/mobichi/mobichi-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/mobichi/mobichi-hakushu-storyboard.png') },
  yami: { rei: require('../../assets/mobies/actions/yami/yami-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/yami/yami-hakushu-storyboard.png') },
  mobiyan: { rei: require('../../assets/mobies/actions/mobiyan/mobiyan-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-storyboard.png') },
  mobiyura: { rei: require('../../assets/mobies/actions/mobiyura/mobiyura-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-storyboard.png') },
  reomoby: { rei: require('../../assets/mobies/actions/reomoby/reomoby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/reomoby/reomoby-hakushu-storyboard.png') },
  potemoby: { rei: require('../../assets/mobies/actions/potemoby/potemoby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/potemoby/potemoby-hakushu-storyboard.png') },
  mobibou: { rei: require('../../assets/mobies/actions/mobibou/mobibou-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/mobibou/mobibou-hakushu-storyboard.png') },
  babumoby: { rei: require('../../assets/mobies/actions/babumoby/babumoby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/babumoby/babumoby-hakushu-storyboard.png') },
  bearmobby: { rei: require('../../assets/mobies/actions/bearmobby/bearmobby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-storyboard.png') },
  boymobby: { rei: require('../../assets/mobies/actions/boymobby/boymobby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/boymobby/boymobby-hakushu-storyboard.png') },
  dogmobby: { rei: require('../../assets/mobies/actions/dogmobby/dogmobby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-storyboard.png') },
  lanimobby: { rei: require('../../assets/mobies/actions/lanimobby/lanimobby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-storyboard.png') },
  ojimobby: { rei: require('../../assets/mobies/actions/ojimobby/ojimobby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-storyboard.png') },
  reamobby: { rei: require('../../assets/mobies/actions/reamobby/reamobby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/reamobby/reamobby-hakushu-storyboard.png') },
  shikamobby: { rei: require('../../assets/mobies/actions/shikamobby/shikamobby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-storyboard.png') },
  uyumobby: { rei: require('../../assets/mobies/actions/uyumobby/uyumobby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-storyboard.png') },
  wolfmobby: { rei: require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-storyboard.png'), hakushu: require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-storyboard.png') },
};
