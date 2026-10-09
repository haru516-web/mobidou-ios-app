import type { ImageSourcePropType } from 'react-native';

/** Artwork for the first event (assets/event-toki, see its MANIFEST.md). Keys are the spot ids in events.ts. */
export const EVENT_MAP_IMAGE: ImageSourcePropType = require('../../assets/event-toki/map.webp');
/** The picture for the event popup: Showa night to Heisei day, three friends walking (1024x1152). */
export const EVENT_KEY_VISUAL: ImageSourcePropType = require('../../assets/event-toki/key-visual.webp');
export const EVENT_BOOK_COVER: ImageSourcePropType = require('../../assets/event-toki/book-cover.webp');
export const EVENT_TICKET_IMAGE: ImageSourcePropType = require('../../assets/event-toki/ticket-event-tag.webp');

// MINIATURES (keychains): the redrawn pictures are used as they arrive (docs/codex-event-assets-taste.md).
const KEYCHAINS: Record<string, ImageSourcePropType> = {
  'showa-car': require('../../assets/event-toki/keychains/keychain-showa-car-v1-transparent.webp'),
  'showa-bike': require('../../assets/event-toki/keychains/keychain-showa-bike-v1-transparent.webp'),
  'showa-tv': require('../../assets/event-toki/keychains/keychain-showa-tv-v1-transparent.webp'),
  'showa-mirrorball': require('../../assets/event-toki/keychains/keychain-showa-mirrorball-v1-transparent.webp'),
  'showa-record': require('../../assets/event-toki/keychains/keychain-showa-record-v1-transparent.webp'),
  'heisei-keitai': require('../../assets/event-toki/keychains/keychain-heisei-keitai-v1-transparent.webp'),
  'heisei-strap': require('../../assets/event-toki/keychains/keychain-heisei-strap-v1-transparent.webp'),
  'heisei-pager': require('../../assets/event-toki/keychains/keychain-heisei-pager-v1-transparent.webp'),
  'heisei-loose': require('../../assets/event-toki/keychains/keychain-heisei-loose-v1-transparent.webp'),
  'heisei-boots': require('../../assets/event-toki/keychains/keychain-heisei-boots-v1-transparent.webp'),
  'heisei-century': require('../../assets/event-toki/keychains/keychain-heisei-century-v1-transparent.webp'),
  'heisei-park': require('../../assets/event-toki/keychains/keychain-heisei-park-v1-transparent.webp'),
};
const KEYCHAIN_FALLBACK: Record<string, string> = {
  'heisei-md': 'heisei-century', 'heisei-cd': 'heisei-pager', 'heisei-sticker': 'heisei-park', 'heisei-phs': 'heisei-park',
  'heisei-digicam': 'heisei-century',
};
export const EVENT_KEYCHAIN_IMAGES: Record<string, ImageSourcePropType> = { ...KEYCHAINS, ...Object.fromEntries(Object.entries(KEYCHAIN_FALLBACK).map(([id, other]) => [id, KEYCHAINS[other]])) };

// GOSHUIN: the Japanese-style goshuin (washi, brush lettering, vermilion seal). Only the first eight exist so far;
// each spot borrows the nearest one until its own is drawn. TEMPORARY: replace the borrowed ones as they arrive.
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
const GOSHUIN_SOURCE: Record<string, string> = {
  'showa-car': 'showa-shoutengai', 'showa-bike': 'showa-toge', 'showa-tv': 'showa-sento', 'showa-mirrorball': 'showa-drivein', 'showa-record': 'showa-record',
  'heisei-md': 'heisei-century', 'heisei-pager': 'heisei-pager', 'heisei-cd': 'heisei-pager', 'heisei-sticker': 'heisei-park', 'heisei-phs': 'heisei-park',
  'heisei-loose': 'heisei-park', 'heisei-keitai': 'heisei-park', 'heisei-boots': 'heisei-century', 'heisei-digicam': 'heisei-century', 'heisei-strap': 'heisei-century',
};
export const EVENT_GOSHUIN_IMAGES: Record<string, ImageSourcePropType> = Object.fromEntries(Object.entries(GOSHUIN_SOURCE).map(([id, other]) => [id, GOSHUIN[other]]));
