import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { BRUSH, Button, C } from '../components';
import { GACHA_UI_ART } from '../data/gachaUiArt';
import { Image } from './AppImage';
import { WashiPressable } from './Washi';
import { SlicedArt } from './SlicedArt';
import { PREMIUM_TAG_ICON } from '../data/premiumTagArt';

const STATUS_ICONS = {
  tickets: require('../../assets/ui-round6/icons/icon-gacha-tag.webp'),
  miniaturePasses: require('../../assets/ui-round3/tickets/ticket-keychain-drop-v2.webp'),

  plusPlan: require('../../assets/ui-round3/tickets/ticket-plus-plan-gold-v1.webp'),
};

export function HomeStatusBar({ tickets, premiumTickets, miniaturePasses, plusActive = false, show = 'both', onAddTickets, onAddPasses, onOpenShop }: {
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
  /** The button at the foot of the count popup: lead to the purchase screen. Left out when the person is already there. */
  onOpenShop?: () => void;
}): React.JSX.Element {
  /** The item whose count is shown in the popup. */
  const [shown, setShown] = useState<{ label: string; source: ImageSourcePropType; value: string } | 'all' | null>(null);
  const homeItems = [['木札', STATUS_ICONS.tickets, tickets], ['プレミアム木札', PREMIUM_TAG_ICON, premiumTickets ?? 0], ['ミニチュア交換券', STATUS_ICONS.miniaturePasses, miniaturePasses]] as const;
  const goShop = onOpenShop ?? (show === 'both' ? (onAddTickets ?? onAddPasses) : undefined);
  const close = () => setShown(null);
  const badge = (label: string, count: number, source: ImageSourcePropType, note?: string) => <View accessible={false} style={[S.badge, note ? S.badgeWide : null]}>
    <SlicedArt name="buttonSecondary" />
    <View style={S.content}>
      <WashiPressable artwork={false} accessibilityRole="button" accessibilityLabel={(note ? label + note : label + ' ' + count + '枚') + '。所持数を見る'} onPress={() => setShown({ label, source, value: note ?? count + '枚' })} style={[S.valueTap, note ? S.valueLeft : S.value]}>
        <Image accessible={false} source={source} contentFit="contain" style={S.icon} />
        {note ? <Text style={S.note}>{note}</Text> : <Text style={S.count}>{count}</Text>}
      </WashiPressable>
    </View>
  </View>;
  // Home: one card for 木札, プレミアム木札 and 交換券, side by side. It takes the room the two cards used to, and the whole card leads to the shop.
  const homeCard = <View accessible={false} style={S.homeCard}>
    <SlicedArt name="buttonSecondary" />
    <WashiPressable artwork={false} accessibilityRole="button" accessibilityLabel={homeItems.map(([label, , count]) => label + ' ' + count + '枚').join('、') + '。所持数を見る'} onPress={() => setShown('all')} style={S.pair}>
      {homeItems.map(([label, source, count]) => <View key={label} style={S.pairCell}>
        <Image accessible={false} source={source} contentFit="contain" style={S.stackIcon} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={S.stackCount}>{count}</Text>
      </View>)}
    </WashiPressable>
  </View>;
  return <View pointerEvents="box-none" style={S.bar}>
    {show === 'both' && homeCard}
    {show === 'shopRight' && badge('木札', tickets, STATUS_ICONS.tickets)}
    {show === 'shopRight' && badge('プラスプラン', 0, STATUS_ICONS.plusPlan, plusActive ? '契約中' : '未契約')}
    {show === 'shopLeft' && badge('ミニチュア交換券', miniaturePasses, STATUS_ICONS.miniaturePasses)}
    {show === 'shopLeft' && premiumTickets !== undefined && badge('プレミアム木札', premiumTickets, PREMIUM_TAG_ICON)}
    {shown && <Modal transparent animationType="fade" visible onRequestClose={close}>
      <Pressable accessible={false} onPress={close} style={S.backdrop}>
        <Pressable accessible={false} onPress={() => undefined} style={S.sheet}>
          <SlicedArt art={GACHA_UI_ART.shopCard} corner={22} />
          {shown === 'all'
            ? <>
              <Text accessibilityRole="header" style={S.popLabel}>所持数</Text>
              <View style={S.popList}>
                {homeItems.map(([label, source, count]) => <View key={label} style={S.popRow}>
                  <Image accessible={false} source={source} contentFit="contain" style={S.popRowIcon} />
                  <Text style={S.popRowLabel}>{label}</Text>
                  <Text style={S.popRowValue}>{count}<Text style={S.popUnit}> 枚</Text></Text>
                </View>)}
              </View>
            </>
            : <>
              <Image accessible={false} source={shown.source} contentFit="contain" style={S.popIcon} />
              <Text accessibilityRole="header" style={S.popLabel}>{shown.label}</Text>
              <Text accessibilityLiveRegion="polite" style={S.popValue}>{shown.value}</Text>
            </>}
          {goShop && <Button soundless title="購入画面へ" onPress={() => { close(); goShop(); }} style={S.popButton} />}
          <Text accessibilityRole="button" onPress={close} style={S.popClose}>閉じる</Text>
        </Pressable>
      </Pressable>
    </Modal>}
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
  pairCell: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 1 },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stackIcon: { width: 22, height: 26 },
  stackCount: { color: C.ink, fontFamily: 'ShipporiBold', fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  icon: { width: 18, height: 20 },
  count: { color: C.ink, fontFamily: 'ShipporiBold', fontSize: 13, fontVariant: ['tabular-nums'] },
  backdrop: { flex: 1, backgroundColor: '#000000B3', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 300, alignItems: 'center', gap: 10, paddingVertical: 24, paddingHorizontal: 22 },
  popIcon: { width: 72, height: 80 },
  popLabel: { color: '#FFF8E9', fontFamily: BRUSH, fontSize: 22, textAlign: 'center' },
  popValue: { color: '#FFF5E2', fontFamily: 'ShipporiBold', fontSize: 34, fontVariant: ['tabular-nums'] },
  popList: { alignSelf: 'stretch', gap: 10, paddingVertical: 6 },
  popRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
  popRowIcon: { width: 30, height: 34 },
  popRowLabel: { flex: 1, color: '#FFF8E9', fontFamily: 'Shippori', fontSize: 15 },
  popRowValue: { color: '#FFF5E2', fontFamily: 'ShipporiBold', fontSize: 26, fontVariant: ['tabular-nums'] },
  popUnit: { color: '#D5BD98', fontFamily: 'Shippori', fontSize: 13 },
  popButton: { minWidth: 170, marginTop: 6 },
  popClose: { color: '#D5BD98', fontSize: 13, textDecorationLine: 'underline', paddingVertical: 6 },
});
