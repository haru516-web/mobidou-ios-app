/*
 * The event team as the screens see it.
 *
 * The server holds the real team (who is in, how far each member has walked, whether the reward was taken).
 * This module keeps a copy in memory for the screens to read at once, and every action goes to the server and
 * then replaces that copy with what the server answers. Without a server address (EXPO_PUBLIC_SERVER_URL set to
 * an empty string) it falls back to a team held only on this device, which is what the development helpers use.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PilgrimageEvent } from '../data/events';
import { authedRequest, readServerAccount, SERVER_URL } from './server';
import { readStepsBetween, type StepSource } from './steps';
import { submitEventSteps } from './eventSteps';
import { canJoin, canLeave, eventProgress, isTeamCode, normalizeTeamCode, startBlocker, teamSteps, type EventTeam, type JoinFailure, type TeamRequest, type StartFailure, type TeamMember } from './eventTeam';

/** `team` is null when the player only asked to join: the maker has to accept first. */
export type EventTeamResult = { ok: true; team: EventTeam | null } | { ok: false; reason: JoinFailure };
export type AnswerResult = 'ok' | 'full' | 'not_found' | 'offline' | 'unavailable';

export type EventTeamApi = {
  get(eventId: string): EventTeam | null;
  /** Ask the server how the team stands now. */
  refresh(eventId: string): Promise<'ok' | 'offline'>;
  create(event: PilgrimageEvent, me: Omit<TeamMember, 'steps'>): Promise<EventTeamResult>;
  join(event: PilgrimageEvent, code: string, me: Omit<TeamMember, 'steps'>): Promise<EventTeamResult>;
  start(event: PilgrimageEvent): Promise<{ ok: true } | { ok: false; reason: StartFailure }>;
  /** The maker accepts or turns down someone who asked to join. */
  answerRequest(event: PilgrimageEvent, requestId: string, accept: boolean): Promise<AnswerResult>;
  /** The player takes back their own request. */
  cancelRequest(eventId: string): Promise<boolean>;
  leave(eventId: string, userId: string): Promise<boolean>;
  claim(event: PilgrimageEvent): Promise<boolean>;
  /** The arrival ceremony for the next unseen spot has been shown. */
  acknowledgeSpot(eventId: string): void;
};

const teams = new Map<string, EventTeam>();
/** The request this player has sent and not had answered yet, with the name of the maker. */
const pendingRequests = new Map<string, { id: string; creatorName: string } | null>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());

/**
 * Whether the server has this event. The buttons that lead into the event are shown only when it does, so a build that
 * is ahead of the server (or a server with no event set up) never offers an event that cannot be played.
 * The last answer is kept on the device, so being offline does not hide an event that was there a moment ago.
 */
const available = new Map<string, boolean>();
const AVAILABLE_KEY = (eventId: string) => `@mobidou/event-available/${eventId}`;
function setAvailable(eventId: string, value: boolean) {
  if (available.get(eventId) === value) return;
  available.set(eventId, value);
  void AsyncStorage.setItem(AVAILABLE_KEY(eventId), value ? '1' : '0').catch(() => undefined);
  emit();
}
const availabilityLoaded = new Set<string>();
async function loadAvailability(eventId: string) {
  if (availabilityLoaded.has(eventId)) return;
  availabilityLoaded.add(eventId);
  try {
    const saved = await AsyncStorage.getItem(AVAILABLE_KEY(eventId));
    if (saved !== null && !available.has(eventId)) { available.set(eventId, saved === '1'); emit(); }
  } catch { /* unknown stays hidden until the server answers */ }
}

const SEEN_KEY = (eventId: string) => `@mobidou/event-seen/${eventId}`;
type SeenRecord = { code: string; seen: number };

async function readSeen(eventId: string): Promise<SeenRecord | null> {
  try {
    const value = JSON.parse(await AsyncStorage.getItem(SEEN_KEY(eventId)) ?? 'null') as Partial<SeenRecord> | null;
    return value && typeof value.code === 'string' && typeof value.seen === 'number' ? { code: value.code, seen: value.seen } : null;
  } catch { return null; }
}
const writeSeen = (eventId: string, record: SeenRecord | null) => (record
  ? AsyncStorage.setItem(SEEN_KEY(eventId), JSON.stringify(record))
  : AsyncStorage.removeItem(SEEN_KEY(eventId))).catch(() => undefined);

/** Reached spots whose arrival was already shown on another phone or an older install must not be shown again. */
function reachedCount(event: PilgrimageEvent, team: Pick<EventTeam, 'members'>) {
  return eventProgress(event, teamSteps(team)).reached;
}

type ServerTeam = { code?: unknown; status?: unknown; members?: unknown; claimed?: unknown; requests?: unknown };

