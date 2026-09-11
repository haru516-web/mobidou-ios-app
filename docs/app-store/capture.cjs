const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const out = __dirname;
(async () => {
  fs.mkdirSync(path.join(out, 'raw'), { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({viewport:{width:440,height:956},deviceScaleFactor:3,locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
  const page = await context.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR',e.message));
  await context.addInitScript(() => {
    const date = new Date();
    const day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const progress = {day,steps:3280,dayStart:0,rewards:[{id:'star',date:day,steps:1080,threshold:1000},{id:'moon',date:day,steps:3280,threshold:3000}],pending:[]};
    localStorage.setItem('@mobidou/journey/v1', JSON.stringify({version:1,onboarded:true,demo:false,real:progress,trial:{day,steps:0,dayStart:0,rewards:[],pending:[]},pet:'mobibou',affection:{mobibou:24},haptics:false,source:'none'}));
  });
  await page.goto('http://localhost:8083', {waitUntil:'networkidle',timeout:90000});
  await page.getByText('ご縁の支度をしています').waitFor({state:'hidden',timeout:60000});
  await page.evaluate(() => document.fonts.ready);
  const opening = page.getByRole('slider', {name:/オープニング/});
  if (await opening.isVisible().catch(() => false)) {
    const box = await opening.boundingBox();
    if (!box) throw new Error('Opening slider was visible but had no layout box.');
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width - 24, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 24, y, {steps: 16});
    await page.mouse.up();
    await opening.waitFor({state:'hidden',timeout:30000});
  }
  const capture = async name => {
    await page.waitForTimeout(900);
    await page.screenshot({path:path.join(out,'raw',`${name}.png`),animations:'disabled'});
    console.log(name, (await page.locator('body').innerText()).slice(-800));
  };
  await capture('01-home');
  await page.getByRole('tab',{name:/御朱印帳/}).click();
  await capture('02-book');
  await page.getByRole('button',{name:/このご縁をみる/}).click();
  await capture('03-story');
  await page.getByRole('button',{name:'御朱印帳にもどる',exact:true}).click();
  await page.getByRole('tab',{name:/おでかけ/}).click();
  await capture('04-walk');
  await page.getByRole('tab',{name:/モビー/}).click();
  await capture('05-mobbies');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
