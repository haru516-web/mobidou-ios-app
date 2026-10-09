/*
 * The event gacha: its own 木札 and its own pool (the event Mobbies), apart from the ordinary gacha.
 * The 木札 come from walking: one for each quarter of the event map, four in all.
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

export const eventTicketsLeft = (state: EventGachaState) => Math.max(0, state.granted - state.used);

const whole = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);

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

/** Raises the earned total to `total` (never lowers it). */
export function grantEventTickets(state: EventGachaState, total: number): EventGachaState {
  const next = Math.min(EVENT_TICKETS_IN_TOTAL, whole(total));
  return next > state.granted ? { ...state, granted: next } : state;
}

/**
 * Spends up to `count` 木札, each drawing one of `pool` with the same chance. A Mobby already owned can come again.
 * `owned` is how many of each the player holds; the result says what to hold afterwards.
 */
export function drawEventPulls(state: EventGachaState, owned: Record<string, number>, pool: readonly string[], count: number, random: () => number = Math.random): { state: EventGachaState; owned: Record<string, number>; drawn: number } {
  const times = Math.max(0, Math.min(Math.floor(count), eventTicketsLeft(state)));
  if (times === 0 || pool.length === 0) return { state, owned, drawn: 0 };
  const nextOwned = { ...owned };
  const results: PullResult[] = [];
  for (let i = 0; i < times; i++) {
    const petId = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    results.push({ petId, isNew: (nextOwned[petId] ?? 0) === 0, guaranteed: false, kind: 'free' });
    nextOwned[petId] = (nextOwned[petId] ?? 0) + 1;
  }
  return { state: { ...state, used: state.used + times, unrevealed: [...state.unrevealed, ...results] }, owned: nextOwned, drawn: times };
}

export const acknowledgeEventPulls = (state: EventGachaState): EventGachaState => (state.unrevealed.length ? { ...state, unrevealed: [] } : state);
