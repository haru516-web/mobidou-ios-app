import type { ImageSourcePropType } from 'react-native';

/** Artwork for the first event (assets/event-toki, see its MANIFEST.md). Keys are the spot ids in events.ts. */
export const EVENT_MAP_IMAGE: ImageSourcePropType = require('../../assets/event-toki/map.webp');
/** The picture for the event popup: Showa night to Heisei day, three friends walking (1024x1152). */
export const EVENT_KEY_VISUAL: ImageSourcePropType = require('../../assets/event-toki/key-visual.webp');
export const EVENT_BOOK_COVER: ImageSourcePropType = require('../../assets/event-toki/book-cover.webp');
export const EVENT_TICKET_IMAGE: ImageSourcePropType = require('../../assets/event-toki/ticket-event-tag.webp');

// The redrawn pictures are used as they arrive (docs/codex-event-assets-taste.md). Spots whose picture is not drawn yet
// borrow one from the first batch so the screens are never empty. TEMPORARY: remove FALLBACK as the rest arrive.
const GOSHUIN: Record<string, ImageSourcePropType> = {
  'showa-car': require('../../assets/event-toki/goshuin/showa-car.webp'),
  'showa-bike': require('../../assets/event-toki/goshuin/showa-bike.webp'),
  'showa-tv': require('../../assets/event-toki/goshuin/showa-tv.webp'),
  'showa-mirrorball': require('../../assets/event-toki/goshuin/showa-mirrorball.webp'),
  'showa-record': require('../../assets/event-toki/goshuin/showa-record.webp'),
  'heisei-keitai': require('../../assets/event-toki/goshuin/heisei-keitai.webp'),
  'heisei-pager': require('../../assets/event-toki/goshuin/heisei-pager.webp'),
  'heisei-century': require('../../assets/event-toki/goshuin/heisei-century.webp'),
  'heisei-park': require('../../assets/event-toki/goshuin/heisei-park.webp'),
};
const KEYCHAINS: Record<string, ImageSourcePropType> = {
  'showa-car': require('../../assets/event-toki/keychains/keychain-showa-car-v1-transparent.webp'),
  'showa-bike': require('../../assets/event-toki/keychains/keychain-showa-bike-v1-transparent.webp'),
  'showa-tv': require('../../assets/event-toki/keychains/keychain-showa-tv-v1-transparent.webp'),
  'showa-mirrorball': require('../../assets/event-toki/keychains/keychain-showa-mirrorball-v1-transparent.webp'),
  'showa-record': require('../../assets/event-toki/keychains/keychain-showa-record-v1-transparent.webp'),
  'heisei-keitai': require('../../assets/event-toki/keychains/keychain-heisei-keitai-v1-transparent.webp'),
  'heisei-strap': require('../../assets/event-toki/keychains/keychain-heisei-strap-v1-transparent.webp'),
  'heisei-pager': require('../../assets/event-toki/keychains/keychain-heisei-pager-v1-transparent.webp'),
  'heisei-century': require('../../assets/event-toki/keychains/keychain-heisei-century-v1-transparent.webp'),
  'heisei-park': require('../../assets/event-toki/keychains/keychain-heisei-park-v1-transparent.webp'),
};
const FALLBACK: Record<string, string> = {
  'heisei-md': 'heisei-century', 'heisei-cd': 'heisei-pager', 'heisei-sticker': 'heisei-park', 'heisei-phs': 'heisei-park',
  'heisei-loose': 'heisei-park', 'heisei-boots': 'heisei-century', 'heisei-digicam': 'heisei-century',
};
const withFallback = (pictures: Record<string, ImageSourcePropType>, extra: Record<string, string> = {}) => ({ ...pictures, ...Object.fromEntries(Object.entries({ ...FALLBACK, ...extra }).map(([id, other]) => [id, pictures[other]])) });

export const EVENT_GOSHUIN_IMAGES = withFallback(GOSHUIN, { 'heisei-strap': 'heisei-keitai' });
export const EVENT_KEYCHAIN_IMAGES = withFallback(KEYCHAINS);
