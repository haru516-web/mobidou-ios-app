import type { ImageSourcePropType } from 'react-native';

/** Washi seal artwork for the floating pop buttons (512x512, transparent; the label is drawn by PopButton). */
export const POP_BUTTON_IDS = [
  'bookIndex', 'routeChange',
  'walkMap',
  'collectionRoom', 'collectionGoshuin', 'collectionMiniature', 'collectionPasses',
  'mobbyCharacter', 'mobbyNotifications', 'mobbyPresents', 'mobbyFriends',
] as const;

export type PopButtonId = (typeof POP_BUTTON_IDS)[number];

export const POP_BUTTON_IMAGES: Record<PopButtonId, ImageSourcePropType | null> = {
  bookIndex: require('../../assets/pop-buttons/book-index.webp'),
  routeChange: require('../../assets/pop-buttons/route-change.webp'),
  walkMap: require('../../assets/pop-buttons/walk-map.webp'),
  collectionRoom: require('../../assets/pop-buttons/collection-room.webp'),
  collectionGoshuin: require('../../assets/pop-buttons/collection-goshuin.webp'),
  collectionMiniature: require('../../assets/pop-buttons/collection-miniature.webp'),
  collectionPasses: require('../../assets/pop-buttons/collection-passes.webp'),
  mobbyCharacter: require('../../assets/pop-buttons/mobby-character.webp'),
  mobbyNotifications: require('../../assets/pop-buttons/mobby-notifications.webp'),
  mobbyPresents: require('../../assets/pop-buttons/mobby-presents.webp'),
  mobbyFriends: require('../../assets/pop-buttons/mobby-friends.webp'),
};
