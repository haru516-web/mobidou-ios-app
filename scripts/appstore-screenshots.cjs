// Captures the App Store screenshots from the web build at the iPhone 6.9" size (1320 x 2868).
//
//   1. Start the web build:   npx expo start --web --port 8096
//   2. Run:                   PLAYWRIGHT_MODULE_PATH=<path to playwright> node scripts/appstore-screenshots.cjs
//
// The saved game is a hand-made "a few days into a pilgrimage" record (see `store` below), so the pictures show a lived-in
// app: four goshuin collected, several Mobbies owned. Start the server with EXPO_PUBLIC_DEV_UNLOCK_ALL=1 to show everything owned.
// OUT_DIR and VIEWPORT (e.g. 393x852 for 1179 x 2556 at 3x) override the output folder and the size.
const playwrightPath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright';
const { chromium } = require(playwrightPath);
const fs = require('fs');
const path = require('path');

const URL = process.env.APP_URL || 'http://localhost:8096';
const OUT = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.resolve(__dirname, '..', 'docs', 'app-store-screenshots', 'iphone-6.9');
const KEY = '@mobidou/journey/v1';
const DAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const VIEWPORT = process.env.VIEWPORT ? { width: Number(process.env.VIEWPORT.split('x')[0]), height: Number(process.env.VIEWPORT.split('x')[1]) } : { width: 440, height: 956 };

const reward = (id, steps, threshold) => ({ id, date: DAY, steps, threshold });
const progress = () => ({
  day: DAY, steps: 6240, totalSteps: 6240, dayStart: 0, routeId: 'sanctuary', baseline: 0, highWater: 6240, routeSteps: 6240,
  rewards: [reward('rain', 1000, 1000), reward('forest', 3000, 3000), reward('takekaze', 5000, 5000), reward('morika', 6000, 6000)],
  pending: [],
});
const store = (overrides = {}) => ({
  version: 1, onboarded: true, demo: false, real: progress(),
  trial: { day: DAY, steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] },
  pet: 'mobibou', affection: { mobibou: 40 }, haptics: false, source: 'none', omikujiDay: DAY, omikujiPetId: 'mobibou',
  mobbies: { owned: { mobibou: 2, mobirin: 1, babumoby: 1, mobichi: 1, bearmobby: 1 }, paidPulls: 0, freePulls: 1, freePullRoutes: ['sanctuary'], unrevealed: [] },
  ...overrides,
});

async function enter(page) {
  const opening = page.locator('[aria-label^="オープニング"]');
  await opening.waitFor({ state: 'visible', timeout: 60000 });
  const box = await opening.boundingBox();
  const y = box.y + box.height * .6;
  await page.mouse.move(box.x + box.width - 24, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 24, y, { steps: 16 });
  await page.mouse.up();
  await opening.waitFor({ state: 'hidden', timeout: 30000 });
}

// The web build is a development build: hide the controls that only exist there so the pictures show what ships.
async function hideDevOnly(page) {
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('[role="tablist"]')) if (/購入/.test(node.textContent || '') && !node.closest('[role="navigation"]') && !/ホーム/.test(node.textContent || '')) node.style.visibility = 'hidden';
    for (const node of document.querySelectorAll('[role="button"]')) if (/開発用/.test(node.textContent || '')) node.style.visibility = 'hidden';
  });
}

async function settle(page) {
  await page.waitForFunction(() => [...document.images].filter(img => img.getBoundingClientRect().width > 0).every(img => img.complete), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

const shots = [
  { name: '01-home', ready: p => p.getByRole('tab', { name: /ホーム/ }) },
  { name: '02-goshuin-book', action: async p => { await p.getByRole('tab', { name: /御朱印帳/ }).click(); await p.getByRole('button', { name: /御朱印帳をひらく/ }).click(); await p.waitForTimeout(1200); await p.getByRole('button', { name: '次の御朱印ページ' }).click(); await p.waitForTimeout(1600); } },
  { name: '03-walk', action: async p => { await p.getByRole('tab', { name: /おでかけ/ }).click(); await p.waitForTimeout(1500); } },
  { name: '04-map', action: async p => { await p.getByRole('tab', { name: /おでかけ/ }).click(); await p.getByRole('button', { name: '絵図', exact: true }).click(); await p.waitForTimeout(1500); } },
  { name: '05-collection', action: async p => { await p.getByRole('tab', { name: /コレクション/ }).click(); await p.waitForTimeout(1500); } },
  { name: '06-gacha-curtain', action: async p => { await p.getByRole('tab', { name: /ガチャ/ }).click(); await p.waitForTimeout(1800); } },
  { name: '07-gacha-cart', action: async p => { await p.getByRole('tab', { name: /ガチャ/ }).click(); await p.waitForTimeout(1500); await p.getByRole('button', { name: '1回引く' }).click(); await p.waitForTimeout(2350); }, noSettle: true },
  // The shop is the only picture that shows the purchase buttons, so its dev-only controls stay: it is what App Review checks for the in-app purchases.
  { name: '09-gacha-shop', action: async p => { await p.getByRole('tab', { name: /ガチャ/ }).click(); await p.waitForTimeout(1500); await p.getByRole('tab', { name: '購入', exact: true }).click(); await p.waitForTimeout(1200); }, keepDev: true },
  { name: '08-omikuji', fixture: store({ omikujiDay: null, omikujiPetId: null }), action: async p => { await p.getByRole('button', { name: '今日のおみくじを引く' }).click(); await p.waitForTimeout(9000); } },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
    for (const shot of shots) {
      if (only && !only.has(shot.name)) continue;
      const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3, locale: 'ja-JP', timezoneId: 'Asia/Tokyo', isMobile: true, hasTouch: false });
      await context.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: shot.fixture ?? store() });
      const page = await context.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
        await enter(page);
        // Announcements (such as the event notice) cover the home screen at start: close them before taking the picture.
        await page.getByText('イベント開催中').first().waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
        for (let i = 0; i < 4; i++) { const close = page.getByText(/^(とじる|閉じる)$/).first(); if (!(await close.isVisible({ timeout: 2500 }).catch(() => false))) break; await close.click().catch(() => {}); await page.waitForTimeout(600); }
        await page.waitForTimeout(1500);
        if (shot.action) await shot.action(page);
        if (shot.ready) await shot.ready(page).waitFor({ state: 'visible', timeout: 30000 });
        if (!shot.noSettle) await settle(page);
        if (!shot.keepDev) await hideDevOnly(page);
        await page.screenshot({ path: path.join(OUT, `${shot.name}.png`), animations: 'allow', timeout: 60000 });
        console.log('ok', shot.name);
      } catch (error) {
        console.log('FAILED', shot.name, error instanceof Error ? error.message.split('\n')[0] : error);
        await page.screenshot({ path: path.join(OUT, `${shot.name}-FAILED.png`) }).catch(() => {});
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
})();
