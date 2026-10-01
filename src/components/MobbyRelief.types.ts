export type MobbyReliefProps = {
  /** Drawing surface size in dp. The character is framed to fit its height. */
  width: number;
  height: number;
  shade?: number;
  depth?: number;
  /** Called if the GL surface can't be set up, so the caller can fall back to the flat art. */
  onError?: () => void;
};
