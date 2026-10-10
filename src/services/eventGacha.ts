/*
 * The event gacha uses the same 木札 as the ordinary one; its own pool is the event Mobbies.
 * The 木札 come from walking: one for each quarter of the event map, four in all, added to the ordinary 木札.
 * Pure on purpose (no React Native, no storage), so it can be tested directly.
 */
import type { PullResult } from './gacha';

export type EventGachaState = {
  /** 木札 earned so far (the most the map has given; never goes down). */
  granted: number;
  /** 木札 already spent on pulls. */
  used: number;
  /** Results drawn and waiting for the reveal. */
  unrevealed: PullResult[];
};

export const emptyEventGacha = (): EventGachaState => ({ granted: 0, used: 0, unrevealed: [] });

export const EVENT_TICKETS_IN_TOTAL = 4;

/** 木札 the map has given at `steps`: one per quarter of `goalSteps`, 0..4. */
export function eventTicketsEarned(goalSteps: number | undefined, steps: number): number {
  if (!goalSteps || goalSteps <= 0) return 0;
  return Math.max(0, Math.min(EVENT_TICKETS_IN_TOTAL, Math.floor((Math.max(0, steps) / goalSteps) * EVENT_TICKETS_IN_TOTAL + 1e-9)));
}

/** The team steps at which the next 木札 is given, or null when all four are earned. */
export function nextEventTicketAt(goalSteps: number | undefined, earned: number): number | null {
  if (!goalSteps || earned >= EVENT_TICKETS_IN_TOTAL) return null;
  return Math.ceil((goalSteps * (earned + 1)) / EVENT_TICKETS_IN_TOTAL);
}

const whole = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);

/**
 * Event 木札 are ordinary 木札 (the ones the gacha screen already counts); this only remembers how many the
 * map has handed over, so each is given once. `used` and `unrevealed` are what older saves kept apart.
 */
export function normalizeEventGacha(value: unknown, isKnownPet: (id: string) => boolean): EventGachaState {
  if (!value || typeof value !== 'object') return emptyEventGacha();
  const v = value as { granted?: unknown; used?: unknown; unrevealed?: unknown };
  const granted = Math.min(EVENT_TICKETS_IN_TOTAL, whole(v.granted));
  const used = Math.min(granted, whole(v.used));
  const unrevealed = Array.isArray(v.unrevealed)
    ? v.unrevealed.flatMap((row): PullResult[] => {
      const r = row as Partial<PullResult> | null;
      return r && typeof r.petId === 'string' && isKnownPet(r.petId) ? [{ petId: r.petId, isNew: r.isNew === true, guaranteed: false, kind: 'free' }] : [];
    })
    : [];
  return { granted, used, unrevealed };
}

/** Raises the earned total to `total` (never lowers it); `credited` is how many new 木札 to add to the ordinary ones. */
export function creditEventTickets(state: EventGachaState, total: number): { state: EventGachaState; credited: number } {
  const next = Math.min(EVENT_TICKETS_IN_TOTAL, whole(total));
  return next > state.granted ? { state: { ...state, granted: next }, credited: next - state.granted } : { state, credited: 0 };
}

/**
 * Older saves kept event 木札 apart from the ordinary ones. Whatever was still unspent becomes ordinary 木札,
 * and results drawn but not yet revealed go to the shared reveal. Done once: the state is left empty afterwards.
 */
export function settleLegacyEventGacha(state: EventGachaState): { state: EventGachaState; tickets: number; unrevealed: PullResult[] } {
  const tickets = Math.max(0, state.granted - state.used);
  if (tickets === 0 && state.unrevealed.length === 0) return { state, tickets: 0, unrevealed: [] };
  return { state: { granted: state.granted, used: state.granted, unrevealed: [] }, tickets, unrevealed: state.unrevealed };
}
