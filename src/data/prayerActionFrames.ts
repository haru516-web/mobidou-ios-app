import type { ImageSourcePropType } from 'react-native';

type FrameSet = readonly ImageSourcePropType[];

const sequence = (rei: FrameSet, hakushu: FrameSet): readonly ImageSourcePropType[] => [
  ...rei,
  ...rei,
  ...hakushu,
  ...hakushu,
  ...rei,
];

const mobirinRei = [
  require('../../assets/mobies/actions/mobirin/mobirin-rei-01.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-rei-02.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-rei-03.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-rei-04.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-rei-05.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-rei-06.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-rei-07.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-rei-08.png'),
] as const;

const mobirinHakushu = [
  require('../../assets/mobies/actions/mobirin/mobirin-hakushu-01.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-hakushu-02.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-hakushu-03.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-hakushu-04.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-hakushu-05.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-hakushu-06.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-hakushu-07.png'),
  require('../../assets/mobies/actions/mobirin/mobirin-hakushu-08.png'),
] as const;

const mobichiRei = [
  require('../../assets/mobies/actions/mobichi/mobichi-rei-01.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-rei-02.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-rei-03.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-rei-04.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-rei-05.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-rei-06.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-rei-07.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-rei-08.png'),
] as const;

const mobichiHakushu = [
  require('../../assets/mobies/actions/mobichi/mobichi-hakushu-01.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-hakushu-02.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-hakushu-03.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-hakushu-04.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-hakushu-05.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-hakushu-06.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-hakushu-07.png'),
  require('../../assets/mobies/actions/mobichi/mobichi-hakushu-08.png'),
] as const;

const yamiRei = [
  require('../../assets/mobies/actions/yami/yami-rei-01.png'),
  require('../../assets/mobies/actions/yami/yami-rei-02.png'),
  require('../../assets/mobies/actions/yami/yami-rei-03.png'),
  require('../../assets/mobies/actions/yami/yami-rei-04.png'),
  require('../../assets/mobies/actions/yami/yami-rei-05.png'),
  require('../../assets/mobies/actions/yami/yami-rei-06.png'),
  require('../../assets/mobies/actions/yami/yami-rei-07.png'),
  require('../../assets/mobies/actions/yami/yami-rei-08.png'),
] as const;

const yamiHakushu = [
  require('../../assets/mobies/actions/yami/yami-hakushu-01.png'),
  require('../../assets/mobies/actions/yami/yami-hakushu-02.png'),
  require('../../assets/mobies/actions/yami/yami-hakushu-03.png'),
  require('../../assets/mobies/actions/yami/yami-hakushu-04.png'),
  require('../../assets/mobies/actions/yami/yami-hakushu-05.png'),
  require('../../assets/mobies/actions/yami/yami-hakushu-06.png'),
  require('../../assets/mobies/actions/yami/yami-hakushu-07.png'),
  require('../../assets/mobies/actions/yami/yami-hakushu-08.png'),
] as const;

const mobiyanRei = [
  require('../../assets/mobies/actions/mobiyan/mobiyan-rei-01.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-rei-02.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-rei-03.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-rei-04.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-rei-05.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-rei-06.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-rei-07.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-rei-08.png'),
] as const;

const mobiyanHakushu = [
  require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-01.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-02.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-03.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-04.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-05.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-06.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-07.png'),
  require('../../assets/mobies/actions/mobiyan/mobiyan-hakushu-08.png'),
] as const;

const mobiyuraRei = [
  require('../../assets/mobies/actions/mobiyura/mobiyura-rei-01.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-rei-02.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-rei-03.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-rei-04.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-rei-05.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-rei-06.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-rei-07.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-rei-08.png'),
] as const;

const mobiyuraHakushu = [
  require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-01.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-02.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-03.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-04.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-05.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-06.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-07.png'),
  require('../../assets/mobies/actions/mobiyura/mobiyura-hakushu-08.png'),
] as const;

