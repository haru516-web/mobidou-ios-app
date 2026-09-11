# 御朱印獲得演出用アセット

`ceremony-stage.png` と `ceremony-gate.png` は、既存の `ceremony-shrine.png` / `route-sanctuary.png` を参照して、同じ和紙水彩の質感で生成した演出用画像です。コード編集は行っていません。

## 生成方式

- built-in `image_gen` を使用（透過要求を含むため、CLIフォールバックは未使用）
- 参照画像（style references）
  - `ceremony-shrine.png`
  - `route-sanctuary.png`

## 出力

| ファイル | 用途 | 実寸 | 色/アルファ検査 |
| --- | --- | --- | --- |
| `ceremony-stage.png` | 森の境内を横から見た背景。右寄りの社と下部の水平な石畳を用意 | 1536 × 1024 | `Format24bppRgb`、全ピクセル不透明 |
| `ceremony-gate.png` | キャラがくぐる前景の朱赤鳥居 | 1214 × 1295 | `Format32bppArgb`、透明画素 992,449、半透明画素 578,316、完全不透明画素 1,365。透明画素のRGB焼込み 0。中央の門内は alpha 0、足元は canvas 底まで接地 |

## ceremony-stage.png の最終プロンプト

```text
Use case: illustration-story
Asset type: game scene background, project-bound raster asset
Primary request: Create ceremony-stage.png as a wide 1536x1024 2D side-view stage for a Japanese shrine stamp-acquisition ceremony. Use the two supplied local images only as visual references for their soft watercolor-on-washi Japanese illustration texture, gentle edges, layered foliage, and warm natural light.
Scene/backdrop: A bright, welcoming forest shrine grounds viewed from the side, with airy green woodland in the background and a small fictional shrine building positioned around 75% of the canvas width on the right side. The lower part has a clearly readable horizontal stone-paved path running from the far left edge toward the shrine on the right; the path occupies roughly the lower 35% and its walking surface is open, level, and visually simple so small walking characters can be composited over it.
Subject: Environment only. No people, no animals, no mascots, no characters.
Style/medium: Hand-painted Japanese watercolor on textured washi paper; clean 2D game-background readability with painterly brush texture, restrained detail, soft atmospheric perspective.
Composition/framing: Landscape 3:2 framing, strict side-view staging rather than a deep perspective corridor. Small shrine at x≈75%, enough open negative space on the left and center for walking. Keep the path surface unobstructed and horizontally continuous. No foreground object should cover the route.
Lighting/mood: Bright daytime forest light, calm ceremonial warmth, subtle dappled sunlight.
Color palette: Fresh greens, muted cedar browns, warm stone gray, restrained vermilion accents on the shrine, cream and pale gold highlights.
Materials/textures: Visible but delicate washi grain, watercolor blooms, natural stone paving with a few irregular seams, leafy forest layers.
Text (verbatim): ""
Constraints: Exactly one small shrine building on the right at roughly 75% width; horizontal path from left edge to the shrine; bright forest background; no characters; no torii gate; preserve generous clear walking lane; 2D side-on composition; no UI.
Avoid: Any torii gate or gate-like structure, shrine stairway dominating the frame, central frontal shrine composition, mountains as the main subject, cluttered foreground, fences crossing the road, people, animals, text, lettering, logos, watermark, photorealism, 3D rendering, tilted camera.
```

## ceremony-gate.png の最終プロンプト

```text
Use case: background-extraction
Asset type: game foreground overlay, transparent raster asset
Primary request: Create ceremony-gate.png as a single large vermilion-red Japanese torii gate, viewed straight-on from the front, in the same soft watercolor-on-washi Japanese illustration style as the supplied reference images. The asset must be a real transparent-background PNG.
Scene/backdrop: No scene backdrop. Only the torii gate itself is present. Everything outside the gate silhouette and the open space inside the gate is transparent alpha.
Subject: One large classic shrine torii: two vertical red-orange wooden pillars with dark stone footings, a gently curved upper kasagi roof beam, a second horizontal nuki beam, subtle hand-painted wood grain and restrained dark gray roof cap.
Style/medium: Hand-painted Japanese watercolor on textured washi paper; clean 2D game foreground overlay, softly irregular brush edges, warm vermilion with muted charcoal roof accents.
Composition/framing: Front-facing symmetrical gate, centered, nearly fills the canvas with little margin. Gate feet touch the exact bottom edge of the canvas. Keep the opening under the gate completely transparent and unobstructed. Preserve a clean silhouette suitable for layering in front of a background and walking character. No perspective tilt.
Lighting/mood: Gentle even daylight, clear readable silhouette, calm ceremonial warmth.
Color palette: Vermilion red, cinnabar, muted charcoal, small warm wood highlights.
Materials/textures: Delicate washi grain and watercolor blooms only inside the painted gate; slightly uneven hand-painted edges but no colored halo in transparent areas.
Text (verbatim): ""
Constraints: True RGBA alpha transparency; empty transparent canvas around the gate and through the gate opening; exactly one gate; feet flush with canvas bottom; minimal margin; no characters; no shrine building; no scenery; no text; no logo; no watermark.
Avoid: White or cream background, checkerboard painted into the image, opaque rectangle, extra gates, lanterns, shrine buildings, people, animals, mountains, leaves, path, Japanese lettering, decorative symbols, photorealism, 3D rendering.
```
