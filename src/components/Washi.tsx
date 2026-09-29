import React from 'react';
import { Pressable as NativePressable, View, StyleSheet, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { SlicedArt } from './SlicedArt';
import { CroppedArt } from './CroppedArt';
import { UI_ART } from '../data/uiArt';

/** `legacy` keeps the old flat paper texture, for small round or clipped spots; otherwise cards get the torn-paper frame. */
export function WashiArt({ button = false, legacy = false }: { button?: boolean; legacy?: boolean }) {
  if (!button && !legacy) return <SlicedArt name="cardFrame" corner={20} />;
  return <Image pointerEvents="none" accessible={false} source={button ? require('../../assets/pilgrimage-v2/button-washi.webp') : require('../../assets/pilgrimage-v2/card-washi.webp')} contentFit="cover" style={[StyleSheet.absoluteFillObject, { opacity: button ? .38 : .64, borderRadius: 12 }]} />;
}
const BOX_KEYS = ['backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth', 'shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'elevation'] as const;
function withoutBox(style: StyleProp<ViewStyle>): ViewStyle {
  const flat: Record<string, unknown> = { ...(StyleSheet.flatten(style) ?? {}) };
  for (const key of BOX_KEYS) delete flat[key];
  return flat as ViewStyle;
}
function PlateArt({ plate, pressed, disabled }: { plate: 'primary' | 'secondary' | 'round' | 'pill'; pressed: boolean; disabled: boolean }) {
  if (plate === 'round') {
    const art = pressed ? UI_ART.roundButtonPressed : UI_ART.roundButton;
    return <CroppedArt source={art.source} bounds={{ x0: art.box.x0 / art.width, x1: art.box.x1 / art.width, y0: art.box.y0 / art.height, y1: art.box.y1 / art.height }} />;
  }
  if (plate === 'pill') return <SlicedArt name="pillStrip" />;
  if (disabled) return <SlicedArt name="buttonDisabled" />;
  if (plate === 'primary') return <SlicedArt name={pressed ? 'buttonPrimaryPressed' : 'buttonPrimary'} />;
  return <SlicedArt name={pressed ? 'buttonSecondaryPressed' : 'buttonSecondary'} />;
}

/** Text on a strip of torn paper, in place of a text box with a drawn fill. The spacing keys of `textStyle` go to the strip. */
const OUTER_KEYS = new Set(['alignSelf', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'width', 'maxWidth', 'minWidth', 'flex', 'flexShrink']);
export function PillText({ children, textStyle, dark = false }: { children: React.ReactNode; textStyle?: StyleProp<TextStyle>; dark?: boolean }) {
  const flat = withoutBox(textStyle as StyleProp<ViewStyle>) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) (OUTER_KEYS.has(key) ? outer : inner)[key] = value;
  return <View style={[{ overflow: 'hidden', justifyContent: 'center' }, outer as ViewStyle]}>
    <SlicedArt name={dark ? 'pillStripDark' : 'pillStrip'} />
    <Text style={[{ paddingHorizontal: 22, paddingVertical: 7 }, inner as TextStyle]}>{children}</Text>
  </View>;
}

/**
 * `plate` puts a cut washi plate behind the button (vermilion for the main action,
 * cream for a quieter one) and drops the drawn box from its style; the layout stays.
 */
export function WashiPressable({ children, style, artwork = true, plate, ...props }: PressableProps & { artwork?: boolean; plate?: 'primary' | 'secondary' | 'round' | 'pill' }) {
  return <NativePressable {...props} style={state => {
    const resolved = typeof style === 'function' ? style(state) : style;
    return [{ position: 'relative', overflow: 'hidden' }, plate ? withoutBox(resolved) : resolved];
  }}>{state => <>
    {plate ? <PlateArt plate={plate} pressed={!!state.pressed} disabled={!!props.disabled} /> : artwork && <WashiArt button />}
    {typeof children === 'function' ? children(state) : children}
  </>}</NativePressable>;
}
export function PaperCard({ children }: { children: React.ReactNode }) {
  return <View style={{ padding: 22, overflow: 'hidden', marginVertical: 12 }}><WashiArt />{children}</View>;
}
