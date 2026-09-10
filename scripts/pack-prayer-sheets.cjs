// Mechanical atlas packing only: every pose comes from the generated source sheet.
// Requires sharp (SHARP_MODULE may point at a shared runtime installation).
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const size = 512;
async function read(file) {
  return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}
function bounds({ data, info }) {
  // Ignore sparse generated speckles when measuring the character, without
  // stretching shorter bow poses back into a standing silhouette.
  const xs = Array(info.width).fill(0), ys = Array(info.height).fill(0);
  for (let y=0;y<info.height;y++) for(let x=0;x<info.width;x++)
    if(data[(y*info.width+x)*4+3]>128) {xs[x]++;ys[y]++;}
  const xx=xs.map((n,i)=>n>info.height*.025?i:-1).filter(i=>i>=0);
  const yy=ys.map((n,i)=>n>info.width*.025?i:-1).filter(i=>i>=0);
  if(!xx.length||!yy.length) throw Error('Empty character');
  return {x:xx[0],y:yy[0],w:xx.at(-1)-xx[0]+1,h:yy.at(-1)-yy[0]+1,bottom:yy.at(-1)+1};
}
function isolateCell(cell) {
 const {data,info}=cell,n=info.width*info.height,seen=new Uint8Array(n);
 let largest=[];
 for(let start=0;start<n;start++) {
  if(seen[start]||data[start*4+3]<8) continue;
  const component=[start];seen[start]=1;
  for(let q=0;q<component.length;q++) {
   const p=component[q],x=p%info.width;
   for(const next of [x?p-1:-1,x<info.width-1?p+1:-1,p-info.width,p+info.width]) {
    if(next<0||next>=n||seen[next]||data[next*4+3]<8) continue;
    seen[next]=1;component.push(next);
   }
  }
  if(component.length>largest.length) largest=component;
 }
 const keep=new Uint8Array(n);for(const p of largest)keep[p]=1;
 for(let p=0;p<n;p++)if(!keep[p])data[p*4+3]=0;
 return cell;
}
(async()=>{
 const report={};
 for(const [id,entry] of Object.entries(manifest)) {
  const target=path.join('assets/mobies/prayer-v2',id);
  fs.mkdirSync(target,{recursive:true});
  const idle=await read(entry.idle), ib=bounds(idle);
  const idleScale=size/Math.max(idle.info.width,idle.info.height);
  const desiredHeight=ib.h*idleScale;
  const desiredWidth=ib.w*idleScale;
  const desiredBottom=(size-idle.info.height*idleScale)/2+ib.bottom*idleScale;
  report[id]={idleBounds:ib,actions:{}};
  for(const [row,action] of ['rei','hakushu'].entries()) {
   const source=entry[action]||entry.source;
   const meta=await sharp(source).metadata();
   const rows=entry.source?2:1;
   const top=entry.source?Math.round(row*meta.height/2):0;
   const height=entry.source?Math.round((row+1)*meta.height/rows)-top:meta.height;
   const cells=[];
   for(let i=0;i<8;i++) {
    const left=Math.round(i*meta.width/8),width=Math.round((i+1)*meta.width/8)-left;
    cells.push(isolateCell(await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true})));
   }
   const first=bounds(cells[0]);
   const scale=desiredHeight/first.h;
   const scaleX=desiredWidth/first.w;
   const layers=[];
   for(let i=0;i<8;i++) {
    const cell=cells[i],b=bounds(cell);
    const w=Math.max(1,Math.round(cell.info.width*scaleX)),h=Math.max(1,Math.round(cell.info.height*scale));
    const pixels=await sharp(cell.data,{raw:cell.info}).resize(w,h,{fit:'fill'}).png().toBuffer();
    const x=Math.round(size/2-(b.x+b.w/2)*scaleX);
    const y=Math.round(desiredBottom-b.bottom*scale);
    // Clip to one square cell before packing, so adjacent poses never leak.
    const left=Math.max(0,-x),t=Math.max(0,-y);
    const cw=Math.min(w-left,size-Math.max(0,x)),ch=Math.min(h-t,size-Math.max(0,y));
    const clipped=await sharp(pixels).extract({left,top:t,width:cw,height:ch}).png().toBuffer();
    layers.push({input:clipped,left:i*size+Math.max(0,x),top:Math.max(0,y)});
   }
   await sharp({create:{width:size*8,height:size,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toFile(path.join(target,action+'.png'));
   report[id].actions[action]={source,firstBounds:first,scale,scaleX,desiredWidth,desiredHeight,desiredBottom};
  }
  if(entry.source && path.resolve(entry.source)!==path.resolve(target,'source.png')) fs.copyFileSync(entry.source,path.join(target,'source.png'));
 }
 fs.writeFileSync('assets/mobies/prayer-v2/packing-report.json',JSON.stringify(report,null,2));
 console.log('Packed',Object.keys(report).length,'characters');
})().catch(e=>{console.error(e);process.exitCode=1});
