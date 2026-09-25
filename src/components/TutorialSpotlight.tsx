import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TutorialTapHint } from './TutorialTapHint';

export type TutorialRect = { x: number; y: number; width: number; height: number };

export function TutorialTarget({ children, onRectChange, active = true, style }: { children: React.ReactNode; onRectChange: (rect: TutorialRect | null) => void; active?: boolean; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const measure = useCallback(() => {
    if (!active) return;
    requestAnimationFrame(() => {
      if (!activeRef.current) return;
      ref.current?.measureInWindow((x, y, width, height) => {
        if (activeRef.current && width > 0 && height > 0) onRectChange({ x, y, width, height });
      });
    });
  }, [active, onRectChange]);

  useEffect(() => {
    measure();
  }, [measure]);

  return <View ref={ref} collapsable={false} onLayout={measure} style={style}>{children}</View>;
}

export function TutorialSpotlightOverlay({ targetRect, step, title, detail }: { targetRect: TutorialRect | null; step: string; title: string; detail: string }) {
  const ref = useRef<View>(null);
  const [frame, setFrame] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const measureFrame = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => setFrame(previous => previous.x === x && previous.y === y && previous.width === width && previous.height === height ? previous : { x, y, width, height }));
  }, []);
  const onLayout = useCallback((_event: LayoutChangeEvent) => measureFrame(), [measureFrame]);
  useEffect(() => {
    const frame = requestAnimationFrame(measureFrame);
    return () => cancelAnimationFrame(frame);
  }, [measureFrame, targetRect]);

  const width = Math.max(1, frame.width);
  const height = Math.max(1, frame.height);
  const localRect = targetRect && frame.width > 0 && frame.height > 0 ? {
    x: targetRect.x - frame.x,
    y: targetRect.y - frame.y,
    width: targetRect.width,
    height: targetRect.height,
  } : null;
  const hole = localRect ? {
    x: Math.max(0, localRect.x - 7),
    y: Math.max(0, localRect.y - 7),
    width: Math.min(width, localRect.width + 14),
    height: Math.min(height, localRect.height + 14),
  } : null;
  const holePath = hole ? roundedRectPath(hole.x, hole.y, hole.width, hole.height, 16) : '';
  const maskPath = `M0 0H${width}V${height}H0Z ${holePath}`;
  const hintWidth = Math.max(240, Math.min(340, width - 28));
  const hintHeight = 82;
  const centeredLeft = localRect ? localRect.x + localRect.width / 2 - hintWidth / 2 : (width - hintWidth) / 2;
  const left = Math.max(14, Math.min(width - hintWidth - 14, centeredLeft));
  const belowTop = localRect ? localRect.y + localRect.height + 14 : 14;
  const top = localRect && belowTop + hintHeight <= height - 12
    ? belowTop
    : Math.max(12, (localRect?.y ?? hintHeight + 24) - hintHeight - 14);

  return <View ref={ref} collapsable={false} onLayout={onLayout} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={S.overlay}>
    {targetRect && <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
      <Path d={maskPath} fill="#89898499" fillRule="evenodd" />
    </Svg>}
    <View style={[S.hint, { left, top, width: hintWidth }]}>
      <TutorialTapHint step={step} label={title} detail={detail} />
    </View>
  </View>;
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  return `M${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${y + height - r}Q${x + width} ${y + height} ${x + width - r} ${y + height}H${x + r}Q${x} ${y + height} ${x} ${y + height - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

const S = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 200, overflow: 'visible' },
  hint: { position: 'absolute' },
});
