import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { freshProgress, localDay, normalizeProgress, rollDay, updateSteps, startRoute, resumeRoute, type Progress } from './progress';
import { getPilgrimage } from '../data/pilgrimages';
import { connectSteps, readTodaySteps, type StepSource } from './steps';
import { isPetId, type PetId } from '../petCatalog';
import { defaultBackgroundId, isBackgroundId, type BackgroundId } from '../data/backgrounds';

const KEY = '@mobidou/journey/v1';
type Saved = { routes?: Record<string, Progress>; version: 1; onboarded: boolean; demo: boolean; real: Progress; trial: Progress; pet: PetId; affection: Record<string, number>; haptics: boolean; source: StepSource; backgroundId: BackgroundId };
const initial = (): Saved => ({ version: 1, onboarded: false, demo: false, real: freshProgress(), trial: freshProgress(), pet: 'mobibou', affection: {}, haptics: true, source: 'none', backgroundId: defaultBackgroundId() });
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
        const loaded: Saved = { ...initial(), onboarded: p.onboarded === true, demo: p.demo === true, real: normalizeProgress(p.real), trial: normalizeProgress(p.trial), pet: isPetId(p.pet) ? p.pet : 'mobibou', haptics: p.haptics !== false, source: ['healthkit', 'motion'].includes(p.source) ? p.source : 'none', backgroundId: isBackgroundId(p.backgroundId) ? p.backgroundId : initial().backgroundId, routes: Object.fromEntries(Object.entries(p.routes ?? {}).map(([key, value]) => [key, normalizeProgress(value)])), affection: Object.fromEntries(Object.entries(p.affection ?? {}).filter(([k, v]) => isPetId(k) && Number.isFinite(v) && v >= 0)) };
        current.current = loaded; setData(loaded);
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
        change(prev => ({ ...prev, real: updateSteps(prev.real, result.steps, result.at) }));
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
      change(prev => ({ ...prev, onboarded: true, demo: false, source, real: updateSteps(prev.real, result.steps, result.at) }));
      setSynced(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { setError(e instanceof Error ? e.message : '接続できませんでした。'); }
    finally { syncLock.current = false; setBusy(false); }
  };
  return {
    data, progress: data.demo ? data.trial : data.real, ready, error, busy, synced, refresh, connect,
    dismissError: () => setError(''),
    enter: (demo: boolean) => { epoch.current++; change(p => ({ ...p, onboarded: true, demo })); },
    demoWalk: () => change(p => ({ ...p, trial: updateSteps(p.trial, rollDay(p.trial).steps + 1000) })),
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
    chooseBackground: (backgroundId: BackgroundId) => change(p => ({ ...p, backgroundId })),
    bond: () => change(p => ({ ...p, affection: { ...p.affection, [p.pet]: Math.min(9999, (p.affection[p.pet] ?? 0) + 1) } })),
    toggleHaptics: () => change(p => ({ ...p, haptics: !p.haptics })),
  };
}