const reomobyRei = [
  require('../../assets/mobies/actions/reomoby/reomoby-rei-01.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-rei-02.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-rei-03.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-rei-04.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-rei-05.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-rei-06.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-rei-07.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-rei-08.png'),
] as const;

const reomobyHakushu = [
  require('../../assets/mobies/actions/reomoby/reomoby-hakushu-01.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-hakushu-02.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-hakushu-03.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-hakushu-04.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-hakushu-05.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-hakushu-06.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-hakushu-07.png'),
  require('../../assets/mobies/actions/reomoby/reomoby-hakushu-08.png'),
] as const;

const potemobyRei = [
  require('../../assets/mobies/actions/potemoby/potemoby-rei-01.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-rei-02.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-rei-03.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-rei-04.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-rei-05.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-rei-06.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-rei-07.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-rei-08.png'),
] as const;

const potemobyHakushu = [
  require('../../assets/mobies/actions/potemoby/potemoby-hakushu-01.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-hakushu-02.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-hakushu-03.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-hakushu-04.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-hakushu-05.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-hakushu-06.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-hakushu-07.png'),
  require('../../assets/mobies/actions/potemoby/potemoby-hakushu-08.png'),
] as const;

const mobibouRei = [
  require('../../assets/mobies/actions/mobibou/mobibou-rei-01.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-02.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-03.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-04.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-05.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-06.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-07.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-rei-08.png'),
] as const;

const mobibouHakushu = [
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-01.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-02.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-03.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-04.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-05.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-06.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-07.png'),
  require('../../assets/mobies/actions/mobibou/mobibou-hakushu-08.png'),
] as const;

const babumobyRei = [
  require('../../assets/mobies/actions/babumoby/babumoby-rei-01.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-rei-02.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-rei-03.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-rei-04.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-rei-05.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-rei-06.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-rei-07.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-rei-08.png'),
] as const;

const babumobyHakushu = [
  require('../../assets/mobies/actions/babumoby/babumoby-hakushu-01.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-hakushu-02.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-hakushu-03.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-hakushu-04.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-hakushu-05.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-hakushu-06.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-hakushu-07.png'),
  require('../../assets/mobies/actions/babumoby/babumoby-hakushu-08.png'),
] as const;

const bearmobbyRei = [
  require('../../assets/mobies/actions/bearmobby/bearmobby-rei-01.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-rei-02.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-rei-03.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-rei-04.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-rei-05.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-rei-06.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-rei-07.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-rei-08.png'),
] as const;

const bearmobbyHakushu = [
  require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-01.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-02.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-03.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-04.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-05.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-06.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-07.png'),
  require('../../assets/mobies/actions/bearmobby/bearmobby-hakushu-08.png'),
] as const;

const boymobbyRei = [
  require('../../assets/mobies/actions/boymobby/boymobby-rei-01.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-rei-02.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-rei-03.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-rei-04.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-rei-05.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-rei-06.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-rei-07.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-rei-08.png'),
] as const;

const boymobbyHakushu = [
  require('../../assets/mobies/actions/boymobby/boymobby-hakushu-01.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-hakushu-02.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-hakushu-03.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-hakushu-04.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-hakushu-05.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-hakushu-06.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-hakushu-07.png'),
  require('../../assets/mobies/actions/boymobby/boymobby-hakushu-08.png'),
] as const;

const dogmobbyRei = [
  require('../../assets/mobies/actions/dogmobby/dogmobby-rei-01.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-rei-02.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-rei-03.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-rei-04.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-rei-05.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-rei-06.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-rei-07.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-rei-08.png'),
] as const;

const dogmobbyHakushu = [
  require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-01.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-02.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-03.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-04.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-05.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-06.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-07.png'),
  require('../../assets/mobies/actions/dogmobby/dogmobby-hakushu-08.png'),
] as const;

const lanimobbyRei = [
  require('../../assets/mobies/actions/lanimobby/lanimobby-rei-01.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-rei-02.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-rei-03.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-rei-04.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-rei-05.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-rei-06.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-rei-07.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-rei-08.png'),
] as const;

