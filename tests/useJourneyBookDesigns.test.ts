import { register } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// useJourney is a React Native hook, so this test registers minimal Node-side
// stubs and resolves the project's extensionless imports before loading its
// pure book-state helpers.
const stub = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;
const moduleUrls = [
  ['react', stub('export const useCallback = (fn) => fn; export const useEffect = () => {}; export const useRef = value => ({ current: value }); export const useState = value => [value, () => {}];')],
  ['react-native', stub('export const AppState = { currentState: null, addEventListener: () => ({ remove() {} }) }; export const DevSettings = { reload() {} };')],
  ['@react-native-async-storage/async-storage', stub('export default { getItem: async () => null, setItem: async () => {} };')],
  ['./steps', stub('export const connectSteps = async () => "none"; export const readTodaySteps = async () => ({ steps: 0, at: new Date() });')],
  ['../petCatalog', stub('export const PET_CHARACTERS = [{ id: "mobibou" }, { id: "mobirin" }]; export const isPetId = id => id === "mobibou" || id === "mobirin";')],
  ['../data/backgrounds', stub('export const defaultBackgroundId = () => "spring-dawn"; export const isBackgroundId = () => true;')],
];
const loaderSource = `const moduleUrls = new Map(${JSON.stringify(moduleUrls)});
export async function resolve(specifier, context, nextResolve) {
  if (moduleUrls.has(specifier)) return { url: moduleUrls.get(specifier), shortCircuit: true };
  if (specifier.startsWith('.') && !specifier.endsWith('.ts') && !specifier.endsWith('.tsx') && !specifier.endsWith('.js')) {
    try { return await nextResolve(specifier + '.ts', context, nextResolve); } catch {}
  }
  return nextResolve(specifier, context, nextResolve);
}`;
register(stub(loaderSource), { parentURL: import.meta.url });

const { emptyBookDesigns, normalizeBookDesignState, normalizeSaved, setActiveBookDesigns } = await import('../src/services/useJourney.ts');

test('legacy book designs migrate to real mode while trial starts separately', () => {
  const legacy = { owned: { sanctuary: true, invalid: 'yes' }, selected: { sanctuary: 'route', invalid: 'other' } };
  const real = normalizeBookDesignState({ demo: false, bookDesigns: legacy });
  assert.deepEqual(real.realBookDesigns, { owned: { sanctuary: true }, selected: { sanctuary: 'route' } });
  assert.deepEqual(real.trialBookDesigns, emptyBookDesigns());
  assert.deepEqual(real.bookDesigns, real.realBookDesigns);

  const trial = normalizeBookDesignState({ demo: true, bookDesigns: legacy, trialBookDesigns: { owned: { mountain: true }, selected: { mountain: 'route' } } });
  assert.deepEqual(trial.realBookDesigns, real.realBookDesigns);
  assert.deepEqual(trial.trialBookDesigns, { owned: { mountain: true }, selected: { mountain: 'route' } });
  assert.deepEqual(trial.bookDesigns, trial.trialBookDesigns);
});

test('active cover updates write only to the selected real or trial state', () => {
  const empty = emptyBookDesigns();
  const base = { demo: false, bookDesigns: empty, realBookDesigns: empty, trialBookDesigns: empty };
  const real = setActiveBookDesigns(base, { owned: { sanctuary: true }, selected: { sanctuary: 'route' } });
  assert.equal(real.realBookDesigns.owned.sanctuary, true);
  assert.equal(real.trialBookDesigns.owned.sanctuary, undefined);

  const trial = setActiveBookDesigns({ ...real, demo: true }, { owned: { mountain: true }, selected: { mountain: 'route' } });
  assert.equal(trial.trialBookDesigns.owned.mountain, true);
  assert.equal(trial.realBookDesigns.owned.sanctuary, true);
  assert.equal(trial.realBookDesigns.owned.mountain, undefined);
  assert.equal(trial.bookDesigns.owned.mountain, true);
});

test('one malformed archived route is dropped without discarding the whole save', () => {
  const fresh = { day: '2026-09-09', steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] };
  const saved = normalizeSaved({
    version: 1,
    onboarded: true,
    real: fresh,
    trial: fresh,
    routes: { 'real:mountain': { ...fresh, routeId: 'mountain' }, 'real:broken': { ...fresh, routeId: 'no-such-route' } },
  });
  assert.equal(saved.onboarded, true);
  assert.deepEqual(Object.keys(saved.routes ?? {}), ['real:mountain']);
});

test('transfer codes round-trip and reject a damaged or edited code', async () => {
  const { createTransferCode, readTransferData } = await import('../src/services/useJourney.ts');
  const fresh = { day: '2026-09-09', steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] };
  const saved = normalizeSaved({ version: 1, onboarded: true, real: fresh, trial: fresh });
  const code = createTransferCode(saved);
  assert.equal(readTransferData(code).onboarded, true);

  const edited = JSON.parse(code);
  edited.data.real.totalSteps = 999999;
  assert.throws(() => readTransferData(JSON.stringify(edited)), /書き換えられている/);

  // Codes exported before checksums were added carry none and still import.
  const legacy = JSON.parse(code);
  delete legacy.checksum;
  assert.equal(readTransferData(JSON.stringify(legacy)).onboarded, true);
});

const { startRoute, updateSteps, routeTargets } = await import('../src/services/progress.ts');
const savedWith = (over: Record<string, unknown>) => {
  const today = new Date();
  const start = startRoute('compassion', 0, today);
  const done = { ...updateSteps(start, routeTargets(start).at(-1)!, today), pending: [] as string[] };
  return { version: 1, onboarded: true, demo: false, real: done, trial: { day: done.day, steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] }, pet: 'mobirin', ...over };
};

test('a save from before the Mobby collection keeps its chosen Mobby and earns a free pull for each finished route', () => {
  const loaded = normalizeSaved(savedWith({}));
  assert.deepEqual(loaded.mobbies.owned, { mobirin: 1 });
  assert.equal(loaded.mobbies.freePulls, 1);
  assert.deepEqual(loaded.mobbies.freePullRoutes, ['compassion']);
  // Loading the same save again must not hand out the pull twice.
  const again = normalizeSaved({ ...savedWith({}), mobbies: loaded.mobbies });
  assert.equal(again.mobbies.freePulls, 1);
});

test('a save that has not been onboarded starts with no Mobby, so the first pick becomes the starter', () => {
  const loaded = normalizeSaved(savedWith({ onboarded: false }));
  assert.deepEqual(loaded.mobbies.owned, {});
});

test('the trial book never earns real free pulls', () => {
  const trialDone = savedWith({});
  const loaded = normalizeSaved({ ...trialDone, real: { ...trialDone.trial }, trial: trialDone.real, demo: true });
  assert.equal(loaded.mobbies.freePulls, 0);
});
