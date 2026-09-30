const playwrightPath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright';
const { test } = require(playwrightPath + '/test');
const { chromium } = require(playwrightPath);
const fs = require('fs');
const path = require('path');

test.setTimeout(20 * 60 * 1000);

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'qa-smoke-screens');
const DAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const KEY = '@mobidou/journey/v1';
const sizes = [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }];
const reward = (id, steps, threshold) => ({ id, date: DAY, steps, threshold });
const fresh = () => ({ day: DAY, steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] });
const partial = () => ({ day: DAY, steps: 3280, totalSteps: 3280, dayStart: 0, routeId: 'sanctuary', baseline: 0, highWater: 3280, routeSteps: 3280, rewards: [reward('rain', 1080, 1000), reward('forest', 3280, 3000)], pending: [] });
const completed = (pending = [], replay = false) => ({
  day: DAY, steps: replay ? 9000 : 8000, totalSteps: replay ? 9000 : 8000, dayStart: 0,
  routeId: 'sanctuary', baseline: 0, highWater: replay ? 9000 : 8000, routeSteps: replay ? 9000 : 8000,
  rewards: [reward('rain', 1000, 1000), reward('forest', 3000, 3000), reward('takekaze', 5000, 5000), reward('morika', 6000, 6000), reward('morikage', 8000, 8000)],
  pending, completedAt: DAY, ...(replay ? { lapBase: 8000 } : {})
});
const base = (overrides = {}) => ({
  version: 1, onboarded: true, demo: false, real: partial(), trial: fresh(), pet: 'mobibou',
  affection: { mobibou: 24 }, haptics: false, source: 'none', omikujiDay: DAY, omikujiPetId: 'mobibou',
  mobbies: { owned: { mobibou: 2, mobirin: 1, mobichi: 1 }, paidPulls: 24, freePulls: 1, freePullRoutes: ['sanctuary'], unrevealed: [] },
  ...overrides
});
const fixtures = {
  base: base(),
  noRoute: base({ real: fresh() }),
  omikuji: base({ omikujiDay: null, omikujiPetId: null }),
  trial: base({ demo: true, trial: partial() }),
  gachaResult: base({ mobbies: { owned: { mobibou: 2, mobirin: 1 }, paidPulls: 24, freePulls: 0, freePullRoutes: ['sanctuary'], unrevealed: [{ petId: 'mobichi', isNew: true, guaranteed: false, kind: 'free' }] } }),
  completion: base({ real: completed(['morikage']) }),
  replay: base({ real: completed(['rain'], true) })
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'fixtures.json'), JSON.stringify(fixtures, null, 2));

async function nextUntil(page, target) {
  await page.waitForTimeout(1000);
  for (let i = 0; i < 15; i++) {
    if (await target.isVisible()) return;
    const next = page.getByRole('button', { name: '次のページ', exact: true }).last();
    if (!await next.isVisible() || !await next.isEnabled()) break;
    await next.click();
    await page.waitForTimeout(200);
  }
  await target.waitFor({ state: 'visible', timeout: 3000 });
}

async function returnHome(page) {
  await page.getByRole('tab', { name: /ホーム/ }).click();
  await page.getByRole('button', { name: '設定を開く' }).waitFor();
}

async function closePopup(page) {
  await page.getByRole('button', { name: '閉じる', exact: true }).last().click();
  await page.getByRole('button', { name: '設定を開く' }).waitFor();
}

async function departFirstRoute(page) {
  const previous = page.getByRole('button', { name: '前のページ', exact: true }).last();
  for (let i = 0; i < 15 && await previous.isVisible() && await previous.isEnabled(); i++) { await previous.click(); await page.waitForTimeout(200); }
  await page.getByRole('button', { name: /木漏れ日の奥宮へ.*詳細/ }).click();
  await page.getByRole('button', { name: 'この巡礼に出発する' }).click();
  await page.getByLabel('巡礼を選ぶ', { exact: true }).waitFor({ state: 'hidden' });
}

async function assertWholeControl(locator) {
  const clipped = await locator.evaluate(node => {
    const r = node.getBoundingClientRect();
    const clips = [];
    for (let p = node.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/hidden|clip/.test(s.overflowY) && (r.top < b.top - 1 || r.bottom > b.bottom + 1)) clips.push({ controlTop: r.top, controlBottom: r.bottom, clipTop: b.top, clipBottom: b.bottom });
    }
    return clips;
  });
  if (clipped.length) throw new Error(`control clipped by container: ${JSON.stringify(clipped)}`);
}

