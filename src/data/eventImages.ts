import type { ImageSourcePropType } from 'react-native';

/** Artwork for the first event (assets/event-toki, see its MANIFEST.md). Keys are the spot ids in events.ts. */
export const EVENT_MAP_IMAGE: ImageSourcePropType = require('../../assets/event-toki/map.webp');
export const EVENT_BOOK_COVER: ImageSourcePropType = require('../../assets/event-toki/book-cover.webp');
export const EVENT_TICKET_IMAGE: ImageSourcePropType = require('../../assets/event-toki/ticket-event-tag.webp');

export const EVENT_GOSHUIN_IMAGES: Record<string, ImageSourcePropType> = {
  'showa-shoutengai': require('../../assets/event-toki/goshuin/showa-shoutengai.webp'),
  'showa-toge': require('../../assets/event-toki/goshuin/showa-toge.webp'),
  'showa-drivein': require('../../assets/event-toki/goshuin/showa-drivein.webp'),
  'showa-sento': require('../../assets/event-toki/goshuin/showa-sento.webp'),
  'showa-record': require('../../assets/event-toki/goshuin/showa-record.webp'),
  'heisei-park': require('../../assets/event-toki/goshuin/heisei-park.webp'),
  'heisei-pager': require('../../assets/event-toki/goshuin/heisei-pager.webp'),
  'heisei-century': require('../../assets/event-toki/goshuin/heisei-century.webp'),
};

export const EVENT_KEYCHAIN_IMAGES: Record<string, ImageSourcePropType> = {
  'showa-shoutengai': require('../../assets/event-toki/keychains/keychain-showa-shoutengai-v1-transparent.webp'),
  'showa-toge': require('../../assets/event-toki/keychains/keychain-showa-toge-v1-transparent.webp'),
  'showa-drivein': require('../../assets/event-toki/keychains/keychain-showa-drivein-v1-transparent.webp'),
  'showa-sento': require('../../assets/event-toki/keychains/keychain-showa-sento-v1-transparent.webp'),
  'showa-record': require('../../assets/event-toki/keychains/keychain-showa-record-v1-transparent.webp'),
  'heisei-park': require('../../assets/event-toki/keychains/keychain-heisei-park-v1-transparent.webp'),
  'heisei-pager': require('../../assets/event-toki/keychains/keychain-heisei-pager-v1-transparent.webp'),
  'heisei-century': require('../../assets/event-toki/keychains/keychain-heisei-century-v1-transparent.webp'),
};