function fromServer(event: PilgrimageEvent, raw: ServerTeam | null | undefined, meId: string | undefined, seen: SeenRecord | null): EventTeam | null {
  if (!raw || typeof raw.code !== 'string' || !Array.isArray(raw.members)) return null;
  const members: TeamMember[] = raw.members.flatMap(item => {
    const m = item as { id?: unknown; name?: unknown; petId?: unknown; steps?: unknown };
    return typeof m.id === 'string' ? [{ id: m.id, name: typeof m.name === 'string' ? m.name : 'もびさん', petId: typeof m.petId === 'string' ? m.petId : 'mobibou', steps: typeof m.steps === 'number' ? m.steps : 0 }] : [];
  });
  const status = raw.status === 'active' || raw.status === 'cleared' ? raw.status : 'recruiting';
  const requests: TeamRequest[] = Array.isArray(raw.requests) ? raw.requests.flatMap(item => {
    const r = item as { id?: unknown; name?: unknown; petId?: unknown };
    return typeof r.id === 'string' ? [{ id: r.id, name: typeof r.name === 'string' ? r.name : 'もびさん', petId: typeof r.petId === 'string' ? r.petId : 'mobibou' }] : [];
  }) : [];
  const team: EventTeam = { code: raw.code, status, members, claimed: raw.claimed === true, seen: 0, meId, requests };
  // A team this device has not seen before (a new phone, a reinstall) starts caught up, so the past arrivals are not replayed.
  team.seen = seen && seen.code === raw.code ? Math.min(seen.seen, reachedCount(event, team)) : reachedCount(event, team);
  return team;
}

type ServerReply = { status: number; data: Record<string, unknown> | null } | null;

const FAILURES: Record<string, JoinFailure> = {
  invalid_team_code: 'invalid', not_found: 'not_found', full: 'full', already_started: 'already_started', already_member: 'already_member', request_pending: 'request_pending',
  profile_required: 'profile_required', event_not_active: 'not_active', too_many_attempts: 'too_many',
};
const failureOf = (reply: ServerReply): JoinFailure => {
  if (!reply) return 'offline';
  const code = typeof reply.data?.error === 'string' ? reply.data.error : '';
  return FAILURES[code] ?? 'unavailable';
};

/** Replace the copy with what the server says (a reply of `team: null` means the player is in no team). */
async function adopt(event: PilgrimageEvent, reply: ServerReply, fresh: boolean): Promise<EventTeam | null> {
  const account = await readServerAccount();
  const body = reply?.data as { team?: ServerTeam | null } | null;
  const previous = await readSeen(event.id);
  const team = fromServer(event, body?.team, account?.userId, fresh ? null : previous);
  if (team) {
    teams.set(event.id, team);
    // Joining or making a team starts at zero arrivals seen; for a team known already the stored count carries on.
    if (fresh) { team.seen = 0; await writeSeen(event.id, { code: team.code, seen: 0 }); }
    else if (!previous || previous.code !== team.code) await writeSeen(event.id, { code: team.code, seen: team.seen });
  } else {
    teams.delete(event.id);
    await writeSeen(event.id, null);
  }
  const asked = (reply?.data as { request?: { id?: unknown; creatorName?: unknown } | null } | null)?.request;
  pendingRequests.set(event.id, !team && asked && typeof asked.id === 'string'
    ? { id: asked.id, creatorName: typeof asked.creatorName === 'string' ? asked.creatorName : 'もびさん' }
    : null);
  emit();
  return team;
}

