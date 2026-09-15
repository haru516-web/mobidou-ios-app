import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { freshProgress, localDay, normalizeProgress, rollDay, updateSteps, startRoute, resumeRoute, type Progress } from './progress';
import { getPilgrimage } from '../data/pilgrimages';
import { connectSteps, readTodaySteps, type StepSource } from './steps';
import { isPetId, type PetId } from '../petCatalog';
import { defaultBackgroundId, isBackgroundId, type BackgroundId } from '../data/backgrounds';
import { emptySpecialCollection, normalizeSpecialCollection, purchasePass, redeemPass, rollSpecialDrop, type PassKind, type SpecialCollection, type SpecialKind } from './specialRewards';
import { DEFAULT_HOME_WIDGET_ITEMS, DEFAULT_HOME_WIDGET_ORDER, normalizeHomeWidgetItems, normalizeHomeWidgetOrder, type HomeWidgetItems, type HomeWidgetOrder } from './homePreferences';

const KEY = '@mobidou/journey/v1';
type BookDesigns = { owned: Record<string, boolean>; selected: Record<string, 'normal' | 'route'> };
type Saved = { routes?: Record<string, Progress>; version: 1; onboarded: boolean; demo: boolean; real: Progress; trial: Progress; realSpecial: SpecialCollection; trialSpecial: SpecialCollection; bookDesigns: BookDesigns; pet: PetId; affection: Record<string, number>; haptics: boolean; source: StepSource; backgroundId: BackgroundId; homeWidgetOrder: HomeWidgetOrder; homeWidgetItems: HomeWidgetItems };
const initial = (): Saved => ({ version: 1, onboarded: false, demo: false, real: freshProgress(), trial: freshProgress(), realSpecial: emptySpecialCollection(), trialSpecial: emptySpecialCollection(), bookDesigns: { owned: {}, selected: {} }, pet: 'mobibou', affection: {}, haptics: true, source: 'none', backgroundId: defaultBackgroundId(), homeWidgetOrder: [...DEFAULT_HOME_WIDGET_ORDER] as HomeWidgetOrder, homeWidgetItems: [...DEFAULT_HOME_WIDGET_ITEMS] });

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
        const loaded: Saved = { ...initial(), onboarded: p.onboarded === true, demo: p.demo === true, real: normalizeProgress(p.real), trial: normalizeProgress(p.trial), realSpecial: normalizeSpecialCollection(p.realSpecial), trialSpecial: normalizeSpecialCollection(p.trialSpecial), bookDesigns: { owned: { ...(p.bookDesigns?.owned ?? {}) }, selected: { ...(p.bookDesigns?.selected ?? {}) } }, pet: isPetId(p.pet) ? p.pet : 'mobibou', haptics: p.haptics !== false, source: ['healthkit', 'motion'].includes(p.source) ? p.source : 'none', backgroundId: isBackgroundId(p.backgroundId) ? p.backgroundId : initial().backgroundId, homeWidgetOrder: normalizeHomeWidgetOrder(p.homeWidgetOrder), homeWidgetItems: normalizeHomeWidgetItems(p.homeWidgetItems), routes: Object.fromEntries(Object.entries(p.routes ?? {}).map(([key, value]) => [key, normalizeProgress(value)])), affection: Object.fromEntries(Object.entries(p.affection ?? {}).filter(([k, v]) => isPetId(k) && Number.isFinite(v) && v >= 0)) };
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
      change(prev => ({ ...updateSavedProgress(prev, 'real', result.steps, result.at), onboarded: true, demo: false, source }));
      setSynced(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { setError(e instanceof Error ? e.message : '接続できませんでした。'); }
    finally { syncLock.current = false; setBusy(false); }
  };
  return {
    data, progress: data.demo ? data.trial : data.real, special: data.demo ? data.trialSpecial : data.realSpecial, ready, error, busy, synced, refresh, connect,
    dismissError: () => setError(''),
    enter: (demo: boolean) => { epoch.current++; change(p => ({ ...p, onboarded: true, demo })); },
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
      const restored = saved ? rollDay(saved) : startRoute(routeId, active.steps);
      return { ...p, routes, [field]: resumeRoute(active, restored) };
    }),
    choosePet: (pet: PetId) => change(p => ({ ...p, pet })),
    saveHomeWidgetOrder: (order: HomeWidgetOrder) => change(p => ({ ...p, homeWidgetOrder: normalizeHomeWidgetOrder(order) })),
    saveHomeWidgetItems: (items: HomeWidgetItems) => change(p => ({ ...p, homeWidgetItems: normalizeHomeWidgetItems(items) })),
    chooseBackground: (backgroundId: BackgroundId) => change(p => ({ ...p, backgroundId })),
    purchaseBookDesign: (routeId: string) => change(p => ({ ...p, bookDesigns: { owned: { ...p.bookDesigns.owned, [routeId]: true }, selected: { ...p.bookDesigns.selected, [routeId]: 'route' } } })),
    selectBookDesign: (routeId: string, design: 'normal' | 'route') => change(p => design === 'route' && !p.bookDesigns.owned[routeId] ? p : ({ ...p, bookDesigns: { ...p.bookDesigns, selected: { ...p.bookDesigns.selected, [routeId]: design } } })),
    purchasePass: (kind: PassKind) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      return { ...p, [field]: purchasePass(p[field], kind) };
    }),
    redeemPass: (shrineId: string, kind: SpecialKind) => change(p => {
      const field = p.demo ? 'trialSpecial' : 'realSpecial';
      return { ...p, [field]: redeemPass(p[field], shrineId, kind) };
    }),
    bond: () => change(p => ({ ...p, affection: { ...p.affection, [p.pet]: Math.min(9999, (p.affection[p.pet] ?? 0) + 1) } })),
    toggleHaptics: () => change(p => ({ ...p, haptics: !p.haptics })),
  };
}
