import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { freshProgress, localDay, normalizeProgress, rollDay, updateSteps, startRoute, resumeRoute, type Progress } from './progress';
import { getPilgrimage, PILGRIMAGES } from '../data/pilgrimages';
import { connectSteps, readTodaySteps, type StepSource } from './steps';
import { isPetId, type PetId } from '../petCatalog';
import { defaultBackgroundId, isBackgroundId, type BackgroundId } from '../data/backgrounds';
import { declineKeychainDrop, emptySpecialCollection, grantPass, normalizeSpecialCollection, purchasePass, redeemCoverChange as redeemCoverChangeState, redeemKeychainDrop, redeemPass, rollSpecialDrop, type PassKind, type SpecialCollection, type SpecialKind } from './specialRewards';
import { DEFAULT_HOME_WIDGET_ITEMS, DEFAULT_HOME_WIDGET_ORDER, normalizeHomeWidgetItems, normalizeHomeWidgetOrder, type HomeWidgetItems, type HomeWidgetOrder } from './homePreferences';
import { localOmikujiDay } from '../data/omikuji';

const KEY = '@mobidou/journey/v1';
export type BookDesigns = { owned: Record<string, boolean>; selected: Record<string, 'normal' | 'route'> };
type Saved = { routes?: Record<string, Progress>; version: 1; onboarded: boolean; demo: boolean; real: Progress; trial: Progress; realSpecial: SpecialCollection; trialSpecial: SpecialCollection; bookDesigns: BookDesigns; realBookDesigns: BookDesigns; trialBookDesigns: BookDesigns; pet: PetId; affection: Record<string, number>; haptics: boolean; source: StepSource; backgroundId: BackgroundId; homeWidgetOrder: HomeWidgetOrder; homeWidgetItems: HomeWidgetItems; omikujiDay: string | null };
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
  return { version: 1, onboarded: false, demo: false, real: freshProgress(), trial: freshProgress(), realSpecial: emptySpecialCollection(), trialSpecial: emptySpecialCollection(), bookDesigns: cloneBookDesigns(realBookDesigns), realBookDesigns, trialBookDesigns, pet: 'mobibou', affection: {}, haptics: true, source: 'none', backgroundId: defaultBackgroundId(), homeWidgetOrder: [...DEFAULT_HOME_WIDGET_ORDER] as HomeWidgetOrder, homeWidgetItems: [...DEFAULT_HOME_WIDGET_ITEMS], omikujiDay: null };
};

function addDropsForNewRewards(collection: SpecialCollection, previous: Progress, next: Progress) {
  return next.rewards.slice(previous.rewards.length).reduce((result, reward) => rollSpecialDrop(result, reward.id), collection);
}

function updateSavedProgress(saved: Saved, field: 'real' | 'trial', steps: number, date = new Date()): Saved {
  const previous = saved[field];
  const next = updateSteps(previous, steps, date);
  const specialField = field === 'real' ? 'realSpecial' : 'trialSpecial';
  return { ...saved, [field]: next, [specialField]: addDropsForNewRewards(saved[specialField], previous, next) };
}

