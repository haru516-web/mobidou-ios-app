import type { ImageSourcePropType } from 'react-native';

export type MobbyPullMeshHandle = {
  begin: (x: number, y: number) => void;
  update: (dx: number, dy: number) => void;
  release: () => void;
  reset: () => void;
};

export type MobbyPullMeshLayer = {
  source: ImageSourcePropType;
  sourceSize: number;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type MobbyPullMeshProps = {
  source: ImageSourcePropType;
  /** Full character art used as the alpha silhouette for the extracted pull body. */
  mask?: ImageSourcePropType;
  size: number;
  visible: boolean;
  layers?: readonly MobbyPullMeshLayer[];
};
