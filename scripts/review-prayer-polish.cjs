const { chromium } = require('C:/Users/User/AppData/Local/npm-cache/_npx/e8fd44a302b8806d/node_modules/playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  page.on('pageerror', error => console.log('PAGE_ERROR', error.message));
  page.on('console', message => { if (message.type() === 'error') console.log('CONSOLE_ERROR', message.text()); });
  await page.goto('http://127.0.0.1:8086/prayer-preview.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(25000);
  await page.waitForFunction(() => {
    const control = document.querySelector('[aria-label="移動。丸を上に動かして歩く"]');
    return control && Number(getComputedStyle(control).opacity) > .9;
  }, null, { timeout: 120000 });
  await page.screenshot({ path: path.resolve('output/prayer-review/prayer-polished-v2.png') });
  console.log('CANVAS', await page.locator('canvas').count());
  if (process.env.PRAYER_TORII_REVIEW === '1') {
    await page.screenshot({ path: path.resolve('output/prayer-review/prayer-torii-entry.png') });
    if (process.env.PRAYER_TORII_ENTRY_ONLY === '1') { await browser.close(); return; }
    await page.mouse.move(310, 750); await page.mouse.down(); await page.mouse.move(310, 715, { steps: 4 });
    await page.getByRole('button', { name: '鳥居の前で一礼', exact: true }).waitFor({ timeout: 90000 }); await page.mouse.up();
    await page.screenshot({ path: path.resolve('output/prayer-review/prayer-torii-detail.png') });
    await browser.close(); return;
  }
  if (process.env.PRAYER_TREE_REVIEW === '1') {
    await page.screenshot({ path: path.resolve('output/prayer-review/prayer-trees-entry.png') });
    await page.mouse.move(310, 650); await page.mouse.down(); await page.mouse.move(210, 650, { steps: 20 }); await page.mouse.up();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.resolve('output/prayer-review/prayer-trees-side.png') });
    await browser.close(); return;
  }
  await page.mouse.move(310, 750); await page.mouse.down(); await page.mouse.move(310, 715, { steps: 8 });
  await page.getByRole('button', { name: '鳥居の前で一礼', exact: true }).waitFor({ timeout: 90000 }); await page.mouse.up();
  await page.getByRole('button', { name: '鳥居の前で一礼', exact: true }).click();
  if (process.env.PRAYER_RITUAL_REVIEW === '1') {
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.resolve('output/prayer-review/prayer-bow-ground.png') });
  }
  await page.getByRole('button', { name: '鳥居の前で一礼', exact: true }).waitFor({ state: 'detached', timeout: 60000 });
  await page.mouse.move(310, 750); await page.mouse.down(); await page.mouse.move(310, 715, { steps: 8 });
  await page.getByRole('button', { name: '一礼目', exact: true }).waitFor({ timeout: 120000 }); await page.mouse.up();
  if (await page.getByRole('button', { name: '一礼目', exact: true }).count() === 0) {
    await page.mouse.move(310, 750); await page.mouse.down(); await page.mouse.move(310, 715, { steps: 8 });
    await page.getByRole('button', { name: '一礼目', exact: true }).waitFor({ timeout: 30000 }); await page.mouse.up();
  }
  await page.screenshot({ path: path.resolve('output/prayer-review/prayer-polished-altar.png') });
  if (process.env.PRAYER_RITUAL_REVIEW === '1') {
    await page.getByRole('button', { name: '一礼目', exact: true }).click();
    await page.getByRole('button', { name: '二礼目', exact: true }).waitFor({ timeout: 60000 });
    await page.getByRole('button', { name: '二礼目', exact: true }).click();
    await page.getByRole('button', { name: '一拍手目', exact: true }).waitFor({ timeout: 60000 });
    await page.getByRole('button', { name: '一拍手目', exact: true }).click();
    const wish = page.getByRole('button', { name: '二拍手目。1秒以上長押しで祈り、離して終える', exact: true });
    await wish.waitFor({ timeout: 60000 });
    await wish.click(); await page.waitForTimeout(500);
    if (!await wish.isVisible()) throw new Error('Short tap incorrectly advanced the second clap');
    await page.mouse.move(66, 758); await page.mouse.down();
    await page.waitForTimeout(2200);
    if (!await wish.isVisible()) throw new Error('Prayer advanced before release');
    await page.screenshot({ path: path.resolve('output/prayer-review/prayer-second-clap-hold.png') });
    await page.mouse.up();
    await page.getByRole('button', { name: '感謝をこめて一礼', exact: true }).waitFor({ timeout: 60000 });
    console.log('SECOND_CLAP_HOLD_RELEASE_OK');
    await page.getByRole('button', { name: '感謝をこめて一礼', exact: true }).click();
    await page.getByRole('button', { name: '感謝をこめて一礼', exact: true }).waitFor({ state: 'detached', timeout: 60000 });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.resolve('output/prayer-review/prayer-return-turn-start.png') });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.resolve('output/prayer-review/prayer-return-auto-view.png') });
    await page.getByRole('button', { name: '視点。押したままスワイプして見回す', exact: true }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.resolve('output/prayer-review/prayer-return-reset-view.png') });
    console.log('RETURN_VIEW_OK');
  }
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
