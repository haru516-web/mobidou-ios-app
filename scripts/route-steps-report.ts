import { PILGRIMAGES } from '../src/data/pilgrimages';
import { expandPointTargets } from '../src/services/progress';
import { readFileSync } from 'fs';
const src = readFileSync('src/data/shrines.ts', 'utf8');
const name = (id: string) => { const i = src.indexOf(`createShrine('${id}', '`); return i < 0 ? id : src.slice(i + `createShrine('${id}', '`.length).split("'")[0]; };
const f = (n: number) => n.toLocaleString('en-US');
let grand = 0;
const sum: string[] = [];
const sections: string[] = [];
for (const r of PILGRIMAGES) {
  const cum = expandPointTargets(r.ids.length, r.targets);
  const total = cum[cum.length - 1]; grand += total;
  sum.push(`| ${r.name} | ${r.type} | ${r.ids.length} | ${f(total)} | ${f(Math.round(total / r.ids.length))} |`);
  const rows = cum.map((c, i) => `| ${i + 1} | ${name(r.ids[i])} | ${f(c - (cum[i - 1] ?? 0))} | ${f(c)} |`);
  sections.push(`### ${r.name}（${r.type}）\n\n| # | 地点 | 前の地点から | 累計 |\n|---|---|---:|---:|\n${rows.join('\n')}\n\n**合計 ${f(total)}歩**\n`);
}
console.log(JSON.stringify({ sum, sections, grand, count: PILGRIMAGES.length }));
