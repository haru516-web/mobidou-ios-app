import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { URL } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

// Exercise the component's real handlers and effects with a controlled clock.
function mount() {
  const slots: any[] = [];
  const effects: any[] = [];
  let cursor = 0, now = 0, tree: any, frame = 0, background: any;
  let ready = true;
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const react = {
    createElement: (type: any, props: any, ...children: any[]) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(value: any) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = value;
      return [slots[i], (next: any) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useRef(value: any) { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect(fn: any, deps: any[]) {
      const i = cursor++;
      const old = slots[i];
      if (!old || deps.some((d, n) => d !== old.deps[n])) effects.push(() => {
        old?.cleanup?.(); slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  const source = fs.readFileSync(new URL('../src/components/PrayerControls.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const exports: any = {};
  vm.runInNewContext(code, {
    exports, Date: { now: () => now },
    setInterval: (fn: any) => { timers.set(++timerId, fn); return timerId; },
    clearInterval: (id: number) => timers.delete(id),
    require: (name: string) => name === 'react' ? react : name === 'react-native'
      ? { Pressable: 'button', Text: 'text', View: 'view', AppState: { addEventListener: (_: any, fn: any) => { background = fn; return { remove() {} }; } } }
      : { __esModule: true, default: 'svg', Circle: 'circle' },
  });
  const onFrame = (value: number) => { frame = value; };
  const render = () => { cursor = 0; tree = exports.PrayerControls({ ready, onFrame }); effects.splice(0).forEach(fn => fn()); };
  const nodes = (node: any): any[] => node && typeof node === 'object' ? [node, ...node.props.children.flatMap(nodes)] : [];
  render();
  return {
    button: (label: string) => nodes(tree).find(n => n.type === 'button' && n.props.accessibilityLabel === label).props,
    tick(ms: number) { for (let left = ms; left > 0;) { const delta = Math.min(10, left); left -= delta; now += delta; [...timers.values()].forEach(fn => fn()); render(); } },
    act(fn: () => void) { fn(); render(); },
    frame: () => frame,
    background() { background('background'); render(); },
    notReady() { ready = false; render(); },
  };
}

function reachSecondClap(h: ReturnType<typeof mount>) {
  for (const [label, duration] of [['歩く', 1710], ['礼', 760], ['歩く', 2090], ['礼', 760], ['礼', 760], ['拍手', 760]] as const) {
    const button = h.button(label);
    assert.equal(button.disabled, false);
    h.act(() => (button.onPressIn ?? button.onPress)());
    h.tick(duration + 20);
    if (button.onPressOut) h.act(button.onPressOut);
  }
}

test('walking waits for input, pauses on release, and resumes', () => {
  const h = mount();
  h.tick(3000); assert.equal(h.frame(), 0);
  h.act(h.button('歩く').onPressIn); h.tick(500);
  const frame = h.frame(); assert.ok(frame > 0);
  h.act(h.button('歩く').onPressOut); h.tick(3000); assert.equal(h.frame(), frame);
  h.act(h.button('歩く').onPressIn); h.tick(1300);
  assert.equal(h.button('礼').disabled, false);
});

test('second clap needs a continuous two seconds and holds contact until final bow', () => {
  const h = mount(); reachSecondClap(h);
  h.act(h.button('拍手').onPressIn); h.tick(1500);
  assert.equal(h.frame(), 75); assert.equal(h.button('礼').disabled, true);
  h.act(h.button('拍手').onPressOut);
  h.act(h.button('拍手').onPressIn); h.tick(1990);
  assert.equal(h.button('礼').disabled, true);
  h.tick(30); assert.equal(h.button('礼').disabled, false);
  h.tick(5000); assert.equal(h.frame(), 75);
  h.act(h.button('礼').onPress); h.tick(800);
  assert.equal(h.frame(), 87); assert.equal(h.button('歩く').disabled, false);
  for (const [label, duration] of [['歩く', 1710], ['礼', 760], ['歩く', 1900]] as const) {
    const button = h.button(label);
    h.act(() => (button.onPressIn ?? button.onPress)()); h.tick(duration + 20);
    if (button.onPressOut) h.act(button.onPressOut);
  }
  assert.equal(h.frame(), 134, 'finishing the return walk advances to the reward');
});

test('backgrounding cancels prayer hold and unloaded assets block input', () => {
  const h = mount(); reachSecondClap(h);
  h.act(h.button('拍手').onPressIn); h.tick(1200); h.background(); h.tick(3000);
  assert.equal(h.button('礼').disabled, true);
  h.act(h.button('拍手').onPressIn); h.tick(1000);
  assert.equal(h.button('礼').disabled, true);
  const cold = mount(); cold.notReady(); assert.equal(cold.button('歩く').disabled, true);
});
