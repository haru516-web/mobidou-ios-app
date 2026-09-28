import type { ImageSourcePropType } from 'react-native';

/**
 * Artwork slots for the floating pop buttons. Every entry is `null` for now,
 * which draws the simple placeholder button. When the dedicated images are
 * generated, drop them in `assets/pop-buttons/` and point the entry at them,
 * e.g. `bookIndex: require('../../assets/pop-buttons/book-index.webp')`.
 * Square images (~240×240, transparent background) fit best; the label is
 * still drawn underneath by PopButton.
 */
export const POP_BUTTON_IDS = [
  'bookIndex', 'routeChange',
  'walkRefresh', 'walkMap',
  'collectionGoshuin', 'collectionMiniature', 'collectionPasses',
  'mobbyCharacter', 'mobbyNotifications', 'mobbyPresents', 'mobbyFriends',
] as const;

export type PopButtonId = (typeof POP_BUTTON_IDS)[number];

export const POP_BUTTON_IMAGES: Record<PopButtonId, ImageSourcePropType | null> = {
  bookIndex: null,
  routeChange: null,
  walkRefresh: null,
  walkMap: null,
  collectionGoshuin: null,
  collectionMiniature: null,
  collectionPasses: null,
  mobbyCharacter: null,
  mobbyNotifications: null,
  mobbyPresents: null,
  mobbyFriends: null,
};
