import type { ImageSourcePropType } from 'react-native';

/** Artwork for the first event (assets/event-toki, see its MANIFEST.md). Keys are the spot ids in events.ts. */
export const EVENT_MAP_IMAGE: ImageSourcePropType = require('../../assets/event-toki/map.webp');
/** The picture for the event popup: Showa night to Heisei day, three friends walking (1024x1152). */
export const EVENT_KEY_VISUAL: ImageSourcePropType = require('../../assets/event-toki/key-visual.webp');
export const EVENT_BOOK_COVER: ImageSourcePropType = require('../../assets/event-toki/book-cover.webp');
export const EVENT_TICKET_IMAGE: ImageSourcePropType = require('../../assets/event-toki/ticket-event-tag.webp');

// MINIATURES (keychains): all fifteen are drawn (docs/codex-event-assets-taste.md).
export const EVENT_KEYCHAIN_IMAGES: Record<string, ImageSourcePropType> = {
  'showa-car': require('../../assets/event-toki/keychains/keychain-showa-car-v1-transparent.webp'),
  'showa-bike': require('../../assets/event-toki/keychains/keychain-showa-bike-v1-transparent.webp'),
  'showa-tv': require('../../assets/event-toki/keychains/keychain-showa-tv-v1-transparent.webp'),
  'showa-mirrorball': require('../../assets/event-toki/keychains/keychain-showa-mirrorball-v1-transparent.webp'),
  'showa-record': require('../../assets/event-toki/keychains/keychain-showa-record-v1-transparent.webp'),
  'heisei-md': require('../../assets/event-toki/keychains/keychain-heisei-md-v1-transparent.webp'),
  'heisei-pager': require('../../assets/event-toki/keychains/keychain-heisei-pager-v1-transparent.webp'),
  'heisei-cd': require('../../assets/event-toki/keychains/keychain-heisei-cd-v1-transparent.webp'),
  'heisei-sticker': require('../../assets/event-toki/keychains/keychain-heisei-sticker-v1-transparent.webp'),
  'heisei-phs': require('../../assets/event-toki/keychains/keychain-heisei-phs-v1-transparent.webp'),
  'heisei-loose': require('../../assets/event-toki/keychains/keychain-heisei-loose-v1-transparent.webp'),
  'heisei-keitai': require('../../assets/event-toki/keychains/keychain-heisei-keitai-v1-transparent.webp'),
  'heisei-boots': require('../../assets/event-toki/keychains/keychain-heisei-boots-v1-transparent.webp'),
  'heisei-digicam': require('../../assets/event-toki/keychains/keychain-heisei-digicam-v1-transparent.webp'),
  'heisei-strap': require('../../assets/event-toki/keychains/keychain-heisei-strap-v1-transparent.webp'),
};

// GOSHUIN: the Japanese-style goshuin (washi, brush lettering, vermilion seal), all fifteen drawn.
// The gara-kei (heisei-keitai) and the compact camera (heisei-digicam) use the first batch's "放課後の公園ほこら" and "世紀末の見晴らし社".
export const EVENT_GOSHUIN_IMAGES: Record<string, ImageSourcePropType> = {
  'showa-car': require('../../assets/event-toki/goshuin/showa-car.webp'),
  'showa-bike': require('../../assets/event-toki/goshuin/showa-bike.webp'),
  'showa-tv': require('../../assets/event-toki/goshuin/showa-tv.webp'),
  'showa-mirrorball': require('../../assets/event-toki/goshuin/showa-mirrorball.webp'),
  'showa-record': require('../../assets/event-toki/goshuin/showa-record.webp'),
  'heisei-md': require('../../assets/event-toki/goshuin/heisei-md.webp'),
  'heisei-cd': require('../../assets/event-toki/goshuin/heisei-cd.webp'),
  'heisei-sticker': require('../../assets/event-toki/goshuin/heisei-sticker.webp'),
  'heisei-phs': require('../../assets/event-toki/goshuin/heisei-phs.webp'),
  'heisei-loose': require('../../assets/event-toki/goshuin/heisei-loose.webp'),
  'heisei-boots': require('../../assets/event-toki/goshuin/heisei-boots.webp'),
  'heisei-strap': require('../../assets/event-toki/goshuin/heisei-strap.webp'),
  'heisei-pager': require('../../assets/event-toki/goshuin/heisei-pager.webp'),
  'heisei-keitai': require('../../assets/event-toki/goshuin/heisei-park.webp'),
  'heisei-digicam': require('../../assets/event-toki/goshuin/heisei-century.webp'),
};
