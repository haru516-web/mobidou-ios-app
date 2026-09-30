import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { UI_ART, type UiArt } from '../data/uiArt';
import { CroppedArt } from './CroppedArt';

const WIDTH = 58;
const HEIGHT = 32;
const KNOB = 30;

const boundsOf = (art: UiArt) => ({ x0: art.box.x0 / art.width, x1: art.box.x1 / art.width, y0: art.box.y0 / art.height, y1: art.box.y1 / art.height });

/** A switch made of a washi track and a round knob, in place of the system switch. */
export function WashiSwitch({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange: (value: boolean) => void; accessibilityLabel?: string }) {
  const slide = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.timing(slide, { toValue: value ? 1 : 0, duration: 140, useNativeDriver: true }).start(); }, [slide, value]);
  const track = value ? UI_ART.switchTrackOn : UI_ART.switchTrackOff;
  const trackHeight = WIDTH * (track.box.y1 - track.box.y0) / (track.box.x1 - track.box.x0);
  return <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: value }} hitSlop={8} onPress={() => onValueChange(!value)} style={S.root}>
    <View style={[S.track, { height: trackHeight, top: (HEIGHT - trackHeight) / 2 }]}><CroppedArt source={track.source} bounds={boundsOf(track)} /></View>
    <Animated.View style={[S.knob, { transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, WIDTH - KNOB] }) }] }]}><CroppedArt source={UI_ART.switchKnob.source} bounds={boundsOf(UI_ART.switchKnob)} /></Animated.View>
  </Pressable>;
}

const S = StyleSheet.create({
  root: { width: WIDTH, height: HEIGHT },
  track: { position: 'absolute', left: 0, width: WIDTH },
  knob: { position: 'absolute', left: 0, top: (HEIGHT - KNOB) / 2, width: KNOB, height: KNOB },
});
