import { useMemo, useEffect } from 'react';
import { Asset } from 'expo-asset';
import { useLoader } from './r3f';
import { Color, CylinderGeometry, DoubleSide, InstancedMesh, Matrix4, MeshStandardMaterial, PlaneGeometry, Quaternion, TextureLoader, Vector3, SRGBColorSpace, RepeatWrapping } from 'three';

const uri = (asset: number) => Asset.fromModule(asset).uri;
const DIFF = uri(require('../../assets/prayer-first-person/realistic-sources/pine_tree_01/twig_diff.png'));
const ALPHA = uri(require('../../assets/prayer-first-person/realistic-sources/pine_tree_01/twig_alpha.png'));
const BARK = uri(require('../../assets/prayer-first-person/realistic-sources/pine_tree_01/bark_diff.png'));

/** Shared instancing keeps the photographed needles small without thousands of draw calls. */
export function PrayerTrees() {
  const [diffuse, alpha, bark] = useLoader(TextureLoader, [DIFF, ALPHA, BARK]);
  const trees = useMemo(() => {
    let seed = 83;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    diffuse.colorSpace = SRGBColorSpace; bark.colorSpace = SRGBColorSpace;
    const barkMap = bark.clone(); barkMap.wrapS = barkMap.wrapT = RepeatWrapping; barkMap.repeat.set(1, 3); barkMap.needsUpdate = true;
    const leafGeometry = new PlaneGeometry(1, 1);
    const uv = leafGeometry.attributes.uv;
    // Only the top-left photographed needle spray, excluding cones and atlas padding.
    for (let i = 0; i < uv.count; i++) uv.setXY(i, .085 + uv.getX(i) * .12, .59 + uv.getY(i) * .36);
    const leafMaterial = new MeshStandardMaterial({ map: diffuse, alphaMap: alpha, alphaTest: .42, side: DoubleSide, roughness: .9, color: '#e0e8cf', emissive: '#34482b', emissiveIntensity: .12 });
    const branchMaterial = new MeshStandardMaterial({ map: barkMap, color: '#b3a58d', roughness: 1 });
    const branchMatrices: any[] = [], leafMatrices: any[] = [];
    const up = new Vector3(0, 1, 0);
    const rod = (a: any, b: any, radius: number) => {
      const delta = b.clone().sub(a);
      branchMatrices.push(new Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new Quaternion().setFromUnitVectors(up, delta.clone().normalize()), new Vector3(radius, delta.length(), radius)));
    };
    const positions = [[-5, 10], [5.8, 10], [-6.8, 3], [6.5, 1], [-7, -6], [7, -8], [-8, -17], [8, -19], [-12, 14], [12, 16], [-13, -12], [14, -5], [-5, -26], [4, -27]];
    for (const [x, z] of positions) {
      const height = 11 + random() * 5, spread = 3.0 + random() * 1.0;
      for (let section = 0; section < 5; section++) {
        rod(new Vector3(x, section * height / 5, z), new Vector3(x + .09 * Math.sin(section), (section + 1) * height / 5, z), .24 * (1 - section / 6));
      }
      for (let tier = 0; tier < 17; tier++) {
        const t = tier / 17, y = height * (.25 + t * .72) + (random() - .5) * .35;
        const count = 5 + tier % 3;
        for (let branch = 0; branch < count; branch++) {
          const angle = tier * 2.39996 + branch * Math.PI * 2 / count + random() * .3;
          const length = spread * Math.pow(1 - t, .65) * (.75 + random() * .4);
          const start = new Vector3(x, y, z);
          const end = new Vector3(x + Math.cos(angle) * length, y + .18 + t * .3, z + Math.sin(angle) * length);
          rod(start, end, .035 * (1 - t) + .008);
          for (let spray = 0; spray < 24; spray++) {
            const at = .22 + spray / 30;
            const center = start.clone().lerp(end, at);
            center.x += (random() - .5) * .9; center.z += (random() - .5) * .9; center.y += (random() - .5) * .5;
            const rotation = new Quaternion().setFromAxisAngle(up, angle + (random() - .5) * 2);
            rotation.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -.4 + random() * 1.2));
            const size = (.75 + random() * .4) * (1 - t * .4);
            leafMatrices.push(new Matrix4().compose(center, rotation, new Vector3(size * .55, size * 1.5, 1)));
          }
        }
      }
    }
    const branches = new InstancedMesh(new CylinderGeometry(.65, 1, 1, 8), branchMaterial, branchMatrices.length);
    const needles = new InstancedMesh(leafGeometry, leafMaterial, leafMatrices.length);
    branchMatrices.forEach((matrix, i) => branches.setMatrixAt(i, matrix));
    leafMatrices.forEach((matrix, i) => { needles.setMatrixAt(i, matrix); needles.setColorAt(i, new Color().setHSL(.24 + random() * .035, .15 + random() * .12, .58 + random() * .25)); });
    branches.computeBoundingSphere(); needles.computeBoundingSphere();
    return { branches, needles, barkMap };
  }, [diffuse, alpha, bark]);
  useEffect(() => () => { for (const mesh of [trees.branches, trees.needles]) { mesh.geometry.dispose(); mesh.material.dispose(); } trees.barkMap.dispose(); }, [trees]);
  return <><primitive object={trees.branches} /><primitive object={trees.needles} /></>;
}