async function waitLoaded(page) {
  page.setDefaultTimeout(15000);
  await page.goto('http://127.0.0.1:8083', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText('ご縁の支度をしています').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
}

async function enter(page) {
  const opening = page.locator('[aria-label^="オープニング"]');
  await opening.waitFor({ state: 'visible', timeout: 30000 });
  const box = await opening.boundingBox();
  if (!box) throw new Error('opening gesture surface has no box');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 24, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 24, y, { steps: 16 });
  await page.mouse.up();
  await opening.waitFor({ state: 'hidden', timeout: 30000 });
  await page.waitForTimeout(450);
}

async function openMobbyMenu(page) {
  await page.getByRole('button', { name: /タップでメニューをひらく/ }).click();
}

async function openPicker(page) {
  await openMobbyMenu(page);
  await page.getByRole('button', { name: 'キャラ変更', exact: true }).click();
  await page.getByRole('heading', { name: 'モビーを選ぶ' }).waitFor();
}

async function openGacha(page) {
  await openPicker(page);
  await page.getByRole('button', { name: /ガチャでモビーに出会う/ }).click();
  await page.getByRole('heading', { name: /ご縁を結ぶ|箱が|前の板|光が|ご縁が結ばれました/ }).waitFor();
}

const scenarios = [
  { name: 'opening', fixture: null, enter: false, ready: p => p.getByLabel(/^オープニング/) },
  { name: 'home-duplicates', fixture: 'base', ready: p => p.getByRole('tab', { name: /ホーム/ }) },
  { name: 'home-card-edit', fixture: 'base', action: async p => { await p.getByRole('button', { name: '設定を開く' }).click(); await p.getByRole('button', { name: 'ホームのカードを編集' }).click(); }, ready: p => p.getByRole('heading', { name: 'ホーム画面カスタム' }) },
  { name: 'route-selection', fixture: 'noRoute', ready: p => p.getByText('どの旅へ、出かけよう。').filter({ visible: true }), back: async p => { await p.getByRole('button', { name: /木漏れ日の奥宮へ.*詳細/ }).click(); await p.getByRole('button', { name: 'この巡礼に出発する' }).click(); await p.getByLabel('巡礼を選ぶ', { exact: true }).waitFor({ state: 'hidden' }); await p.getByRole('button', { name: '設定を開く' }).waitFor(); } },
  { name: 'route-event', fixture: 'noRoute', action: async p => { await nextUntil(p, p.getByRole('button', { name: /イベント巡礼/ })); await p.getByRole('button', { name: /イベント巡礼/ }).click(); }, ready: p => p.getByRole('button', { name: /イベント巡礼/ }), back: async p => { await departFirstRoute(p); await p.getByRole('button', { name: '設定を開く' }).waitFor(); } },
  { name: 'map', fixture: 'base', action: async p => { await p.getByRole('tab', { name: /おでかけ/ }).click(); await p.getByRole('button', { name: '絵図', exact: true }).click(); }, ready: p => p.getByText('もびの世界の巡礼絵図 · 実際の地図ではありません') },
  { name: 'goshuin-book', fixture: 'base', action: async p => { await p.getByRole('tab', { name: /御朱印帳/ }).click(); }, ready: p => p.getByRole('button', { name: /御朱印帳をひらく/ }) },
  { name: 'collection', fixture: 'base', action: async p => { await p.getByRole('tab', { name: /コレクション/ }).click(); }, ready: p => p.getByLabel(/コレクション展示室/) },
  { name: 'omikuji', fixture: 'omikuji', ready: p => p.getByRole('button', { name: '今日のおみくじを引く' }) },
  { name: 'settings', fixture: 'base', action: async p => { await p.getByRole('button', { name: '設定を開く' }).click(); }, ready: p => p.getByRole('button', { name: 'アカウント管理' }), verify: async p => { for (const label of ['アカウント管理', 'ホームのカードを編集', 'プライバシーとデータ', 'もび道について・利用上の案内']) { await p.getByRole('button', { name: label }).scrollIntoViewIfNeeded(); await p.getByRole('button', { name: label }).waitFor(); } } },
  { name: 'settings-privacy', fixture: 'base', action: async p => { await p.getByRole('button', { name: '設定を開く' }).click(); await p.getByRole('button', { name: 'プライバシーとデータ' }).click(); }, ready: p => p.getByText(/GPSも使用しません/).last(), back: async p => { await p.getByRole('button', { name: 'とじる', exact: true }).click(); await closePopup(p); } },
  { name: 'settings-about', fixture: 'base', action: async p => { await p.getByRole('button', { name: '設定を開く' }).click(); await p.getByRole('button', { name: 'もび道について・利用上の案内' }).click(); }, ready: p => p.getByText(/架空の御朱印を集めるアプリ/).last(), back: async p => { await p.getByRole('button', { name: 'とじる', exact: true }).click(); await closePopup(p); } },
  { name: 'mobby-selection-locks', fixture: 'base', action: async p => { await openPicker(p); await p.getByRole('radio', { name: /まだ出会っていません/ }).first().scrollIntoViewIfNeeded(); }, ready: p => p.getByRole('heading', { name: 'モビーを選ぶ' }), verify: async p => { if (await p.getByRole('radio', { name: /まだ出会っていません/ }).first().isEnabled()) throw new Error('unowned Mobby is selectable'); await assertWholeControl(p.getByRole('button', { name: '決定', exact: true })); } },
  { name: 'gacha-rope', fixture: 'base', action: openGacha, ready: p => p.getByRole('button', { name: 'ひもを引いてモビーに出会う' }) },
  { name: 'gacha-box', fixture: 'base', action: async p => { await openGacha(p); await p.getByRole('button', { name: 'ひもを引く' }).click(); }, ready: p => p.getByRole('button', { name: '箱の前の板を上へ引き上げる' }) },
  { name: 'gacha-lift', fixture: 'base', action: async p => { await openGacha(p); await p.getByRole('button', { name: 'ひもを引く' }).click(); const board = p.getByRole('button', { name: '箱の前の板を上へ引き上げる' }); await board.waitFor(); const b = await board.boundingBox(); if (!b) throw new Error('gacha board has no box'); await p.mouse.move(b.x + b.width / 2, b.y + b.height * .55); await p.mouse.down(); await p.mouse.move(b.x + b.width / 2, b.y + b.height * .25, { steps: 8 }); return async () => p.mouse.up(); }, ready: p => p.getByRole('button', { name: '箱の前の板を上へ引き上げる' }) },
  { name: 'gacha-result', fixture: 'gachaResult', action: async p => { await openGacha(p); await p.getByRole('button', { name: '演出を省略' }).click(); }, ready: p => p.getByRole('heading', { name: 'ご縁が結ばれました' }) },
  { name: 'completion-award', fixture: 'completion', action: async p => { await p.getByRole('button', { name: '演出を省略して御朱印をみる' }).click(); }, ready: p => p.getByRole('heading', { name: '巡礼、結願。' }) },
  { name: 'replay-award', fixture: 'replay', ready: p => p.getByRole('heading', { name: '再びのご参拝です' }) },
  { name: 'presents', fixture: 'trial', action: async p => { await openMobbyMenu(p); await p.getByRole('button', { name: /^プレゼント/ }).click(); }, ready: p => p.getByRole('heading', { name: 'プレゼントボックス' }) },
  { name: 'friends', fixture: 'trial', action: async p => { await openMobbyMenu(p); await p.getByRole('button', { name: 'フレンド', exact: true }).click(); }, ready: p => p.getByRole('heading', { name: 'フレンド' }) },
  { name: 'notifications', fixture: 'base', action: async p => { await openMobbyMenu(p); await p.getByRole('button', { name: /^通知/ }).click(); }, ready: p => p.getByRole('heading', { name: '通知' }) }
];

