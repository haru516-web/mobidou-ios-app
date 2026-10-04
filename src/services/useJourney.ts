import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, DevSettings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { creditMissedDays, freshProgress, isSyncMark, localDay, normalizeProgress, rollDay, updateSteps, startRoute, startReplay, resumeRoute, type Progress, type SyncMark } from './progress';
import { getPilgrimage } from '../data/pilgrimages';
import { normalizeDayLog, recordDay, type DayLog } from './weekly';
import { connectSteps, readMissedDays, readTodaySteps, type StepSource } from './steps';
import { isPetId, PET_CHARACTERS, type PetId } from '../petCatalog';
import { acknowledgePulls, applyServerPulls, chooseStarter, emptyMobbyCollection, grantFreePullForClear, grantTickets, hasStarter, normalizeMobbyCollection, ownsMobby, pullOnce, setPaidTickets, type MobbyCollection, type PullResult } from './gacha';
import { defaultBackgroundId, isBackgroundId, type BackgroundId } from '../data/backgrounds';
import { emptySpecialCollection, finishArrival, grantPass, isKeychainPlan, normalizeSpecialCollection, redeemKeychainTicket, rollKeychainOnArrival, type KeychainPlan, type PassKind, type SpecialCollection } from './specialRewards';
import { DEFAULT_HOME_WIDGET_ITEMS, DEFAULT_HOME_WIDGET_ORDER, normalizeHomeWidgetItems, normalizeHomeWidgetOrder, type HomeWidgetItems, type HomeWidgetOrder } from './homePreferences';
import { localOmikujiDay } from '../data/omikuji';
import { DEV_UNLOCK_ALL, devUnlockAll } from './devUnlock';
import { adoptServerAccount, readServerAccount, syncServer, type ServerAccount } from './server';
import { fetchPaidTickets } from './purchase';
import { MIN_UPLOAD_GAP_MS, uploadSave } from './cloudSave';
import { isAppStorageKey } from './accountDeletion';

const KEY = '@mobidou/journey/v1';
const CORRUPTED_BACKUP_KEY = '@mobidou/journey/v1/corrupted-backup';
export type BookDesigns = { owned: Record<string, boolean>; selected: Record<string, 'normal' | 'route'> };
type Saved = { routes?: Record<string, Progress>; /** Last credited real step reading; the start of any catch-up for days the app was closed. */ lastSync?: SyncMark; /** Steps per local day, for the weekly look-back. */ dayLog?: DayLog; /** Start day of the week whose look-back was last shown or dismissed. */ weekSeen?: string; version: 1; onboarded: boolean; demo: boolean; real: Progress; trial: Progress; realSpecial: SpecialCollection; trialSpecial: SpecialCollection; keychainPlan: KeychainPlan; mobbies: MobbyCollection; bookDesigns: BookDesigns; realBookDesigns: BookDesigns; trialBookDesigns: BookDesigns; pet: PetId; affection: Record<string, number>; haptics: boolean; source: StepSource; backgroundId: BackgroundId; homeWidgetOrder: HomeWidgetOrder; homeWidgetItems: HomeWidgetItems; omikujiDay: string | null; omikujiPetId: PetId | null };
export type BookDesignStateInput = { bookDesigns?: unknown; realBookDesigns?: unknown; trialBookDesigns?: unknown; demo?: unknown };
export type BookDesignState = { bookDesigns: BookDesigns; realBookDesigns: BookDesigns; trialBookDesigns: BookDesigns };

export function emptyBookDesigns(): BookDesigns {
  return { owned: {}, selected: {} };
}

/** Normalize the legacy/global shape without allowing malformed entries into either mode. */
export function normalizeBookDesigns(value: unknown): BookDesigns {
  if (!value || typeof value !== 'object') return emptyBookDesigns();
  const source = value as Partial<BookDesigns>;
  const owned = source.owned && typeof source.owned === 'object'
    ? Object.fromEntries(Object.entries(source.owned).filter(([, owned]) => owned === true))
    : {};
  const selected = source.selected && typeof source.selected === 'object'
    ? Object.fromEntries(Object.entries(source.selected).filter(([, design]) => design === 'normal' || design === 'route')) as Record<string, 'normal' | 'route'>
    : {};
  return { owned, selected };
}

function cloneBookDesigns(value: BookDesigns): BookDesigns {
  return { owned: { ...value.owned }, selected: { ...value.selected } };
}

