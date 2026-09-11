'use strict';

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const pilgrimagesPath = path.join(repoRoot, 'src', 'data', 'pilgrimages.ts');
const collectionMapPath = path.join(repoRoot, 'src', 'data', 'collectionKeychains.ts');
const assetDirectory = path.join(repoRoot, 'assets', 'collection', 'keychains');
const expectedSize = { width: 1024, height: 1536 };
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const keychainFilePattern = /^keychain-(.+)-v1-transparent\.png$/;
const keychainPrefixPattern = /^keychain-/;

const toRelativePath = (filePath) =>
  path.relative(repoRoot, filePath).split(path.sep).join('/');

const countValues = (values) => {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
};

const duplicatesFromCounts = (counts) =>
  [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));

const readCurrentPilgrimages = () => {
  const source = fs.readFileSync(pilgrimagesPath, 'utf8');
  const blockMatch = source.match(
    /export const PILGRIMAGES:\s*Pilgrimage\[\]\s*=\s*\[([\s\S]*?)\n\];\s*\n\s*\/\/ 旧版/,
  );

  if (!blockMatch) {
    throw new Error('Could not locate the current PILGRIMAGES block.');
  }

  const routes = [];
  const routePattern = /\bid:\s*'([^']+)'[\s\S]*?\bids:\s*\[([^\]]*)\]/g;

  for (const match of blockMatch[1].matchAll(routePattern)) {
    routes.push({
      id: match[1],
      shrineIds: [...match[2].matchAll(/'([^']+)'/g)].map((idMatch) => idMatch[1]),
    });
  }

  return routes;
};

