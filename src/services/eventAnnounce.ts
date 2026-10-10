import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (eventId: string) => `mobidou.eventAnnounceHidden.${eventId}`;

/** Whether the player asked not to be shown the "an event is running" popup at launch for this event. */
export async function isEventAnnounceHidden(eventId: string): Promise<boolean> {
  try { return (await AsyncStorage.getItem(key(eventId))) === '1'; } catch { return false; }
}

export async function setEventAnnounceHidden(eventId: string, hidden: boolean): Promise<void> {
  try {
    if (hidden) await AsyncStorage.setItem(key(eventId), '1');
    else await AsyncStorage.removeItem(key(eventId));
  } catch { /* the choice just lasts until the app is closed */ }
}
