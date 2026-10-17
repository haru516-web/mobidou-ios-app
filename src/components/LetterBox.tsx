import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SerialModal as Modal } from './SerialModal';
import { Image } from './AppImage';
import { BRUSH, Icon } from '../components';
import { WashiPressable } from './Washi';
import { removeLetter, type Letter } from '../services/letters';

const LETTER_CLOSED = require('../../assets/ui-round3/collection/collection-letter-closed-v1.webp');
const LETTER_PAPER = require('../../assets/ui-round3/collection/collection-letter-paper-v1.webp');
/** Width / height of the two pictures. */
const CLOSED_RATIO = 512 / 340;
const PAPER_RATIO = 1024 / 1536;
const INK = '#4A2F22';
const RED = '#A63A2C';

export const letterDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

/** The letter that sits between the miniature shelf and the goshuin shelf: tap it to read what you wrote at each place. */
export function LetterBoxButton({ count, width, onPress }: { count: number; width: number; onPress: () => void }) {
  const empty = count === 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={empty ? '手紙。まだ手紙はありません' : `手紙。${count}通の手紙を読む`}
      onPress={onPress}
      style={{ width, height: width / CLOSED_RATIO, alignItems: 'center', justifyContent: 'center' }}
    >
      <Image accessible={false} source={LETTER_CLOSED} contentFit="contain" style={{ width, height: width / CLOSED_RATIO, opacity: empty ? 0.45 : 1 }} />
      {!empty && <View style={S.count}><Text style={S.countText}>{count}</Text></View>}
    </Pressable>
  );
}

/** One letter at a time on the paper, newest first. Nothing scrolls: the answer is capped when it is written. */
export function LettersPopup({ visible, letters, onClose }: { visible: boolean; letters: readonly Letter[]; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { if (visible) { setIndex(0); setConfirming(false); } }, [visible]);
  useEffect(() => { setConfirming(false); }, [index]);
  useEffect(() => { if (index > 0 && index >= letters.length) setIndex(Math.max(0, letters.length - 1)); }, [index, letters.length]);

  const paperWidth = Math.min(380, width - 32, (height - 150) * PAPER_RATIO);
  const paperHeight = paperWidth / PAPER_RATIO;
  const letter = letters[index];
  const pad = paperWidth * 0.13;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={S.backdrop}>
        <View style={{ width: paperWidth, height: paperHeight }}>
          <Image accessible={false} source={LETTER_PAPER} contentFit="fill" style={StyleSheet.absoluteFill} />
          {letter
            ? <View style={[S.body, { paddingHorizontal: pad, paddingTop: pad * 1.1, paddingBottom: pad * 0.9 }]}>
              <Text style={[S.date, { fontSize: Math.max(13, paperWidth * 0.042) }]}>{letterDate(letter.createdAt)}</Text>
              <Text numberOfLines={1} style={[S.place, { fontSize: Math.max(15, paperWidth * 0.052) }]}>{letter.shrineName}にて</Text>
              {!!letter.quote && <Text numberOfLines={3} style={[S.quote, { fontSize: Math.max(11, paperWidth * 0.032) }]}>「{letter.quote}」</Text>}
              <Text style={[S.question, { fontSize: Math.max(12, paperWidth * 0.036) }]}>{letter.question}</Text>
              <View style={S.answerBox}><Text style={[S.answer, { fontSize: Math.max(16, paperWidth * 0.05), lineHeight: Math.max(26, paperWidth * 0.082) }]}>{letter.answer}</Text></View>
              <View style={S.footer}>
                <Pressable accessibilityRole="button" accessibilityLabel={confirming ? 'この手紙を破り捨てる。もう一度押すと消えます' : 'この手紙を破り捨てる'} onPress={() => { if (confirming) { void removeLetter(letter.id); setConfirming(false); } else setConfirming(true); }} style={S.discard}>
                  <Icon name="trash-outline" size={14} color={confirming ? RED : '#8A6950'} />
                  <Text style={[S.discardText, confirming && { color: RED }]}>{confirming ? 'もう一度押すと消えます' : '破り捨てる'}</Text>
                </Pressable>
                <View style={S.pager}>
                  <Pressable accessibilityRole="button" accessibilityLabel="新しい手紙" disabled={index === 0} onPress={() => setIndex(index - 1)} hitSlop={8} style={[S.turn, index === 0 && S.turnOff]}><Icon name="chevron-back" size={18} color={INK} /></Pressable>
                  <Text style={S.pageText}>{index + 1} / {letters.length}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="古い手紙" disabled={index >= letters.length - 1} onPress={() => setIndex(index + 1)} hitSlop={8} style={[S.turn, index >= letters.length - 1 && S.turnOff]}><Icon name="chevron-forward" size={18} color={INK} /></Pressable>
                </View>
              </View>
            </View>
            : <View style={[S.body, S.emptyBody, { padding: pad }]}>
              <Text style={S.emptyTitle}>まだ手紙はありません</Text>
              <Text style={S.emptyText}>各地点に着いたときの答えが、ここに自分宛ての手紙として残ります。</Text>
            </View>}
        </View>
        <WashiPressable accessibilityRole="button" onPress={onClose} style={S.closeButton}><Text style={S.closeText}>とじる</Text></WashiPressable>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  count: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#FFF8E7', fontSize: 11, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: '#241b15b8', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 14 },
  body: { ...StyleSheet.absoluteFillObject },
  emptyBody: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontFamily: BRUSH, fontSize: 22, color: INK },
  emptyText: { fontSize: 13, lineHeight: 21, color: '#7A604D', textAlign: 'center' },
  date: { fontFamily: BRUSH, color: RED, textAlign: 'right', letterSpacing: 1 },
  place: { fontFamily: BRUSH, color: INK, marginTop: 6 },
  quote: { color: '#8A6950', marginTop: 8, lineHeight: 18 },
  question: { color: '#7A604D', marginTop: 12, lineHeight: 20 },
  answerBox: { flex: 1, marginTop: 14, overflow: 'hidden' },
  answer: { fontFamily: BRUSH, color: INK },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  discard: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  discardText: { fontSize: 11, color: '#8A6950' },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  turn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  turnOff: { opacity: 0.25 },
  pageText: { fontSize: 12, color: '#7A604D', minWidth: 40, textAlign: 'center' },
  closeButton: { paddingHorizontal: 28, paddingVertical: 10 },
  closeText: { fontFamily: BRUSH, fontSize: 16, color: INK },
});