/** Migrate one legacy/global book shape into independent real and trial state. */
export function normalizeBookDesignState(value: BookDesignStateInput): BookDesignState {
  const legacyBookDesigns = normalizeBookDesigns(value.bookDesigns);
  const realBookDesigns = normalizeBookDesigns(value.realBookDesigns ?? legacyBookDesigns);
  const trialBookDesigns = normalizeBookDesigns(value.trialBookDesigns);
  return {
    bookDesigns: cloneBookDesigns(value.demo === true ? trialBookDesigns : realBookDesigns),
    realBookDesigns,
    trialBookDesigns,
  };
}

export function setActiveBookDesigns<T extends { demo: boolean; bookDesigns: BookDesigns; realBookDesigns: BookDesigns; trialBookDesigns: BookDesigns }>(saved: T, bookDesigns: BookDesigns): T {
  const field = saved.demo ? 'trialBookDesigns' : 'realBookDesigns';
  return { ...saved, [field]: bookDesigns, bookDesigns };
}

const initial = (): Saved => {
  const realBookDesigns = emptyBookDesigns();
  const trialBookDesigns = emptyBookDesigns();
  return { version: 1, onboarded: false, demo: false, real: freshProgress(), trial: freshProgress(), realSpecial: emptySpecialCollection(), trialSpecial: emptySpecialCollection(), keychainPlan: 'none', mobbies: emptyMobbyCollection(), bookDesigns: cloneBookDesigns(realBookDesigns), realBookDesigns, trialBookDesigns, pet: 'mobibou', affection: {}, haptics: true, source: 'none', backgroundId: defaultBackgroundId(), homeWidgetOrder: [...DEFAULT_HOME_WIDGET_ORDER] as HomeWidgetOrder, homeWidgetItems: [...DEFAULT_HOME_WIDGET_ITEMS], omikujiDay: null, omikujiPetId: null };
};

/** Reaching the end of a route for the first time unlocks its own book cover. */
function rewardFirstClear(saved: Saved, field: 'real' | 'trial', previous: Progress, next: Progress): Saved {
  if (!next.routeId || !next.completedAt || previous.completedAt) return saved;
  if (field === 'real') saved = { ...saved, mobbies: grantFreePullForClear(saved.mobbies, next.routeId) };
  const designsField = field === 'real' ? 'realBookDesigns' : 'trialBookDesigns';
  const designs = saved[designsField];
  if (designs.owned[next.routeId]) return saved;
  return setActiveBookDesignsFor(saved, designsField, { owned: { ...designs.owned, [next.routeId]: true }, selected: { ...designs.selected, [next.routeId]: 'route' } });
}

function setActiveBookDesignsFor(saved: Saved, field: 'realBookDesigns' | 'trialBookDesigns', designs: BookDesigns): Saved {
  const isActive = (field === 'trialBookDesigns') === saved.demo;
  return { ...saved, [field]: designs, ...(isActive ? { bookDesigns: designs } : {}) };
}

function updateSavedProgress(saved: Saved, field: 'real' | 'trial', steps: number, date = new Date(), missed: readonly { day: string; steps: number }[] = []): Saved {
  const previous = saved[field];
  // Days the app was closed are credited first, then today's reading on top.
  const base = field === 'real' && saved.lastSync && missed.length ? creditMissedDays(previous, saved.lastSync, missed) : previous;
  const next = updateSteps(base, steps, date);
  const mark: SyncMark | undefined = field === 'real' ? { day: localDay(date), steps: next.highWater ?? next.steps } : undefined;
  const markChanged = !!mark && (saved.lastSync?.day !== mark.day || saved.lastSync.steps !== mark.steps);
  let dayLog = saved.dayLog;
  if (field === 'real') {
    for (const reading of missed) dayLog = recordDay(dayLog, reading.day, reading.steps, date);
    dayLog = recordDay(dayLog, localDay(date), next.highWater ?? next.steps, date);
  }
  const logChanged = field === 'real' && JSON.stringify(dayLog) !== JSON.stringify(saved.dayLog);
  // Periodic refreshes usually read the same count; skip the no-op so it
  // neither re-renders the app nor rewrites storage.
  if (JSON.stringify(next) === JSON.stringify(previous) && !markChanged && !logChanged) return saved;
  return rewardFirstClear({ ...saved, [field]: next, ...(markChanged ? { lastSync: mark } : {}), ...(logChanged ? { dayLog } : {}) }, field, previous, next);
}

