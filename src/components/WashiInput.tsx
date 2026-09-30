import React from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SlicedArt } from './SlicedArt';

// Keys of `style` that place the box; everything else styles the text and its padding.
const OUTER_KEYS = new Set(['flex', 'flexGrow', 'flexShrink', 'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 'alignSelf', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical']);
// The drawn box is replaced by the frame art, which also sets the padding.
const BOX_KEYS = new Set(['padding', 'paddingHorizontal', 'paddingVertical', 'backgroundColor', 'borderColor', 'borderWidth', 'borderRadius']);

/**
 * A text field on a torn-paper frame. Single-line fields stretch the strip frame across;
 * multi-line fields use the inset card frame. `style` works as it does on a TextInput,
 * minus the drawn box.
 */
export function WashiInput({ style, multiline, ...props }: TextInputProps) {
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(StyleSheet.flatten(style) ?? {})) {
    if (BOX_KEYS.has(key)) continue;
    (OUTER_KEYS.has(key) ? outer : inner)[key] = value;
  }
  // The frame's torn edge takes room from the text, so keep it clear of the writing.
  const inset = multiline ? 12 : 16;
  return <View style={[{ justifyContent: 'center' }, outer as ViewStyle]}>
    {multiline ? <SlicedArt name="cardFrameInset" corner={14} /> : <SlicedArt name="inputFrame" />}
    <TextInput {...props} multiline={multiline} style={[{ flexGrow: 1, paddingHorizontal: inset }, multiline && { paddingVertical: inset }, inner as TextStyle]} />
  </View>;
}
