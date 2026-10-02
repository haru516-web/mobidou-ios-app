# ナビバー選択表示 比較用素材

作成日: 2026-10-02。built-in image_gen、transparent_background: true。

参照: `D:/mobby/mobidou-claude/docs/codex-nav-selected-assets.md`、`docs/ARTWORK.md`、御朱印 `moon.webp`、既存 `nav-tab-active.webp` と `common/underline-brush.webp`。現在のチェックアウトには指定資料と ui-washi 素材がないため、別チェックアウトを読み取り参照。成果物は現在の作業フォルダーに保存。

朱は御朱印の落ち着いた赤茶色に合わせ、プロンプトでは #B64B32 を指定。ARTWORK.md は数値色を指定していない。御朱印の朱色画素の参考中央値は RGB(198,95,60)。

## 保存・検証

すべてアルファ付き lossless WebP（method 6）。四隅のアルファは全て0、各60,000 bytes以下。素材に文字・アイコン・追加記号・影・背景色・市松模様はなし。

生成画像のアルファが16を超える範囲の外接矩形を切り出して縮小し、透明キャンバスに配置。切り出し後は生成アルファを維持。板は180×164、筆線は244×28 / 244×26へリサイズ。絵馬は164×92内に縦横比を保って収め、上端4pxに配置し、下半分（y=100..199）は全画素アルファ0。

`docs/nav-assets-verification/pixel-audit.json` に保存後のWebPを再読込した検査結果、`generation.json` に各生成元とプロンプトを保存。

`overlay-comparison.webp` は左 #302D25、右 #F2E8D2。朱の板に白い家アイコン、絵馬に朱 #B64B32 の家アイコンを重ねて目視し、両背景でアイコンが読め、輪郭が保たれることを確認。アイコンは検証画像だけに描画し、納品素材には含めない。下線は既存の細い筆線より太く、244px幅の長い線として書き出した。

コード（src/、App.tsx）は変更なし。

## 各素材と使用プロンプト

### nav-plate-vermilion.webp

- 保存先: assets/ui-washi/nav/nav-plate-vermilion.webp
- 寸法: 192×176
- 容量: 41108 bytes

> Use case: stylized-concept. Production Japanese mobile UI asset. True transparent alpha background everywhere outside the object. Flat front-facing handmade Japanese washi, sumi dry-brush and goshuin vermilion style. Muted warm goshuin stamp vermilion approximately #B64B32, restrained red-brown pigment, not neon or scarlet. No text, letters, numbers, icons, decorative symbols, shadow, glow, perspective, background color, checkerboard or watermark. Clean isolated silhouette, fully transparent corners. One slightly rounded rectangular vermilion paper plate, nearly square 192:176 canvas proportions, centered with narrow transparent margins. Slightly irregular hand-torn washi edges, fine paper fibers and restrained mottled vermilion pigment. Center is almost uniform solid vermilion, dark enough for white icons and white lettering to read; texture and slightly darker pigment mainly at perimeter. No blank holes in center. No frame decorations.

### nav-ema-selected.webp

- 保存先: assets/ui-washi/nav/nav-ema-selected.webp
- 寸法: 176×200
- 容量: 11750 bytes

> Use case: stylized-concept. Production Japanese mobile UI asset. True transparent alpha background everywhere outside the object. Flat front-facing handmade Japanese washi, sumi dry-brush and goshuin vermilion style. Muted warm goshuin stamp vermilion approximately #B64B32, restrained red-brown pigment, not neon or scarlet. No text, letters, numbers, icons, decorative symbols, shadow, glow, perspective, background color, checkerboard or watermark. Clean isolated silhouette, fully transparent corners. One Japanese ema votive wooden plaque, symmetric pentagonal outline with shallow roof-shaped top, pale warm paulownia wood face and fine vermilion border. Small real hole near roof peak, with one short vermilion cord threaded through it and visible just above the plaque. Quiet fine horizontal wood fibers at edges, center very light nearly uniform for overlaying a vermilion icon. Flat illustration. Canvas aspect 176:200. CRITICAL: entire plaque AND cord occupy ONLY the TOP HALF of the canvas; bottom 50 percent stays completely empty transparent for later app lettering. Plaque should span most canvas width, shallow compact pentagon body, no writing or emblem. Cord does not reach outer canvas edge.

### nav-brush-top.webp

- 保存先: assets/ui-washi/nav/nav-brush-top.webp
- 寸法: 256×40
- 容量: 10150 bytes

> Use case: stylized-concept. Production Japanese mobile UI asset. True transparent alpha background everywhere outside the object. Flat front-facing handmade Japanese washi, sumi dry-brush and goshuin vermilion style. Muted warm goshuin stamp vermilion approximately #B64B32, restrained red-brown pigment, not neon or scarlet. No text, letters, numbers, icons, decorative symbols, shadow, glow, perspective, background color, checkerboard or watermark. Clean isolated silhouette, fully transparent corners. Exactly one long thick horizontal vermilion brush stroke on very wide 256:40 canvas. Nearly straight with slight natural wavering. Thick continuous center, both ends gracefully taper thinner with sparse dry-brush hairs and fraying. Width spans about 92 percent, stroke height about 65 percent. Washed pigment and sumi brush abrasion subtle, red pigment only. No additional strokes.

### nav-underline-thick.webp

- 保存先: assets/ui-washi/nav/nav-underline-thick.webp
- 寸法: 256×36
- 容量: 10894 bytes

> Use case: stylized-concept. Production Japanese mobile UI asset. True transparent alpha background everywhere outside the object. Flat front-facing handmade Japanese washi, sumi dry-brush and goshuin vermilion style. Muted warm goshuin stamp vermilion approximately #B64B32, restrained red-brown pigment, not neon or scarlet. No text, letters, numbers, icons, decorative symbols, shadow, glow, perspective, background color, checkerboard or watermark. Clean isolated silhouette, fully transparent corners. Exactly one broad long horizontal vermilion underline brush stroke on extremely wide 256:36 canvas. Thicker and longer than a fine underline: about 94 percent canvas width and 72 percent canvas height. Firm nearly horizontal continuous bold central brush mass, tactile sumi-style dry-brush skips and fine longitudinal scratch grain, slightly uneven ends with brush fraying. Vermilion pigment only. Keep four corners transparent. No additional strokes.
