import type { Shrine } from './shrines';
import { TOKI_MEGURU } from './events';

/**
 * The event's spots in the shape of an ordinary shrine, so the goshuin book (cover, page turn, index, detail)
 * shows the event with the same screen code. The picture is found by the spot id in STAMP_IMAGES.
 */
export const EVENT_SHRINES: Shrine[] = (TOKI_MEGURU.spots ?? []).map(spot => ({
  id: spot.id,
  name: spot.name,
  reading: `${spot.chapter} · ${spot.at.toLocaleString()}歩`,
  place: `${spot.chapter}の道 · ${TOKI_MEGURU.name}`,
  theme: `${spot.miniature}`,
  description: `${spot.miniature}
${spot.chapter}の宝物を祀る社。
チームのみんなで歩いて、ご縁を結ぶ。`,
  blessing: '',
  stampLocation: '',
  color: '#2F4A6B',
  icon: 'star',
}) as unknown as Shrine);
