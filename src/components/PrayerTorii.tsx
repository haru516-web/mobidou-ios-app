import { useMemo, useEffect } from 'react';
import { CylinderGeometry, DataTexture, ExtrudeGeometry, Mesh, MeshStandardMaterial, Quaternion, RepeatWrapping, RGBAFormat, Shape, SRGBColorSpace, Vector3 } from 'three';

/** Independently modelled wooden gate; no third-party geometry or images. */
export function PrayerTorii() {
  const gate = useMemo(() => {
    const width = 256, height = 1024;
    const pixels = new Uint8Array(width * height * 4);
    const rough = new Uint8Array(pixels.length);
    let seed = 193;
    const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    const streaks = Array.from({ length: width }, () => rand());
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const grain = Math.sin(x * 2.1 + Math.sin(y / 210) * .7) * .025 + (streaks[x] - .5) * .07;
      const weather = .96 + grain + (rand() - .5) * .025 + .025 * Math.sin(y / 130 + x / 63);
      pixels[index] = 169 * weather; pixels[index + 1] = 66 * weather; pixels[index + 2] = 37 * weather; pixels[index + 3] = 255;
      const r = Math.round(155 + streaks[x] * 35 + rand() * 10);
      rough[index] = rough[index + 1] = rough[index + 2] = r; rough[index + 3] = 255;
    }
    const paint = new DataTexture(pixels, width, height, RGBAFormat); paint.colorSpace = SRGBColorSpace; paint.wrapS = paint.wrapT = RepeatWrapping; paint.needsUpdate = true;
    const roughness = new DataTexture(rough, width, height, RGBAFormat); roughness.wrapS = roughness.wrapT = RepeatWrapping; roughness.needsUpdate = true;
    const vermilion = new MeshStandardMaterial({ map: paint, roughnessMap: roughness, roughness: .85, bumpMap: roughness, bumpScale: .004, color: '#f2d6bc' });
    const cap = new MeshStandardMaterial({ color: '#37372f', roughness: .65, metalness: .15 });
    const shoe = new MeshStandardMaterial({ color: '#373b37', roughness: .8, metalness: .18 });
    const stone = new MeshStandardMaterial({ color: '#85877b', roughness: 1 });
    const bronze = new MeshStandardMaterial({ color: '#766c4b', metalness: .65, roughness: .65 });
    const objects: any[] = [];
    const beam = (half: number, base: number, rise: number, thickness: number, depth: number, material: any) => {
      const shape = new Shape();
      const top = (x: number) => base + rise * Math.pow(Math.abs(x) / half, 2.7);
      shape.moveTo(-half, top(-half));
      for (let i = 1; i <= 48; i++) { const x = -half + 2 * half * i / 48; shape.lineTo(x, top(x)); }
      for (let i = 48; i >= 0; i--) { const x = -half + 2 * half * i / 48; shape.lineTo(x, top(x) - thickness); }
      shape.closePath();
      const geometry = new ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: true, bevelSegments: 3, bevelSize: .018, bevelThickness: .018, curveSegments: 24 });
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) { const x = uv.getX(i); uv.setXY(i, uv.getY(i), x); }
      const mesh = new Mesh(geometry, material);
      mesh.position.z = 3.5 - depth / 2; objects.push(mesh);
    };
    const cylinder = (a: any, b: any, lower: number, upper: number, material: any) => {
      const delta = b.clone().sub(a);
      const mesh = new Mesh(new CylinderGeometry(upper, lower, delta.length(), 48), material);
      mesh.position.copy(a.clone().add(b).multiplyScalar(.5));
      mesh.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize())); objects.push(mesh);
    };
    for (const side of [-1, 1]) {
      const x = side * 2.5;
      cylinder(new Vector3(x, .1, 3.5), new Vector3(side * 2.28, 4.48, 3.5), .26, .205, vermilion);
      cylinder(new Vector3(x, .08, 3.5), new Vector3(x - side * .017, .48, 3.5), .275, .267, shoe);
      cylinder(new Vector3(x, .06, 3.5), new Vector3(x, .15, 3.5), .37, .34, stone);
      for (const y of [3.28, 4.22]) cylinder(new Vector3(side * (2.5 - y * .05), y, 3.17), new Vector3(side * (2.5 - y * .05), y, 3.23), .038, .038, bronze);
      // Small joinery wedges at the nuki, with bevelled edges.
      const wedge = new Shape(); wedge.moveTo(-.23, -.045); wedge.lineTo(.23, -.025); wedge.lineTo(.23, .06); wedge.lineTo(-.23, .09); wedge.closePath();
      const mesh = new Mesh(new ExtrudeGeometry(wedge, { depth: .13, bevelEnabled: true, bevelSegments: 2, bevelSize: .008, bevelThickness: .008 }), vermilion);
      mesh.position.set(side * 2.34, 3.46, 3.19); objects.push(mesh);
    }
    beam(3.65, 4.65, .3, .17, .57, vermilion);
    beam(3.72, 4.73, .31, .075, .64, cap);
    beam(3.35, 4.43, .24, .19, .43, vermilion);
    beam(3.03, 3.43, 0, .25, .32, vermilion);
    // Gakuzuka: the central vertical member between shimaki and nuki.
    const support = new Shape(); support.moveTo(-.16, 3.44); support.lineTo(.16, 3.44); support.lineTo(.19, 4.26); support.lineTo(-.19, 4.26); support.closePath();
    const center = new Mesh(new ExtrudeGeometry(support, { depth: .22, bevelEnabled: true, bevelSegments: 3, bevelSize: .012, bevelThickness: .012 }), vermilion); center.position.z = 3.39; objects.push(center);
    return { objects, materials: [vermilion, cap, shoe, stone, bronze], paint, roughness };
  }, []);
  useEffect(() => () => { gate.objects.forEach(o => o.geometry.dispose()); gate.materials.forEach(m => m.dispose()); gate.paint.dispose(); gate.roughness.dispose(); }, [gate]);
  return <group scale={[1, 1.12, 1]}>{gate.objects.map((object, index) => <primitive key={index} object={object} />)}</group>;
}
