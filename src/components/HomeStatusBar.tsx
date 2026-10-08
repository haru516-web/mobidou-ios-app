import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, Icon } from '../components';
import { Image } from './AppImage';
import { WashiPressable } from './Washi';
import { SlicedArt } from './SlicedArt';
import { PREMIUM_TAG_ICON } from '../data/premiumTagArt';

const STATUS_ICONS = {
  tickets: require('../../assets/ui-round6/icons/icon-gacha-tag.webp'),
  miniaturePasses: require('../../assets/ui-round3/tickets/ticket-keychain-drop-v2.webp'),

  plusPlan: require('../../assets/ui-round3/tickets/ticket-plus-plan-gold-v1.webp'),
};

export function HomeStatusBar({ tickets, premiumTickets, miniaturePasses, plusActive = false, show = 'both', onAddTickets, onAddPasses }: {
  tickets: number;
  /** Bought 木札, shown as its own badge on the shop's left side. */
  premiumTickets?: number;
  miniaturePasses: number;
  /** Plus plan running: the pass card takes "契約中" in place of its + (the plan cannot be bought twice). */
  plusActive?: boolean;
  /** 'both' is the home bar, where the pass card swaps on tap. The shop splits around its title: 'shopLeft' is the exchange tickets, 'shopRight' the tag count and the plan state. */
  show?: 'both' | 'shopLeft' | 'shopRight';
  /** The + inside each card: both lead to the purchase screen. */
  onAddTickets?: () => void;
  onAddPasses?: () => void;
}): React.JSX.Element {
  const badge = (label: string, count: number, icon: React.ReactNode, onAdd?: () => void, note?: string, onToggle?: () => void) => <View accessible={false} style={[S.badge, note ? S.badgeWide : null]}>
    <SlicedArt name="buttonSecondary" />
    <View style={S.content}>
      {onAdd && <WashiPressable plate="round" artwork={false} accessibilityRole="button" accessibilityLabel={label + 'を購入する'} onPress={onAdd} hitSlop={6} style={S.plus}><Icon name="add" size={13} color="#7f302d" /></WashiPressable>}
      <WashiPressable artwork={false} disabled={!onToggle} accessibilityRole={onToggle ? 'button' : 'text'} accessibilityLabel={note ? 'プラスプラン' + note : label + ' ' + count + '枚'} accessibilityHint={onToggle ? 'タップで引換券とプラスプランの表示を切り替えます' : undefined} onPress={onToggle} style={[S.valueTap, note ? S.valueLeft : S.value]}>{icon}{note ? <Text style={S.note}>{note}</Text> : <Text style={S.count}>{count}</Text>}</WashiPressable>
    </View>
  </View>;
  // Home: one card for 木札, プレミアム木札 and 交換券, side by side. It takes the room the two cards used to, and the whole card leads to the shop.
  const homeCard = <View accessible={false} style={S.homeCard}>
    <SlicedArt name="buttonSecondary" />
    <WashiPressable artwork={false} accessibilityRole="button" accessibilityLabel={`木札 ${tickets}枚、プレミアム木札 ${premiumTickets ?? 0}枚、交換券 ${miniaturePasses}枚。購入画面をひらく`} onPress={onAddTickets ?? onAddPasses} style={S.pair}>
      {([[STATUS_ICONS.tickets, tickets], [PREMIUM_TAG_ICON, premiumTickets ?? 0], [STATUS_ICONS.miniaturePasses, miniaturePasses]] as const).map(([source, count], index) => <View key={index} style={S.pairCell}><Image accessible={false} source={source} contentFit="contain" style={S.stackIcon} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={S.stackCount}>{count}</Text></View>)}
    </WashiPressable>
  </View>;
  return <View pointerEvents="box-none" style={S.bar}>
    {show === 'both' && homeCard}
    {show === 'shopRight' && badge('木札', tickets, <Image accessible={false} source={STATUS_ICONS.tickets} contentFit="contain" style={S.icon} />)}
    {show === 'shopRight' && badge('プラスプラン', 0, <Image accessible={false} source={STATUS_ICONS.plusPlan} contentFit="contain" style={S.icon} />, undefined, plusActive ? '契約中' : '未契約')}
    {show === 'shopLeft' && badge('交換券', miniaturePasses, <Image accessible={false} source={STATUS_ICONS.miniaturePasses} contentFit="contain" style={S.icon} />)}
    {show === 'shopLeft' && premiumTickets !== undefined && badge('プレミアム木札', premiumTickets, <Image accessible={false} source={PREMIUM_TAG_ICON} contentFit="contain" style={S.icon} />)}
  </View>;
}

const S = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 3, height: 40, flexShrink: 1 },
  badge: { width: 68, height: 40, justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 5, paddingRight: 5 },
  badgeWide: { width: 66 },
  valueTap: { minHeight: 36 },
  valueLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  note: { flex: 1, textAlign: 'center', color: '#7f302d', fontSize: 10, fontWeight: '700' },
  plus: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  value: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  stack: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 0 },
  homeCard: { width: 139, height: 40, justifyContent: 'center' },
  pair: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', gap: 0, paddingHorizontal: 6 },
  pairCell: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 1 },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stackIcon: { width: 22, height: 26 },
  stackCount: { color: C.ink, fontSize: 15, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  icon: { width: 18, height: 20 },
  count: { color: C.ink, fontSize: 13, fontVariant: ['tabular-nums'] },
});
