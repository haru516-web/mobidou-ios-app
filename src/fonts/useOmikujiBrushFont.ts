import { useEffect, useState } from 'react';
import { loadAsync } from 'expo-font';
import { YujiSyuku_400Regular } from '@expo-google-fonts/yuji-syuku/400Regular';

export const OMIKUJI_BRUSH_TEXT_STYLE = { fontFamily: 'OmikujiBrush' } as const;

let brushFontPromise: Promise<void> | null = null;

function loadBrushFont() {
  if (!brushFontPromise) {
    brushFontPromise = loadAsync({ OmikujiBrush: YujiSyuku_400Regular }).catch(error => {
      brushFontPromise = null;
      throw error;
    });
  }
  return brushFontPromise;
}

export function useOmikujiBrushFont(enabled = true) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadBrushFont().then(() => {
      if (active) setLoaded(true);
    }).catch(() => {});
    return () => { active = false; };
  }, [enabled]);

  return loaded ? OMIKUJI_BRUSH_TEXT_STYLE : undefined;
}
