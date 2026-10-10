import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { BRUSH } from '../components';
import { sayingColumns } from '../data/shrineSayings';

const FONT_SIZE = 40;
const LINE_HEIGHT = 52;
const COLUMN_WIDTH = 52;
const COLUMN_GAP = 26;
const VERTICAL_FORMS: Record<string, string> = { 'ー': '｜', '…': '︙' };
const HANGING = new Set(['、', '。', '，', '．']);
/** How long the page rests, once it is on the screen, before the first column starts to open. */
const START_DELAY = 300;

/**
 * A saying written downward with nothing behind it. The columns read from the right; each column opens from its top
 * toward its bottom, one after another, so the line seems to be written as you watch. The opening starts only after the
 * page has been drawn and a short rest, so it is seen from its first stroke. With reduced motion it simply appears.
 */
export function VerticalSaying({ text, reducedMotion = false, onDone }: { text: string; reducedMotion?: boolean; onDone?: () => void }) {
  const columns = useMemo(() => sayingColumns(text), [text]);
  const total = useMemo(() => columns.reduce((sum, column) => sum + column.length, 0), [columns]);
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const [laidOut, setLaidOut] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    progress.setValue(reducedMotion ? 1 : 0);
    if (reducedMotion) { onDoneRef.current?.(); return undefined; }
    if (!laidOut) return undefined;
    let animation: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      animation = Animated.timing(progress, { toValue: 1, duration: 500 + total * 110, easing: Easing.inOut(Easing.quad), useNativeDriver: false });
      animation.start(({ finished }) => { if (finished) onDoneRef.current?.(); });
    }, START_DELAY);
    return () => { clearTimeout(timer); animation?.stop(); };
  }, [progress, reducedMotion, laidOut, text, total]);

  // Each column takes a share of the whole opening in proportion to its length.
  let consumed = 0;
  const spans = columns.map(column => {
    const from = consumed / Math.max(1, total);
    consumed += column.length;
    return { from, to: consumed / Math.max(1, total) };
  });

  return <View accessible accessibilityLabel={text} style={S.row} onLayout={() => setLaidOut(true)}>
    {columns.map((column, columnIndex) => {
      const fullHeight = column.length * LINE_HEIGHT;
      const height = progress.interpolate({ inputRange: [spans[columnIndex].from, spans[columnIndex].to], outputRange: [0, fullHeight], extrapolate: 'clamp' });
      return <View key={columnIndex} style={{ width: COLUMN_WIDTH, height: fullHeight }}>
        <Animated.View style={{ height, overflow: 'hidden' }}>
          <View style={{ height: fullHeight, alignItems: 'center' }}>
            {column.map((char, charIndex) => <View key={charIndex} style={HANGING.has(char) ? S.hanging : undefined}>
              <Animated.Text style={S.char}>{VERTICAL_FORMS[char] ?? char}</Animated.Text>
            </View>)}
          </View>
        </Animated.View>
      </View>;
    })}
  </View>;
}

const S = StyleSheet.create({
  // The first column is the rightmost one.
  row: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'center', gap: COLUMN_GAP, paddingVertical: 12 },
  char: { color: '#FFF5E2', fontFamily: BRUSH, fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT, height: LINE_HEIGHT, textAlign: 'center', includeFontPadding: false },
  // Commas and full stops sit at the upper right of their cell when writing downward.
  hanging: { transform: [{ translateX: 14 }, { translateY: -16 }] },
});
