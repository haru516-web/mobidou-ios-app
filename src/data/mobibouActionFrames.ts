import type { ImageSourcePropType } from 'react-native';

import type { PrayerAction } from './prayerTiming';

const rei = [
  require('../../assets/mobies/actions/mobibou/mobibou-rei-01.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-02.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-03.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-04.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-05.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-06.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-07.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-08.webp'),
] as const satisfies readonly ImageSourcePropType[];

const hakushu = [
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-01.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-02.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-03.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-04.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-05.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-06.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-07.webp'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-08.webp'),
] as const satisfies readonly ImageSourcePropType[];

/** Bow, bow, clap-clap, bow: the hakushu strip holds both claps, so it plays once. */
export const MOBIBOU_PRAYER_ORDER: readonly PrayerAction[] = ['rei', 'rei', 'hakushu', 'rei'];
export const MOBIBOU_ACTION_STRIPS = { rei, hakushu } as const;
export const MOBIBOU_ACTION_FRAMES: readonly ImageSourcePropType[] = MOBIBOU_PRAYER_ORDER.flatMap(action => MOBIBOU_ACTION_STRIPS[action]);
