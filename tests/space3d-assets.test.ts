import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'build-space3d-assets.cjs');
const hasFfmpeg = (() => { try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } })();

// The 3D collection view only shows pictures from its own small set: a goshuin, keychain, character or backdrop that is not in it never appears.
test('the 3D collection pictures and their index are up to date', { skip: !hasFfmpeg && 'ffprobe is not installed' }, () => {
  assert.doesNotThrow(() => execFileSync('node', [script, '--check'], { stdio: 'pipe' }), 'run: node scripts/build-space3d-assets.cjs');
});
