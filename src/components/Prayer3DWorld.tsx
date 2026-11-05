import React, { Suspense, useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Asset } from 'expo-asset';
import { Canvas, useFrame, useLoader, useThree } from './r3f';
import {
  ACESFilmicToneMapping, CatmullRomCurve3, Vector3, Color, DoubleSide, RepeatWrapping, Fog, EquirectangularReflectionMapping, SRGBColorSpace,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';
import { ease } from '../data/prayerFirstPersonMotion';
import { PrayerTrees } from './PrayerTrees';
import { PrayerTorii } from './PrayerTorii';
import { prayerWalkZ, smoothViewAngle } from '../data/prayerNavigation';

const WORLD = require('../../assets/prayer-first-person/shrine-world-realistic.glb');
const SKY = require('../../assets/prayer-first-person/shrine-sky.jpg');
const WORLD_URI = Asset.fromModule(WORLD).uri;
const SKY_URI = Asset.fromModule(SKY).uri;
const FOREST_URI = Asset.fromModule(require('../../assets/prayer-first-person/shrine-forest-panorama-v1.png')).uri;

export type PrayerWorldProps = {
  index: number;
  progress: number;
  elapsed: number;
  walking: boolean;
  look?: { yaw: number; pitch: number };
  fov?: number;
  reducedMotion: boolean;
  onReady: () => void;
  onError: () => void;
  style?: StyleProp<ViewStyle>;
};

function ShrineScene({ index, progress, elapsed, walking, reducedMotion, onReady, look, fov = 82 }: Omit<PrayerWorldProps, 'onError' | 'style'>) {
  const gltf = useLoader(GLTFLoader, WORLD_URI);
  const sky = useLoader(TextureLoader, SKY_URI);
  const forest = useLoader(TextureLoader, FOREST_URI);
  const model = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.traverse((object: any) => {
      if (!object.isMesh || !Array.isArray(object.material) || !object.geometry.index) return;
      const geometry = object.geometry.clone();
      const oldIndex = geometry.index;
      const indices: number[] = [];
      const groups = [...geometry.groups];
      geometry.clearGroups();
      for (const group of groups) {
        const start = indices.length;
        const foliage = /bough|foliage|twig/i.test(object.material[group.materialIndex ?? 0]?.name ?? '');
        for (let i = group.start; i < group.start + group.count; i += 3) {
          if (foliage && Math.floor((i - group.start) / 6) % 3 !== 0) continue;
          indices.push(oldIndex.getX(i), oldIndex.getX(i + 1), oldIndex.getX(i + 2));
        }
        geometry.addGroup(start, indices.length - start, group.materialIndex);
      }
      geometry.setIndex(indices);
      object.geometry = geometry;
    });
    return copy;
  }, [gltf.scene]);
  const sacredRope = useMemo(() => new CatmullRomCurve3([
    new Vector3(-1.9, 3.25, -8.65), new Vector3(-.95, 2.95, -8.65),
    new Vector3(0, 2.83, -8.65), new Vector3(.95, 2.95, -8.65), new Vector3(1.9, 3.25, -8.65),
  ]), []);
  const groundMap = useMemo(() => {
    let texture: any = null;
    model.traverse((object: any) => {
      if (!object.isMesh) return;
      for (const m of Array.isArray(object.material) ? object.material : [object.material]) {
        if (m.name.includes('forest_floor') && m.map) texture = m.map.clone();
      }
    });
    if (texture) { texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(140, 140); texture.needsUpdate = true; }
    return texture;
  }, [model]);
  useEffect(() => {
    model.traverse((object: any) => {
      if (!object.isMesh) return;
      const materials = (Array.isArray(object.material) ? object.material : [object.material]).map((source: any) => {
        const material = source.clone();
        const name = material.name.toLowerCase();
        if (/vermilion|shide/.test(name)) material.visible = false;
        if (/bough|foliage|twig|bark/.test(name)) material.visible = false;
        material.roughness = Math.max(.75, material.roughness ?? 1);
        if (/bough|foliage|twig/.test(name)) {
          material.side = DoubleSide;
          material.alphaTest = .45;
          material.transparent = false;
          material.emissive = new Color('#536c37');
          material.emissiveMap = null;
          material.emissiveIntensity = .12;
          material.color.set('#d7e3bf');
          material.vertexColors = false;
        }
        if (/wood|plank/.test(name)) {
          material.color.set('#aeb2a7');
          material.onBeforeCompile = (shader: any) => {
            shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, 0.42);');
          };
        }
        if (/stone|tile/.test(name)) { material.color.set('#b7b9ac'); material.normalScale?.set(.3, .3); }
        if (/bark/.test(name)) { material.color.set('#c2b39a'); material.emissive.set('#322c22'); material.emissiveIntensity = .18; }
        material.needsUpdate = true;
        return material;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
    });
    return () => { model.traverse((object: any) => { if (object.isMesh) (Array.isArray(object.material) ? object.material : [object.material]).forEach((m: any) => m.dispose()); }); };
  }, [model]);
  const { camera, scene, gl } = useThree();

  useEffect(() => {
    sky.mapping = EquirectangularReflectionMapping;
    sky.colorSpace = SRGBColorSpace;
    forest.wrapS = RepeatWrapping;
    forest.repeat.set(3, 1);
    forest.needsUpdate = true;
    forest.colorSpace = SRGBColorSpace;
    scene.background = new Color('#c5d1c4');
    scene.fog = new Fog('#9caa91', 35, 145);
    scene.environment = sky;
    scene.backgroundIntensity = 0.85;
    scene.environmentIntensity = 1.15;
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    onReady();
  }, [gltf, sky, forest, scene, gl, onReady]);

  useFrame((_, delta) => {
    if ('fov' in camera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const isWalk = index === 0 || index === 2 || index === 9 || index === 13;
    const p = isWalk ? progress : ease(progress);
    let z = -2.5;
    if (index === 0) z = 15.6 + (6 - 15.6) * p;
    else if (index === 1) z = 6;
    else if (index === 2) z = 6 + (-2.5 - 6) * p;
    else if (index >= 9 && index <= 10) z = -2.5 + (6 + 2.5) * (index === 9 ? progress : 1);
    else if (index >= 11 && index <= 12) z = 6;
    else if (index === 13) z = 6 + (15.6 - 6) * p;
    if (isWalk) z = prayerWalkZ(index, progress);

    // Facing: toward the shrine on the way in; turning around is a slow, eased beat.
    let yaw = 0;
    if (index === 8 || index === 12) yaw = Math.PI * ease(progress);
    else if (index === 9 || index === 13) yaw = Math.PI;
    else if (index === 10) yaw = Math.PI * (1 - ease(progress));

    const isBow = index === 1 || index === 3 || index === 4 || index === 7 || index === 11;
    const bowAmount = isBow ? Math.min(ease(progress / .36), ease((1 - progress) / .4)) : 0;
    const bow = bowAmount * (reducedMotion ? .25 : .78);
    const bob = walking && !reducedMotion ? Math.sin((elapsed / 1160) * Math.PI * 2) * 0.035 : 0;
    const lean = bowAmount * (reducedMotion ? .035 : .16);
    const direction = yaw + (look?.yaw ?? 0);
    camera.position.set(-Math.sin(direction) * lean, 0.72 + bob * 0.5 - bowAmount * (reducedMotion ? .025 : .13), z - Math.cos(direction) * lean);
    camera.rotation.order = 'YXZ';
    const pitch = Math.max(-1.35, Math.min(1.25, -0.035 - bow + (look?.pitch ?? 0) * (1 - bowAmount * .65)));
    const viewYaw = reducedMotion ? direction : smoothViewAngle(camera.rotation.y, direction, delta);
    const viewPitch = reducedMotion ? pitch : smoothViewAngle(camera.rotation.x, pitch, delta);
    camera.rotation.set(viewPitch, viewYaw, 0);
  });

  return <>
    <ambientLight intensity={1.1} />
    <hemisphereLight color="#edf3df" groundColor="#82775b" intensity={1.6} />
    <directionalLight position={[-5, 9, 5]} color="#ffe3be" intensity={2.1} />
    <directionalLight position={[5, 5, -7]} color="#bcd5ff" intensity={0.65} />
    <primitive object={model} />
    <PrayerTrees />
    <PrayerTorii />
    <mesh><tubeGeometry args={[sacredRope, 40, .055, 8, false]} /><meshStandardMaterial color="#c2ac73" roughness={1} /></mesh>
    {[-1.25, -.42, .42, 1.25].map(x => <group key={x} position={[x, 2.9 + Math.abs(x) * .17, -8.59]}>
      {[0, 1, 2].map(i => <mesh key={i} position={[i % 2 * .055, -.09 - i * .12, 0]} rotation={[0, 0, i % 2 ? -.3 : .3]}><boxGeometry args={[.11, .15, .012]} /><meshStandardMaterial color="#ede8d6" roughness={1} /></mesh>)}
    </group>)}
    <mesh position={[0, 2.75, -7.9]}><sphereGeometry args={[.16, 16, 12]} /><meshStandardMaterial color="#98855b" metalness={.65} roughness={.45} /></mesh>
    <mesh position={[0, 2.03, -7.9]}><cylinderGeometry args={[.035, .035, 1.25, 10]} /><meshStandardMaterial color="#b8a276" roughness={1} /></mesh>
    <mesh position={[0, 1.36, -7.9]}><sphereGeometry args={[.085, 12, 8]} /><meshStandardMaterial color="#b8a276" roughness={1} /></mesh>
    <mesh position={[0, 10, 0]}>
      <cylinderGeometry args={[65, 65, 70, 96, 1, true]} />
      <meshBasicMaterial map={forest} side={DoubleSide} color="#ffffff" fog={false} toneMapped={false}
        onBeforeCompile={(shader: any) => {
          shader.uniforms.horizonSky = { value: new Color('#c5d1c4') };
          shader.fragmentShader = 'uniform vec3 horizonSky;\n' + shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, horizonSky, smoothstep(0.76, 1.0, vMapUv.y));');
        }} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .1, 0]}>
      <planeGeometry args={[180, 180]} />
      <meshStandardMaterial map={groundMap} color="#96997c" roughness={1} />
    </mesh>
  </>;
}

class WorldLoadBoundary extends React.Component<{
  children: React.ReactNode;
  onError: () => void;
}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Prayer3DWorld(props: PrayerWorldProps) {
  const { style, onError, ...sceneProps } = props;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
    <Canvas
      camera={{ position: [0, 0.72, 15.6], fov: 82, near: 0.05, far: 120 }}
      dpr={[1, 1.2]}
      gl={{ alpha: false, antialias: false, powerPreference: 'low-power' }}
      style={S.canvas}
      fallback={<View style={S.fallback} />}
    >
      <Suspense fallback={null}>
        <WorldLoadBoundary onError={onError}><ShrineScene {...sceneProps} /></WorldLoadBoundary>
      </Suspense>
    </Canvas>
  </View>;
}

const S = StyleSheet.create({ canvas: { flex: 1 }, fallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#18221C' } });
