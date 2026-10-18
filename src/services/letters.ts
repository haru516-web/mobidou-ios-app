import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

/** What the player wrote at a place, kept as a private letter to themself. It lives only on this device and is never sent anywhere. */
export type Letter = {
  id: string;
  shrineId: string;
  shrineName: string;
  /** What was asked, so the answer still reads well when the questions change later. */
  question: string;
  /** The saying shown just before the question, when there was one. */
  quote?: string;
  answer: string;
  /** ISO time of writing. */
  createdAt: string;
};

const KEY = '@mobidou/letters/v1';
const MAX_ANSWER_LENGTH = 120;

let letters: readonly Letter[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();
const publish = (next: readonly Letter[]) => { letters = next; listeners.forEach(listener => listener()); };

const isLetter = (value: unknown): value is Letter => {
  const entry = value as Letter | null;
  return !!entry && typeof entry.id === 'string' && typeof entry.shrineId === 'string' && typeof entry.shrineName === 'string'
    && typeof entry.question === 'string' && typeof entry.answer === 'string' && typeof entry.createdAt === 'string';
};

const persist = (next: readonly Letter[]) => AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);

export const parseLetters = (raw: string | null): Letter[] => {
  try {
    const value = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(value) ? value.filter(isLetter) : [];
  } catch { return []; }
};

/** Newest first. */
export const sortLetters = (list: readonly Letter[]): Letter[] => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const loadLetters = (): Promise<void> => {
  loaded ??= AsyncStorage.getItem(KEY).then(raw => {
    // A letter written while the stored ones were still being read must not be lost.
    const stored = parseLetters(raw);
    const known = new Set(letters.map(letter => letter.id));
    publish(sortLetters([...letters, ...stored.filter(letter => !known.has(letter.id))]));
  }).catch(() => undefined);
  return loaded;
};

export const addLetter = async (draft: Omit<Letter, 'id' | 'createdAt'> & { createdAt?: string }): Promise<Letter | null> => {
  const answer = draft.answer.trim().slice(0, MAX_ANSWER_LENGTH);
  if (!isValidAnswer(answer)) return null;
  await loadLetters();
  const createdAt = draft.createdAt ?? new Date().toISOString();
  const letter: Letter = { ...draft, answer, createdAt, id: `${createdAt}-${draft.shrineId}` };
  const next = sortLetters([...letters.filter(entry => entry.id !== letter.id), letter]);
  publish(next);
  await persist(next);
  return letter;
};

export const LETTER_MAX_LENGTH = MAX_ANSWER_LENGTH;

/** An answer of a single character, whatever the script, is not an answer. */
export const isValidAnswer = (text: string): boolean => [...text.trim()].length >= 2;

/** The letters on this device, newest first. */
export function useLetters(): readonly Letter[] {
  useEffect(() => { void loadLetters(); }, []);
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => letters, () => letters);
}

const PENDING_KEY = '@mobidou/letters/pending-question/v1';

/** The question being answered right now, so closing the app on that screen brings the player back to the same question. */
export type PendingQuestion = { shrineId: string; question: string };

export const savePendingQuestion = (pending: PendingQuestion): Promise<void> => AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending)).catch(() => undefined);
export const clearPendingQuestion = (): Promise<void> => AsyncStorage.removeItem(PENDING_KEY).catch(() => undefined);
export const loadPendingQuestion = async (): Promise<PendingQuestion | null> => {
  try {
    const value = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? 'null') as PendingQuestion | null;
    return value && typeof value.shrineId === 'string' && typeof value.question === 'string' ? value : null;
  } catch { return null; }
};
