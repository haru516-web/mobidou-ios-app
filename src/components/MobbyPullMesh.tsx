import { forwardRef, useImperativeHandle } from 'react';
import type { MobbyPullMeshHandle, MobbyPullMeshProps } from './MobbyPullMesh.types';

export type { MobbyPullMeshHandle, MobbyPullMeshProps } from './MobbyPullMesh.types';

export const SUPPORTS_PULL_MESH = false;

export const MobbyPullMesh = forwardRef<MobbyPullMeshHandle, MobbyPullMeshProps>(function MobbyPullMesh(_props, ref) {
  useImperativeHandle(ref, () => ({ begin() {}, update() {}, release() {}, reset() {} }), []);
  return null;
});