scenarios.push(
  { name: 'completion-animation', fixture: 'completion', ready: p => p.getByRole('button', { name: '演出を省略して御朱印をみる' }), back: async p => { await p.getByRole('button', { name: '演出を省略して御朱印をみる' }).click(); await p.getByRole('button', { name: '御朱印帳にしまう' }).click(); await p.getByRole('button', { name: '設定を開く' }).waitFor(); } },
  { name: 'gacha-drag-result', fixture: 'base', action: async p => {
    await openGacha(p);
    const rope = await p.getByRole('button', { name: 'ひもを引いてモビーに出会う' }).boundingBox();
    if (!rope) throw new Error('rope missing');
    await p.mouse.move(rope.x + rope.width / 2, rope.y + 190); await p.mouse.down();
    await p.mouse.move(rope.x + rope.width / 2, rope.y + 300, { steps: 12 }); await p.mouse.up();
    const board = p.getByRole('button', { name: '箱の前の板を上へ引き上げる' }); await board.waitFor();
    const b = await board.boundingBox(); if (!b) throw new Error('board missing');
    await p.mouse.move(b.x + b.width / 2, b.y + b.height * .8); await p.mouse.down();
    await p.mouse.move(b.x + b.width / 2, b.y - b.height * .2, { steps: 16 }); await p.mouse.up();
  }, ready: p => p.getByRole('heading', { name: 'ご縁が結ばれました' }), back: async p => { await p.getByRole('button', { name: 'おわる', exact: true }).click(); await p.getByRole('button', { name: '設定を開く' }).waitFor(); } },
  { name: 'home-trial', fixture: 'trial', ready: p => p.getByRole('button', { name: /体験モード中/ }) },
  { name: 'goshuin-pages', fixture: 'base', action: async p => { await p.getByRole('tab', { name: /御朱印帳/ }).click(); await p.getByRole('button', { name: /御朱印帳をひらく/ }).click(); await p.getByRole('button', { name: '次の御朱印ページ' }).click(); }, ready: p => p.getByRole('button', { name: '前の御朱印ページ' }), back: returnHome },
  { name: 'goshuin-index', fixture: 'base', action: async p => { await p.getByRole('tab', { name: /御朱印帳/ }).click(); await p.getByRole('button', { name: /御朱印帳をひらく/ }).click(); await p.getByRole('button', { name: '目次', exact: true }).click(); }, ready: p => p.getByRole('heading', { name: '目次' }), back: async p => { await closePopup(p); await returnHome(p); } },
  { name: 'omikuji-result', fixture: 'omikuji', action: async p => { await p.getByRole('button', { name: '今日のおみくじを引く', exact: true }).click(); }, ready: p => p.getByRole('button', { name: 'おみくじの演出をもう一度見る' }), back: closePopup },
  { name: 'settings-account', fixture: 'base', action: async p => { await p.getByRole('button', { name: '設定を開く' }).click(); await p.getByRole('button', { name: 'アカウント管理' }).click(); await nextUntil(p, p.getByRole('button', { name: 'データ引き継ぎ', exact: true })); }, ready: p => p.getByRole('button', { name: 'データ引き継ぎ', exact: true }), back: async p => { await p.getByRole('button', { name: '設定に戻る' }).click(); await closePopup(p); } },
  { name: 'settings-controls', fixture: 'base', action: async p => { await p.getByRole('button', { name: '設定を開く' }).click(); await p.getByRole('switch', { name: 'ふれあいの振動' }).click(); await p.getByRole('button', { name: '歩数を連携する' }).click(); }, ready: p => p.getByRole('button', { name: '体験モードをはじめる' }), back: async p => { await p.getByRole('button', { name: '体験モードをはじめる' }).click(); await p.getByRole('button', { name: /体験モード中/ }).waitFor(); const route = p.getByRole('button', { name: '巡礼を選ぶを閉じる', exact: true }); await route.waitFor(); await departFirstRoute(p); await p.getByRole('button', { name: /体験モード中/ }).click(); await p.getByRole('button', { name: /体験モード中/ }).waitFor({ state: 'hidden' }); } }
);

