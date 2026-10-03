import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { BRUSH, Button, C } from '../components';

/** Last step of the first-run guide: connect the step source, or leave it for later. */
export function ConnectStepsPrompt({ visible, busy, error, onConnect, onLater }: { visible: boolean; busy: boolean; error: string; onConnect: () => void; onLater: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
    <View style={S.backdrop}>
      <View accessibilityViewIsModal style={S.card}>
        <Text style={S.title}>歩数をつなごう</Text>
        <Text style={S.body}>iPhoneの歩数を、旅の道のりに使います。位置情報は使いません。歩いた分だけ、御朱印が集まります。</Text>
        {!!error && <Text style={S.error}>{error}</Text>}
        <Button title={busy ? 'つないでいます…' : '歩数をつなぐ'} icon="footsteps-outline" disabled={busy} onPress={onConnect} />
        <Button title="あとで（設定やホームからつなげます）" secondary disabled={busy} onPress={onLater} />
      </View>
    </View>
  </Modal>;
}

const S = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#2A1D14B8', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 18, backgroundColor: '#FFF9EF', borderWidth: 1, borderColor: '#C7A98A', paddingVertical: 22, paddingHorizontal: 18, alignItems: 'center', gap: 12 },
  title: { color: C.red, fontFamily: BRUSH, fontSize: 24, textAlign: 'center' },
  body: { color: '#4E4034', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  error: { color: C.red, fontSize: 12, textAlign: 'center' },
});