const serverApi: EventTeamApi = {
  get: eventId => teams.get(eventId) ?? null,
  async refresh(eventId) {
    // A team made up by the development preview is not on the server; leave it alone.
    if (teams.get(eventId)?.code === 'PREVW2') return 'ok';
    const reply = await authedRequest(`/events/${encodeURIComponent(eventId)}/team`, { method: 'GET' });
    if (reply?.status === 404 && reply.data?.error === 'event_not_found') { setAvailable(eventId, false); teams.delete(eventId); emit(); return 'ok'; }
    if (!reply || reply.status !== 200) return 'offline';
    setAvailable(eventId, true);
    const event = knownEvents.get(eventId);
    if (!event) return 'offline';
    await adopt(event, reply, false);
    return 'ok';
  },
  async create(event) {
    knownEvents.set(event.id, event);
    const reply = await authedRequest(`/events/${encodeURIComponent(event.id)}/teams`, { body: {} });
    if (!reply || reply.status !== 201) return { ok: false, reason: failureOf(reply) };
    const team = await adopt(event, reply, true);
    return team ? { ok: true, team } : { ok: false, reason: 'unavailable' };
  },
  async join(event, code) {
    knownEvents.set(event.id, event);
    if (!isTeamCode(code)) return { ok: false, reason: 'invalid' };
    const reply = await authedRequest(`/events/${encodeURIComponent(event.id)}/teams/join`, { body: { code: normalizeTeamCode(code) } });
    // The server only records the request (202); nobody is added until the maker accepts.
    if (!reply || (reply.status !== 202 && reply.status !== 200)) return { ok: false, reason: failureOf(reply) };
    const team = await adopt(event, reply, true);
    return team || pendingRequests.get(event.id) ? { ok: true, team } : { ok: false, reason: 'unavailable' };
  },
  async start(event) {
    const current = teams.get(event.id);
    if (current) { const blocked = startBlocker(current, event); if (blocked) return { ok: false, reason: blocked }; }
    const reply = await authedRequest(`/events/${encodeURIComponent(event.id)}/teams/start`, { body: {} });
    if (!reply) return { ok: false, reason: 'offline' };
    if (reply.status !== 200) {
      const code = typeof reply.data?.error === 'string' ? reply.data.error : '';
      return { ok: false, reason: code === 'too_few' || code === 'not_recruiting' || code === 'not_creator' || code === 'no_team' ? code : 'unavailable' };
    }
    const team = await adopt(event, reply, false);
    // The first arrival is shown from zero for the team that has just set out.
    if (team) { team.seen = 0; await writeSeen(event.id, { code: team.code, seen: 0 }); emit(); }
    return { ok: true };
  },
  async answerRequest(event, requestId, accept) {
    knownEvents.set(event.id, event);
    const reply = await authedRequest(`/events/${encodeURIComponent(event.id)}/requests/${encodeURIComponent(requestId)}/answer`, { body: { accept } });
    if (!reply) return 'offline';
    if (reply.status !== 200) {
      const code = typeof reply.data?.error === 'string' ? reply.data.error : '';
      if (code === 'full') { await serverApi.refresh(event.id); return 'full'; }
      return code === 'request_not_found' ? 'not_found' : 'unavailable';
    }
    await adopt(event, reply, false);
    return 'ok';
  },
  async cancelRequest(eventId) {
    const reply = await authedRequest(`/events/${encodeURIComponent(eventId)}/requests/cancel`, { body: {} });
    if (!reply || reply.status !== 200) return false;
    const event = knownEvents.get(eventId);
    if (event) await adopt(event, reply, false); else { pendingRequests.set(eventId, null); emit(); }
    return true;
  },
  async leave(eventId) {
    const reply = await authedRequest(`/events/${encodeURIComponent(eventId)}/leave`, { body: {} });
    if (!reply || reply.status !== 200) return false;
    teams.delete(eventId);
    await writeSeen(eventId, null);
    emit();
    return true;
  },
  async claim(event) {
    const reply = await authedRequest(`/events/${encodeURIComponent(event.id)}/claim`, { body: {} });
    if (!reply || reply.status !== 200) return false;
    const team = teams.get(event.id);
    if (team) { teams.set(event.id, { ...team, claimed: true }); emit(); }
    return true;
  },
  acknowledgeSpot(eventId) {
    const team = teams.get(eventId);
    if (!team) return;
    const next = { ...team, seen: team.seen + 1 };
    teams.set(eventId, next);
    void writeSeen(eventId, { code: team.code, seen: next.seen });
    emit();
  },
};

/** Events the app has shown, so a refresh by id knows the steps and spots it is judging by. */
const knownEvents = new Map<string, PilgrimageEvent>();

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