for (const scenario of scenarios) {
  if (['home-card-edit', 'settings', 'mobby-selection-locks', 'presents', 'friends', 'notifications'].includes(scenario.name)) scenario.back = closePopup;
  if (['map', 'goshuin-book', 'collection'].includes(scenario.name)) scenario.back = returnHome;
  if (scenario.name === 'gacha-rope') scenario.back = async p => { await p.getByRole('button', { name: 'とじる', exact: true }).click(); await p.getByRole('button', { name: '設定を開く' }).waitFor(); };
  if (['gacha-result', 'completion-award', 'replay-award'].includes(scenario.name)) scenario.back = async p => { await p.getByRole('button', { name: scenario.name === 'gacha-result' ? 'おわる' : '御朱印帳にしまう', exact: true }).click(); await p.getByRole('button', { name: '設定を開く' }).waitFor(); };
}

for (const size of sizes) test(`${size.width}x${size.height}`, async () => {
  const resultPath = path.join(OUT, `${size.width}x${size.height}-results.json`);
  const selected = process.env.SMOKE_SCREENS?.split(',');
  const results = selected && fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')).filter(r => !selected.includes(r.screen)) : [];
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const scenario of scenarios) {
      if (selected && !selected.includes(scenario.name)) continue;
      const context = await browser.newContext({ viewport: size, locale: 'ja-JP', timezoneId: 'Asia/Tokyo', reducedMotion: 'reduce' });
      if (scenario.fixture) await context.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: fixtures[scenario.fixture] });
      const page = await context.newPage();
      const messages = [];
      page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') messages.push({ type: message.type(), text: message.text() }); });
      page.on('pageerror', error => messages.push({ type: 'error', text: error.message }));
      let status = 'OK'; let reason = ''; let cleanup; let reached = false; let backChecked = false; let returnScreenshot = null;
      try {
        await waitLoaded(page);
        if (scenario.enter !== false) await enter(page);
        if (scenario.action) cleanup = await scenario.action(page);
        await scenario.ready(page).waitFor({ state: 'visible', timeout: 30000 });
        reached = true;
        await page.waitForFunction(() => [...document.images].filter(img => img.getBoundingClientRect().width > 0).every(img => img.complete), null, { timeout: 20000 }).catch(() => {});
        if (scenario.verify) await scenario.verify(page);
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(OUT, `${size.width}x${size.height}-${scenario.name}.png`), animations: 'disabled', timeout: 60000 });
        if (cleanup) await cleanup();
      } catch (error) {
        status = reached ? 'NG' : '未検証'; reason = error instanceof Error ? error.message : String(error);
        await page.screenshot({ path: path.join(OUT, `${size.width}x${size.height}-${scenario.name}.png`), animations: 'disabled' }).catch(() => {});
      }
      const geometry = await page.evaluate(() => {
        const activeDialog = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].at(-1);
        const visible = [...document.querySelectorAll('button,[role="button"],[role="tab"]')].filter(node => {
          if (activeDialog && !activeDialog.contains(node)) return false;
          if (node.closest('[aria-hidden="true"]')) return false;
          const r = node.getBoundingClientRect(); const s = getComputedStyle(node);
          if (!(r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none')) return false;
          for (let p = node; p; p = p.parentElement) if (Number(getComputedStyle(p).opacity) === 0) return false;
          return true;
        });
        const horizontalOutside = visible.filter(node => {
          for (let p = node.parentElement; p; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowX)) return false;
          const r = node.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1;
        }).map(node => node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 60) || node.tagName);
        const verticalOutside = visible.filter(node => {
          for (let p = node.parentElement; p; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowY)) return false;
          const r = node.getBoundingClientRect(); return r.top < -1 || r.bottom > innerHeight + 1;
        }).map(node => node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 60) || node.tagName);
        return { bodyScrollWidth: document.documentElement.scrollWidth, bodyScrollHeight: document.documentElement.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight, horizontalOutside, verticalOutside };
      }).catch(() => null);
      if (reached && scenario.back) {
        try { await scenario.back(page); backChecked = true; }
        catch (error) { status = 'NG'; reason += ` return: ${error.message}`; returnScreenshot = `docs/qa-smoke-screens/${size.width}x${size.height}-${scenario.name}-return.png`; await page.screenshot({ path: path.join(ROOT, returnScreenshot), timeout: 60000 }).catch(() => {}); }
      }
      if (reached && messages.some(message => message.type === 'error')) { status = 'NG'; reason += ' console error'; }
      if (status === 'OK' && geometry?.horizontalOutside.length) { status = 'NG'; reason = `horizontal overflow: ${geometry.horizontalOutside.join(', ')}`; }
      if (status === 'OK' && geometry?.verticalOutside.length) { status = 'NG'; reason = `vertical overflow: ${geometry.verticalOutside.join(', ')}`; }
      results.push({ size: `${size.width}x${size.height}`, screen: scenario.name, status, reason, reached, backChecked, returnScreenshot, screenshot: `docs/qa-smoke-screens/${size.width}x${size.height}-${scenario.name}.png`, messages, geometry });
      fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
      console.log(`${size.width}x${size.height} ${scenario.name}: ${status}${reason ? ` - ${reason}` : ''}`);
      await Promise.race([page.close({ runBeforeUnload: false }).catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))]);
      await Promise.race([context.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))]);
    }
  } finally { await browser.close(); }
});
