import React from 'react';
import { Animated, Image as RNImage, Platform, type ImageSourcePropType } from 'react-native';
import { Asset } from 'expo-asset';
import Svg, { ClipPath, Defs, Image as SvgImage, Mask, Path, Rect } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const W = 212;
const H = 318;
const ROWS = 15;
const LEN = 420;

/** Brush strokes sweeping down the sheet, each one a little off the last, so the picture seems to be painted on. */
const STROKES = Array.from({ length: ROWS }, (_, i) => {
  const y = -6 + i * ((H + 12) / (ROWS - 1));
  const lean = Math.sin(i * 1.9) * 13;
  const ltr = i % 2 === 0;
  const [x0, x1] = ltr ? [-30, W + 30] : [W + 30, -30];
  const mid = (x0 + x1) / 2;
  return {
    d: `M ${x0} ${y + lean} C ${mid - 60 * (ltr ? 1 : -1)} ${y - 14 + lean}, ${mid + 50 * (ltr ? 1 : -1)} ${y + 16 - lean}, ${x1} ${y + lean * .6}`,
    width: 46 + (i % 4) * 7,
    start: (i / ROWS * .55 + ((i * 7) % 5) / 5 * .22) * .9,
  };
});

/** The picture appears as it is painted, stroke by stroke, with soft wet edges; once `progress` reaches 1 nothing moves. */
export function InkReveal({ source, progress }: { source: ImageSourcePropType; progress: Animated.Value }) {
  // React Native Web has no Image.resolveAssetSource, so a bundled picture is resolved through expo-asset there.
  const uri = (typeof RNImage.resolveAssetSource === 'function' ? RNImage.resolveAssetSource(source)?.uri : typeof source === 'number' ? Asset.fromModule(source).uri : (source as { uri?: string })?.uri) ?? '';
  // Native wants the asset itself; web wants a plain URL.
  const href = Platform.OS === 'web' ? uri : source;
  return <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <Defs>
      <ClipPath id="inkClip"><Rect x={0} y={0} width={W} height={H} rx={5} /></ClipPath>
      <Mask id="inkMask" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
        {STROKES.map((stroke, i) => {
          const offset = progress.interpolate({ inputRange: [stroke.start, stroke.start + .36], outputRange: [LEN, 0], extrapolate: 'clamp' });
          return <React.Fragment key={i}>
            <AnimatedPath d={stroke.d} stroke="#fff" strokeOpacity={.3} strokeWidth={stroke.width + 14} strokeLinecap="round" strokeDasharray={`${LEN} ${LEN}`} strokeDashoffset={offset} fill="none" />
            <AnimatedPath d={stroke.d} stroke="#fff" strokeOpacity={.7} strokeWidth={stroke.width + 5} strokeLinecap="round" strokeDasharray={`${LEN} ${LEN}`} strokeDashoffset={offset} fill="none" />
            <AnimatedPath d={stroke.d} stroke="#fff" strokeWidth={stroke.width} strokeLinecap="round" strokeDasharray={`${LEN} ${LEN}`} strokeDashoffset={offset} fill="none" />
          </React.Fragment>;
        })}
      </Mask>
    </Defs>
    <SvgImage href={href as string} width={W} height={H} preserveAspectRatio="xMidYMid slice" clipPath="url(#inkClip)" mask="url(#inkMask)" />
  </Svg>;
}
