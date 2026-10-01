import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BRUSH, Button, C } from '../components';
import { buildTourPlan, navSlice, type TourAnchorId, type TourSelection, type TourTab } from '../data/featureTour';
import { PagedMeasureContext } from './PagedMeasure';
import { SlicedArt } from './SlicedArt';
import { WashiPressable as Pressable } from './Washi';

type Rect = { x: number; y: number; width: number; height: number };
type AnchorKey = TourAnchorId | 'nav';

// Screens register the views the tour may point at. A plain module map keeps the screens free of any tour state:
// an anchor costs one wrapper view, and the tour looks the view up only when a step needs it.
const anchors = new Map<AnchorKey, React.RefObject<View | null>>();

/** Marks a view the tour can spotlight. Renders one wrapper View, so pass the layout style the child would have had. */
export function TourAnchor({ id, children, style, onLayout }: { id: AnchorKey; children: React.ReactNode; style?: StyleProp<ViewStyle>; onLayout?: (event: LayoutChangeEvent) => void }) {
  const ref = useRef<View>(null);
  const measuring = useContext(PagedMeasureContext);
  useEffect(() => {
    if (measuring) return undefined;
    anchors.set(id, ref);
    return () => { if (anchors.get(id) === ref) anchors.delete(id); };
  }, [id, measuring]);
  return <View ref={ref} collapsable={false} onLayout={onLayout} style={style}>{children}</View>;
}

function measureAnchor(id: AnchorKey): Promise<Rect | null> {
  const view = anchors.get(id)?.current;
  if (!view) return Promise.resolve(null);
  return new Promise(resolve => view.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null)));
}

type Props = {
  selection: TourSelection;
  /** Whether the gacha tab is on the bar; it decides both the plan and where each tab sits. */
  gacha: boolean;
  /** Space the tab bar takes at the bottom, so a step with nothing to point at keeps its card above it. */
  bottomInset: number;
  onNavigate: (tab: TourTab) => void;
  /** Called when the step's full-screen scene changes (null = just the tabs). */
  onScene: (scene: 'gacha' | null) => void;
  onClose: () => void;
};

/**
 * The replayable tour: dims the screen, cuts a hole around the thing being explained and shows a short card.
 * It only explains; nothing underneath can be tapped while it is open. Each step first moves to the tab it is about.
 */
