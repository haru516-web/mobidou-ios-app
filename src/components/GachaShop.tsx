import React, { useState } from 'react';
import { Linking } from 'react-native';
import { SERVER_URL } from '../services/server';
import { playSfx } from '../services/audio';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from './AppImage';
import { BRUSH, Button, SERIF } from '../components';
import { SHOP_GROUPS, SHOP_PRODUCTS, type ShopProduct } from '../data/shop';
import { GACHA_UI_ART, SHOP_PRODUCT_ART } from '../data/gachaUiArt';
import { SlicedArt } from './SlicedArt';

/** The ordinary miniature pass picture, the same one the pass balance on the home screen uses. */
const WEEKLY_PASS_ART = require('../../assets/ui-round3/tickets/ticket-keychain-drop-v2.webp');

const weeklyText = (available: boolean) => available
  ? '1週間に1回、無料でもらえます。ふつうのミニチュア交換券です。'
  : '今週の分は受け取りました。次は来週の月曜日にもらえます。';

type Props = {
  /** Tickets owed back after a refund: the next purchase pays this off first. */
  refundDebt?: number;
  /** Start a purchase. Omit while the App Store connection is not available: the buttons then say so. */
  onBuy?: (product: ShopProduct) => void;
  /** The plus plan is running: its card says so and cannot be bought again. */
  plusActive?: boolean;
  /** The free weekly miniature pass shown under the plan: open to take, or already taken this week. */
  weeklyPass?: { available: boolean; onClaim: () => void };
  /** Restore purchases (required for subscriptions). */
  onRestore?: () => void;
  /** The App Store's own price text for each product, which replaces the fixed one when it is known. */
  priceLabels?: Partial<Record<ShopProduct['id'], string>>;
};

