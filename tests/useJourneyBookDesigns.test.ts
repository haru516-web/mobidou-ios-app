import { register } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// useJourney is a React Native hook, so this test registers minimal Node-side
// stubs and resolves the project's extensionless imports before loading its
// pure book-state helpers.
const stub = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;
const moduleUrls = [
  ['react', stub('export const useCallback = (fn) => fn; export const useEffect = () => {}; export const useRef = value => ({ current: value }); export const useState = value => [value, () => {}];')],
  ['react-native', stub('export const AppState = { currentState: null, addEventListener: () => ({ remove() {} }) };')],
  ['@react-native-async-storage/async-storage', stub('export default { getItem: async () => null, setItem: async () => {} };')],
  ['./steps', stub('export const connectSteps = async () => "none"; export const readTodaySteps = async () => ({ steps: 0, at: new Date() });')],
  ['../petCatalog', stub('export const isPetId = () => false;')],
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

const { emptyBookDesigns, normalizeBookDesignState, setActiveBookDesigns } = await import('../src/services/useJourney.ts');

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