const readCollectionMap = () => {
  const source = fs.readFileSync(collectionMapPath, 'utf8');
  return [...source.matchAll(
    /^\s*([a-z0-9_-]+):\s*require\(['"]\.\.\/\.\.\/assets\/collection\/keychains\/keychain-([a-z0-9_-]+)-v1-transparent\.png['"]\),?$/gm,
  )].map((match) => ({ id: match[1], assetId: match[2] }));
};

const inspectPng = (filePath) => {
  const buffer = fs.readFileSync(filePath);

  if (buffer.length < 29 || !buffer.subarray(0, 8).equals(pngSignature)) {
    return { error: 'invalid-png' };
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25];
  let hasTransparencyChunk = false;
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
    if (chunkType === 'tRNS') {
      hasTransparencyChunk = true;
    }
    offset += 12 + chunkLength;
    if (chunkType === 'IEND') {
      break;
    }
  }

  const hasAlphaChannel = colorType === 4 || colorType === 6 || hasTransparencyChunk;

  return {
    width,
    height,
    colorType,
    hasAlphaChannel,
  };
};

const main = () => {
  const routes = readCurrentPilgrimages();
  const collectionMap = readCollectionMap();
  const expectedIds = routes.flatMap((route) => route.shrineIds);
  const expectedIdSet = new Set(expectedIds);
  const duplicateRouteIds = duplicatesFromCounts(countValues(expectedIds));
  const duplicateMapIds = duplicatesFromCounts(countValues(collectionMap.map((entry) => entry.id)));
  const mapMissing = expectedIds.filter((id) => !collectionMap.some((entry) => entry.id === id));
  const mapUnexpected = collectionMap.filter((entry) => !expectedIdSet.has(entry.id)).map((entry) => entry.id);
  const mapMismatches = collectionMap
    .filter((entry) => entry.id !== entry.assetId)
    .map((entry) => ({ id: entry.id, assetId: entry.assetId }));
  const allFiles = fs.existsSync(assetDirectory)
    ? fs.readdirSync(assetDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort()
    : [];
  const recognizedAssets = [];
  const unrecognizedFiles = [];

  for (const fileName of allFiles) {
    const match = fileName.match(keychainFilePattern);
    if (match) {
      recognizedAssets.push({ id: match[1], fileName });
    } else if (keychainPrefixPattern.test(fileName)) {
      unrecognizedFiles.push(fileName);
    }
  }

  const duplicateAssetIds = duplicatesFromCounts(countValues(recognizedAssets.map((asset) => asset.id)));
  const assetById = new Map();
  for (const asset of recognizedAssets) {
    if (!assetById.has(asset.id)) {
      assetById.set(asset.id, asset);
    }
  }

  const missing = expectedIds.filter((id) => !assetById.has(id));
  const unexpected = recognizedAssets
    .filter((asset) => !expectedIdSet.has(asset.id))
    .map((asset) => asset.id);
  const sizeChecked = [];
  const sizeInvalid = [];
  const alphaChecked = [];
  const alphaInvalid = [];

  for (const id of expectedIds) {
    const asset = assetById.get(id);
    if (!asset) {
      continue;
    }

    const filePath = path.join(assetDirectory, asset.fileName);
    let metadata;
    try {
      metadata = inspectPng(filePath);
    } catch (error) {
      metadata = { error: error instanceof Error ? error.message : String(error) };
    }

    const file = toRelativePath(filePath);
    if (metadata.error) {
      sizeInvalid.push({ id, file, reason: metadata.error });
      alphaInvalid.push({ id, file, reason: metadata.error });
      continue;
    }

    const sizeResult = {
      id,
      file,
      width: metadata.width,
      height: metadata.height,
      valid: metadata.width === expectedSize.width && metadata.height === expectedSize.height,
    };
    sizeChecked.push(sizeResult);
    if (!sizeResult.valid) {
      sizeInvalid.push(sizeResult);
    }

    const alphaResult = {
      id,
      file,
      colorType: metadata.colorType,
      hasAlphaChannel: metadata.hasAlphaChannel,
      valid: metadata.hasAlphaChannel,
    };
    alphaChecked.push(alphaResult);
    if (!alphaResult.valid) {
      alphaInvalid.push(alphaResult);
    }
  }

  const report = {
    ok:
      routes.length === 12 &&
      expectedIds.length === 74 &&
      duplicateRouteIds.length === 0 &&
      duplicateMapIds.length === 0 &&
      collectionMap.length === expectedIds.length &&
      mapMissing.length === 0 &&
      mapUnexpected.length === 0 &&
      mapMismatches.length === 0 &&
      duplicateAssetIds.length === 0 &&
      missing.length === 0 &&
      unexpected.length === 0 &&
      unrecognizedFiles.length === 0 &&
      sizeInvalid.length === 0 &&
      alphaInvalid.length === 0,
    source: toRelativePath(pilgrimagesPath),
    collectionMap: {
      source: toRelativePath(collectionMapPath),
      count: collectionMap.length,
      expected: expectedIds.length,
      duplicateIds: duplicateMapIds,
      missing: mapMissing,
      unexpected: mapUnexpected,
      mismatches: mapMismatches,
    },
    assetsDirectory: toRelativePath(assetDirectory),
    routes: {
      count: routes.length,
      expected: 12,
      idsPerRoute: routes.map((route) => ({
        id: route.id,
        count: route.shrineIds.length,
        shrineIds: route.shrineIds,
      })),
    },
    expectedShrines: {
      count: expectedIds.length,
      expected: 74,
      ids: expectedIds,
    },
    duplicate: {
      routeShrineIds: duplicateRouteIds,
      assetShrineIds: duplicateAssetIds,
    },
    missing,
    unexpected,
    unrecognizedFiles,
    size: {
      expected: expectedSize,
      checked: sizeChecked,
      invalid: sizeInvalid,
    },
    alpha: {
      required: true,
      checked: alphaChecked,
      invalid: alphaInvalid,
    },
    assets: {
      recognizedFileCount: recognizedAssets.length,
      allFiles,
    },
  };

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.ok ? 0 : 1;
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stdout.write(JSON.stringify({ ok: false, error: message }, null, 2) + '\n');
  process.exitCode = 1;
}
