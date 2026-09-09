const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const data = file => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
const slides = [
  {id:'01-home', theme:'cream', label:'モビーと歩く毎日', title:'いつもの散歩が、<br>小さな旅になる。', sub:'今日の一歩を、相棒といっしょに。'},
  {id:'02-book', theme:'red', label:'歩いて、集める', title:'歩いた日々が、<br>御朱印帳になる。', sub:'もびの世界にある、六つのご縁。'},
  {id:'03-story', theme:'cream', label:'一枚ずつ、ものがたり', title:'ひらくたび、<br>ご縁に出会う。', sub:'御朱印に込められた、小さな物語。'},
  {id:'04-walk', theme:'sage', label:'あなたの歩幅で', title:'あと少し先に、<br>新しい楽しみ。', sub:'1,000歩から、ひとつずつ御朱印を。'},
  {id:'05-mobbies', theme:'red', label:'好きな子を、相棒に', title:'26体のモビー。<br>今日は、誰と歩く？', sub:'みんな、最初から選べます。'}
];
const font = fs.readFileSync(path.join(dir,'../../node_modules/@expo-google-fonts/shippori-mincho/700Bold/ShipporiMincho_700Bold.ttf')).toString('base64');
const css = `
@font-face{font-family:Shippori;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}html,body{margin:0}body{background:#eee8dd}.slide{position:relative;width:440px;height:956px;overflow:hidden;background:#f3eddf;color:#342f26;font-family:Shippori,serif}.slide.red{background:#9e463a;color:#fff8e9}.slide.sage{background:#dce1d1;color:#30392d}.meta{position:absolute;top:29px;left:32px;right:32px;display:flex;align-items:center;justify-content:space-between;font:11px Arial,sans-serif;letter-spacing:2px}.brand{font:700 18px Shippori}.chapter{position:absolute;top:69px;left:32px;font:11px Arial,sans-serif;letter-spacing:2px;opacity:.8}h1{position:absolute;top:92px;left:31px;margin:0;font-size:34px;line-height:1.5;letter-spacing:-1.3px;font-weight:700}p{position:absolute;top:203px;left:32px;font:12px Arial,sans-serif;letter-spacing:.6px;margin:0;opacity:.84}.frame{position:absolute;top:253px;left:64px;width:312px;height:678px;border:4px solid #fffbef;border-radius:21px;background:#faf5e9;box-shadow:0 17px 35px #39282030;overflow:hidden}.frame img{width:304px;height:auto;display:block}.red .frame{border-color:#efdcc3}.orb{position:absolute;left:-125px;top:310px;width:660px;height:660px;border:1px solid #a1835433;border-radius:50%}.red .orb{border-color:#f9dc9a44}.sage .orb{border-color:#708d6344}.orb:after{content:'';position:absolute;inset:27px;border:1px solid inherit;border-radius:50%}.line{position:absolute;width:500px;height:230px;left:-35px;bottom:105px;border-radius:50%;border:1px solid #a1835433;transform:rotate(-30deg)}.red .line{border-color:#f9dc9a33}.seal{position:absolute;top:241px;right:25px;writing-mode:vertical-rl;border:1px solid currentColor;padding:10px 5px;font-size:10px;letter-spacing:3px;opacity:.5}.footer{position:absolute;bottom:12px;left:0;width:440px;text-align:center;font:8px Arial,sans-serif;letter-spacing:3px;opacity:.65}
`;
function markup(s,i){return `<section class="slide ${s.theme}"><div class="orb"></div><div class="line"></div><div class="meta"><span class="brand">もび道</span><span>0${i+1} / 05</span></div><div class="chapter">${s.label}</div><h1>${s.title}</h1><p>${s.sub}</p><div class="seal">歩く、集める、好きになる。</div><div class="frame"><img src="${data(path.join(dir,'raw',s.id+'.png'))}"></div><div class="footer">MOBIDOU — A LITTLE WALK, A LITTLE WONDER.</div></section>`;}
(async()=>{
 fs.mkdirSync(path.join(dir,'iphone-6.9'),{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:440,height:956},deviceScaleFactor:3});
 const items=slides.map(markup);
 for(let i=0;i<slides.length;i++){
  await page.setContent(`<html lang="ja"><meta charset="utf-8"><style>${css}</style>${items[i]}</html>`);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(dir,'iphone-6.9',slides[i].id+'.png'),omitBackground:false});
 }
 fs.writeFileSync(path.join(dir,'preview.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><title>もび道 | App Store スクリーンショット</title><style>${css}body{padding:24px;display:flex;gap:20px;flex-wrap:wrap}</style>${items.join('')}</html>`);
 const overview=await browser.newPage({viewport:{width:1320,height:616},deviceScaleFactor:1});
 await overview.setContent(`<html><style>body{margin:0;padding:20px;display:flex;gap:15px;background:#e8e1d6}img{width:244px;height:auto;border-radius:8px}</style>${slides.map(s=>`<img src="${data(path.join(dir,'iphone-6.9',s.id+'.png'))}">`).join('')}</html>`);
 await overview.screenshot({path:path.join(dir,'overview.png')});
 await browser.close();console.log('Rendered 5 screenshots and overview.');
})().catch(e=>{console.error(e);process.exit(1)});
