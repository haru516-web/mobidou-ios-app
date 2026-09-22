import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { PetCharacter } from '../petCatalog';
import { OMIKUJI_ATLASES, OMIKUJI_FRAME_COUNT } from '../data/omikujiAtlases';
import type { OmikujiFortune } from '../data/omikuji';
import { WashiPressable as Pressable } from './Washi';

export function OmikujiExperience({ pet, fortune, drawn, onDraw }: { pet: PetCharacter; fortune: OmikujiFortune; drawn: boolean; onDraw: () => void }) {
  const [frame, setFrame] = useState<number | null>(null);
  const atlas = OMIKUJI_ATLASES[pet.id];
  useEffect(() => {
    if (frame === null) return undefined;
    const timer = setInterval(() => setFrame(current => {
      if (current === null || current >= OMIKUJI_FRAME_COUNT - 1) { clearInterval(timer); onDraw(); return null; }
      return current + 1;
    }), 130);
    return () => clearInterval(timer);
  }, [frame, onDraw]);
  const start = () => { if (!drawn && frame === null) setFrame(0); };
  const visibleFrame = frame ?? 0;
  return <View style={S.wrap}>
    <View style={S.stage}>
      <View style={S.spriteViewport}><Image source={atlas} contentFit="fill" style={[S.characterAtlas, { left: -210 * visibleFrame }]} /></View>
      <Text style={S.petLine}>{frame !== null ? `${pet.name}が、心をこめて引いています…` : drawn ? `${pet.name}が今日の運勢を届けてくれました。` : `${pet.name}に今日のおみくじをお願いしよう。`}</Text>
    </View>
    {!drawn && <Pressable accessibilityRole="button" accessibilityLabel="今日のおみくじを引く" disabled={frame !== null} onPress={start} style={[S.drawButton, frame !== null && S.disabled]}><Text style={S.drawButtonText}>{frame !== null ? 'おみくじを引いています…' : '今日のおみくじを引く'}</Text></Pressable>}
    {drawn && <View accessibilityLabel={`今日のおみくじは${fortune.rank}`} style={S.paper}>
      <Text style={S.date}>本日のご縁みくじ</Text><Text style={S.rank}>{fortune.rank}</Text><Text style={S.title}>{fortune.title}</Text>
      <Text style={S.message}>{fortune.message}</Text><View style={S.rule} />
      {fortune.categories.map(item => <View key={item.label} style={S.row}><Text style={S.label}>{item.label}</Text><Text style={S.value}>{item.text}</Text></View>)}
      <View style={S.tip}><Text style={S.tipLabel}>今日の小さな開運</Text><Text style={S.tipText}>{fortune.action}</Text><Text style={S.lucky}>吉もの　{fortune.lucky}</Text></View>
      <Text style={S.tomorrow}>また明日、違うご縁が待っています。</Text>
    </View>}
  </View>;
}

const S = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 18 }, stage: { minHeight: 258, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 }, spriteViewport: { position: 'absolute', top: 5, width: 210, height: 210, overflow: 'hidden' }, characterAtlas: { position: 'absolute', top: 0, width: 1680, height: 210 }, petLine: { fontFamily: 'Shippori', color: '#5B4030', fontSize: 12, backgroundColor: '#FFF9EEDD', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 7, overflow: 'hidden' }, drawButton: { alignSelf: 'center', minHeight: 48, minWidth: 240, backgroundColor: '#A54E42', borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }, disabled: { opacity: .65 }, drawButtonText: { color: '#FFF9EF', fontFamily: 'ShipporiBold', letterSpacing: 1 }, paper: { marginHorizontal: 4, backgroundColor: '#FFF9EAEA', borderWidth: 1, borderColor: '#CDAF82', padding: 19, borderRadius: 4, shadowColor: '#5E3C28', shadowOpacity: .2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, date: { textAlign: 'center', color: '#8B6B51', fontSize: 10, letterSpacing: 2 }, rank: { textAlign: 'center', color: '#A54E42', fontFamily: 'ShipporiBold', fontSize: 40, marginTop: 4 }, title: { textAlign: 'center', color: '#3D3028', fontFamily: 'ShipporiBold', fontSize: 17, marginTop: 3 }, message: { color: '#5E5045', fontFamily: 'Shippori', fontSize: 12, lineHeight: 22, marginTop: 12 }, rule: { height: 1, backgroundColor: '#D8C3A6', marginVertical: 13 }, row: { flexDirection: 'row', marginVertical: 3 }, label: { width: 50, color: '#A54E42', fontFamily: 'ShipporiBold', fontSize: 11 }, value: { flex: 1, color: '#5E5045', fontSize: 11 }, tip: { marginTop: 13, backgroundColor: '#F2E6D3', padding: 12, borderRadius: 10 }, tipLabel: { color: '#8A5A3B', fontSize: 9, letterSpacing: 1 }, tipText: { color: '#3D3028', fontFamily: 'ShipporiBold', marginTop: 4 }, lucky: { color: '#79685A', fontSize: 10, marginTop: 5 }, tomorrow: { textAlign: 'center', color: '#8A7564', fontSize: 9, marginTop: 14 },
});
