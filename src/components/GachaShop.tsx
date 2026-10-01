import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BRUSH, Button, SERIF } from '../components';
import { SHOP_PRODUCTS, type ShopProduct } from '../data/shop';

type Props = {
  /** Start a purchase. Omit while the App Store connection is not available: the buttons then say so. */
  onBuy?: (product: ShopProduct) => void;
};

/** The shop tab of the gacha screen: single and five pulls, and the monthly plans. */
export function GachaShop({ onBuy }: Props) {
  const group = (kind: ShopProduct['kind'], heading: string) => <View style={S.group}>
    <Text accessibilityRole="header" style={S.heading}>{heading}</Text>
    {SHOP_PRODUCTS.filter(product => product.kind === kind).map(product => <View key={product.id} style={S.card}>
      <View style={S.cardText}>
        <Text style={S.title}>{product.title}</Text>
        <Text style={S.detail}>{product.detail}</Text>
      </View>
      <View style={S.buy}>
        <Text style={S.price}>{product.price}</Text>
        <Button title={onBuy ? '購入' : '準備中'} disabled={!onBuy} onPress={() => onBuy?.(product)} style={S.button} />
      </View>
    </View>)}
  </View>;
  return <View style={S.root}>
    {group('pull', 'ご縁を迎える')}
    {group('plan', '月ごとのプラン')}
  </View>;
}

const S = StyleSheet.create({
  root: { gap: 14, width: '100%', maxWidth: 380, alignSelf: 'center' },
  group: { gap: 8 },
  heading: { alignSelf: 'flex-start', color: '#F6D9A3', fontFamily: SERIF, fontSize: 13, letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: '#211A13D9' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#211A13D9', borderWidth: 1, borderColor: '#6B5A3F' },
  cardText: { flex: 1, gap: 3 },
  title: { color: '#FFF8E9', fontFamily: BRUSH, fontSize: 18 },
  detail: { color: '#D5BD98', fontSize: 11, lineHeight: 16 },
  buy: { alignItems: 'center', gap: 6 },
  price: { color: '#FFF5E2', fontFamily: SERIF, fontSize: 14 },
  button: { minWidth: 84 },
});
