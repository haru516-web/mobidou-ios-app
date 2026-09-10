# お参りスプライト v2

- モビ坊以外の17体は各キャラの元画像を参照して画像生成ツールで再生成。`source.png` は上段が礼8コマ、下段が拍手8コマ。
- モビ坊は既存の礼・拍手シートを再利用。
- `rei.png` と `hakushu.png` はそれぞれ4096×512、横8コマ。通常画像の幅・高さ・足元に合わせて全コマを共通倍率でパッキング。礼の途中だけ背丈を引き伸ばす処理はしない。
- 実装は `src/data/prayerAtlasesV2.ts` と `src/components/PullableCompanion.tsx`。2枚を事前読み込みし表示窓の位置を切り替える。元画像の回転・縮小を礼の代用にしない。
- 順序は礼8コマ×2、拍手8コマ×2、礼8コマ×1（40コマ）。
- 再パッキング: `node scripts/pack-prayer-sheets.cjs scripts/prayer-sources-all.json`。sharpが必要。共有ランタイムの場合は `SHARP_MODULE` にモジュールパスを指定。

## 生成プロンプト

Transparent animation sprite sheet of EXACTLY the supplied character. Preserve all original features, fur colors, ears, outfit, camera eye and torso controls. Exactly 8 columns x 2 rows, uniform cells. No labels, lines, scenery or checkerboard. Each full character centered within cell with safe margins and identical scale, feet baseline fixed. TOP ROW: upright, slight bow, 25 degree bow, deep 45 degree bow, deepest bow showing top of head and downward facing eyes, rising, almost upright, upright. BOTTOM ROW: arms down, both hands raised and separated at chest, hands approach, palms meet, contact hold, hands separate, arms lower, original upright. Real articulated bow, not static image squashing or rotation. Real alpha transparent background. Preserve seated poses for seated characters.
