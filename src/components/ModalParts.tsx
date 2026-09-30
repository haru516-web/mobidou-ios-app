import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, BRUSH, Icon } from '../components';
import { WashiPressable as Pressable } from './Washi';

export function Close({ onPress }: { onPress: () => void }) {
  return <Pressable plate="round" accessibilityRole="button" accessibilityLabel="閉じる" onPress={onPress} style={M.close}><Icon name="close" /></Pressable>;
}

export function Meta({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
  return <View style={M.meta}><Icon name={icon} size={18} color={C.gold} /><Text style={M.metaText}>{text}</Text></View>;
}

/** Styles shared by the full-screen sheets (settings, detail, route picker, ...). */
export const M = StyleSheet.create({
  modal: { flex: 1, backgroundColor: C.paper, width: '100%', maxWidth: 600, alignSelf: 'center' },
  modalHeader: { padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: C.line },
  modalTitle: { fontFamily: BRUSH, fontSize: 23, color: C.ink },
  error: { backgroundColor: '#F5DCD4', margin: 10, padding: 9, flexDirection: 'row', alignItems: 'center', borderRadius: 8 },
  errorText: { color: '#813D31', flexShrink: 1, fontSize: 12, lineHeight: 19 },
  settingHelp: { fontSize: 12, color: C.muted, lineHeight: 20, marginVertical: 8 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  metaText: { fontSize: 12, color: '#776B59', flex: 1, lineHeight: 20 },
});
