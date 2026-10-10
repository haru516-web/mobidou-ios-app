import type { ImageSourcePropType } from 'react-native';

/** Artwork for the first event (assets/event-toki, see its MANIFEST.md). Keys are the spot ids in events.ts. */
export const EVENT_MAP_IMAGE: ImageSourcePropType = require('../../assets/event-toki/map.webp');
/** The picture for the event popup: Showa night to Heisei day, three friends walking (1024x1152). */
export const EVENT_KEY_VISUAL: ImageSourcePropType = require('../../assets/event-toki/key-visual.webp');
export const EVENT_BOOK_COVER: ImageSourcePropType = require('../../assets/event-toki/feel/book/event-book-cover.webp');
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

// GOSHUIN: the Japanese-style goshuin (washi, brush lettering, vermilion seal) with the event Mobbies standing in the scene (goshuin/mobby), all fifteen drawn.
// The gara-kei (heisei-keitai) is "放課後の公園ほこら" and the compact camera (heisei-digicam) is "世紀末の見晴らし社".
export const EVENT_GOSHUIN_IMAGES: Record<string, ImageSourcePropType> = {
  'showa-car': require('../../assets/event-toki/goshuin/mobby/showa-car.webp'),
  'showa-bike': require('../../assets/event-toki/goshuin/mobby/showa-bike.webp'),
  'showa-tv': require('../../assets/event-toki/goshuin/mobby/showa-tv.webp'),
  'showa-mirrorball': require('../../assets/event-toki/goshuin/mobby/showa-mirrorball.webp'),
  'showa-record': require('../../assets/event-toki/goshuin/mobby/showa-record.webp'),
  'heisei-md': require('../../assets/event-toki/goshuin/mobby/heisei-md.webp'),
  'heisei-cd': require('../../assets/event-toki/goshuin/mobby/heisei-cd.webp'),
  'heisei-sticker': require('../../assets/event-toki/goshuin/mobby/heisei-sticker.webp'),
  'heisei-phs': require('../../assets/event-toki/goshuin/mobby/heisei-phs.webp'),
  'heisei-loose': require('../../assets/event-toki/goshuin/mobby/heisei-loose.webp'),
  'heisei-boots': require('../../assets/event-toki/goshuin/mobby/heisei-boots.webp'),
  'heisei-strap': require('../../assets/event-toki/goshuin/mobby/heisei-strap.webp'),
  'heisei-pager': require('../../assets/event-toki/goshuin/mobby/heisei-pager.webp'),
  'heisei-keitai': require('../../assets/event-toki/goshuin/mobby/heisei-keitai.webp'),
  'heisei-digicam': require('../../assets/event-toki/goshuin/mobby/heisei-digicam.webp'),
};

/**
 * The event's own look (assets/event-toki/feel): same shapes and positions as the normal pictures, only the surface is the event's.
 * The gacha parts are in gachaArt.ts / gachaUiArt.ts.
 */
export const EVENT_FEEL = {
  scroll: require('../../assets/event-toki/feel/popup/event-scroll.webp'),
  detailBackground: require('../../assets/event-toki/feel/popup/event-detail-bg.webp'),
  sheetBackground: require('../../assets/event-toki/feel/sheet/event-sheet-bg.webp'),
  sheetHeader: require('../../assets/event-toki/feel/sheet/event-sheet-header.webp'),
  sectionPlate: require('../../assets/event-toki/feel/sheet/event-section-plate.webp'),
  ceremonyStage: require('../../assets/event-toki/feel/ceremony/event-ceremony-stage.webp'),
  ceremonyGate: require('../../assets/event-toki/feel/ceremony/event-ceremony-gate.webp'),
  outingBackground: require('../../assets/event-toki/feel/background/event-outing.webp'),
  bookBackground: require('../../assets/event-toki/feel/background/event-book-bg.webp'),
  collectionRoom: require('../../assets/event-toki/feel/background/event-collection-room.webp'),
  pageLeft: require('../../assets/event-toki/feel/book/event-page-left.webp'),
  pageRight: require('../../assets/event-toki/feel/book/event-page-right.webp'),
  bookCloth: require('../../assets/event-toki/feel/book/event-book-cloth.webp'),
} as const;
