import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Original authored frame ranges, at 95ms per frame.
const STEPS = [
  ['歩く', 0, 18], ['礼', 18, 26], ['歩く', 26, 48],
  ['礼', 48, 56], ['礼', 56, 64], ['拍手', 64, 72], ['拍手', 72, 80],
  ['礼', 80, 88], ['歩く', 88, 106], ['礼', 106, 114], ['歩く', 114, 134],
] as const;
const HINTS = ['鳥居まで歩く', '鳥居の前で一礼', '参拝する場所へ歩く', '一礼目', '二礼目', '一拍手目', '二拍手目・願いをこめる', '最後の一礼', '鳥居へ戻る', '感謝をこめて一礼', '参道を歩く'];

export function PrayerControls({ ready, onFrame }: { ready: boolean; onFrame: (frame: number) => void }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const active = useRef(false);
  const elapsed = useRef(0);
  const step = STEPS[index];
  const prayer = index === 6;
  const hold = step?.[0] === '歩く' || prayer;
  const duration = step ? prayer ? 2000 : (step[2] - step[1]) * 95 : 1;
  const stop = () => { active.current = false; setRunning(false); };
  const release = () => {
    stop();
    if (prayer) { elapsed.current = 0; setProgress(0); }
  };
  const releaseRef = useRef(release);
  releaseRef.current = release;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') releaseRef.current(); });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!running || !step) return;
    let previous = Date.now();
    const timer = setInterval(() => {
      if (!active.current) return;
      const now = Date.now();
      elapsed.current += now - previous;
      previous = now;
      const fraction = Math.min(1, elapsed.current / duration);
      setProgress(fraction);
      // Hold the hands-together contact frame until the final bow is pressed.
      onFrame(step[1] + Math.min(prayer ? 3 : step[2] - step[1] - 1, Math.floor(elapsed.current / 95)));
      if (fraction >= 1) {
        stop();
        elapsed.current = 0;
        setProgress(0);
        setIndex(value => value + 1);
        if (index === STEPS.length - 1) onFrame(134);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [running, step, index, duration, prayer, onFrame]);
  const start = () => {
    if (!ready || !step || active.current) return;
    active.current = true;
    setRunning(true);
  };
  if (!step) return null;
  return <View style={{ alignItems: 'center', gap: 8, width: '100%' }}>
    <Text accessibilityLiveRegion="polite" style={{ color: '#FFF5E2', textAlign: 'center' }}>{HINTS[index]}{hold ? `・${(duration / 1000).toFixed(2)}秒長押し` : '・タップ'}</Text>
    <View style={{ flexDirection: 'row', gap: 18 }}>
      {['歩く', '礼', '拍手'].map(label => {
        const enabled = ready && label === step[0] && (hold || !running);
        return <Pressable key={label} accessibilityRole="button" accessibilityLabel={label}
          accessibilityHint={label === step[0] ? HINTS[index] : '順番が来ると操作できます'}
          disabled={!enabled} accessibilityState={{ disabled: !enabled }}
          onPressIn={hold ? start : undefined} onPressOut={hold ? release : undefined} onPress={!hold ? start : undefined}
          style={{ width: 76, height: 76, justifyContent: 'center', alignItems: 'center', opacity: enabled ? 1 : .4 }}>
          <Svg width={76} height={76} style={{ position: 'absolute' }} pointerEvents="none">
            <Circle cx={38} cy={38} r={33} stroke="#685C49" strokeWidth={4} fill="#392F25" />
            <Circle cx={38} cy={38} r={33} stroke="#F0CA86" strokeWidth={4} fill="none"
              strokeDasharray={`${2 * Math.PI * 33}`} strokeDashoffset={2 * Math.PI * 33 * (1 - (label === '拍手' && index === 7 ? 1 : label === step[0] ? progress : 0))}
              rotation={-90} origin="38,38" />
          </Svg>
          <Text style={{ color: '#FFF5E2', fontSize: 18 }}>{label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
