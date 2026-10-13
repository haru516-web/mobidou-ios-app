/*
 * Event teams: who is in, how far the team has walked, and what may happen next.
 * Pure on purpose (no React Native, no storage, no network) so it can be tested
 * directly. The server decides all of this for real; the app only shows it.
 */
import type { EventSpot, PilgrimageEvent } from '../data/events';

export type TeamStatus = 'recruiting' | 'active' | 'cleared';
export type TeamMember = { id: string; name: string; petId: string; steps: number };
/** Someone who asked to join; the player who made the team answers. */
export type TeamRequest = { id: string; name: string; petId: string };
/** `seen`: how many reached spots the arrival ceremony has already been shown for. */
export type EventTeam = { code: string; status: TeamStatus; members: TeamMember[]; claimed: boolean; seen: number; /** Players who asked to join; only the player who made the team gets them. */ requests?: TeamRequest[]; /** Epoch ms from which this player's steps count: when they joined, or when the team set out if later. */ since?: number; /** The player's own member id, so the screens can tell which member is them. */ meId?: string };

/** Team code alphabet: same as friend codes (no 0/O/1/I). */
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
export const normalizeTeamCode = (value: string) => value.replace(/[\s-]/g, '').toUpperCase();
export const isTeamCode = (value: string) => CODE.test(normalizeTeamCode(value));

export const teamSteps = (team: Pick<EventTeam, 'members'>) => team.members.reduce((sum, m) => sum + Math.max(0, m.steps), 0);

export type EventProgress = {
  steps: number;
  /** Spots already reached. */
  reached: number;
  /** The spot being walked to; null once the map is cleared. */
  next: EventSpot | null;
  /** 0..1 of the way between the previous spot and `next`. */
  ratio: number;
  cleared: boolean;
};

export function eventProgress(event: Pick<PilgrimageEvent, 'spots' | 'goalSteps'>, steps: number): EventProgress {
  const spots = event.spots ?? [];
  const total = Math.max(0, Math.floor(steps));
  const reached = spots.filter(s => total >= s.at).length;
  const cleared = !!event.goalSteps && total >= event.goalSteps;
  const next = cleared ? null : spots[reached] ?? null;
  const previous = reached === 0 ? 0 : spots[reached - 1].at;
  const ratio = next ? Math.max(0, Math.min(1, (total - previous) / Math.max(1, next.at - previous))) : 1;
  return { steps: total, reached, next, ratio, cleared };
}

export type JoinFailure = 'invalid' | 'not_found' | 'full' | 'already_started' | 'already_member' | 'request_pending'
  /** Not about the code: the server could not be reached, a name is needed first, the event is not running, too many tries, or something unexpected. */
  | 'offline' | 'profile_required' | 'not_active' | 'too_many' | 'unavailable';

export type StartFailure = 'too_few' | 'not_recruiting' | 'no_team' | 'not_creator' | 'offline' | 'unavailable';

/** Whether one more person may join this team. */
export function canJoin(team: EventTeam, event: Pick<PilgrimageEvent, 'maxMembers'>, userId: string): JoinFailure | null {
  if (team.members.some(m => m.id === userId)) return 'already_member';
  if (team.status !== 'recruiting') return 'already_started';
  if (team.members.length >= (event.maxMembers ?? 4)) return 'full';
  return null;
}

/** Why the team cannot set out yet, or null if it can. Solo play is not possible. */
export function startBlocker(team: EventTeam, event: Pick<PilgrimageEvent, 'minMembers'>): 'not_recruiting' | 'too_few' | null {
  if (team.status !== 'recruiting') return 'not_recruiting';
  return team.members.length < (event.minMembers ?? 2) ? 'too_few' : null;
}

/** A member keeps their steps if they leave later, so only a recruiting team may lose a member. */
export const canLeave = (team: EventTeam) => team.status === 'recruiting';

export function inviteMessage(event: Pick<PilgrimageEvent, 'name'>, code: string, link: string) {
  return `もび道のイベント「${event.name}」をいっしょに歩こう！\nチームコード：${normalizeTeamCode(code)}\n${link}`;
}

export const teamInviteLink = (serverUrl: string, code: string) => `${serverUrl.replace(/\/$/, '')}/t/${normalizeTeamCode(code)}`;

/** The code in an invite: the app's own link (`mobidou://team?code=…`) or the web page link (`…/t/CODE`). */
export function teamCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const app = /^mobidou:\/\/team\/?\?(?:[^#]*&)?code=([^&#]+)/i.exec(url);
  const web = /^https?:\/\/[^/]+\/t\/([^/?#]+)\/?(?:[?#].*)?$/i.exec(url);
  const raw = app?.[1] ?? web?.[1];
  if (!raw) return null;
  let decoded: string;
  try { decoded = decodeURIComponent(raw); } catch { return null; }
  return isTeamCode(decoded) ? normalizeTeamCode(decoded) : null;
}
