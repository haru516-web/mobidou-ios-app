const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets/prayer-first-person');
const glb = fs.readFileSync(path.join(dir, 'shrine-world-realistic.glb'));
if (glb.toString('ascii', 0, 4) !== 'glTF' || glb.readUInt32LE(4) !== 2 || glb.readUInt32LE(8) !== glb.length) throw Error('Invalid GLB header');
const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
if (json.cameras?.length || json.nodes.some(n => /POV|Mobby|Komainu.*(?:ear|head|body)/i.test(n.name || ''))) throw Error('Unexpected camera or character');
if (json.images.some(i => i.uri || i.bufferView === undefined)) throw Error('Non-embedded image');
if (json.images.some(i => /walk|joined|mobby/i.test(i.name || ''))) throw Error('Hand texture included in environment');
let triangles = 0;
for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
  if (primitive.indices !== undefined) triangles += json.accessors[primitive.indices].count / 3;
}
const preview = fs.readFileSync(path.join(dir, 'shrine-world-realistic-preview.png'));
if (preview.toString('hex', 0, 8) !== '89504e470d0a1a0a' || preview.readUInt32BE(16) !== 720 || preview.readUInt32BE(20) !== 1280) throw Error('Invalid preview');
const detail = fs.readFileSync(path.join(dir, 'shrine-world-realistic-prayer-preview.png'));
if (detail.readUInt32BE(16) !== 720 || detail.readUInt32BE(20) !== 1280) throw Error('Invalid detail preview');
const names = ['shrine-world-realistic.blend', 'shrine-world-realistic.glb', 'shrine-world-realistic-preview.png', 'shrine-world-realistic-prayer-preview.png'];
const report = {
  date: '2026-11-01',
  files: names.map(name => { const b = fs.readFileSync(path.join(dir, name)); return { name, bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') }; }),
  preview: { width: 720, height: 1280, bitDepth: preview[24], colorType: preview[25] },
  glb: { nodes: json.nodes.length, uniqueMeshes: json.meshes.length, materials: json.materials.length, embeddedImages: json.images.length, uniqueMeshTriangles: triangles, cameras: 0, hands: false },
  validation: 'Structural checks and offline render only; no app or device validation.'
};
fs.writeFileSync(path.join(root, 'docs/prayer-first-person/realistic-environment-validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
