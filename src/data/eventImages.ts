import type { ImageSourcePropType } from 'react-native';

/** Artwork for the first event (assets/event-toki, see its MANIFEST.md). Keys are the spot ids in events.ts. */
export const EVENT_MAP_IMAGE: ImageSourcePropType = require('../../assets/event-toki/map.webp');
/** The picture for the event popup: Showa night to Heisei day, three friends walking (1024x1152). */
export const EVENT_KEY_VISUAL: ImageSourcePropType = require('../../assets/event-toki/key-visual.webp');
export const EVENT_BOOK_COVER: ImageSourcePropType = require('../../assets/event-toki/book-cover.webp');
export const EVENT_TICKET_IMAGE: ImageSourcePropType = require('../../assets/event-toki/ticket-event-tag.webp');

// TEMPORARY: the 15 spots reuse the first batch of 8 pictures until the redrawn set arrives (docs/codex-event-assets-taste.md).
const FIRST_BATCH: Record<string, string> = {
  'showa-car': 'showa-shoutengai', 'showa-bike': 'showa-toge', 'showa-tv': 'showa-sento', 'showa-mirrorball': 'showa-drivein', 'showa-record': 'showa-record',
  'heisei-md': 'heisei-century', 'heisei-pager': 'heisei-pager', 'heisei-cd': 'heisei-pager', 'heisei-sticker': 'heisei-park', 'heisei-phs': 'heisei-park',
  'heisei-loose': 'heisei-park', 'heisei-keitai': 'heisei-park', 'heisei-boots': 'heisei-century', 'heisei-digicam': 'heisei-century', 'heisei-strap': 'heisei-century',
};
const GOSHUIN: Record<string, ImageSourcePropType> = {
  'showa-shoutengai': require('../../assets/event-toki/goshuin/showa-shoutengai.webp'),
  'showa-toge': require('../../assets/event-toki/goshuin/showa-toge.webp'),
  'showa-drivein': require('../../assets/event-toki/goshuin/showa-drivein.webp'),
  'showa-sento': require('../../assets/event-toki/goshuin/showa-sento.webp'),
  'showa-record': require('../../assets/event-toki/goshuin/showa-record.webp'),
  'heisei-park': require('../../assets/event-toki/goshuin/heisei-park.webp'),
  'heisei-pager': require('../../assets/event-toki/goshuin/heisei-pager.webp'),
  'heisei-century': require('../../assets/event-toki/goshuin/heisei-century.webp'),
};
const KEYCHAINS: Record<string, ImageSourcePropType> = {
  'showa-shoutengai': require('../../assets/event-toki/keychains/keychain-showa-shoutengai-v1-transparent.webp'),
  'showa-toge': require('../../assets/event-toki/keychains/keychain-showa-toge-v1-transparent.webp'),
  'showa-drivein': require('../../assets/event-toki/keychains/keychain-showa-drivein-v1-transparent.webp'),
  'showa-sento': require('../../assets/event-toki/keychains/keychain-showa-sento-v1-transparent.webp'),
  'showa-record': require('../../assets/event-toki/keychains/keychain-showa-record-v1-transparent.webp'),
  'heisei-park': require('../../assets/event-toki/keychains/keychain-heisei-park-v1-transparent.webp'),
  'heisei-pager': require('../../assets/event-toki/keychains/keychain-heisei-pager-v1-transparent.webp'),
  'heisei-century': require('../../assets/event-toki/keychains/keychain-heisei-century-v1-transparent.webp'),
};
const viaFirstBatch = (pictures: Record<string, ImageSourcePropType>) => Object.fromEntries(Object.entries(FIRST_BATCH).map(([id, old]) => [id, pictures[old]])) as Record<string, ImageSourcePropType>;

export const EVENT_GOSHUIN_IMAGES = viaFirstBatch(GOSHUIN);
export const EVENT_KEYCHAIN_IMAGES = viaFirstBatch(KEYCHAINS);
