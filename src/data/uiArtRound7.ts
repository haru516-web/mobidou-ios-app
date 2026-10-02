// Round 7 art for the notification / present / friend sheets. Fixed edge widths are source pixels (see assets/ui-round7/MANIFEST.md).
import type { UiArt } from './uiArt';

const strip = (source: number, width: number, height: number, left: number, right: number): UiArt => ({ source, width, height, box: { x0: 0, x1: width, y0: 0, y1: height }, slice: { left, right } });

export const UI_ART7 = {
  sheetHeader: strip(require('../../assets/ui-round7/sheet/sheet-header-v1.webp'), 1536, 192, 96, 96),
  sectionPlate: strip(require('../../assets/ui-round7/sheet/section-plate-v1.webp'), 480, 72, 36, 36),
  noticeStrip: strip(require('../../assets/ui-round7/ui/notice-strip-v1.webp'), 960, 120, 48, 48),
  buttonSmall: strip(require('../../assets/ui-round7/ui/button-small-v1.webp'), 320, 96, 40, 40),
  buttonSmallPressed: strip(require('../../assets/ui-round7/ui/button-small-pressed-v1.webp'), 320, 96, 40, 40),
  itemRow: strip(require('../../assets/ui-round7/gift/item-row-v1.webp'), 960, 128, 48, 48),
  codePlate: strip(require('../../assets/ui-round7/friend/code-plate-v1.webp'), 960, 160, 72, 40),
} as const;

export const IMG7 = {
  sheetBg: require('../../assets/ui-round7/sheet/sheet-bg-v1.webp'),
  emptyNotices: require('../../assets/ui-round7/empty/empty-notices-v1.webp'),
  emptyGifts: require('../../assets/ui-round7/empty/empty-gifts-v1.webp'),
  emptyFriends: require('../../assets/ui-round7/empty/empty-friends-v1.webp'),
  noticeTodo: require('../../assets/ui-round7/notice/notice-todo-v1.webp'),
  noticeStatus: require('../../assets/ui-round7/notice/notice-status-v1.webp'),
  noticeEvent: require('../../assets/ui-round7/notice/notice-event-v1.webp'),
  unreadDot: require('../../assets/ui-round7/notice/unread-dot-v1.webp'),
  giftHeader: require('../../assets/ui-round7/gift/gift-header-v1.webp'),
  stampReceived: require('../../assets/ui-round7/gift/stamp-received-v1.webp'),
  avatarRing: require('../../assets/ui-round7/friend/avatar-ring-v1.webp'),
} as const;
