import type { ImageSourcePropType } from 'react-native';

const rei = [
  require('../../assets/mobies/actions/mobibou/mobibou-rei-01.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-02.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-03.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-04.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-05.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-06.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-07.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-08.png'),
] as const satisfies readonly ImageSourcePropType[];

const hakushu = [
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-01.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-02.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-03.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-04.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-05.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-06.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-07.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-08.png'),
] as const satisfies readonly ImageSourcePropType[];

export const MOBIBOU_ACTION_ASSETS = [...rei, ...hakushu] as const;
export const MOBIBOU_ACTION_FRAMES = [
  ...rei,
  ...rei,
  ...hakushu,
  ...hakushu,
  ...rei,
] as const;