export function normalizeSaved(value: unknown): Saved {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('記録の形式が正しくありません。');
  const p = value as Partial<Saved>;
  if (p.version !== 1 || !p.real || !p.trial) throw new Error('この引き継ぎコードには対応していません。');
  const demo = p.demo === true;
  const bookDesignState = normalizeBookDesignState({ demo, bookDesigns: p.bookDesigns, realBookDesigns: p.realBookDesigns, trialBookDesigns: p.trialBookDesigns });
  const defaults = initial();
  const loaded: Saved = {
    ...defaults,
    onboarded: p.onboarded === true,
    demo,
    real: normalizeProgress(p.real),
    trial: normalizeProgress(p.trial),
    realSpecial: normalizeSpecialCollection(p.realSpecial),
    trialSpecial: normalizeSpecialCollection(p.trialSpecial),
    keychainPlan: isKeychainPlan(p.keychainPlan) ? p.keychainPlan : 'none',
    // A save from before the collection existed keeps the Mobby it was using.
    mobbies: normalizeMobbyCollection(p.mobbies, isPetId, p.onboarded === true && isPetId(p.pet) ? p.pet : undefined),
    ...bookDesignState,
    pet: isPetId(p.pet) ? p.pet : 'mobibou',
    haptics: p.haptics !== false,
    source: ['healthkit', 'motion'].includes(p.source as string) ? p.source! : 'none',
    backgroundId: isBackgroundId(p.backgroundId) ? p.backgroundId : defaults.backgroundId,
    homeWidgetOrder: normalizeHomeWidgetOrder(p.homeWidgetOrder),
    homeWidgetItems: normalizeHomeWidgetItems(p.homeWidgetItems),
    // Archived route records are secondary; one malformed entry must not
    // discard the whole save, so drop only that entry.
    routes: Object.fromEntries(Object.entries(p.routes && typeof p.routes === 'object' ? p.routes : {}).flatMap(([key, progress]) => {
      try { return [[key, normalizeProgress(progress)] as const]; } catch { return []; }
    })),
    affection: Object.fromEntries(Object.entries(p.affection && typeof p.affection === 'object' ? p.affection : {}).filter(([key, count]) => isPetId(key) && Number.isFinite(count) && count >= 0)),
    dayLog: normalizeDayLog(p.dayLog),
    ...(typeof p.weekSeen === 'string' && /^d{4}-d{2}-d{2}$/.test(p.weekSeen) ? { weekSeen: p.weekSeen } : {}),
    ...(isSyncMark(p.lastSync) ? { lastSync: { day: p.lastSync.day, steps: p.lastSync.steps } } : {}),
    omikujiDay: typeof p.omikujiDay === 'string' ? p.omikujiDay : null,
    omikujiPetId: isPetId(p.omikujiPetId) ? p.omikujiPetId : null,
  };
  // Covers now come from finishing a route, so unlock them for routes already finished.
  const finished = (saved: Progress[]) => saved.filter(record => record.routeId && record.completedAt).map(record => record.routeId!);
  for (const [field, records] of [['realBookDesigns', [loaded.real, ...Object.entries(loaded.routes ?? {}).filter(([key]) => key.startsWith('real:')).map(([, record]) => record)]], ['trialBookDesigns', [loaded.trial, ...Object.entries(loaded.routes ?? {}).filter(([key]) => key.startsWith('trial:')).map(([, record]) => record)]]] as const) {
    const owned = { ...loaded[field].owned };
    finished([...records]).forEach(routeId => { owned[routeId] = true; });
    loaded[field] = { ...loaded[field], owned };
  }
  loaded.bookDesigns = cloneBookDesigns(loaded.demo ? loaded.trialBookDesigns : loaded.realBookDesigns);
  // Routes already cleared in the real book also earned their free pull.
  finished([loaded.real, ...Object.entries(loaded.routes ?? {}).filter(([key]) => key.startsWith('real:')).map(([, record]) => record)]).forEach(routeId => { loaded.mobbies = grantFreePullForClear(loaded.mobbies, routeId); });
  return loaded;
}

/**
 * Detects a transfer code that was cut off while copying or edited by hand.
 * Without a server this cannot stop deliberate tampering (the hash can be
 * recomputed); it only guards against silently importing a damaged record.
 */
