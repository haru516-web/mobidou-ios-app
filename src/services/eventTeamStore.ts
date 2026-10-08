/*
 * The event team as the screens see it. Until the app is connected to the server
 * this is a local mock held in memory; the screens only use `EventTeamApi`, so the
 * server version can replace `mockApi` without touching them.
 */
import { useEffect, useState } from 'react';
import type { PilgrimageEvent } from '../data/events';
import { canJoin, canLeave, eventProgress, isTeamCode, normalizeTeamCode, startBlocker, teamSteps, type EventTeam, type JoinFailure, type TeamMember } from './eventTeam';

export type EventTeamApi = {
  get(eventId: string): EventTeam | null;
  create(event: PilgrimageEvent, me: Omit<TeamMember, 'steps'>): EventTeam;
  join(event: PilgrimageEvent, code: string, me: Omit<TeamMember, 'steps'>): { ok: true; team: EventTeam } | { ok: false; reason: JoinFailure };
  start(event: PilgrimageEvent): { ok: true } | { ok: false; reason: 'too_few' | 'not_recruiting' | 'no_team' };
  leave(eventId: string, userId: string): boolean;
  claim(event: PilgrimageEvent): boolean;
  /** The arrival ceremony for the next unseen spot has been shown. */
  acknowledgeSpot(eventId: string): void;
};

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

const teams = new Map<string, EventTeam>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());

const mockApi: EventTeamApi = {
  get: eventId => teams.get(eventId) ?? null,
  create(event, me) {
    const team: EventTeam = { code: randomCode(), status: 'recruiting', members: [{ ...me, steps: 0 }], claimed: false, seen: 0 };
    teams.set(event.id, team);
    emit();
    return team;
  },
  join(event, code, me) {
    if (!isTeamCode(code)) return { ok: false, reason: 'invalid' };
    // The mock has only the player's own team, so any well-formed code that is not it is "not found".
    const team = teams.get(event.id);
    if (!team || team.code !== normalizeTeamCode(code)) return { ok: false, reason: 'not_found' };
    const blocked = canJoin(team, event, me.id);
    if (blocked) return { ok: false, reason: blocked };
    const next = { ...team, members: [...team.members, { ...me, steps: 0 }] };
    teams.set(event.id, next);
    emit();
    return { ok: true, team: next };
  },
  start(event) {
    const team = teams.get(event.id);
    if (!team) return { ok: false, reason: 'no_team' };
    const blocked = startBlocker(team, event);
    if (blocked) return { ok: false, reason: blocked };
    teams.set(event.id, { ...team, status: 'active' });
    emit();
    return { ok: true };
  },
  leave(eventId, userId) {
    const team = teams.get(eventId);
    if (!team || !canLeave(team)) return false;
    const members = team.members.filter(m => m.id !== userId);
    if (members.length === 0) teams.delete(eventId); else teams.set(eventId, { ...team, members });
    emit();
    return true;
  },
  claim(event) {
    const team = teams.get(event.id);
    if (!team || team.claimed || !eventProgress(event, teamSteps(team)).cleared) return false;
    teams.set(event.id, { ...team, status: 'cleared', claimed: true });
    emit();
    return true;
  },
  acknowledgeSpot(eventId) {
    const team = teams.get(eventId);
    if (!team) return;
    teams.set(eventId, { ...team, seen: team.seen + 1 });
    emit();
  },
};

export const eventTeamApi: EventTeamApi = mockApi;

/** Development helpers for trying every state before the server exists. */
export const devEventTeam = {
  addFriend(eventId: string, name: string) {
    const team = teams.get(eventId);
    if (!team) return;
    const id = `dev-${team.members.length}`;
    teams.set(eventId, { ...team, members: [...team.members, { id, name, petId: 'mobibou', steps: 0 }] });
    emit();
  },
  addSteps(eventId: string, steps: number) {
    const team = teams.get(eventId);
    if (!team || team.status === 'recruiting') return;
    const members = team.members.map((m, i) => (i === 0 ? { ...m, steps: m.steps + steps } : { ...m, steps: m.steps + Math.round(steps * .6) }));
    teams.set(eventId, { ...team, members });
    emit();
  },
  reset(eventId: string) { teams.delete(eventId); emit(); },
};

export function useEventTeam(eventId: string): EventTeam | null {
  const [team, setTeam] = useState(() => mockApi.get(eventId));
  useEffect(() => {
    const update = () => setTeam(mockApi.get(eventId));
    listeners.add(update);
    update();
    return () => { listeners.delete(update); };
  }, [eventId]);
  return team;
}
