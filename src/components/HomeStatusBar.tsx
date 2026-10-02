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

export function HomeStatusBar({ tickets, miniaturePasses, onPressTickets, onPressPasses }: {
  tickets: number;
  miniaturePasses: number;
  onPressTickets?: () => void;
  onPressPasses?: () => void;
}): React.JSX.Element {
  const badge = (label: string, count: number, icon: React.ReactNode, onPress?: () => void, wide = false) => {
    const content = <View pointerEvents="none" style={S.content}>{icon}<Text style={S.count}>{count}</Text></View>;
    const style = [S.badge, wide && S.wide];
    return onPress
      ? <WashiPressable plate="secondary" style={style} accessibilityRole="button" accessibilityLabel={label + ' ' + count + '枚'} onPress={onPress}>{content}</WashiPressable>
      : <View pointerEvents="none" accessible accessibilityRole="text" accessibilityLabel={label + ' ' + count + '枚'} style={style}><SlicedArt name="buttonSecondary" />{content}</View>;
  };
  return <View pointerEvents="box-none" style={S.bar}>
    {badge('木札', tickets, <Icon name={STATUS_ICONS.tickets} size={16} color={C.ink} />, onPressTickets)}
    {badge('ミニチュアパス', miniaturePasses, <Image accessible={false} source={STATUS_ICONS.miniaturePasses} contentFit="contain" style={S.icon} />, onPressPasses, true)}
  </View>;
}

const S = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 4, height: 40, flexShrink: 1 },
  badge: { width: 64, height: 40, justifyContent: 'center' },
  wide: { width: 64 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 5 },
  icon: { width: 18, height: 22 },
  label: { color: C.ink, fontFamily: 'Shippori', fontSize: 10, flexShrink: 1 },
  count: { color: C.ink, fontSize: 13, fontVariant: ['tabular-nums'] },
});
