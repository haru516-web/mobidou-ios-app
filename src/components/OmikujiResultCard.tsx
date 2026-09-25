import React from 'react';
import { ImageBackground, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { categoriesForFortune, type OmikujiFortune } from '../data/omikuji';

const OMIKUJI_RESULT_BACKGROUND = require('../../assets/omikuji/omikuji-result-paper-v2.png');

export function OmikujiResultCard({ fortune, brushTextStyle }: { fortune: OmikujiFortune; brushTextStyle?: TextStyle }) {
  return <ImageBackground source={OMIKUJI_RESULT_BACKGROUND} resizeMode="cover" imageStyle={S.paperImage} accessibilityLabel={`今日のおみくじは${fortune.rank}`} style={S.paper}>
    <OmikujiResultContent fortune={fortune} brushTextStyle={brushTextStyle} />
  </ImageBackground>;
}

export function OmikujiResultContent({ fortune, brushTextStyle, style }: { fortune: OmikujiFortune; brushTextStyle?: TextStyle; style?: StyleProp<ViewStyle> }) {
  return <View style={[S.content, style]}>
    <Text style={[S.date, brushTextStyle, S.resultTextEmphasis]}>本日のご縁みくじ</Text>
    <Text style={[S.rank, brushTextStyle, S.resultTextEmphasis]}>{fortune.rank}</Text>
    <Text style={[S.title, brushTextStyle, S.resultTextEmphasis]}>{fortune.title}</Text>
    <Text style={[S.message, brushTextStyle, S.resultTextEmphasis]}>{fortune.message}</Text>
    <View style={S.rule} />
    {categoriesForFortune(fortune).map(item => <View key={item.label} style={S.row}>
      <Text style={[S.label, brushTextStyle, S.resultTextEmphasis]}>{item.label}</Text>
      <Text style={[S.value, brushTextStyle, S.resultTextEmphasis]}>{item.text}</Text>
    </View>)}
    <View style={S.tip}>
      <Text style={[S.tipLabel, brushTextStyle, S.resultTextEmphasis]}>今日の小さな開運</Text>
      <Text style={[S.tipText, brushTextStyle, S.resultTextEmphasis]}>{fortune.action}</Text>
      <Text style={[S.lucky, brushTextStyle, S.resultTextEmphasis]}>吉もの　{fortune.lucky}</Text>
    </View>
    <Text style={[S.tomorrow, brushTextStyle, S.resultTextEmphasis]}>また明日、違うご縁が待っています。</Text>
  </View>;
}

const S = StyleSheet.create({
  paper: { marginHorizontal: 4, backgroundColor: '#FFF9EA', borderRadius: 4, shadowColor: '#5E3C28', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, overflow: 'hidden' },
  paperImage: { borderRadius: 4, opacity: 0.58 },
  content: { padding: 19 },
  date: { textAlign: 'center', color: '#8B6B51', fontSize: 10, letterSpacing: 2 },
  rank: { textAlign: 'center', color: '#A54E42', fontFamily: 'ShipporiBold', fontSize: 40, marginTop: 4 },
  title: { textAlign: 'center', color: '#3D3028', fontFamily: 'ShipporiBold', fontSize: 17, marginTop: 3 },
  message: { color: '#5E5045', fontFamily: 'Shippori', fontSize: 12, lineHeight: 22, marginTop: 12 },
  rule: { height: 1, backgroundColor: '#D8C3A6', marginVertical: 13 },
  row: { flexDirection: 'row', marginVertical: 3 },
  label: { width: 50, color: '#A54E42', fontFamily: 'ShipporiBold', fontSize: 11 },
  value: { flex: 1, color: '#5E5045', fontSize: 11 },
  tip: { marginTop: 13, backgroundColor: '#F2E6D3DD', padding: 12, borderRadius: 10 },
  tipLabel: { color: '#8A5A3B', fontSize: 9, letterSpacing: 1 },
  tipText: { color: '#3D3028', fontFamily: 'ShipporiBold', marginTop: 4 },
  lucky: { color: '#79685A', fontSize: 10, marginTop: 5 },
  tomorrow: { textAlign: 'center', color: '#8A7564', fontSize: 9, marginTop: 14 },
  resultTextEmphasis: { fontWeight: '700' },
});
