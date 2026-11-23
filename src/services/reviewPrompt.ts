// The App Store rating invitation: asked politely, rarely, and only once the player has really come back a few days.
// The state is tiny and kept on the phone. Pure functions here so the rules can be tested without the phone.
export type ReviewPromptState = { days: string[]; askedAt: number[] };

export const REVIEW_PROMPT_KEY = '@mobidou/review-prompt/v1';
/** Distinct days the app was opened before the first invitation. */
export const REVIEW_MIN_DAYS = 3;
/** Wait this long between two invitations, and never ask more than the max in total. */
export const REVIEW_GAP_MS = 90 * 24 * 60 * 60 * 1000;
export const REVIEW_MAX_ASKS = 3;

export const emptyReviewState = (): ReviewPromptState => ({ days: [], askedAt: [] });

export function parseReviewState(raw: string | null): ReviewPromptState {
  if (!raw) return emptyReviewState();
  try {
    const value = JSON.parse(raw) as Partial<ReviewPromptState>;
    return {
      days: Array.isArray(value.days) ? value.days.filter((d): d is string => typeof d === 'string').slice(-30) : [],
      askedAt: Array.isArray(value.askedAt) ? value.askedAt.filter((t): t is number => Number.isFinite(t)).slice(-REVIEW_MAX_ASKS) : [],
    };
  } catch { return emptyReviewState(); }
}

export const withReviewDay = (state: ReviewPromptState, day: string): ReviewPromptState =>
  state.days.includes(day) ? state : { ...state, days: [...state.days, day].slice(-30) };

export const withReviewAsked = (state: ReviewPromptState, now: number): ReviewPromptState =>
  ({ ...state, askedAt: [...state.askedAt, now].slice(-REVIEW_MAX_ASKS) });

export function shouldAskForReview(state: ReviewPromptState, now: number): boolean {
  if (state.days.length < REVIEW_MIN_DAYS) return false;
  if (state.askedAt.length >= REVIEW_MAX_ASKS) return false;
  const last = state.askedAt.at(-1);
  return last === undefined || now - last >= REVIEW_GAP_MS;
}