export function FeatureTour({ selection, gacha, bottomInset, onNavigate, onScene, onClose }: Props) {
  const plan = useMemo(() => buildTourPlan(selection, { gacha }), [selection, gacha]);
  const [position, setPosition] = useState(0);
  const step = plan[Math.min(position, plan.length - 1)];
  const [target, setTarget] = useState<Rect | null>(null);
  const [frame, setFrame] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [cardHeight, setCardHeight] = useState(150);
  const frameRef = useRef<View>(null);
  const last = position >= plan.length - 1;

  useEffect(() => { if (step?.tab) onNavigate(step.tab); }, [step?.tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onScene(step?.scene ?? null); }, [step?.scene]); // eslint-disable-line react-hooks/exhaustive-deps

  // Measure after the tab change has rendered; a second pass catches slow layouts (the book and the walk ring settle late).
  useEffect(() => {
    if (!step) return undefined;
    let cancelled = false;
    setTarget(null);
    const run = async () => {
      frameRef.current?.measureInWindow((x, y, width, height) => { if (!cancelled) setFrame(previous => previous.x === x && previous.y === y && previous.width === width && previous.height === height ? previous : { x, y, width, height }); });
      if (!step.anchor) return;
      const slice = navSlice(step.anchor, { gacha });
      const rect = await measureAnchor(slice ? 'nav' : step.anchor);
      if (cancelled || !rect) return;
      setTarget(slice ? { x: rect.x + rect.width * slice.index / slice.count, y: rect.y, width: rect.width / slice.count, height: rect.height } : rect);
    };
    const first = setTimeout(() => void run(), 160);
    const second = setTimeout(() => void run(), 600);
    return () => { cancelled = true; clearTimeout(first); clearTimeout(second); };
  }, [step, gacha]);

  const go = useCallback((delta: number) => setPosition(value => Math.max(0, Math.min(plan.length - 1, value + delta))), [plan.length]);
  if (!step) return null;

  const width = Math.max(1, frame.width);
  const height = Math.max(1, frame.height);
  const local = target && frame.width > 0 ? { x: target.x - frame.x, y: target.y - frame.y, width: target.width, height: target.height } : null;
  const hole = local ? { x: Math.max(0, local.x - 7), y: Math.max(0, local.y - 7), width: Math.min(width, local.width + 14), height: Math.min(height, local.height + 14) } : null;
  const cardWidth = Math.max(240, Math.min(360, width - 28));
  const left = Math.max(14, (width - cardWidth) / 2);
  const bottomLimit = height - cardHeight - 12;
  // Inside a full-screen scene the buttons being explained sit at the bottom, so the card goes in the middle.
  const top = step.scene ? Math.round(height * .38) : hole
    ? (hole.y + hole.height / 2 < height / 2 ? Math.min(hole.y + hole.height + 14, bottomLimit) : Math.max(12, hole.y - cardHeight - 14))
    : Math.max(12, height - bottomInset - cardHeight - 18);

  // A transparent modal, so the tour also sits above the gacha, which is a modal of its own.
  return <Modal transparent visible animationType="none" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onClose}>
    <View ref={frameRef} collapsable={false} accessibilityViewIsModal onLayout={() => frameRef.current?.measureInWindow((x, y, w, h) => setFrame({ x, y, width: w, height: h }))} style={S.overlay}>
      {/* A touch sink: the screen behind must not react while the tour explains it. */}
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="つぎへ" onPress={() => (last ? onClose() : go(1))} style={StyleSheet.absoluteFill} />
      {hole
        ? <Svg pointerEvents="none" width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
          <Path d={`M0 0H${width}V${height}H0Z ${roundedRectPath(hole.x, hole.y, hole.width, hole.height, 16)}`} fill="#89898499" fillRule="evenodd" />
        </Svg>
        : <View pointerEvents="none" style={[StyleSheet.absoluteFill, S.softDim]} />}
      <View onLayout={event => setCardHeight(Math.round(event.nativeEvent.layout.height))} style={[S.card, { left, top, width: cardWidth }]}>
        <SlicedArt name="hintFrame" corner={18} />
        <View style={S.cardBody}>
          <View style={S.headRow}>
            <View style={S.badge}><Text style={S.badgeText}>{step.index} / {step.total}</Text></View>
            <Text numberOfLines={1} style={S.section}>{step.sectionTitle}</Text>
            <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="チュートリアルをとじる" onPress={onClose} hitSlop={10} style={S.closeButton}><Text style={S.closeText}>とじる</Text></Pressable>
          </View>
          <Text style={S.title}>{step.title}</Text>
          <Text style={S.detail}>{step.detail}</Text>
          <View style={S.buttons}>
            <Button title="もどる" secondary disabled={position === 0} onPress={() => go(-1)} style={S.button} />
            <Button title={last ? 'おわり' : 'つぎへ'} onPress={() => (last ? onClose() : go(1))} style={S.button} />
          </View>
        </View>
      </View>
  </View>
  </Modal>;
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  return `M${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${y + height - r}Q${x + width} ${y + height} ${x + width - r} ${y + height}H${x + r}Q${x} ${y + height} ${x} ${y + height - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

const S = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 300 },
  softDim: { backgroundColor: '#2B241A40' },
  card: { position: 'absolute' },
  cardBody: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { minWidth: 48, height: 24, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#815C3B' },
  badgeText: { color: '#FFF8E9', fontSize: 11, fontWeight: '700', letterSpacing: .25 },
  section: { flex: 1, color: '#9D6540', fontSize: 12 },
  closeButton: { paddingHorizontal: 4, paddingVertical: 2 },
  closeText: { color: '#786853', fontSize: 12, textDecorationLine: 'underline' },
  title: { color: '#3D3328', fontFamily: BRUSH, fontSize: 17, lineHeight: 23 },
  detail: { color: C.ink, fontSize: 12.5, lineHeight: 19 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  button: { flex: 1, minHeight: 44, paddingHorizontal: 6 },
});
