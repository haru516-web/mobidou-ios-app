import React, { useEffect, useState } from 'react';
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
      <Text numberOfLines={2} style={[S.name, { fontSize: columns > 3 ? 9 : columns === 3 ? 11 : 13, lineHeight: columns > 3 ? 11 : columns === 3 ? 14 : 17 }]}>{pet.name}</Text>
      {showCatchphrase && <Text numberOfLines={2} style={S.catchphrase}>{pet.catchphrase}</Text>}
    </View>)}
  </View>;
}

/** The ordinary roster is shown in two pages, so each Mobby is big enough to see: the first 8, then the rest. */
const FIRST_PAGE = 8;

/** Shown once before the first gacha of the guide: everyone the player can meet. `onNext` goes on with the guide. */
export function CharacterIntroPopup({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  const [page, setPage] = useState(0);
  useEffect(() => { if (visible) setPage(0); }, [visible]);
  const pages = [PET_CHARACTERS.slice(0, FIRST_PAGE), PET_CHARACTERS.slice(FIRST_PAGE)];
  return <ScrollPopup visible={visible} title="出会えるモビーたち" onClose={onNext}>
    {paper => <View style={S.body}>
      <Text style={S.lead}>もび道には、こんなモビーたちがいます。</Text>
      {/* Both pages are mounted so the second one's pictures are ready when it is turned to. */}
      {pages.map((pets, index) => <View key={index} style={index === page ? undefined : S.hidden}><Grid pets={pets} columns={3} paper={paper} reserved={96} /></View>)}
      <Text style={S.note}>{page === 0 ? `1 / 2　（全${PET_CHARACTERS.length}人）` : `2 / 2　イベント限定のモビーもいます。`}</Text>
      {page === 0
        ? <Button title="つづきを見る" onPress={() => setPage(1)} />
        : <Button title="次へ" onPress={onNext} />}
    </View>}
  </ScrollPopup>;
}

/** The second popup of an event: the Mobbies that only the event gives. */
export function EventMobbiesBody({ paper, eventName, onOpenEvent }: { paper: ScrollPaper; eventName: string; onOpenEvent: () => void }) {
  return <View style={S.body}>
    <Text style={S.lead}>「{eventName}」でしか会えない{EVENT_PET_CHARACTERS.length}人です。</Text>
    <Grid pets={EVENT_PET_CHARACTERS} columns={2} paper={paper} reserved={110} showCatchphrase />
    <Button title="イベントを見る" onPress={onOpenEvent} />
  </View>;
}

export function EventMobbiesPopup({ visible, eventName, onOpenEvent, onClose }: { visible: boolean; eventName: string; onOpenEvent: () => void; onClose: () => void }) {
  return <ScrollPopup event visible={visible} title="イベント限定のモビー" onClose={onClose}>
    {paper => <EventMobbiesBody paper={paper} eventName={eventName} onOpenEvent={onOpenEvent} />}
  </ScrollPopup>;
}

const S = StyleSheet.create({
  body: { flex: 1, gap: 8, justifyContent: 'space-between', paddingTop: 4 },
  lead: { color: C.ink, fontFamily: BRUSH, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  note: { color: '#655B4D', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  hidden: { display: 'none' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  cell: { alignItems: 'center', paddingVertical: 2 },
  name: { color: C.ink, fontFamily: BRUSH, textAlign: 'center', maxWidth: '100%' },
  catchphrase: { color: '#655B4D', fontSize: 10, lineHeight: 14, textAlign: 'center', paddingHorizontal: 4 },
});
