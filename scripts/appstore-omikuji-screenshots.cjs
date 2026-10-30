// Pictures of the omikuji being drawn with Mobirin as the companion, at 1179 x 2556 (393 x 852 CSS px, 3x).
// Starts the draw and saves a frame every 150 ms for the first 2.4 s, then every 0.9 s so the best moments can be picked.
//   PLAYWRIGHT_MODULE_PATH=<path to playwright> APP_URL=http://localhost:8096 node scripts/appstore-omikuji-screenshots.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.APP_URL || 'http://localhost:8096';
const OUT = path.resolve(process.env.OUT_DIR || path.join(__dirname, '..', 'docs', 'app-store-screenshots', 'iphone-6.3-omikuji'));
const DAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const store = {
  version: 1, onboarded: true, demo: false,
  real: { day: DAY, steps: 6240, totalSteps: 6240, dayStart: 0, routeId: 'sanctuary', baseline: 0, highWater: 6240, routeSteps: 6240, rewards: [], pending: [] },
  trial: { day: DAY, steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] },
  pet: 'mobirin', affection: { mobirin: 40 }, haptics: false, source: 'none', omikujiDay: null, omikujiPetId: null,
  mobbies: { owned: { mobibou: 1, mobirin: 2 }, paidPulls: 0, freePulls: 1, freePullRoutes: ['sanctuary'], unrevealed: [] },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, locale: 'ja-JP', timezoneId: 'Asia/Tokyo', isMobile: true, hasTouch: false });
  await context.addInitScript(value => localStorage.setItem('@mobidou/journey/v1', JSON.stringify(value)), store);
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
  const opening = page.locator('[aria-label^="オープニング"]');
  await opening.waitFor({ state: 'visible', timeout: 60000 });
  const box = await opening.boundingBox();
  const y = box.y + box.height * .6;
  await page.mouse.move(box.x + box.width - 24, y); await page.mouse.down(); await page.mouse.move(box.x + 24, y, { steps: 16 }); await page.mouse.up();
  await opening.waitFor({ state: 'hidden', timeout: 30000 });
  await page.getByText('イベント開催中').first().waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
  for (let i = 0; i < 4; i++) { const close = page.getByText(/^(とじる|閉じる)$/).first(); if (!(await close.isVisible({ timeout: 2500 }).catch(() => false))) break; await close.click({ timeout: 5000, force: true }).catch(async () => { await page.screenshot({ path: path.join(OUT, 'stuck.png') }); }); await page.waitForTimeout(600); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'before.png') });
  const draw = page.getByRole('button', { name: '今日のおみくじを引く' });
  if (!(await draw.isVisible({ timeout: 2500 }).catch(() => false))) { await page.getByText('おみくじを引けるよ').first().click({ force: true }); await page.waitForTimeout(1500); }
  await draw.click({ timeout: 8000, force: true });
  for (let i = 0; i < 24; i++) {
    await page.screenshot({ path: path.join(OUT, `frame-${String(i).padStart(2, '0')}.png`), animations: 'allow' });
    await page.waitForTimeout(i < 16 ? 150 : 900);
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
