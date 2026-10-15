import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { readServerAccount, request } from './server';
import { ABSENCE_BODY, ABSENCE_TITLE, absenceTimes, OMIKUJI_BODY, OMIKUJI_TITLE, omikujiTimes, REMINDER_BODY, REMINDER_TITLE, reminderTimes, type ReminderOptions } from './notificationPlan';

/*
 * Notifications.
 *
 * Two kinds, both switched on and off together by one setting:
 * - from the server (Expo push): a request to join your team, the answer, the team setting out, the goal reached,
 *   and friend requests. The server only needs a device token for them.
 * - on the device: a reminder a few minutes after 20:00 Japan time to bring the day's steps to the team.
 *
 * The player is asked for permission when they first do something that needs an answer (make or join a team, ask a
 * friend), not when the app opens. Nothing here throws into the UI.
 */

const ENABLED_KEY = '@mobidou/notifications/enabled';
const TOKEN_KEY = '@mobidou/notifications/token';
const REMINDER_PREFIX = 'steps-reminder-';
const OMIKUJI_KEY = '@mobidou/notifications/omikuji';
const OMIKUJI_PREFIX = 'omikuji-reminder-';
const ABSENCE_PREFIX = 'absence-reminder-';
const TOKEN_REFRESH_MS = 7 * 86_400_000;
/** A token whose removal from the server has not gone through yet: it is tried again until the server has dropped it. */
const REMOVE_KEY = '@mobidou/notifications/pending-removal';

/** 'unset' until the player has been asked; then on or off. */
export type NotificationSetting = 'unset' | 'on' | 'off';

const supported = Platform.OS === 'ios';
const listeners = new Set<() => void>();
let current: NotificationSetting = 'unset';
/** Changes with every change of the setting: a registration asked for before a change is not carried out after it. */
let generation = 0;
let loaded = false;

