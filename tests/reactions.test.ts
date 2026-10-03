import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affinityStageFor, reactionLine } from '../src/data/reactions.ts';
const PET_IDS = ['mobibou', 'mobirin', 'mobichi', 'yami', 'mobiyan', 'mobiyura', 'reomoby', 'potemoby', 'babumoby', 'bearmobby', 'boymobby', 'dogmobby', 'ojimobby', 'reamobby', 'shikamobby', 'uyumobby', 'wolfmobby'];

test('reactionLine without a context keeps cycling the character lines', () => {
  assert.equal(reactionLine('mobibou', 'talk', 0), 'なあ、あの雲、団子っぽくない？');
  const seen = new Set(Array.from({ length: 12 }, (_, count) => reactionLine('mobibou', 'talk', count)));
  assert.ok(seen.size >= 6);
});
test('every character has at least five different things to say when talked to', () => {
  for (const id of PET_IDS) {
    const lines = new Set(Array.from({ length: 30 }, (_, count) => reactionLine(id, 'talk', count)));
    assert.ok(lines.size >= 5, id);
  }
});
test('a stop just reached is always mentioned; other moments take every other turn', () => {
  assert.match(reactionLine('mobirin', 'talk', 1, { justReceivedGoshuin: true }), /御朱印|旅の証/);
  assert.match(reactionLine('mobirin', 'talk', 3, { justCompletedPilgrimage: true, justReceivedGoshuin: true }), /ここまで|旅の証/);
  assert.equal(reactionLine('mobirin', 'talk', 1, { hour: 8 }), reactionLine('mobirin', 'talk', 1));
  assert.match(reactionLine('mobirin', 'talk', 0, { hour: 8 }), /おはよう|朝/);
  assert.match(reactionLine('mobirin', 'talk', 0, { hour: 23 }), /こんばんは|小さな発見/);
});
test('long breaks are welcomed back and never blamed', () => {
  for (let count = 0; count < 8; count += 2) assert.doesNotMatch(reactionLine('yami', 'talk', count, { daysSinceLastOpen: 9 }), /なぜ|どうして|さぼ|来なかった/);
  assert.match(reactionLine('yami', 'talk', 0, { daysSinceLastOpen: 9 }), /おかえり|久しぶり/);
});
test('situations only change talk, and affinity stages follow bond counts', () => {
  assert.equal(reactionLine('mobibou', 'pet', 2, { justCompletedPilgrimage: true }), reactionLine('mobibou', 'pet', 2));
  assert.deepEqual([0, 19, 20, 99, 100].map(affinityStageFor), ['new', 'new', 'friendly', 'friendly', 'partner']);
});
