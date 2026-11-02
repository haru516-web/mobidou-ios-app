declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  export type GLTF = { scene: import('three').Object3D };
  export class GLTFLoader {
    constructor(manager?: unknown);
    load(url: string, onLoad: (gltf: GLTF) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void): void;
    loadAsync(url: string): Promise<GLTF>;
  }
}
