import { useEffect, useMemo } from 'react';
import { Asset } from 'expo-asset';
import { useFrame, useLoader, useThree } from './r3f';
import {
  ACESFilmicToneMapping, BufferAttribute, BufferGeometry, Color, DoubleSide, EquirectangularReflectionMapping, Fog, Points, PointsMaterial, SRGBColorSpace, TextureLoader,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const SKY_URI = Asset.fromModule(require('../../assets/prayer-first-person/kannon-sky.jpg')).uri;
/** Direction of the afterglow in the baked sky (scripts/kannon-sky.py): behind the camera, low, a little to the left. */
const SUN: [number, number, number] = [-0.3465, 0.0872, 0.934];

/** Slowly drifting gold sparkles (rising) or sakura petals (falling) around the temple grounds. */
function useDrift(count: number, color: string, size: number, fall: boolean) {
  return useMemo(() => {
    const seed = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) seed[i] = Math.random();
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    const points = new Points(geometry, new PointsMaterial({ color, size, transparent: true, opacity: .85, depthWrite: false, fog: false }));
    points.frustumCulled = false;
    const update = (t: number) => {
      const position = geometry.getAttribute('position') as any;
      for (let i = 0; i < count; i++) {
        const phase = (seed[i * 3 + 1] + t * (fall ? .02 : .012) * (fall ? -1 : 1) * (.6 + seed[i * 3 + 2] * .8)) % 1;
        const y = (phase + 1) % 1 * 11;
        position.setXYZ(i, (seed[i * 3] - .5) * 32 + Math.sin(t * .4 + i) * .6, y, (seed[i * 3 + 2] - .5) * 40 - 2 + Math.cos(t * .3 + i) * .6);
      }
      position.needsUpdate = true;
    };
    return { points, update };
  }, [count, color, size, fall]);
}

/** 願い観音もび寺: the temple built in Blender (scripts/build-kannon-temple.py), lit by the baked dusk sky and its afterglow. */
export function KannonWorld({ uri, onReady, reducedMotion }: { uri: string; onReady: () => void; reducedMotion: boolean }) {
  const gltf = useLoader(GLTFLoader, uri);
  const sky = useLoader(TextureLoader, SKY_URI);
  const { scene, gl } = useThree();
  const gold = useDrift(reducedMotion ? 30 : 80, '#ffd98a', .12, false);
  const petals = useDrift(reducedMotion ? 24 : 60, '#ffc9dc', .14, true);
  useEffect(() => {
    sky.mapping = EquirectangularReflectionMapping;
    sky.colorSpace = SRGBColorSpace;
    sky.needsUpdate = true;
    gltf.scene.traverse((object: any) => {
      if (!object.isMesh) return;
      (Array.isArray(object.material) ? object.material : [object.material]).forEach((m: any) => {
        if (/^Foliage/.test(m.name)) { m.alphaTest = .45; m.transparent = false; m.depthWrite = true; m.side = DoubleSide; }
        if (m.name === 'Halo light') { m.depthWrite = false; m.transparent = true; }
        if (m.name === 'Gold leaf' || m.name === 'Kannon gold') m.envMapIntensity = 1.35;
        if (m.name === 'Pond water') m.envMapIntensity = 1.6;
      });
    });
    scene.background = sky;
    scene.environment = sky;
    scene.backgroundIntensity = 1;
    scene.environmentIntensity = 1.0;
    scene.fog = new Fog(new Color('#6f5688'), 38, 135);
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    onReady();
  }, [gltf, sky, scene, gl, onReady]);
  useFrame(state => {
    if (reducedMotion) return;
    gold.update(state.clock.elapsedTime);
    petals.update(state.clock.elapsedTime + 40);
  });
  return <>
    <ambientLight intensity={.35} color="#7a6aa6" />
    <hemisphereLight color="#ffb98f" groundColor="#2d2442" intensity={.55} />
    <directionalLight position={[SUN[0] * 40, SUN[1] * 40 + 4, SUN[2] * 40]} color="#ffa763" intensity={3.6} />
    <directionalLight position={[8, 12, -14]} color="#8fa4ff" intensity={.5} />
    <pointLight position={[0, 3.6, -10.5]} color="#ffc873" intensity={70} distance={22} />
    <pointLight position={[0, 5.2, 1.5]} color="#ff9a55" intensity={45} distance={14} />
    <pointLight position={[0, 3.2, 11]} color="#ff9650" intensity={40} distance={16} />
    <primitive object={gltf.scene} />
    <primitive object={gold.points} />
    <primitive object={petals.points} />
  </>;
}
