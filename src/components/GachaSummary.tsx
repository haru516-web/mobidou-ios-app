import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRUSH, Button, C, SERIF } from '../components';
import { getPetCharacter, isPetId } from '../petCatalog';
import type { PullResult } from '../services/gacha';
import { Image } from './AppImage';

const SHEET = require('../../assets/ui-washi/goshuin/index-popup.webp');
/** The washi sheet is 1024 x 1400. */
const SHEET_RATIO = 1400 / 1024;
const BUTTON_AREA = 84;

/** After a multi-pull: every Mobby that came out, on one sheet of washi, so the whole result can be seen at once. */
export function GachaSummary({ results, onClose }: { results: readonly PullResult[]; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const available = height - insets.top - insets.bottom - BUTTON_AREA - 24;
  const sheetH = Math.min(available, Math.min(width - 24, 420) * SHEET_RATIO);
  const sheetW = sheetH / SHEET_RATIO;
  // The scroll's paper is narrower than the picture (rollers top and bottom, curled edges), so the content stays inside it.
  const padX = sheetW * 0.17;
  const padTop = sheetH * 0.13;
  const rows = Math.max(1, Math.ceil(results.length / 2));
  const titleH = 46;
  const gridH = sheetH - padTop * 2 - titleH;
  const cellH = gridH / rows;
  const art = Math.max(40, Math.min(cellH - 34, (sheetW - padX * 2) / 2 - 8));
  const newCount = results.filter(result => result.isNew).length;
  return <View accessibilityViewIsModal style={S.root}>
    <View style={[S.sheet, { width: sheetW, height: sheetH, marginTop: insets.top + 12 }]}>
      <Image accessible={false} source={SHEET} contentFit="fill" style={StyleSheet.absoluteFill} />
      <View style={{ paddingHorizontal: padX, paddingTop: padTop, height: sheetH }}>
        <View style={[S.titleBox, { height: titleH }]}>
          <Text accessibilityRole="header" style={S.title}>ご縁が結ばれました</Text>
          {newCount > 0 && <Text style={S.sub}>はじめまして {newCount}体</Text>}
        </View>
        <View style={[S.grid, { height: gridH }]}>
          {results.map((result, index) => {
            if (!isPetId(result.petId)) return null;
            const pet = getPetCharacter(result.petId);
            return <View key={index} accessible accessibilityLabel={`${pet.name}${result.isNew ? '、はじめまして' : ''}`} style={[S.cell, { height: cellH }]}>
              <View style={{ width: art, height: art }}>
                <Image accessible={false} source={pet.image} contentFit="contain" style={{ width: art, height: art }} />
                {result.isNew && <View style={S.newTag}><Text style={S.newText}>NEW</Text></View>}
              </View>
              <Text numberOfLines={1} style={S.name}>{pet.name}</Text>
            </View>;
          })}
        </View>
      </View>
    </View>
    <View style={[S.footer, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      <Button title="おわる" onPress={onClose} style={S.button} />
    </View>
  </View>;
}

const S = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000EB', alignItems: 'center', zIndex: 30 },
  sheet: { alignItems: 'center' },
  titleBox: { alignItems: 'center', justifyContent: 'center' },
  title: { color: C.ink, fontFamily: BRUSH, fontSize: 17, letterSpacing: 1, textAlign: 'center' },
  sub: { color: '#8A3B2F', fontFamily: SERIF, fontSize: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', alignItems: 'center', justifyContent: 'center', gap: 2 },
  name: { color: C.ink, fontFamily: SERIF, fontSize: 12, textAlign: 'center', maxWidth: '100%' },
  newTag: { position: 'absolute', top: 0, right: -4, backgroundColor: '#B8392F', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  newText: { color: '#FFF8EC', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  footer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  button: { minWidth: 180 },
});