const lanimobbyHakushu = [
  require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-01.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-02.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-03.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-04.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-05.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-06.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-07.png'),
  require('../../assets/mobies/actions/lanimobby/lanimobby-hakushu-08.png'),
] as const;

const ojimobbyRei = [
  require('../../assets/mobies/actions/ojimobby/ojimobby-rei-01.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-rei-02.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-rei-03.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-rei-04.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-rei-05.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-rei-06.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-rei-07.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-rei-08.png'),
] as const;

const ojimobbyHakushu = [
  require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-01.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-02.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-03.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-04.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-05.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-06.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-07.png'),
  require('../../assets/mobies/actions/ojimobby/ojimobby-hakushu-08.png'),
] as const;

const reamobbyRei = [
  require('../../assets/mobies/actions/reamobby/reamobby-rei-01.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-rei-02.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-rei-03.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-rei-04.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-rei-05.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-rei-06.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-rei-07.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-rei-08.png'),
] as const;

const reamobbyHakushu = [
  require('../../assets/mobies/actions/reamobby/reamobby-hakushu-01.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-hakushu-02.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-hakushu-03.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-hakushu-04.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-hakushu-05.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-hakushu-06.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-hakushu-07.png'),
  require('../../assets/mobies/actions/reamobby/reamobby-hakushu-08.png'),
] as const;

const shikamobbyRei = [
  require('../../assets/mobies/actions/shikamobby/shikamobby-rei-01.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-rei-02.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-rei-03.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-rei-04.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-rei-05.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-rei-06.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-rei-07.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-rei-08.png'),
] as const;

const shikamobbyHakushu = [
  require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-01.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-02.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-03.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-04.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-05.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-06.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-07.png'),
  require('../../assets/mobies/actions/shikamobby/shikamobby-hakushu-08.png'),
] as const;

const uyumobbyRei = [
  require('../../assets/mobies/actions/uyumobby/uyumobby-rei-01.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-rei-02.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-rei-03.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-rei-04.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-rei-05.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-rei-06.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-rei-07.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-rei-08.png'),
] as const;

const uyumobbyHakushu = [
  require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-01.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-02.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-03.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-04.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-05.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-06.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-07.png'),
  require('../../assets/mobies/actions/uyumobby/uyumobby-hakushu-08.png'),
] as const;

const wolfmobbyRei = [
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-01.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-02.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-03.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-04.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-05.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-06.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-07.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-rei-08.png'),
] as const;

const wolfmobbyHakushu = [
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-01.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-02.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-03.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-04.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-05.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-06.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-07.png'),
  require('../../assets/mobies/actions/wolfmobby/wolfmobby-hakushu-08.png'),
] as const;

export const PRAYER_SEQUENCES: Record<string, readonly ImageSourcePropType[]> = {
  mobirin: sequence(mobirinRei, mobirinHakushu),
  mobichi: sequence(mobichiRei, mobichiHakushu),
  yami: sequence(yamiRei, yamiHakushu),
  mobiyan: sequence(mobiyanRei, mobiyanHakushu),
  mobiyura: sequence(mobiyuraRei, mobiyuraHakushu),
  reomoby: sequence(reomobyRei, reomobyHakushu),
  potemoby: sequence(potemobyRei, potemobyHakushu),
  mobibou: sequence(mobibouRei, mobibouHakushu),
  babumoby: sequence(babumobyRei, babumobyHakushu),
  bearmobby: sequence(bearmobbyRei, bearmobbyHakushu),
  boymobby: sequence(boymobbyRei, boymobbyHakushu),
  dogmobby: sequence(dogmobbyRei, dogmobbyHakushu),
  lanimobby: sequence(lanimobbyRei, lanimobbyHakushu),
  ojimobby: sequence(ojimobbyRei, ojimobbyHakushu),
  reamobby: sequence(reamobbyRei, reamobbyHakushu),
  shikamobby: sequence(shikamobbyRei, shikamobbyHakushu),
  uyumobby: sequence(uyumobbyRei, uyumobbyHakushu),
  wolfmobby: sequence(wolfmobbyRei, wolfmobbyHakushu),
};