/** The shop tab of the gacha screen: single and five pulls, and the monthly plans. */
export function GachaShop({ onBuy, onRestore, refundDebt = 0, plusActive = false, priceLabels, weeklyPass }: Props) {
  /** The card shown enlarged, or null. */
  const [detail, setDetail] = useState<ShopProduct['id'] | 'weekly' | null>(null);
  const purchase = (product: ShopProduct) => { playSfx('sfx_shop_buy'); setDetail(null); onBuy?.(product); };
  const detailProduct = detail && detail !== 'weekly' ? SHOP_PRODUCTS.find(product => product.id === detail) : undefined;
  const enlarged = detailProduct
    ? { art: SHOP_PRODUCT_ART[detailProduct.id], title: detailProduct.title, body: detailProduct.detail, price: priceLabels?.[detailProduct.id] ?? detailProduct.price }
    : detail === 'weekly' && weeklyPass ? { art: WEEKLY_PASS_ART, title: 'ミニチュア交換券', body: weeklyText(weeklyPass.available), price: '無料' } : null;
  const enlargedAction = () => {
    if (detail === 'weekly' && weeklyPass) {
      return weeklyPass.available
        ? <Button soundless title="受け取る" onPress={() => { playSfx('sfx_shop_buy'); setDetail(null); weeklyPass.onClaim(); }} style={S.bigButton} />
        : <View accessible accessibilityRole="text" accessibilityLabel="今週の分は受け取り済み" style={S.activePlate}><SlicedArt name="buttonSecondary" /><Text style={S.active}>受取済み</Text></View>;
    }
    if (!detailProduct) return null;
    if (detailProduct.id === 'plus' && plusActive) return <View accessible accessibilityRole="text" accessibilityLabel="プラスプラン契約中" style={S.activePlate}><SlicedArt name="buttonSecondary" /><Text style={S.active}>契約中</Text></View>;
    return <Button soundless title={onBuy ? '購入' : '準備中'} disabled={!onBuy} onPress={() => purchase(detailProduct)} style={S.bigButton} />;
  };
  const group = ({ kind, heading, summary }: typeof SHOP_GROUPS[number]) => <View key={kind} style={S.group}>
    <View style={S.headingPlate}>
      <SlicedArt art={GACHA_UI_ART.shopHeading} />
      <Text accessibilityRole="header" style={S.heading}>{heading}</Text>
    </View>
    <Text style={S.summary}>{summary}</Text>
    {SHOP_PRODUCTS.filter(product => product.kind === kind).map(product => <View key={product.id} style={S.card}>
      <SlicedArt art={GACHA_UI_ART.shopCard} corner={22} />
      <Pressable accessibilityRole="button" accessibilityLabel={product.title + 'の詳細を見る'} onPress={() => setDetail(product.id)} style={StyleSheet.absoluteFill} />
      <Image accessible={false} pointerEvents="none" source={SHOP_PRODUCT_ART[product.id]} contentFit="contain" style={S.art} />
      <View pointerEvents="none" style={S.cardText}>
        <Text style={S.title}>{product.title}</Text>
        <Text style={S.detail}>{product.detail}</Text>
      </View>
      {product.id === 'plus' && plusActive
        ? <View accessible accessibilityRole="text" accessibilityLabel="プラスプラン契約中" style={S.buy}><View style={S.activePlate}><SlicedArt name="buttonSecondary" /><Text style={S.active}>契約中</Text></View></View>
        : <View style={S.buy}>
          <Text style={S.price}>{priceLabels?.[product.id] ?? product.price}</Text>
          <Button soundless title={onBuy ? '購入' : '準備中'} disabled={!onBuy} onPress={() => { playSfx('sfx_shop_buy'); onBuy?.(product); }} style={S.button} />
        </View>}
    </View>)}
  </View>;
  const weekly = ({ available, onClaim }: NonNullable<Props['weeklyPass']>) => <View key="weekly" style={S.group}>
    <View style={S.headingPlate}>
      <SlicedArt art={GACHA_UI_ART.shopHeading} />
      <Text accessibilityRole="header" style={S.heading}>毎週の無料プレゼント</Text>
    </View>
    <View style={S.card}>
      <SlicedArt art={GACHA_UI_ART.shopCard} corner={22} />
      <Pressable accessibilityRole="button" accessibilityLabel="ミニチュア交換券の詳細を見る" onPress={() => setDetail('weekly')} style={StyleSheet.absoluteFill} />
      <Image accessible={false} pointerEvents="none" source={WEEKLY_PASS_ART} contentFit="contain" style={S.art} />
      <View pointerEvents="none" style={S.cardText}>
        <Text style={S.title}>ミニチュア交換券</Text>
        <Text style={S.detail}>{weeklyText(available)}</Text>
      </View>
      {available
        ? <View style={S.buy}><Button soundless title="受け取る" onPress={() => { playSfx('sfx_shop_buy'); onClaim(); }} style={S.button} /></View>
        : <View accessible accessibilityRole="text" accessibilityLabel="今週の分は受け取り済み" style={S.buy}><View style={S.activePlate}><SlicedArt name="buttonSecondary" /><Text style={S.active}>受取済み</Text></View></View>}
    </View>
  </View>;
  const enlargedView = enlarged && <Modal transparent animationType="fade" visible onRequestClose={() => setDetail(null)}>
    <Pressable accessible={false} onPress={() => setDetail(null)} style={S.backdrop}>
      <Pressable accessible={false} onPress={() => undefined} style={S.sheet}>
        <SlicedArt art={GACHA_UI_ART.shopCard} corner={22} />
        <Image accessible={false} source={enlarged.art} contentFit="contain" style={S.bigArt} />
        <Text accessibilityRole="header" style={S.bigTitle}>{enlarged.title}</Text>
        <Text style={S.bigDetail}>{enlarged.body}</Text>
        <Text style={S.bigPrice}>{enlarged.price}</Text>
        {enlargedAction()}
        <Text accessibilityRole="button" onPress={() => setDetail(null)} style={S.close}>閉じる</Text>
      </Pressable>
    </Pressable>
  </Modal>;
  return <View style={S.root}>
    {refundDebt > 0 && <Text accessibilityLiveRegion="polite" style={S.debtNote}>返金があったため、木札{refundDebt}枚分は、次にご購入の木札から差し引かれます。差し引きが終わるまで、購入した木札は手元に増えません。</Text>}
    {enlargedView}
    {SHOP_GROUPS.map(item => item.kind === 'plan' && weeklyPass ? <React.Fragment key={item.kind}>{group(item)}{weekly(weeklyPass)}</React.Fragment> : group(item))}
    <View style={S.notePlate}>
      <SlicedArt art={GACHA_UI_ART.shopCard} corner={22} />
      <Text style={S.fineprint}>プラスプランは月{priceLabels?.plus ?? '300円'}の自動更新です。お支払いはApple IDに請求され、期間の終了の24時間前までに解約しない限り、自動で更新されます。解約は、iPhoneの「設定」のApple ID、サブスクリプションからできます。</Text>
      <Text style={S.fineprint}>
        {onRestore && <Text accessibilityRole="button" onPress={onRestore} style={S.underline}>購入を復元する</Text>}
        {onRestore && '　/　'}
        <Text accessibilityRole="link" onPress={() => void Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').catch(() => undefined)} style={S.underline}>利用規約（Apple標準）</Text>
      </Text>
      <Text style={S.fineprint}>
        <Text accessibilityRole="link" onPress={() => void Linking.openURL(`${SERVER_URL}/privacy`).catch(() => undefined)} style={S.underline}>プライバシーポリシー</Text>
        {'　/　'}
        <Text accessibilityRole="link" onPress={() => void Linking.openURL(`${SERVER_URL}/legal`).catch(() => undefined)} style={S.underline}>特定商取引法に基づく表記</Text>
      </Text>
    </View>
  </View>;
}

const S = StyleSheet.create({
  debtNote: { color: '#FFF8E9', fontSize: 12, lineHeight: 18, paddingHorizontal: 8, textShadowColor: '#000000CC', textShadowRadius: 5 },
  notePlate: { gap: 6, paddingVertical: 12, paddingHorizontal: 20 },
  fineprint: { color: '#F1E3C8', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  underline: { textDecorationLine: 'underline' },
  legalLink: { color: '#D5BD98', fontSize: 12, textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 6 },
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
  activePlate: { minWidth: 84, minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  active: { color: '#A54E42', fontFamily: BRUSH, fontSize: 14, letterSpacing: 1 },
  button: { minWidth: 84 },
  backdrop: { flex: 1, backgroundColor: '#000000B3', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 340, alignItems: 'center', gap: 10, paddingVertical: 22, paddingHorizontal: 22 },
  bigArt: { width: 220, height: 280 },
  bigTitle: { color: '#FFF8E9', fontFamily: BRUSH, fontSize: 24, textAlign: 'center' },
  bigDetail: { color: '#D5BD98', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  bigPrice: { color: '#FFF5E2', fontFamily: SERIF, fontSize: 18 },
  bigButton: { minWidth: 160 },
  close: { color: '#D5BD98', fontSize: 13, textDecorationLine: 'underline', paddingVertical: 6 },
});
