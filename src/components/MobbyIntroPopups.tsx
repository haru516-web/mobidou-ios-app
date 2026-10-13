import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from './AppImage';
import { BRUSH, Button, C } from '../components';
import { ScrollPopup, type ScrollPaper } from './ScrollPopup';
import { EVENT_PET_CHARACTERS, PET_CHARACTERS, type PetCharacter } from '../petCatalog';

/*
 * Two popups that show the Mobbies together, so a player learns there are many of them:
 * the whole ordinary roster before the first gacha, and the four that only the event gives.
 * They are introductions, not lessons: a picture, a name, and a way to go on.
 */

/** Height under the heading that the content may use. */
const HEADING = 46;

function Grid({ pets, columns, paper, reserved, showCatchphrase = false }: { pets: readonly PetCharacter[]; columns: number; paper: ScrollPaper; reserved: number; showCatchphrase?: boolean }) {
  const rows = Math.ceil(pets.length / columns);
  const labelHeight = showCatchphrase ? 44 : 26;
  const available = Math.max(80, paper.height - HEADING - reserved);
  const cellWidth = Math.floor(paper.width / columns);
  const picture = Math.max(30, Math.min(cellWidth - 8, Math.floor(available / rows) - labelHeight - 4, 120));
  return <View style={S.grid}>
    {pets.map(pet => <View key={pet.id} style={[S.cell, { width: cellWidth }]}>
      <Image source={pet.image} contentFit="contain" accessibilityLabel={pet.name} style={{ width: picture, height: picture }} />
      <Text numberOfLines={2} style={[S.name, { fontSize: columns > 2 ? 9 : 13, lineHeight: columns > 2 ? 11 : 17 }]}>{pet.name}</Text>
      {showCatchphrase && <Text numberOfLines={2} style={S.catchphrase}>{pet.catchphrase}</Text>}
    </View>)}
  </View>;
}

/** Shown once before the first gacha of the guide: everyone the player can meet. `onNext` goes on with the guide. */
export function CharacterIntroPopup({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  return <ScrollPopup visible={visible} title="もびの仲間たち" onClose={onNext}>
    {paper => <View style={S.body}>
      <Text style={S.lead}>いろんなモビーに、会えます。</Text>
      <Grid pets={PET_CHARACTERS} columns={4} paper={paper} reserved={128} />
      <Text style={S.note}>イベント限定のモビーもいます。</Text>
      <Button title="次へ" onPress={onNext} />
    </View>}
  </ScrollPopup>;
}

/** The second popup of an event: the Mobbies that only the event gives. */
export function EventMobbiesPopup({ visible, eventName, onOpenEvent, onClose }: { visible: boolean; eventName: string; onOpenEvent: () => void; onClose: () => void }) {
  return <ScrollPopup event visible={visible} title="イベント限定のモビー" onClose={onClose}>
    {paper => <View style={S.body}>
      <Text style={S.lead}>「{eventName}」でしか会えない{EVENT_PET_CHARACTERS.length}人です。</Text>
      <Grid pets={EVENT_PET_CHARACTERS} columns={2} paper={paper} reserved={110} showCatchphrase />
      <Button title="イベントを見る" onPress={onOpenEvent} />
    </View>}
  </ScrollPopup>;
}

const S = StyleSheet.create({
  body: { flex: 1, gap: 8, justifyContent: 'space-between', paddingTop: 4 },
  lead: { color: C.ink, fontFamily: BRUSH, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  note: { color: '#655B4D', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  cell: { alignItems: 'center', paddingVertical: 2 },
  name: { color: C.ink, fontFamily: BRUSH, textAlign: 'center', maxWidth: '100%' },
  catchphrase: { color: '#655B4D', fontSize: 10, lineHeight: 14, textAlign: 'center', paddingHorizontal: 4 },
});