function transferChecksum(data: unknown): string {
  const text = JSON.stringify(data);
  let a = 0x811c9dc5, b = 0x01000193 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x5bd1e995);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

/** `server` is the anonymous account that owns the bought 木札; without it a new device would start with none. */
export function createTransferCode(saved: Saved, server?: ServerAccount | null): string {
  return JSON.stringify({ format: 'mobidou-transfer', version: 1, checksum: transferChecksum(saved), data: saved, ...(server ? { server: { userId: server.userId, secret: server.secret } } : {}) });
}

/** The account carried by a code, or null for codes made before this existed. */
export function readTransferServerAccount(raw: string): ServerAccount | null {
  try {
    const server = (JSON.parse(raw) as { server?: { userId?: unknown; secret?: unknown } }).server;
    return server && typeof server.userId === 'string' && typeof server.secret === 'string' && server.userId && server.secret ? { userId: server.userId, secret: server.secret } : null;
  } catch { return null; }
}

export function readTransferData(raw: string): Saved {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('引き継ぎコードを読み取れません。コピーした内容を確認してください。');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('引き継ぎコードの形式が正しくありません。');
  const envelope = parsed as { format?: unknown; version?: unknown; checksum?: unknown; data?: unknown };
  if (envelope.format !== 'mobidou-transfer' || envelope.version !== 1) throw new Error('もび道で作成した引き継ぎコードではありません。');
  try {
    // Codes exported before checksums existed have none; accept those as-is.
    if (envelope.checksum !== undefined && envelope.checksum !== transferChecksum(envelope.data)) throw new Error('この引き継ぎコードは途中で欠けているか書き換えられているため、読み込めません。元の端末でコピーし直してください。');
    return normalizeSaved(envelope.data);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('この引き継ぎコード')) throw error;
    throw new Error('引き継ぎコードの記録が壊れているため、読み込めません。');
  }
}

function transferSummary(saved: Saved) {
  return {
    petId: saved.pet,
    routeId: saved.real.routeId ?? null,
    rewardCount: saved.real.rewards.length,
    totalSteps: saved.real.totalSteps,
  };
}

