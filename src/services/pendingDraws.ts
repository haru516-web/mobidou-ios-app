import AsyncStorage from '@react-native-async-storage/async-storage';
import { setPendingDrawStore, type PendingDraw } from './purchase';

/** Keeps the operation ids of bought-木札 draws on the device, so a lost answer can be asked for again after a restart. */
const KEY = '@mobidou/pending-paid-draws/v1';

setPendingDrawStore({
  async read() {
    try {
      const value = JSON.parse(await AsyncStorage.getItem(KEY) ?? '[]') as unknown;
      return Array.isArray(value)
        ? value.filter((entry): entry is PendingDraw => !!entry && typeof (entry as PendingDraw).opId === 'string' && typeof (entry as PendingDraw).count === 'number')
        : [];
    } catch { return []; }
  },
  async write(list) { await AsyncStorage.setItem(KEY, JSON.stringify(list)); },
});
