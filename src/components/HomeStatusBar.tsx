import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, Icon } from '../components';
import { Image } from './AppImage';
import { WashiPressable } from './Washi';
import { SlicedArt } from './SlicedArt';

// Replace these placeholders here when the dedicated ticket artwork is ready.
const STATUS_ICONS = {
  tickets: 'pricetag-outline' as const,
  miniaturePasses: require('../../assets/ui-round3/tickets/ticket-keychain-drop-v2.webp'),
};

export function HomeStatusBar({ tickets, miniaturePasses, onAddTickets, onAddPasses }: {
  tickets: number;
  miniaturePasses: number;
  /** The + inside each card: both lead to the purchase screen. */
  onAddTickets?: () => void;
  onAddPasses?: () => void;
}): React.JSX.Element {
  const badge = (label: string, count: number, icon: React.ReactNode, onAdd?: () => void) => <View accessible={false} style={S.badge}>
    <SlicedArt name="buttonSecondary" />
    <View style={S.content}>
      {onAdd && <WashiPressable plate="round" artwork={false} accessibilityRole="button" accessibilityLabel={label + 'を購入する'} onPress={onAdd} hitSlop={6} style={S.plus}><Icon name="add" size={14} color="#7f302d" /></WashiPressable>}
      <View accessible accessibilityRole="text" accessibilityLabel={label + ' ' + count + '枚'} style={S.value}>{icon}<Text style={S.count}>{count}</Text></View>
    </View>
  </View>;
  return <View pointerEvents="box-none" style={S.bar}>
    {badge('木札', tickets, <Icon name={STATUS_ICONS.tickets} size={16} color={C.ink} />, onAddTickets)}
    {badge('交換券', miniaturePasses, <Image accessible={false} source={STATUS_ICONS.miniaturePasses} contentFit="contain" style={S.icon} />, onAddPasses)}
  </View>;
}

const S = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 4, height: 40, flexShrink: 1 },
  badge: { width: 82, height: 40, justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 6, paddingRight: 8 },
  plus: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  value: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  icon: { width: 18, height: 22 },
  count: { color: C.ink, fontSize: 13, fontVariant: ['tabular-nums'] },
});