export function useJourney() {
  const [data, setData] = useState<Saved>(initial);
  const current = useRef(data);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [synced, setSynced] = useState('');
  const [corruptedBackup, setCorruptedBackup] = useState<string | null>(null);
  const writing = useRef(Promise.resolve());
  const mounted = useRef(true);
  const syncLock = useRef(false);
  const readOnly = useRef(false);
  const epoch = useRef(0);
  const change = useCallback((fn: (prev: Saved) => Saved) => {
    if (readOnly.current) return;
    const changed = fn(current.current);
    const next = DEV_UNLOCK_ALL ? devUnlockAll(changed) : changed;
    if (next === current.current) return;
    current.current = next; setData(next);
    writing.current = writing.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(next))).catch(() => {
      if (mounted.current) setError('記録を保存できませんでした。端末の空き容量を確認してください。');
    });
  }, []);
  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(CORRUPTED_BACKUP_KEY).then(backup => { if (mounted.current && backup) setCorruptedBackup(backup); }).catch(() => {});
    AsyncStorage.getItem(KEY).then(async raw => {
      if (!mounted.current || !raw) return;
      let loaded: Saved;
      try {
        loaded = normalizeSaved(JSON.parse(raw));
      } catch {
        // The stored record is unreadable. Keep the untouched original under
        // a separate key before anything can overwrite it, then continue with
        // a fresh, writable record instead of silently dropping every change.
        await AsyncStorage.setItem(CORRUPTED_BACKUP_KEY, raw);
        if (mounted.current) setCorruptedBackup(raw);
        if (mounted.current) setError('保存した記録を読み込めなかったため、新しく記録を始めます。以前のデータは端末内に退避しました。');
        return;
      }
      if (DEV_UNLOCK_ALL) loaded = devUnlockAll(loaded);
      current.current = loaded; setData(loaded);
      void AsyncStorage.setItem(KEY, JSON.stringify(loaded));
    }).catch(() => { readOnly.current = true; if (mounted.current) setError('保存した記録を読み込めませんでした。元のデータは上書きせず、アプリを開き直してください。'); })
      .finally(() => { if (mounted.current) setReady(true); });
    return () => { mounted.current = false; };
  }, []);
  const refresh = useCallback(async () => {
    if (syncLock.current || readOnly.current) return;
    const state = current.current;
    change(prev => {
      const real = rollDay(prev.real);
      const trial = rollDay(prev.trial);
      return real === prev.real && trial === prev.trial ? prev : { ...prev, real, trial };
    });
    if (state.demo || state.source === 'none' || !state.onboarded) return;
    syncLock.current = true; setBusy(true); const token = epoch.current;
    try {
      const missed = await readMissedDays(state.source, state.lastSync);
      const result = await readTodaySteps(state.source);
      if (token === epoch.current && localDay(result.at) === localDay()) {
        change(prev => updateSavedProgress(prev, 'real', result.steps, result.at, missed));
        setSynced(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
        setError('');
      }
    } catch (e) { setError(e instanceof Error ? e.message : '歩数を読み取れませんでした。'); }
    finally { syncLock.current = false; setBusy(false); }
  }, [change]);
  useEffect(() => {
    if (!ready) return;
    void refresh();
    // Steps are read when the app opens or comes back, and now and then while it stays open (the phone counts them all the time anyway).
    const timer = setInterval(() => { if (AppState.currentState === 'active' || AppState.currentState === null) void refresh(); }, 5 * 60_000);
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [ready, data.demo, data.source, refresh]);
  // Report the first Mobby and first route clears to the server; the app works the same offline or in 体験モード.
  useEffect(() => {
    if (ready && !data.demo && !DEV_UNLOCK_ALL) void syncServer(data.mobbies);
  }, [ready, data.demo, data.mobbies]);
  const connect = async () => {
    if (syncLock.current || readOnly.current) return;
    syncLock.current = true; setBusy(true); setError('');
    try {
      const source = await connectSteps();
      const missed = await readMissedDays(source, current.current.lastSync);
      const result = await readTodaySteps(source);
      epoch.current++;
      change(prev => setActiveBookDesigns({ ...updateSavedProgress(prev, 'real', result.steps, result.at, missed), onboarded: true, demo: false, source }, cloneBookDesigns(prev.realBookDesigns)));
      setSynced(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { setError(e instanceof Error ? e.message : '接続できませんでした。'); }
    finally { syncLock.current = false; setBusy(false); }
  };
  // For players tied to an Apple ID the whole record is kept on the server: when the app is left (below), once shortly after it opens
  // (after the steps were read), and as a safety every 15 minutes while it stays open. Nothing is sent when nothing changed.
  const launchUploaded = useRef(false);
  useEffect(() => {
    if (!ready || data.demo || !data.onboarded) return undefined;
    const first = launchUploaded.current ? null : setTimeout(() => { launchUploaded.current = true; void uploadSave(createTransferCode(current.current), { force: true }); }, 15000);
    const safety = setInterval(() => { void uploadSave(createTransferCode(current.current)); }, MIN_UPLOAD_GAP_MS);
    return () => { if (first) clearTimeout(first); clearInterval(safety); };
  }, [ready, data.demo, data.onboarded]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', value => {
      if ((value === 'background' || value === 'inactive') && !current.current.demo && current.current.onboarded) void uploadSave(createTransferCode(current.current), { force: true });
    });
    return () => subscription.remove();
  }, []);
  /** The record without the account's secret: this is what may be sent to the server. */
  const exportRecord = useCallback(async () => { await writing.current; return createTransferCode(current.current); }, []);
  const exportTransfer = useCallback(async () => {
    await writing.current;
    return createTransferCode(current.current, await readServerAccount());
  }, []);
  const previewTransfer = useCallback((raw: string) => transferSummary(readTransferData(raw)), []);
  const importTransfer = useCallback(async (raw: string) => {
    if (syncLock.current) throw new Error('歩数を更新中です。少し待ってからもう一度お試しください。');
    // A restored record starts a fresh reading baseline: steps taken between the export and now are not back-filled.
    const { lastSync: _discarded, ...restored } = readTransferData(raw);
    const imported: Saved = { ...restored, onboarded: true };
    syncLock.current = true;
    setBusy(true);
    try {
      await writing.current;
      await AsyncStorage.setItem(KEY, JSON.stringify(imported));
      const account = readTransferServerAccount(raw);
      if (account) await adoptServerAccount(account);
      epoch.current++;
      current.current = imported;
      setData(imported);
      readOnly.current = false;
      setSynced('');
      setError('');
      writing.current = Promise.resolve();
      // The 木札 balance belongs to the account that came with the code.
      if (account) void fetchPaidTickets().then(paid => { if (paid !== null) change(p => { const mobbies = setPaidTickets(p.mobbies, paid); return mobbies === p.mobbies ? p : { ...p, mobbies }; }); });
    } catch {
      throw new Error('引き継いだ記録を保存できませんでした。端末の空き容量を確認してください。');
    } finally {
      syncLock.current = false;
      setBusy(false);
    }
  }, []);
  return {
    data, progress: data.demo ? data.trial : data.real, special: data.demo ? data.trialSpecial : data.realSpecial, ready, error, busy, synced, refresh, connect, exportTransfer, exportRecord, previewTransfer, importTransfer,
    dismissError: () => setError(''),
    /** The untouched text of a record that could not be loaded, if one was set aside. */
    corruptedBackup,
    discardCorruptedBackup: async () => {
      await AsyncStorage.removeItem(CORRUPTED_BACKUP_KEY);
      setCorruptedBackup(null);
    },
    enter: (demo: boolean) => { epoch.current++; change(p => ({ ...p, onboarded: true, demo, bookDesigns: cloneBookDesigns(demo ? p.trialBookDesigns : p.realBookDesigns) })); },
    demoWalk: () => change(p => updateSavedProgress(p, 'trial', rollDay(p.trial).steps + 1000)),
    demoTomorrow: () => change(p => ({ ...p, trial: { ...p.trial, steps: 0, baseline: 0, highWater: 0, dayStart: p.trial.rewards.length, day: localDay() } })),
    acknowledge: () => change(p => p.demo ? { ...p, trial: { ...p.trial, pending: p.trial.pending.slice(1) }, trialSpecial: finishArrival(p.trialSpecial) } : { ...p, real: { ...p.real, pending: p.real.pending.slice(1) }, realSpecial: finishArrival(p.realSpecial) }),
    markWeekSeen: (start: string) => change(p => p.weekSeen === start ? p : { ...p, weekSeen: start }),
    selectRoute: (routeId: string) => change(p => {
      if (!getPilgrimage(routeId)) return p;
      const field = p.demo ? 'trial' : 'real';
      const active = rollDay(p[field]);
      // Choosing a finished route again (even the one on screen) starts a new lap; its clear is kept.
      if (active.routeId === routeId) { const replay = startReplay(active); return replay === active ? p : { ...p, [field]: replay }; }
      const routes = { ...p.routes, [field + ':' + (active.routeId ?? 'legacy')]: active };
      const saved = routes[field + ':' + routeId];
      const restored = saved ? rollDay(saved) : startRoute(routeId, active.steps, new Date(), active.totalSteps ?? active.steps);
      return { ...p, routes, [field]: startReplay(resumeRoute(active, restored)) };
    }),
    /** The first pick becomes the starter; afterwards only a Mobby the player owns can be chosen. */
    choosePet: (pet: PetId) => change(p => {
      if (!hasStarter(p.mobbies)) return { ...p, pet, mobbies: chooseStarter(p.mobbies, pet, isPetId) };
      return ownsMobby(p.mobbies, pet) && p.pet !== pet ? { ...p, pet } : p;
    }),
    /** Use one free pull (earned by the first clear of a route). Paid pulls are decided by the server. */
    drawFreeMobby: (count = 1) => change(p => {
      const pool = PET_CHARACTERS.map(character => character.id);
      let mobbies = p.mobbies;
      for (let pull = 0; pull < count; pull++) mobbies = pullOnce(mobbies, pool, 'free');
      return mobbies === p.mobbies ? p : { ...p, mobbies };
    }),
    /** Pulls the server drew with bought 木札; they wait in `unrevealed` for the reveal. `paidTickets` is what is left. */
    applyPaidPulls: (results: readonly PullResult[], paidPulls: number, paidTickets: number) => change(p => ({ ...p, mobbies: applyServerPulls(p.mobbies, results, paidPulls, isPetId, paidTickets) })),
    /** The server's balance of bought 木札. */
    setPaidTickets: (amount: number) => change(p => { const mobbies = setPaidTickets(p.mobbies, amount); return mobbies === p.mobbies ? p : { ...p, mobbies }; }),
    /** 木札 from a gift or a purchase. */
    grantTickets: (amount: number) => change(p => {
      const mobbies = grantTickets(p.mobbies, amount);
      return mobbies === p.mobbies ? p : { ...p, mobbies };
    }),
    /** The welcome 木札 from the first-run present box; given once per save. */
    grantWelcomePull: () => change(p => {
      const mobbies = grantFreePullForClear(p.mobbies, 'welcome-gift');
      return mobbies === p.mobbies ? p : { ...p, mobbies };
    }),
    /** The reveal is over. */
    acknowledgeMobbyPulls: () => change(p => { const mobbies = acknowledgePulls(p.mobbies); return mobbies === p.mobbies ? p : { ...p, mobbies }; }),
    saveHomeWidgetOrder: (order: HomeWidgetOrder) => change(p => ({ ...p, homeWidgetOrder: normalizeHomeWidgetOrder(order) })),
    saveHomeWidgetItems: (items: HomeWidgetItems) => change(p => ({ ...p, homeWidgetItems: normalizeHomeWidgetItems(items) })),
    // Remember whose fortune was drawn so switching partners later the same
    // day does not change an already drawn result.
    drawDailyOmikuji: () => change(p => ({ ...p, omikujiDay: localOmikujiDay(), omikujiPetId: p.pet })),
    resetDailyOmikuji: () => change(p => ({ ...p, omikujiDay: null, omikujiPetId: null })),
    /** Development builds only: wipe the saved record and restart the app from the first launch. */
    /** Account deletion: wipe everything this app keeps on the device and start again from a blank record. */
    eraseEverything: async () => {
      await writing.current.catch(() => {});
      const keys = (await AsyncStorage.getAllKeys()).filter(isAppStorageKey);
      if (keys.length) await AsyncStorage.multiRemove(keys);
      const blank = initial();
      epoch.current++;
      current.current = blank;
      setData(blank);
      readOnly.current = false;
      writing.current = Promise.resolve();
      setError('');
    },
    devResetAll: async () => {
      if (!__DEV__) return;
      await writing.current.catch(() => {});
      // Keep the latest record on the server before wiping this device (a linked account can restore it).
      if (current.current.onboarded && !current.current.demo) await uploadSave(createTransferCode(current.current), { force: true });
      await AsyncStorage.removeItem(KEY);
      await AsyncStorage.removeItem(CORRUPTED_BACKUP_KEY);
      DevSettings.reload();
    },
    chooseBackground: (backgroundId: BackgroundId) => change(p => ({ ...p, backgroundId })),
    purchaseBookDesign: (routeId: string) => change(p => setActiveBookDesigns(p, { owned: { ...(p.demo ? p.trialBookDesigns : p.realBookDesigns).owned, [routeId]: true }, selected: { ...(p.demo ? p.trialBookDesigns : p.realBookDesigns).selected, [routeId]: 'route' } })),
    selectBookDesign: (routeId: string, design: 'normal' | 'route') => change(p => {
      const activeBookDesigns = p.demo ? p.trialBookDesigns : p.realBookDesigns;
      return design === 'route' && !activeBookDesigns.owned[routeId]
        ? p
        : setActiveBookDesigns(p, { ...activeBookDesigns, selected: { ...activeBookDesigns.selected, [routeId]: design } });
    }),
    /** Grant a ticket (operator present or plan grant). */
    grantPass: (kind: PassKind, amount = 1) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      return { ...p, [field]: grantPass(p[field], kind, amount) };
    }),
    /** Roll the keychain for the arrival ceremony that just opened (once per ceremony). */
    rollKeychain: (shrineId: string) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      const next = rollKeychainOnArrival(p[field], shrineId, p.keychainPlan);
      return next === p[field] ? p : { ...p, [field]: next };
    }),
    /** Spend a ticket on the miss that is on screen. */
    redeemKeychainTicket: (shrineId: string) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      const next = redeemKeychainTicket(p[field], shrineId);
      return next === p[field] ? p : { ...p, [field]: next };
    }),
    /** Placeholder until StoreKit reports the real subscription state. */
    setKeychainPlan: (keychainPlan: KeychainPlan) => change(p => p.keychainPlan === keychainPlan ? p : { ...p, keychainPlan }),
    bond: () => change(p => ({ ...p, affection: { ...p.affection, [p.pet]: Math.min(9999, (p.affection[p.pet] ?? 0) + 1) } })),
    toggleHaptics: () => change(p => ({ ...p, haptics: !p.haptics })),
  };
}
