import test from 'node:test';
import assert from 'node:assert/strict';
import { TOKI_MEGURU } from '../src/data/events.ts';
import { canJoin, canLeave, eventProgress, isTeamCode, startBlocker, teamCodeFromUrl, teamInviteLink, teamSteps, type EventTeam } from '../src/services/eventTeam.ts';

const member = (id: string, steps = 0) => ({ id, name: id, petId: 'mobibou', steps });
const team = (status: EventTeam['status'], n: number): EventTeam => ({ code: 'ABCDEF', status, members: Array.from({ length: n }, (_, i) => member(`m${i}`)), claimed: false, seen: 0 });

test('the first event is a fixed-goal map of 2 to 4 people with rising spot thresholds', () => {
  assert.equal(TOKI_MEGURU.minMembers, 2);
  assert.equal(TOKI_MEGURU.maxMembers, 4);
  const spots = TOKI_MEGURU.spots ?? [];
  assert.ok(spots.length > 0);
  assert.deepEqual(spots.map(s => s.at), [...spots.map(s => s.at)].sort((a, b) => a - b));
  assert.equal(spots.at(-1)?.at, TOKI_MEGURU.goalSteps);
});

test('progress follows the summed steps and clears at the goal', () => {
  assert.deepEqual({ ...eventProgress(TOKI_MEGURU, 0), next: undefined }, { steps: 0, reached: 0, next: undefined, ratio: 0, cleared: false });
  const mid = eventProgress(TOKI_MEGURU, 50000);
  assert.equal(mid.reached, 1);
  assert.equal(mid.next?.id, 'showa-toge');
  assert.equal(mid.ratio, .5);
  const done = eventProgress(TOKI_MEGURU, 999999);
  assert.equal(done.cleared, true);
  assert.equal(done.next, null);
  assert.equal(done.reached, TOKI_MEGURU.spots?.length);
});

test('team steps add up and ignore negatives', () => {
  assert.equal(teamSteps({ members: [member('a', 100), member('b', 250), member('c', -5)] }), 350);
});

test('joining is refused when the team is full, started, or already has you', () => {
  assert.equal(canJoin(team('recruiting', 3), TOKI_MEGURU, 'new'), null);
  assert.equal(canJoin(team('recruiting', 4), TOKI_MEGURU, 'new'), 'full');
  assert.equal(canJoin(team('active', 2), TOKI_MEGURU, 'new'), 'already_started');
  assert.equal(canJoin(team('recruiting', 2), TOKI_MEGURU, 'm0'), 'already_member');
});

test('a team cannot set out alone, and members cannot leave after setting out', () => {
  assert.equal(startBlocker(team('recruiting', 1), TOKI_MEGURU), 'too_few');
  assert.equal(startBlocker(team('recruiting', 2), TOKI_MEGURU), null);
  assert.equal(startBlocker(team('active', 3), TOKI_MEGURU), 'not_recruiting');
  assert.equal(canLeave(team('recruiting', 2)), true);
  assert.equal(canLeave(team('active', 2)), false);
});

test('team codes are read from the app link or the web link, and from nothing else', () => {
  assert.equal(isTeamCode('abc-def'), true);
  assert.equal(isTeamCode('ABC0EF'), false);
  assert.equal(teamInviteLink('https://x.example/', 'abcdef'), 'https://x.example/t/ABCDEF');
  assert.equal(teamCodeFromUrl('mobidou://team?code=abcdef'), 'ABCDEF');
  assert.equal(teamCodeFromUrl('https://x.example/t/ABCDEF?utm=1'), 'ABCDEF');
  assert.equal(teamCodeFromUrl('mobidou://friend?code=ABCDEF'), null);
  assert.equal(teamCodeFromUrl('mobidou://team?code=NOPE'), null);
  assert.equal(teamCodeFromUrl(null), null);
});
