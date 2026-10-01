import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from './AppImage';
import { BRUSH, Button, SERIF } from '../components';
import { SHOP_GROUPS, SHOP_PRODUCTS, type ShopProduct } from '../data/shop';
import { GACHA_UI_ART, SHOP_PRODUCT_ART } from '../data/gachaUiArt';
import { SlicedArt } from './SlicedArt';

type Props = {
  /** Start a purchase. Omit while the App Store connection is not available: the buttons then say so. */
  onBuy?: (product: ShopProduct) => void;
};

/** The shop tab of the gacha screen: single and five pulls, and the monthly plans. */
export function GachaShop({ onBuy }: Props) {
  const group = ({ kind, heading, summary }: typeof SHOP_GROUPS[number]) => <View key={kind} style={S.group}>
    <View style={S.headingPlate}>
      <SlicedArt art={GACHA_UI_ART.shopHeading} />
      <Text accessibilityRole="header" style={S.heading}>{heading}</Text>
    </View>
    <Text style={S.summary}>{summary}</Text>
    {SHOP_PRODUCTS.filter(product => product.kind === kind).map(product => <View key={product.id} style={S.card}>
      <SlicedArt art={GACHA_UI_ART.shopCard} corner={22} />
      <Image accessible={false} source={SHOP_PRODUCT_ART[product.id]} contentFit="contain" style={S.art} />
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
    {SHOP_GROUPS.map(group)}
  </View>;
}

const S = StyleSheet.create({
  root: { gap: 10, width: '100%', maxWidth: 380, alignSelf: 'center' },
  group: { gap: 6 },
  summary: { color: '#FFF8E9', fontSize: 12, lineHeight: 17, paddingHorizontal: 4, textShadowColor: '#000000CC', textShadowRadius: 5 },
  headingPlate: { alignSelf: 'flex-start', minHeight: 30, paddingHorizontal: 18, justifyContent: 'center' },
  heading: { color: '#6B3A2A', fontFamily: SERIF, fontSize: 13, letterSpacing: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingLeft: 18, paddingRight: 16 },
  art: { width: 52, height: 52 },
  cardText: { flex: 1, gap: 3 },
  title: { color: '#FFF8E9', fontFamily: BRUSH, fontSize: 18 },
  detail: { color: '#D5BD98', fontSize: 11, lineHeight: 16 },
  buy: { alignItems: 'center', gap: 6 },
  price: { color: '#FFF5E2', fontFamily: SERIF, fontSize: 14 },
  button: { minWidth: 84 },
});