export function useJourney() {
  const [data, setData] = useState<Saved>(initial);
  const current = useRef(data);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [synced, setSynced] = useState('');
  const writing = useRef(Promise.resolve());
  const mounted = useRef(true);
  const syncLock = useRef(false);
  const readOnly = useRef(false);
  const epoch = useRef(0);
  const change = useCallback((fn: (prev: Saved) => Saved) => {
    if (readOnly.current) return;
    const next = fn(current.current); current.current = next; setData(next);
    writing.current = writing.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(next))).catch(() => {
      if (mounted.current) setError('記録を保存できませんでした。端末の空き容量を確認してください。');
    });
  }, []);
  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(KEY).then(raw => {
      if (!mounted.current) return;
      if (raw) {
        const p = JSON.parse(raw) as Saved;
        if (p.version !== 1) throw new Error('Unsupported save');
        const demo = p.demo === true;
        const bookDesignState = normalizeBookDesignState({ demo, bookDesigns: p.bookDesigns, realBookDesigns: p.realBookDesigns, trialBookDesigns: p.trialBookDesigns });
        const loaded: Saved = { ...initial(), onboarded: p.onboarded === true, demo, real: normalizeProgress(p.real), trial: normalizeProgress(p.trial), realSpecial: normalizeSpecialCollection(p.realSpecial), trialSpecial: normalizeSpecialCollection(p.trialSpecial), ...bookDesignState, pet: isPetId(p.pet) ? p.pet : 'mobibou', haptics: p.haptics !== false, source: ['healthkit', 'motion'].includes(p.source) ? p.source : 'none', backgroundId: isBackgroundId(p.backgroundId) ? p.backgroundId : initial().backgroundId, homeWidgetOrder: normalizeHomeWidgetOrder(p.homeWidgetOrder), homeWidgetItems: normalizeHomeWidgetItems(p.homeWidgetItems), routes: Object.fromEntries(Object.entries(p.routes ?? {}).map(([key, value]) => [key, normalizeProgress(value)])), affection: Object.fromEntries(Object.entries(p.affection ?? {}).filter(([k, v]) => isPetId(k) && Number.isFinite(v) && v >= 0)), omikujiDay: typeof p.omikujiDay === 'string' ? p.omikujiDay : null };
        loaded.realSpecial = loaded.real.rewards.reduce((result, reward) => rollSpecialDrop(result, reward.id), loaded.realSpecial);
        loaded.trialSpecial = loaded.trial.rewards.reduce((result, reward) => rollSpecialDrop(result, reward.id), loaded.trialSpecial);
        current.current = loaded; setData(loaded);
        void AsyncStorage.setItem(KEY, JSON.stringify(loaded));
      }
    }).catch(() => { readOnly.current = true; if (mounted.current) setError('保存した記録を読み込めませんでした。元のデータは上書きせず、アプリを開き直してください。'); })
      .finally(() => { if (mounted.current) setReady(true); });
    return () => { mounted.current = false; };
  }, []);
  const refresh = useCallback(async () => {
    if (syncLock.current || readOnly.current) return;
    const state = current.current;
    change(prev => ({ ...prev, real: rollDay(prev.real), trial: rollDay(prev.trial) }));
    if (state.demo || state.source === 'none') return;
    syncLock.current = true; setBusy(true); const token = epoch.current;
    try {
      const result = await readTodaySteps(state.source);
      if (token === epoch.current && localDay(result.at) === localDay()) {
        change(prev => updateSavedProgress(prev, 'real', result.steps, result.at));
        setSynced(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
        setError('');
      }
    } catch (e) { setError(e instanceof Error ? e.message : '歩数を読み取れませんでした。'); }
    finally { syncLock.current = false; setBusy(false); }
  }, [change]);
  useEffect(() => {
    if (!ready) return;
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active' || AppState.currentState === null) void refresh(); }, 30000);
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [ready, data.demo, data.source, refresh]);
  const connect = async () => {
    if (syncLock.current || readOnly.current) return;
    syncLock.current = true; setBusy(true); setError('');
    try {
      const source = await connectSteps();
      const result = await readTodaySteps(source);
      epoch.current++;
      change(prev => setActiveBookDesigns({ ...updateSavedProgress(prev, 'real', result.steps, result.at), onboarded: true, demo: false, source }, cloneBookDesigns(prev.realBookDesigns)));
      setSynced(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { setError(e instanceof Error ? e.message : '接続できませんでした。'); }
    finally { syncLock.current = false; setBusy(false); }
  };
  return {
    data, progress: data.demo ? data.trial : data.real, special: data.demo ? data.trialSpecial : data.realSpecial, ready, error, busy, synced, refresh, connect,
    dismissError: () => setError(''),
    enter: (demo: boolean) => { epoch.current++; change(p => ({ ...p, onboarded: true, demo, bookDesigns: cloneBookDesigns(demo ? p.trialBookDesigns : p.realBookDesigns) })); },
    demoWalk: () => change(p => updateSavedProgress(p, 'trial', rollDay(p.trial).steps + 1000)),
    demoTomorrow: () => change(p => ({ ...p, trial: { ...p.trial, steps: 0, baseline: 0, highWater: 0, dayStart: p.trial.rewards.length, day: localDay() } })),
    acknowledge: () => change(p => p.demo ? { ...p, trial: { ...p.trial, pending: p.trial.pending.slice(1) } } : { ...p, real: { ...p.real, pending: p.real.pending.slice(1) } }),
    selectRoute: (routeId: string) => change(p => {
      if (!getPilgrimage(routeId)) return p;
      const field = p.demo ? 'trial' : 'real';
      const active = rollDay(p[field]);
      if (active.routeId === routeId) return p;
      const routes = { ...p.routes, [field + ':' + (active.routeId ?? 'legacy')]: active };
      const saved = routes[field + ':' + routeId];
      const restored = saved ? rollDay(saved) : startRoute(routeId, active.steps, new Date(), active.totalSteps ?? active.steps);
      return { ...p, routes, [field]: resumeRoute(active, restored) };
    }),
    choosePet: (pet: PetId) => change(p => ({ ...p, pet })),
    saveHomeWidgetOrder: (order: HomeWidgetOrder) => change(p => ({ ...p, homeWidgetOrder: normalizeHomeWidgetOrder(order) })),
    saveHomeWidgetItems: (items: HomeWidgetItems) => change(p => ({ ...p, homeWidgetItems: normalizeHomeWidgetItems(items) })),
    drawDailyOmikuji: () => change(p => ({ ...p, omikujiDay: localOmikujiDay() })),
    chooseBackground: (backgroundId: BackgroundId) => change(p => ({ ...p, backgroundId })),
    purchaseBookDesign: (routeId: string) => change(p => setActiveBookDesigns(p, { owned: { ...(p.demo ? p.trialBookDesigns : p.realBookDesigns).owned, [routeId]: true }, selected: { ...(p.demo ? p.trialBookDesigns : p.realBookDesigns).selected, [routeId]: 'route' } })),
    selectBookDesign: (routeId: string, design: 'normal' | 'route') => change(p => {
      const activeBookDesigns = p.demo ? p.trialBookDesigns : p.realBookDesigns;
      return design === 'route' && !activeBookDesigns.owned[routeId]
        ? p
        : setActiveBookDesigns(p, { ...activeBookDesigns, selected: { ...activeBookDesigns.selected, [routeId]: design } });
    }),
    purchasePass: (kind: PassKind) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      return { ...p, [field]: purchasePass(p[field], kind) };
    }),
    /** Mock grant hook for reward/shop UI and test fixtures. */
    grantPass: (kind: PassKind, amount = 1) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      return { ...p, [field]: grantPass(p[field], kind, amount) };
    }),
    /** Use a new keychain ticket only for a persisted natural failure. */
    redeemKeychainDrop: (shrineId: string) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      return { ...p, [field]: redeemKeychainDrop(p[field], shrineId) };
    }),
    /** Decline a pending failed roll without consuming a ticket. */
    declineKeychainDrop: (shrineId: string) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      return { ...p, [field]: declineKeychainDrop(p[field], shrineId) };
    }),
    /**
     * Unlock the selected active-route cover once. Invalid/archived routes,
     * already-owned covers, and empty balances are all no-ops.
     */
    redeemCoverChange: (routeId: string) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      const activeBookDesigns = p.demo ? p.trialBookDesigns : p.realBookDesigns;
      const alreadyOwned = activeBookDesigns.owned[routeId] === true;
      const coverExists = PILGRIMAGES.some(route => route.id === routeId);
      const special = redeemCoverChangeState(p[field], routeId, { coverExists, alreadyOwned });
      if (special === p[field]) return p;
      const next = setActiveBookDesigns({ ...p, [field]: special }, {
        ...activeBookDesigns,
        owned: { ...activeBookDesigns.owned, [routeId]: true },
        selected: { ...activeBookDesigns.selected, [routeId]: 'route' },
      });
      return next;
    }),
    redeemPass: (shrineId: string, kind: SpecialKind) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      return { ...p, [field]: redeemPass(p[field], shrineId, kind) };
    }),
    bond: () => change(p => ({ ...p, affection: { ...p.affection, [p.pet]: Math.min(9999, (p.affection[p.pet] ?? 0) + 1) } })),
    toggleHaptics: () => change(p => ({ ...p, haptics: !p.haptics })),
  };
}
