import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { authedRequest, readServerAccount } from './server';
import { REMINDER_BODY, REMINDER_TITLE, reminderTimes, type ReminderOptions } from './notificationPlan';

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
const TOKEN_REFRESH_MS = 7 * 86_400_000;

/** 'unset' until the player has been asked; then on or off. */
export type NotificationSetting = 'unset' | 'on' | 'off';

const supported = Platform.OS === 'ios';
const listeners = new Set<() => void>();
let current: NotificationSetting = 'unset';
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

/** Tell the server which device to notify (only when the player is signed in to it). */
async function registerToken(force = false): Promise<boolean> {
  if (!supported || !(await readServerAccount())) return false;
  try {
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    const known = JSON.parse((await AsyncStorage.getItem(TOKEN_KEY)) ?? 'null') as { token?: string; at?: number } | null;
    if (!force && known?.token === token && typeof known.at === 'number' && Date.now() - known.at < TOKEN_REFRESH_MS) return true;
    const reply = await authedRequest('/push/token', { body: { token, team: true, friend: true } });
    if (reply?.status !== 200) return false;
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify({ token, at: Date.now() }));
    return true;
  } catch { return false; }
}

async function unregisterToken(): Promise<void> {
  try {
    const known = JSON.parse((await AsyncStorage.getItem(TOKEN_KEY)) ?? 'null') as { token?: string } | null;
    if (known?.token) await authedRequest('/push/token/remove', { body: { token: known.token } });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch { /* the server also drops a token the device refuses */ }
}

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
  if ((await load()) !== 'on') return;
  if (!(await permissionGranted(false))) return;
  await registerToken();
}

async function cancelReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter(item => item.identifier.startsWith(REMINDER_PREFIX)).map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  } catch { /* nothing was scheduled */ }
}

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

export type NotificationTap = { type: string; eventId?: string };

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
