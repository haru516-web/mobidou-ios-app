const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'content-and-polish-qa');
const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const reward = (id, threshold) => ({ id, date: day, steps: threshold, threshold });
const fixture = (award) => ({
  version: 1, onboarded: true, demo: false, pet: 'mobibou', affection: { mobibou: 24 }, haptics: false, source: 'none', omikujiDay: day, omikujiPetId: 'mobibou',
  real: { day, steps: award ? 19000 : 3280, totalSteps: award ? 19000 : 3280, dayStart: 0, routeId: 'sanctuary', baseline: 0, highWater: award ? 19000 : 3280, routeSteps: award ? 19000 : 3280,
    rewards: award ? ['rain', 'forest', 'takekaze', 'morika', 'morikage'].map((id, i) => reward(id, [5000, 7000, 9000, 14000, 19000][i])) : [reward('rain', 1000), reward('forest', 3000)], pending: award ? ['morikage'] : [] },
  trial: { day, steps: 0, totalSteps: 0, dayStart: 0, rewards: [], pending: [] },
  ...(award ? { realSpecial: { keychains: {}, sparkles: {}, passes: { keychainDrop: 0 }, arrival: { shrineId: 'morikage', outcome: 'missed', rate: 0.1 } } } : {}),
  mobbies: { owned: { mobibou: 2, mobirin: 1 }, paidPulls: 24, freePulls: 10, freePullRoutes: [], unrevealed: [] },
});
async function enter(page) {
  await page.goto('http://127.0.0.1:8084', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const opening = page.locator('[aria-label^="オープニング"]');
  await opening.waitFor({ timeout: 120000 });
  const b = await opening.boundingBox();
  await page.mouse.move(b.x + b.width - 24, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 24, b.y + b.height / 2, { steps: 16 });
  await page.mouse.up();
  await opening.waitFor({ state: 'hidden' });
  await page.evaluate(() => document.fonts.ready);
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const resultsPath = path.join(out, 'results.json');
  const results = fs.existsSync(resultsPath) ? JSON.parse(fs.readFileSync(resultsPath, 'utf8')) : [];
  try {
    // Representative screen first; only expand after it reaches and captures.
    for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
      if (process.env.QA_WIDTH && size.width !== Number(process.env.QA_WIDTH)) continue;
      for (const screen of ['home', 'gacha', 'award']) {
        if (process.env.QA_SCREENS && !process.env.QA_SCREENS.split(',').includes(screen)) continue;
        const context = await browser.newContext({ viewport: size, locale: 'ja-JP', timezoneId: 'Asia/Tokyo', reducedMotion: 'reduce' });
        await context.addInitScript(value => localStorage.setItem('@mobidou/journey/v1', JSON.stringify(value)), fixture(screen === 'award'));
        const page = await context.newPage(); page.setDefaultTimeout(30000);
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        const result = { size, screen, errors };
        try {
          await enter(page);
          if (screen === 'award') {
            await page.getByRole('button', { name: '演出を省略して御朱印をみる' }).click();
            await page.getByText('ここまで歩いた記録', { exact: true }).waitFor();
            await page.getByRole('button', { name: '御朱印帳にしまう', exact: true }).waitFor();
          } else {
            await page.getByRole('button', { name: '設定を開く' }).waitFor();
            if (screen === 'gacha') {
              await page.getByRole('tab', { name: /ガチャ/ }).click();
              await page.getByRole('button', { name: '10回引く', exact: true }).waitFor();
              result.labels = await Promise.all(['1回引く', '10回引く'].map(name => page.getByRole('button', { name, exact: true }).evaluate(n => {
                const text = [...n.querySelectorAll('div')].find(d => d.textContent === n.textContent && !d.children.length);
                const r = text.getBoundingClientRect(); const s = getComputedStyle(text);
                return { text: text.textContent, width: r.width, height: r.height, fontSize: s.fontSize, lineHeight: s.lineHeight };
              })));
            } else result.card = await page.locator('[id^="home-widget-goshuin-"]').evaluate(n => ({ width: n.clientWidth, height: n.clientHeight }));
          }
          await page.waitForTimeout(screen === 'award' ? 5500 : 1300);
          await page.screenshot({ path: path.join(out, `${size.width}x${size.height}-${screen}.png`), animations: 'disabled' });
          result.reached = true;
        } catch (e) { result.failure = e.message; await page.screenshot({ path: path.join(out, `${size.width}x${size.height}-${screen}-failure.png`) }); }
        const previous = results.findIndex(r => r.size.width === size.width && r.screen === screen);
        if (previous >= 0) results.splice(previous, 1);
        results.push(result); fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(JSON.stringify(result)); await context.close();
        if (!result.reached) throw new Error('Stop expansion after failed representative case: ' + result.failure);
      }
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
