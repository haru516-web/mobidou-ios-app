import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, Icon } from '../components';
import { Image } from './AppImage';
import { WashiPressable } from './Washi';
import { SlicedArt } from './SlicedArt';

const STATUS_ICONS = {
  tickets: require('../../assets/ui-round6/icons/icon-gacha-tag.webp'),
  miniaturePasses: require('../../assets/ui-round3/tickets/ticket-keychain-drop-v2.webp'),
  // Placeholder until the gold plus-plan ticket is delivered (docs/codex-plus-plan-ticket.md).
  plusPlan: require('../../assets/ui-round3/tickets/ticket-keychain-drop-v2.webp'),
};

export function HomeStatusBar({ tickets, miniaturePasses, plusActive = false, show = 'both', onAddTickets, onAddPasses }: {
  tickets: number;
  miniaturePasses: number;
  /** Plus plan running: the pass card takes "契約中" in place of its + (the plan cannot be bought twice). */
  plusActive?: boolean;
  /** Which cards to draw: the shop moves the ticket card to the other side of its title. */
  show?: 'both' | 'tickets' | 'passes';
  /** The + inside each card: both lead to the purchase screen. */
  onAddTickets?: () => void;
  onAddPasses?: () => void;
}): React.JSX.Element {
  // Tapping the pass card swaps the exchange-ticket count and the plus-plan state.
  const [plusView, setPlusView] = useState(false);
  const badge = (label: string, count: number, icon: React.ReactNode, onAdd?: () => void, note?: string, onToggle?: () => void) => <View accessible={false} style={[S.badge, note ? S.badgeWide : null]}>
    <SlicedArt name="buttonSecondary" />
    <View style={S.content}>
      {onAdd && <WashiPressable plate="round" artwork={false} accessibilityRole="button" accessibilityLabel={label + 'を購入する'} onPress={onAdd} hitSlop={6} style={S.plus}><Icon name="add" size={13} color="#7f302d" /></WashiPressable>}
      <WashiPressable artwork={false} disabled={!onToggle} accessibilityRole={onToggle ? 'button' : 'text'} accessibilityLabel={note ? 'プラスプラン' + note : label + ' ' + count + '枚'} accessibilityHint={onToggle ? 'タップで引換券とプラスプランの表示を切り替えます' : undefined} onPress={onToggle} style={[S.valueTap, note ? S.valueLeft : S.value]}>{icon}{note ? <Text style={S.note}>{note}</Text> : <Text style={S.count}>{count}</Text>}</WashiPressable>
    </View>
  </View>;
  return <View pointerEvents="box-none" style={S.bar}>
    {show !== 'passes' && badge('木札', tickets, <Image accessible={false} source={STATUS_ICONS.tickets} contentFit="contain" style={S.icon} />, onAddTickets)}
    {show !== 'tickets' && (plusView
      ? badge('プラスプラン', 0, <Image accessible={false} source={STATUS_ICONS.plusPlan} contentFit="contain" style={S.icon} />, undefined, plusActive ? '契約中' : '未契約', () => setPlusView(false))
      : badge('交換券', miniaturePasses, <Image accessible={false} source={STATUS_ICONS.miniaturePasses} contentFit="contain" style={S.icon} />, plusActive ? undefined : onAddPasses, undefined, () => setPlusView(true)))}
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
  icon: { width: 18, height: 20 },
  count: { color: C.ink, fontSize: 13, fontVariant: ['tabular-nums'] },
});
