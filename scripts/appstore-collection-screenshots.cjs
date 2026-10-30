// Collection screenshots for App Store Connect at 1179 x 2556 (393 x 852 CSS px, 3x), with everything owned.
//
//   1. Start the web build with everything unlocked:  EXPO_PUBLIC_DEV_UNLOCK_ALL=1 npx expo start --web --port 8096
//   2. Run:  PLAYWRIGHT_MODULE_PATH=<path to playwright> node scripts/appstore-collection-screenshots.cjs
//
// Takes the 3D collection world zoomed all the way out (the most things on one screen), then each shelf list page by page.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.APP_URL || 'http://localhost:8096';
const OUT = path.resolve(process.env.OUT_DIR || path.join(__dirname, '..', 'docs', 'app-store-screenshots', 'iphone-6.3-collection'));
const KEY = '@mobidou/journey/v1';
const DAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const reward = (id, steps, threshold) => ({ id, date: DAY, steps, threshold });
const store = {
  version: 1, onboarded: true, demo: false,
  real: { day: DAY, steps: 7000, totalSteps: 7000, dayStart: 0, routeId: 'sanctuary', baseline: 0, highWater: 7000, routeSteps: 7000, completedAt: DAY,
    rewards: [reward('rain', 1000, 1000), reward('forest', 3000, 3000), reward('takekaze', 5000, 5000), reward('morika', 6000, 6000), reward('morikage', 7000, 7000)], pending: [] },
  trial: { day: DAY, steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] },
  pet: 'mobibou', affection: { mobibou: 40 }, haptics: false, source: 'none', omikujiDay: DAY, omikujiPetId: 'mobibou',
  mobbies: { owned: { mobibou: 2 }, paidPulls: 0, freePulls: 1, freePullRoutes: ['sanctuary'], unrevealed: [] },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, locale: 'ja-JP', timezoneId: 'Asia/Tokyo', isMobile: true, hasTouch: true });
  await context.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: store });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
  const opening = page.locator('[aria-label^="オープニング"]');
  await opening.waitFor({ state: 'visible', timeout: 60000 });
  const box = await opening.boundingBox();
  const y = box.y + box.height * .6;
  await page.mouse.move(box.x + box.width - 24, y); await page.mouse.down(); await page.mouse.move(box.x + 24, y, { steps: 16 }); await page.mouse.up();
  await opening.waitFor({ state: 'hidden', timeout: 30000 });
  await page.getByText('イベント開催中').first().waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
  const closeText = () => page.getByText(/^(とじる|閉じる)$/).first();
  for (let i = 0; i < 4; i++) { if (!(await closeText().isVisible({ timeout: 2500 }).catch(() => false))) break; await closeText().click(); await page.waitForTimeout(600); }
  await page.getByRole('tab', { name: /コレクション/ }).click();
  await page.waitForTimeout(2000);

  // The world: pinch all the way out with two fingers.
  await page.getByRole('button', { name: '所持品の一覧を3Dで見る' }).click();
  await page.waitForTimeout(3500);
  const guide = page.getByText('はじめる').first();
  if (await guide.isVisible({ timeout: 2000 }).catch(() => false)) { await guide.click(); await page.waitForTimeout(1500); }
  const cdp = await context.newCDPSession(page);
  const touch = (type, xs) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: xs.map((x, i) => ({ x, y: 420, id: i + 1 })) });
  for (let round = 0; round < 2; round++) {
    await touch('touchStart', [60, 330]);
    for (let s = 0; s <= 10; s++) { const d = 135 - s * 10; await touch('touchMove', [196 - d, 196 + d]); await page.waitForTimeout(40); }
    await touch('touchEnd', []);
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, '01-collection-world-wide.png') });
  await page.getByRole('button', { name: '一覧を閉じる' }).click();
  await page.waitForTimeout(1200);

  // The shelves: every page of each list.
  let n = 2;
  for (const label of ['御朱印', 'ミニチュア']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(2200);
    const next = page.getByRole('button', { name: /次/ });
    for (let pageNo = 1; pageNo <= 12; pageNo++) {
      await page.screenshot({ path: path.join(OUT, `${String(n++).padStart(2, '0')}-${label === '御朱印' ? 'goshuin' : 'miniature'}-p${pageNo}.png`) });
      const more = await next.first().isEnabled({ timeout: 1000 }).catch(() => false);
      if (!more) break;
      await next.first().click();
      await page.waitForTimeout(1200);
    }
    await closeText().click();
    await page.waitForTimeout(1000);
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
