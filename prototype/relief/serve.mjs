// Tiny static server for the fur prototype: node prototype/fur/serve.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.json': 'application/json', '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png' };

import { writeFile, mkdir } from 'node:fs/promises';
const saveDir = join(root, '..', '..', 'assets', 'mobies', 'relief');

createServer(async (req, res) => {
  // dev-only: the page POSTs its baked textures here so they land in assets/mobies/relief
  if (req.method === 'POST' && req.url.startsWith('/save/')) {
    const name = decodeURIComponent(req.url.slice(6));
    if (!/^[a-z0-9-]+.(png|json)$/.test(name)) { res.writeHead(400).end('bad name'); return; }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    await mkdir(saveDir, { recursive: true });
    await writeFile(join(saveDir, name), Buffer.concat(chunks));
    res.writeHead(200).end('ok');
    return;
  }
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const repo = join(root, '..', '..');
  const shared = path.startsWith('assets') || path.startsWith('src');
  const file = join(shared ? repo : root, path === '' ? 'index.html' : path);
  if (!file.startsWith(shared ? repo : root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(5200, () => console.log('fur prototype on http://localhost:5199'));
