const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const imageExt = /\.(?:png|jpe?g|webp)$/i;
const sourceExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs']);
const sourceFiles = [path.join(root, 'App.tsx')];

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, visit);
    else visit(fullPath);
  }
}

walk(path.join(root, 'src'), (file) => {
  if (sourceExt.has(path.extname(file).toLowerCase())) sourceFiles.push(file);
});

function skipTrivia(source, index) {
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index += 1;
    } else if (source.startsWith('//', index)) {
      index = source.indexOf('\n', index + 2);
      if (index < 0) return source.length;
    } else if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 2;
    } else {
      break;
    }
  }
  return index;
}

function readQuoted(source, index) {
  const quote = source[index];
  let value = '';
  let cursor = index + 1;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === quote) return { value, end: cursor + 1 };
    if (char === '\\' && cursor + 1 < source.length) {
      const escaped = source[cursor + 1];
      value += escaped === 'n' ? '\n' : escaped === 'r' ? '\r' : escaped === 't' ? '\t' : escaped;
      cursor += 2;
      continue;
    }
    value += char;
    cursor += 1;
  }
  return null;
}

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

const references = new Map();
const staticImageReferences = [];
const unresolvedReferences = [];
const dynamicRequires = [];
const assetStringRefs = new Map();

function addReference(from, specifier, line, kind) {
  if (!imageExt.test(specifier)) return;
  if (!specifier.startsWith('.')) {
    unresolvedReferences.push({ from, line, specifier, kind });
    return;
  }
  const resolved = path.resolve(path.dirname(from), specifier);
  if (!fs.existsSync(resolved)) {
    unresolvedReferences.push({ from, line, specifier, kind, resolved });
    return;
  }
  references.set(resolved.toLowerCase(), resolved);
  staticImageReferences.push({ from: path.relative(root, from).replace(/\\/g, '/'), line, specifier, kind });
}

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const requirePattern = /\brequire\s*\(/g;
  let match;
  while ((match = requirePattern.exec(source))) {
    const argIndex = skipTrivia(source, requirePattern.lastIndex);
    const argChar = source[argIndex];
    if (argChar === '"' || argChar === "'") {
      const literal = readQuoted(source, argIndex);
      if (literal) {
        const afterArg = skipTrivia(source, literal.end);
        if (source[afterArg] === ')') {
          addReference(file, literal.value, lineAt(source, match.index), 'require');
          continue;
        }
      }
    } else if (argChar === '`') {
      const literal = readQuoted(source, argIndex);
      if (literal && !literal.value.includes('${')) {
        const afterArg = skipTrivia(source, literal.end);
        if (source[afterArg] === ')') {
          addReference(file, literal.value, lineAt(source, match.index), 'require');
          continue;
        }
      }
    }
    const line = lineAt(source, match.index);
    const snippet = source.slice(match.index, Math.min(source.length, match.index + 180)).split('\n')[0].trim();
    dynamicRequires.push({ file: path.relative(root, file), line, snippet });
  }

  const importPattern = /(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g;
  while ((match = importPattern.exec(source))) {
    addReference(file, match[1], lineAt(source, match.index), 'import');
  }

  const pathPattern = /(?:\.\.\/|\.\/|\/)?assets\/[^'"`\s)]+\.(?:png|jpe?g|webp)\b/gi;
  while ((match = pathPattern.exec(source))) {
    const key = match[0].replace(/^\.\//, '').replace(/^\.\.\//, '').toLowerCase();
    assetStringRefs.set(key, (assetStringRefs.get(key) || 0) + 1);
  }
}

const configPath = path.join(root, 'app.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const visitConfig = (value, key = '') => {
    if (typeof value === 'string' && imageExt.test(value) && /(?:^|[\\/])assets[\\/]/i.test(value)) {
      addReference(configPath, value, 1, `app.json:${key}`);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visitConfig(item, `${key}[${index}]`));
    } else if (value && typeof value === 'object') {
      for (const [childKey, child] of Object.entries(value)) visitConfig(child, key ? `${key}.${childKey}` : childKey);
    }
  };
  visitConfig(config);
}

const allImages = [];
walk(path.join(root, 'assets'), (file) => {
  if (imageExt.test(file)) allImages.push(file);
});

const unused = allImages
  .filter((file) => !references.has(file.toLowerCase()))
  .map((file) => ({ file, bytes: fs.statSync(file).size }));
const referenced = allImages.filter((file) => references.has(file.toLowerCase()));
const totalBytes = (files) => files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

console.log(JSON.stringify({
  sourceFilesScanned: sourceFiles.length,
  staticImageReferences: references.size,
  imageFiles: allImages.length,
  referencedImageFiles: referenced.length,
  unusedImageFiles: unused.length,
  referencedMB: formatMB(totalBytes(referenced)),
  unusedMB: formatMB(unused.reduce((sum, item) => sum + item.bytes, 0)),
  referenced: referenced.map((file) => path.relative(root, file).replace(/\\/g, '/')).sort(),
  staticImageReferences,
  dynamicRequires,
  unresolvedReferences,
  sourceAssetStringsNotResolvedByRequire: [...assetStringRefs.keys()].filter((key) => {
    const normalized = key.replace(/\\/g, '/').toLowerCase();
    return ![...references.values()].some((file) => path.relative(root, file).replace(/\\/g, '/').toLowerCase() === normalized);
  }),
  unused: unused.map(({ file, bytes }) => ({ path: path.relative(root, file).replace(/\\/g, '/'), bytes, MB: formatMB(bytes) }))
}, null, 2));
