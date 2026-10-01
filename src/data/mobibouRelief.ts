import type { ReliefMeta, ReliefSources } from '../components/reliefCore';
import meta from './mobibouReliefMeta.json';

/** Cut-outs and baked height maps of Mobibou's front / side / back turnaround views. */
export const MOBIBOU_RELIEF_SOURCES: ReliefSources = {
  front: { color: require('../../assets/mobies/relief/mobibou-front.png'), height: require('../../assets/mobies/relief/mobibou-front-height.png') },
  side: { color: require('../../assets/mobies/relief/mobibou-side.png'), height: require('../../assets/mobies/relief/mobibou-side-height.png') },
  back: { color: require('../../assets/mobies/relief/mobibou-back.png'), height: require('../../assets/mobies/relief/mobibou-back-height.png') },
};

export const MOBIBOU_RELIEF_META = meta as unknown as ReliefMeta;
