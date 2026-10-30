import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRUSH, Button } from '../components';
import { FitToHeight } from './PagedBody';
import { addLetter, isValidAnswer, LETTER_MAX_LENGTH, saveQuestionQueue, type QueuedQuestion } from '../services/letters';

/**
 * The questions of the places that were skipped all at once, asked one after another. None can be left unanswered, and the
 * rest are kept on the device, so closing the app in the middle brings the player back to the question they were on.
 */
export function LetterQuestionFlow({ items, onDone }: { items: readonly QueuedQuestion[]; onDone: () => void }) {
  const [rest, setRest] = useState<readonly QueuedQuestion[]>(items);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const total = items.length;
  const current = rest[0];
  const submit = async () => {
    if (!current || saving || !isValidAnswer(answer)) return;
    Keyboard.dismiss();
    setSaving(true);
    await addLetter({ shrineId: current.shrineId, shrineName: current.shrineName, question: current.question, quote: current.quote, answer });
    const next = rest.slice(1);
    await saveQuestionQueue(next);
    setAnswer('');
    setSaving(false);
    if (next.length) setRest(next); else onDone();
  };
  if (!current) return null;
  const last = rest.length === 1;
  return <SafeAreaView style={S.page}><KeyboardAvoidingView style={S.fit} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <FitToHeight key={current.shrineId} style={S.fit}><View style={S.content}>
      <Text style={S.progress}>{total - rest.length + 1} / {total}</Text>
      <Text style={S.place}>{current.shrineName}にて</Text>
      {!!current.quote && <Text style={S.quote}>「{current.quote}」</Text>}
      <Text accessibilityRole="header" style={S.question}>{current.question}</Text>
      <TextInput accessibilityLabel="答えを書く" value={answer} onChangeText={text => setAnswer(text.slice(0, LETTER_MAX_LENGTH))} multiline maxLength={LETTER_MAX_LENGTH} placeholder="ここに書く" placeholderTextColor="#9A8A72" style={S.input} />
      <Text style={S.count}>{answer.trim().length === 1 ? '2文字以上で書いてください　' : ''}{answer.length} / {LETTER_MAX_LENGTH}</Text>
      <Text style={S.warn}>書いた答えは、あとから変えられません。{'\n'}手紙として残り、いつでも見返せます。</Text>
    </View></FitToHeight>
    <View style={S.bar}><Button title={last ? '手紙に残してホームへ' : '手紙に残して次へ'} disabled={!isValidAnswer(answer) || saving} onPress={() => void submit()} style={{ width: '100%', maxWidth: 350 }} /></View>
  </KeyboardAvoidingView></SafeAreaView>;
}

const S = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#302D25' },
  fit: { flex: 1 },
  content: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 24, gap: 10, width: '100%', maxWidth: 350, alignSelf: 'center' },
  progress: { fontSize: 13, color: '#BFAE92' },
  place: { fontFamily: BRUSH, fontSize: 16, color: '#D4B387' },
  quote: { fontFamily: BRUSH, fontSize: 14, lineHeight: 22, color: '#D9C9AE', textAlign: 'center' },
  question: { fontFamily: BRUSH, fontSize: 24, lineHeight: 34, color: '#FFF5E2', textAlign: 'center' },
  input: { width: '100%', minHeight: 120, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#D4B387', backgroundColor: '#FFF8E7', color: '#4A2F22', fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
  count: { alignSelf: 'flex-end', fontSize: 12, color: '#BFAE92' },
  warn: { fontSize: 13, lineHeight: 20, color: '#F2C9A0', textAlign: 'center' },
  bar: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, minHeight: 76 },
});
