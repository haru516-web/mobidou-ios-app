import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BRUSH, C } from '../components';
import { getPetCharacter, isPetId } from '../petCatalog';
import { duplicateCrowd, type MobbyCollection } from '../services/gacha';

const SIZE = 38;

/**
 * Every duplicate Mobby gathers at the foot of the main one as a small still
 * copy. Purely decorative: it never takes a touch from the main Mobby.
 */
export function DuplicateMobbies({ collection, limit = 8 }: { collection: MobbyCollection; limit?: number }) {
  const { petIds, more } = duplicateCrowd(collection, limit);
  if (petIds.length === 0) return null;
  const total = petIds.length + more;
  return <View pointerEvents="none" accessible accessibilityLabel={`重複したモビーが${total}体、そばにいます`} style={S.row}>
    {petIds.map((id, index) => {
      if (!isPetId(id)) return null;
      // A small, fixed wobble so the crowd looks gathered rather than lined up.
      const lift = [0, 5, 1, 6, 2, 4, 0, 5][index % 8];
      return <Image
        key={`${id}-${index}`}
        accessible={false}
        source={getPetCharacter(id).image}
        contentFit="contain"
        style={[S.small, { marginBottom: lift, transform: [{ scaleX: index % 2 ? -1 : 1 }] }]}
      />;
    })}
    {more > 0 && <View style={S.more}><Text style={S.moreText}>+{more}</Text></View>}
  </View>;
}

const S = StyleSheet.create({
  row: { position: 'absolute', left: 14, right: 14, bottom: 10, flexDirection: 'row', flexWrap: 'wrap-reverse', alignItems: 'flex-end', justifyContent: 'center', gap: -6 },
  small: { width: SIZE, height: SIZE },
  more: { minWidth: 26, height: 22, marginLeft: 8, marginBottom: 4, paddingHorizontal: 6, borderRadius: 11, backgroundColor: '#FBF4E4EE', borderWidth: 1, borderColor: '#C7A98A', alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: BRUSH, fontSize: 12, color: C.ink },
});