if (supported) {
  // A notification that arrives while the app is open is shown as a banner too.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

async function load(): Promise<NotificationSetting> {
  if (loaded) return current;
  try {
    const value = await AsyncStorage.getItem(ENABLED_KEY);
    current = value === 'on' || value === 'off' ? value : 'unset';
  } catch { current = 'unset'; }
  loaded = true;
  return current;
}
async function store(value: NotificationSetting): Promise<void> {
  current = value;
  generation += 1;
  loaded = true;
  try { await AsyncStorage.setItem(ENABLED_KEY, value); } catch { /* it lasts until the app is closed */ }
  listeners.forEach(listener => listener());
}

export function useNotificationSetting(): NotificationSetting {
  const [value, setValue] = useState<NotificationSetting>(current);
  useEffect(() => {
    let active = true;
    const update = () => { if (active) setValue(current); };
    listeners.add(update);
    void load().then(update);
    return () => { active = false; listeners.delete(update); };
  }, []);
  return value;
}

async function permissionGranted(ask: boolean): Promise<boolean> {
  try {
    const now = await Notifications.getPermissionsAsync();
    if (now.granted) return true;
    if (!ask || !now.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch { return false; }
}

/** Registration and removal are done one at a time, so a late answer never undoes a newer decision. */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

type PendingRemoval = { token: string; userId: string; generation: number };
async function readPendingRemoval(): Promise<PendingRemoval | null> {
  try {
    const raw = await AsyncStorage.getItem(REMOVE_KEY);
    if (!raw) return null;
    // Builds before this one kept the bare token: its owner is unknown (empty), so it is released by the device, not removed by an owner.
    if (raw.startsWith('Expo')) return { token: raw, userId: '', generation: 0 };
    const parsed = JSON.parse(raw) as Partial<PendingRemoval> | null;
    return parsed && typeof parsed.token === 'string' && typeof parsed.userId === 'string' ? { token: parsed.token, userId: parsed.userId, generation: Number(parsed.generation) || 0 } : null;
  } catch { return null; }
}

/** Tell the server which device to notify (only when the player is signed in to it). */
async function registerTokenNow(force: boolean, requested: number): Promise<boolean> {
  // Asked for before the setting changed (turned off in between): not carried out.
  const stillWanted = async () => requested === generation && (await load()) === 'on';
  if (!(await stillWanted())) return false;
  const account = supported ? await readServerAccount() : null;
  if (!account) return false;
  try {
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    const known = JSON.parse((await AsyncStorage.getItem(TOKEN_KEY)) ?? 'null') as { token?: string; userId?: string; at?: number } | null;
    // The cached answer is only good for the account it was made for: another account on this device registers again.
    if (!force && known?.token === token && known.userId === account.userId && typeof known.at === 'number' && Date.now() - known.at < TOKEN_REFRESH_MS) return true;
    // The setting may have been turned off while the token was being fetched.
    if (!(await stillWanted())) return false;
    // Sent with the account that was read above (never "whichever is current by now").
    const reply = await request('/push/token', { body: { token, team: true, friend: true }, account });
    if (reply?.status !== 200) return false;
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify({ token, userId: account.userId, at: Date.now() }));
    // The token now belongs to this account: a removal that was waiting for the same token is moot.
    const waiting = await readPendingRemoval();
    if (waiting?.token === token) await AsyncStorage.removeItem(REMOVE_KEY);
    return true;
  } catch { return false; }
}
const registerToken = (force = false, requested = generation) => serial(() => registerTokenNow(force, requested));

/** Send a removal that has not been accepted yet. It is forgotten only when the server says it dropped it, for the account it belongs to. */
async function retryPendingRemovalNow(): Promise<void> {
  try {
    const waiting = await readPendingRemoval();
    if (!waiting) return;
    const account = await readServerAccount();
    if (!account) return;
    // The account it belongs to is the one on the device: removed by it. Another account is on the device now (or the owner is
    // unknown): the device lets the token go with whichever account it has, the token being the proof that it holds it.
    const owner = account.userId === waiting.userId;
    const reply = await request(owner ? '/push/token/remove' : '/push/token/release', { body: { token: waiting.token }, account });
    if (reply?.status !== 200) return;
    const now = await readPendingRemoval();
    if (now && now.token === waiting.token && now.userId === waiting.userId && now.generation === waiting.generation) await AsyncStorage.removeItem(REMOVE_KEY);
  } catch { /* tried again next time */ }
}

async function unregisterTokenNow(): Promise<void> {
  try {
    const known = JSON.parse((await AsyncStorage.getItem(TOKEN_KEY)) ?? 'null') as { token?: string; userId?: string } | null;
    const account = await readServerAccount();
    const userId = known?.userId ?? account?.userId;
    if (known?.token && userId) await AsyncStorage.setItem(REMOVE_KEY, JSON.stringify({ token: known.token, userId, generation: Date.now() } satisfies PendingRemoval));
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch { /* the removal is tried again at the next start */ }
  await retryPendingRemovalNow();
}
const unregisterToken = () => serial(unregisterTokenNow);
const retryPendingRemoval = () => serial(retryPendingRemovalNow);

/**
 * Called when the player does something whose answer comes later (makes or asks to join a team, asks a friend).
 * The first time, this asks for permission; after that it only makes sure the device is registered.
 */
export async function offerNotifications(): Promise<void> {
  if (!supported) return;
  const setting = await load();
  if (setting === 'off') return;
  if (!(await permissionGranted(setting === 'unset'))) { if (setting === 'unset') await store('off'); return; }
  if (setting === 'unset') await store('on');
  await registerToken();
}

/** The settings switch. Turning it on asks for permission when needed. Returns the resulting setting. */
export async function setNotificationsEnabled(on: boolean): Promise<NotificationSetting> {
  if (!supported) return current;
  if (!on) {
    await store('off');
    await unregisterToken();
    await cancelReminders();
    await cancelByPrefix(ABSENCE_PREFIX);
    return 'off';
  }
  if (!(await permissionGranted(true))) { await store('off'); return 'off'; }
  await store('on');
  await registerToken(true);
  return 'on';
}

/** At app start: keep the device registered when the player has said yes. */
export async function refreshRegistration(): Promise<void> {
  if (!supported) return;
  // Notifications were turned off while the server could not be reached: finish dropping the token first.
  const requested = generation;
  await retryPendingRemoval();
  if ((await load()) !== 'on') return;
  if (!(await permissionGranted(false))) return;
  await registerToken(false, requested);
}

async function cancelByPrefix(prefix: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter(item => item.identifier.startsWith(prefix)).map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  } catch { /* nothing was scheduled */ }
}
const cancelReminders = () => cancelByPrefix(REMINDER_PREFIX);

/** Make the on-device reminders match the situation now: the next few evenings while a team is out, none otherwise. */
export async function syncStepReminders(options: Omit<ReminderOptions, 'enabled'>, now = new Date()): Promise<void> {
  if (!supported) return;
  await cancelReminders();
  const enabled = (await load()) === 'on' && await permissionGranted(false);
  const times = reminderTimes(now, { ...options, enabled });
  try {
    for (const at of times) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${at}`,
        content: { title: REMINDER_TITLE, body: REMINDER_BODY, data: { type: 'steps' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
      });
    }
  } catch { /* a reminder that cannot be set is not worth a message */ }
}

// ---- the daily omikuji reminder: its own switch, off until the player turns it on, on the phone only

let omikujiOn = true;
let omikujiLoaded = false;
const omikujiListeners = new Set<() => void>();
async function loadOmikuji(): Promise<boolean> {
  if (!omikujiLoaded) {
    // On unless the player has turned it off; it only reaches them once the phone's own permission is given.
    try { omikujiOn = (await AsyncStorage.getItem(OMIKUJI_KEY)) !== 'off'; } catch { omikujiOn = true; }
    omikujiLoaded = true;
  }
  return omikujiOn;
}

export function useOmikujiReminder(): boolean {
  const [value, setValue] = useState(omikujiOn);
  useEffect(() => {
    let active = true;
    const update = () => { if (active) setValue(omikujiOn); };
    omikujiListeners.add(update);
    void loadOmikuji().then(update);
    return () => { active = false; omikujiListeners.delete(update); };
  }, []);
  return value;
}

/** The settings switch for the daily omikuji reminder. Turning it on asks for permission when needed. */
export async function setOmikujiReminder(on: boolean): Promise<boolean> {
  if (!supported) return false;
  if (on && !(await permissionGranted(true))) return false;
  omikujiOn = on;
  omikujiLoaded = true;
  try { await AsyncStorage.setItem(OMIKUJI_KEY, on ? 'on' : 'off'); } catch { /* it lasts until the app is closed */ }
  if (!on) await cancelByPrefix(OMIKUJI_PREFIX);
  omikujiListeners.forEach(listener => listener());
  return omikujiOn;
}

/** Make the morning reminders match the situation now: the next two weeks, without today's once the omikuji is drawn. */
export async function syncOmikujiReminders(options: { drawnToday: boolean }, now = new Date()): Promise<void> {
  if (!supported) return;
  await cancelByPrefix(OMIKUJI_PREFIX);
  const enabled = (await loadOmikuji()) && await permissionGranted(false);
  try {
    for (const at of omikujiTimes(now, { enabled, drawnToday: options.drawnToday })) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${OMIKUJI_PREFIX}${at}`,
        content: { title: OMIKUJI_TITLE, body: OMIKUJI_BODY, data: { type: 'omikuji' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
      });
    }
  } catch { /* a reminder that cannot be set is not worth a message */ }
}

/** Plan the two "you have been away" reminders from now (day 5 and day 12), or none when notifications are off. */
export async function syncAbsenceReminders(now = new Date()): Promise<void> {
  if (!supported) return;
  await cancelByPrefix(ABSENCE_PREFIX);
  const enabled = (await load()) === 'on' && await permissionGranted(false);
  try {
    for (const at of absenceTimes(now, { enabled })) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${ABSENCE_PREFIX}${at}`,
        content: { title: ABSENCE_TITLE, body: ABSENCE_BODY, data: { type: 'absence' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
      });
    }
  } catch { /* a reminder that cannot be set is not worth a message */ }
}

export type NotificationTap = { type: string; eventId?: string };

/** Calls back when a notification arrives while the app is open. Returns the unsubscribe. */
export function onNotificationArrived(handler: (type: string) => void): () => void {
  if (!supported) return () => undefined;
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data as { type?: unknown } | undefined;
    if (data && typeof data.type === 'string') handler(data.type);
  });
  return () => subscription.remove();
}

/** Calls back when the player taps a notification, including the one that opened the app. Returns the unsubscribe. */
export function onNotificationTap(handler: (tap: NotificationTap) => void): () => void {
  if (!supported) return () => undefined;
  const read = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data as { type?: unknown; eventId?: unknown } | undefined;
    if (data && typeof data.type === 'string') handler({ type: data.type, eventId: typeof data.eventId === 'string' ? data.eventId : undefined });
  };
  void Notifications.getLastNotificationResponseAsync().then(read).catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener(read);
  return () => subscription.remove();
}
