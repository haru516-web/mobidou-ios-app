import type { ImageSourcePropType } from 'react-native';

import type { PullSample } from './pullMeshCore';

export type MobbyPullMeshHandle = {
  begin: (x: number, y: number) => void;
  update: (dx: number, dy: number) => void;
  release: () => void;
  reset: () => void;
  /** Deformation at a point in sprite coordinates (0..size). */
  sample: (x: number, y: number) => PullSample;
};

export type MobbyPullMeshProps = {
  source: ImageSourcePropType;
  /** Full character art used as the alpha silhouette for the extracted pull body. */
  mask?: ImageSourcePropType;
  size: number;
  visible: boolean;
  /** Called after every drawn frame, so eyes and buttons can follow the body. */
  onFrame?: () => void;
  /** Called if the GL surface can't be set up, so the caller can fall back. */
  onError?: () => void;
};
