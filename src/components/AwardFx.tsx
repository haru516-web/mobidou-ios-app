import React, { useEffect, useState } from 'react';
import { Image as RNImage, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GACHA_ART } from '../data/gachaArt';
import { CHARGE_MS, blossomsAt, bloomAt, burstAt, dustAt, flashAt, gatherAt, glowAfterOpen, pillarAt, shimmerAt, sparklesAt } from './gachaTimeline';

/** The light the goshuin is painted in: it gathers, bursts at BURST_AT, and the dust and petals have gone by END_AT. */
export const BURST_AT = 1000;
const END_AT = 7600;
const SHIFT = CHARGE_MS - BURST_AT;
const U = 190;
const SCENE = { width: 350, height: 420 };
const GOLD = 'rgb(255, 226, 168)';

function Part({ part, style, tint }: { part: 'glowCore' | 'glowRays'; style: StyleProp<ViewStyle>; tint?: string }) {
  return <View pointerEvents="none" style={style}><RNImage accessible={false} source={GACHA_ART[part]} resizeMode="contain" style={{ width: '100%', height: '100%', tintColor: tint }} /></View>;
}

/**
 * The gacha's light, scaled down for a goshuin: specks of light are drawn in, flash, rays and a pillar burst out as
 * the brush starts, gold flies, petals and dust drift down, and everything fades. It leaves nothing on screen.
 */
export function AwardFx() {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Date.now() - start;
      setMs(t);
      if (t > END_AT) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, []);
  if (ms > END_AT) return null;
  const opened = ms + SHIFT;
  const fade = 1 - Math.min(1, Math.max(0, (ms - 4200) / (END_AT - 4200)));
  const shimmer = shimmerAt(ms);
  const bloom = bloomAt(opened, 1);
  const glow = Math.min(1, glowAfterOpen(opened) * 1.1) * fade;
  const burst = burstAt(opened);
  const pillar = pillarAt(opened);
  const flash = flashAt(opened);
  const gather = gatherAt(opened, 18);
  const sparkles = sparklesAt(opened, 16);
  const dust = dustAt(opened, 14);
  const petals = blossomsAt(opened, { x: .5, y: .5 }, 24);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { mixBlendMode: 'screen' } as object]}>
      <Part part="glowCore" tint={GOLD} style={[S.centered, { width: U * 3.1, height: U * 3.1, marginLeft: -U * 1.55, marginTop: -U * 1.55, opacity: Math.min(1, glow * .5 * shimmer) * Math.min(1, bloom), transform: [{ scale: (.85 + .3 * bloom) * shimmer }] }]} />
      <Part part="glowRays" tint={GOLD} style={[S.centered, { width: U * 4.4, height: U * 4.4, marginLeft: -U * 2.2, marginTop: -U * 2.2, opacity: glow * .22 * shimmer, transform: [{ rotate: `${ms * .008}deg` }, { scale: .8 + .2 * bloom }] }]} />
      <Part part="glowRays" tint={GOLD} style={[S.centered, { width: U * 4.4, height: U * 4.4, marginLeft: -U * 2.2, marginTop: -U * 2.2, opacity: burst.opacity * .4, transform: [{ rotate: `${-(opened - CHARGE_MS) * .02 + 20}deg` }, { scale: burst.scale }] }]} />
      {pillar.opacity > 0 && <Part part="glowCore" tint={GOLD} style={[S.centered, { width: U * .42, height: SCENE.height * 1.5 * pillar.height, marginLeft: -U * .21, marginTop: -SCENE.height * .75 * pillar.height, opacity: pillar.opacity * .7 * fade }]} />}
      {gather.map((speck, i) => <Part key={`g${i}`} part="glowCore" tint={GOLD} style={[S.centered, { width: U * speck.size * 2.2, height: U * speck.size * 2.2, marginLeft: speck.x * U - U * speck.size * 1.1, marginTop: speck.y * U - U * speck.size * 1.1, opacity: speck.opacity }]} />)}
      {sparkles.map((spark, i) => <Part key={`s${i}`} part="glowCore" tint={GOLD} style={[S.centered, { width: U * spark.size * 2, height: U * spark.size * 2, marginLeft: spark.x * U - U * spark.size, marginTop: spark.y * U - U * spark.size, opacity: spark.opacity * .75 }]} />)}
      {dust.map((flake, i) => <Part key={`d${i}`} part="glowCore" tint={GOLD} style={[S.centered, { width: SCENE.width * flake.size * 2.2, height: SCENE.width * flake.size * 2.2, marginLeft: (flake.x - .5) * SCENE.width * 1.3, marginTop: (flake.y - .5) * SCENE.height * 1.2, opacity: flake.opacity * .55 }]} />)}
    </View>
    {petals.map((petal, i) => {
      const w = SCENE.width * petal.size * 1.6;
      return <View key={`p${i}`} style={[S.centered, { width: w, height: w * .62, marginLeft: (petal.x - .5) * SCENE.width * 1.6 - w / 2, marginTop: (petal.y - .5) * SCENE.height * 1.5, opacity: petal.opacity * fade, backgroundColor: `rgb(255, ${Math.round(222 - 62 * petal.tone)}, ${Math.round(230 - 46 * petal.tone)})`, borderTopLeftRadius: w * .62, borderBottomRightRadius: w * .62, borderTopRightRadius: w * .08, borderBottomLeftRadius: w * .08, transform: [{ rotate: `${petal.rotate}deg` }, { scaleX: petal.flip }] }]} />;
    })}
    <View pointerEvents="none" style={{ position: 'absolute', left: -300, right: -300, top: -300, bottom: -300, backgroundColor: GOLD, opacity: flash * .3 }} />
  </View>;
}
const S = StyleSheet.create({ centered: { position: 'absolute', left: '50%', top: '50%' } });
