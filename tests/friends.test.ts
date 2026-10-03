import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFriendCode, friendCodeFromUrl, friendInviteLink, isFriendCode, normalizeFriendCode, readFriendRequests, readFriends, requestFailure } from '../src/services/friends.ts';

const known = (id: string) => id === 'mobibou' || id === 'yami';

test('friend codes are read forgivingly and checked strictly', () => {
  assert.equal(normalizeFriendCode(' abcde-fghjk '), 'ABCDEFGHJK');
  assert.equal(isFriendCode('abcde fghjk'), true);
  assert.equal(isFriendCode('ABCDEFGHJK'), true);
  assert.equal(isFriendCode('ABCDE-FGHJ0'), false, '0 is not in the alphabet');
  assert.equal(isFriendCode('ABCDEFGHJ'), false);
  assert.equal(isFriendCode('ABCDEFGHJKL'), false);
  assert.equal(formatFriendCode('abcdefghjk'), 'ABCDE-FGHJK');
  assert.equal(formatFriendCode('short'), 'SHORT');
});

test('the invite link is the server page for that code', () => {
  assert.equal(friendInviteLink('https://mobidou-server.mobidou.workers.dev/', 'abcde-fghjk'), 'https://mobidou-server.mobidou.workers.dev/f/ABCDEFGHJK');
});

test('a code is taken from the app link or the web page link, and from nothing else', () => {
  assert.equal(friendCodeFromUrl('mobidou://friend?code=ABCDEFGHJK'), 'ABCDEFGHJK');
  assert.equal(friendCodeFromUrl('mobidou://friend/?x=1&code=abcdefghjk'), 'ABCDEFGHJK');
  assert.equal(friendCodeFromUrl('https://mobidou-server.mobidou.workers.dev/f/ABCDEFGHJK'), 'ABCDEFGHJK');
  assert.equal(friendCodeFromUrl('https://example.com/f/ABCDEFGHJK?utm=1'), 'ABCDEFGHJK');
  assert.equal(friendCodeFromUrl('mobidou://friend?code=NOPE'), null);
  assert.equal(friendCodeFromUrl('mobidou://friend?code=%E0%A4%A'), null);
  assert.equal(friendCodeFromUrl('mobidou://settings?code=ABCDEFGHJK'), null);
  assert.equal(friendCodeFromUrl('https://example.com/other/ABCDEFGHJK'), null);
  assert.equal(friendCodeFromUrl(null), null);
});

test('friends carry only a name and the main Mobby; an unknown Mobby or a nameless row is handled', () => {
  const rows = { friends: [{ id: 'a', name: 'はる', petId: 'yami', goshuinCount: 99, routeName: 'secret' }, { id: 'b', name: 'そら', petId: 'ghost' }, { id: 'c', name: '', petId: 'yami' }, { name: 'x' }] };
  assert.deepEqual(readFriends(rows, known, 'mobibou'), [{ id: 'a', name: 'はる', petId: 'yami' }, { id: 'b', name: 'そら', petId: 'mobibou' }]);
  assert.deepEqual(readFriends(null, known, 'mobibou'), []);
  assert.deepEqual(readFriends({ friends: 'no' }, known, 'mobibou'), []);
});

test('incoming requests show who asked, with their main Mobby and the day', () => {
  const data = { incomingRequests: [{ id: 'r1', fromName: 'ベン', fromPetId: 'yami', createdAt: '2026-10-04T05:00:00.000Z' }, { id: 'r2', fromName: 'アン', fromPetId: null, createdAt: 'bad' }] };
  const requests = readFriendRequests(data, known, 'mobibou');
  assert.equal(requests[0].name, 'ベン');
  assert.equal(requests[0].petId, 'yami');
  assert.match(requests[0].sentAt, /^\d{1,2}月\d{1,2}日$/);
  assert.deepEqual(requests[1], { id: 'r2', name: 'アン', petId: 'mobibou', sentAt: '' });
});

test('every way a request can fail has its own reason', () => {
  assert.equal(requestFailure(null, undefined), 'offline');
  assert.equal(requestFailure(404, 'friend_not_found'), 'not_found');
  assert.equal(requestFailure(409, 'already_friends'), 'already_friends');
  assert.equal(requestFailure(409, 'already_requested'), 'already_requested');
  assert.equal(requestFailure(409, 'they_already_asked'), 'they_already_asked');
  assert.equal(requestFailure(400, 'cannot_add_self'), 'self');
  assert.equal(requestFailure(400, 'profile_required'), 'profile_required');
  assert.equal(requestFailure(400, 'invalid_friend_code'), 'invalid');
  assert.equal(requestFailure(500, 'internal_error'), 'offline');
});
