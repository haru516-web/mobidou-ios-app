const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');const path=require('path');const OUT=path.resolve('docs/gacha-assets-verification');
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
  await page.goto('http://127.0.0.1:8085', { waitUntil: 'domcontentloaded', timeout: 30000 });
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


(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});
for(const size of sizes){const page=await browser.newPage({viewport:size});await page.addInitScript(value=>localStorage.setItem('@mobidou/journey/v1',JSON.stringify(value)),fixtures.base);await waitLoaded(page);await enter(page);await openGacha(page);const shot=async(name)=>page.screenshot({path:path.join(OUT,'scene-'+size.width+'x'+size.height+'-'+name+'.png')});await shot('rope');
const rope=await page.getByRole('button',{name:'ひもを引いてモビーに出会う'}).boundingBox();await page.mouse.move(rope.x+rope.width/2,rope.y+240);await page.mouse.down();await page.waitForTimeout(80);await page.mouse.move(rope.x+rope.width/2,rope.y+340,{steps:12});await page.mouse.up();await page.waitForTimeout(100);if(await page.getByRole('button',{name:'ひもを引く',exact:true}).isVisible()) throw new Error('rope drag did not start a draw');await page.waitForTimeout(450);await shot('roll');
const board=page.getByRole('button',{name:'箱の前の板を上へ引き上げる'});await page.getByRole('heading',{name:'前の板を、上へ引き上げて'}).waitFor();await board.waitFor();await shot('closed');const b=await board.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height*.75);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height*.45,{steps:10});await shot('lift');await page.mouse.move(b.x+b.width/2,b.y-b.height*.2,{steps:10});await page.mouse.up();await page.waitForTimeout(320);await shot('glow');await page.getByRole('heading',{name:'ご縁が結ばれました'}).waitFor();await shot('revealed');await assertWholeControl(page.getByRole('button',{name:'おわる',exact:true}));console.log(size,await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight})));await page.close();}await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