/** A team on this device only: used when there is no server address, and by the development helpers. */
const localApi: EventTeamApi = {
  get: eventId => teams.get(eventId) ?? null,
  async refresh() { return 'ok'; },
  async create(event, me) {
    const team: EventTeam = { code: randomCode(), status: 'recruiting', members: [{ ...me, steps: 0 }], claimed: false, seen: 0, meId: me.id };
    teams.set(event.id, team);
    emit();
    return { ok: true, team };
  },
  async join(event, code, me) {
    if (!isTeamCode(code)) return { ok: false, reason: 'invalid' };
    const team = teams.get(event.id);
    if (!team || team.code !== normalizeTeamCode(code)) return { ok: false, reason: 'not_found' };
    const blocked = canJoin(team, event, me.id);
    if (blocked) return { ok: false, reason: blocked };
    const next = { ...team, members: [...team.members, { ...me, steps: 0 }] };
    teams.set(event.id, next);
    emit();
    return { ok: true, team: next };
  },
  async start(event) {
    const team = teams.get(event.id);
    if (!team) return { ok: false, reason: 'no_team' };
    const blocked = startBlocker(team, event);
    if (blocked) return { ok: false, reason: blocked };
    teams.set(event.id, { ...team, status: 'active' });
    emit();
    return { ok: true };
  },
  async answerRequest() { return 'unavailable'; },
  async cancelRequest() { return true; },
  async leave(eventId, userId) {
    const team = teams.get(eventId);
    if (!team || !canLeave(team)) return false;
    const members = team.members.filter(m => m.id !== userId);
    if (members.length === 0) teams.delete(eventId); else teams.set(eventId, { ...team, members });
    emit();
    return true;
  },
  async claim(event) {
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

export const eventTeamApi: EventTeamApi = SERVER_URL ? serverApi : localApi;

/** Development helpers for trying every state without a second player. They change only this device's copy. */
export const devEventTeam = {
  addFriend(eventId: string, name: string) {
    const team = teams.get(eventId);
    if (!team) return;
    const id = `dev-${team.members.length}`;
    const members = [...team.members, { id, name, petId: 'mobibou', steps: 0 }];
    // Like the real thing: a second member sets the team out.
    teams.set(eventId, { ...team, members, status: team.status === 'recruiting' && members.length >= 2 ? 'active' : team.status });
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
  /** A team that has already set out with `steps` walked, its arrival ceremonies already seen: for looking at the screens. */
  seedPreview(event: PilgrimageEvent, steps: number, me: Omit<TeamMember, 'steps'>) {
    const reached = eventProgress(event, steps).reached;
    available.set(event.id, true);
    teams.set(event.id, { code: 'PREVW2', status: 'active', claimed: false, seen: reached, meId: me.id, members: [{ ...me, steps: Math.round(steps * .6) }, { id: 'dev-friend', name: '友だち', petId: 'mobibou', steps: Math.round(steps * .4) }] });
    emit();
  },
};

/** Whether the event can be played now: it is on the server (or there is no server and the team is kept on the device). */
export function useEventAvailable(eventId: string): boolean {
  const [value, setValue] = useState(() => !SERVER_URL || available.get(eventId) === true);
  useEffect(() => {
    if (!SERVER_URL) return undefined;
    const update = () => setValue(available.get(eventId) === true);
    listeners.add(update);
    void loadAvailability(eventId).then(update);
    update();
    return () => { listeners.delete(update); };
  }, [eventId]);
  return value;
}

export function useEventPendingRequest(eventId: string): { id: string; creatorName: string } | null {
  const [pending, setPending] = useState(() => pendingRequests.get(eventId) ?? null);
  useEffect(() => {
    const update = () => setPending(pendingRequests.get(eventId) ?? null);
    listeners.add(update);
    update();
    return () => { listeners.delete(update); };
  }, [eventId]);
  return pending;
}

export function useEventTeam(eventId: string): EventTeam | null {
  const [team, setTeam] = useState(() => teams.get(eventId) ?? null);
  useEffect(() => {
    const update = () => setTeam(teams.get(eventId) ?? null);
    listeners.add(update);
    update();
    return () => { listeners.delete(update); };
  }, [eventId]);
  return team;
}

/** Load the team once the app has an event to show (a restart, or a new phone), so the buttons and the map are right at once. */
export function loadEventTeam(event: PilgrimageEvent): Promise<'ok' | 'offline'> {
  knownEvents.set(event.id, event);
  return eventTeamApi.refresh(event.id);
}

/** Send the steps of the open day for the team that has set out. At most once per `minGapMs`, never at the same time twice. */
let lastSend = 0;
let sending = false;
export async function sendEventSteps(event: PilgrimageEvent, source: StepSource, options: { minGapMs?: number; now?: Date } = {}): Promise<'sent' | 'skipped' | 'failed'> {
  const team = teams.get(event.id);
  if (!SERVER_URL || sending || source === 'none' || !team || team.status !== 'active') return 'skipped';
  const now = options.now ?? new Date();
  if (now.getTime() - lastSend < (options.minGapMs ?? 120_000)) return 'skipped';
  sending = true;
  try {
    const result = await submitEventSteps({
      eventId: event.id,
      now,
      readSteps: (start, end) => readStepsBetween(source, start, end),
      transport: async request => {
        const reply = await authedRequest(`/events/${encodeURIComponent(request.eventId)}/steps`, { body: { cumulative: request.cumulative, day: request.day } });
        if (!reply) throw new Error('offline');
        return { status: reply.status, body: reply.data };
      },
    });
    lastSend = Date.now();
    if (!result.ok) return 'failed';
    knownEvents.set(event.id, event);
    await eventTeamApi.refresh(event.id);
    return 'sent';
  } catch {
    return 'failed';
  } finally {
    sending = false;
  }
}
