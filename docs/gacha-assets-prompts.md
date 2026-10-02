# ガチャ演出素材の生成プロンプトと制作記録

生成日: 2026-09-30。作業前の git status で `codex/v3-followups` を確認。
依頼文書 `docs/codex-gacha-assets.md` を全文確認し、Luna Max の3担当で箱2点、光と影3点、紐と背景2点を制作した。生成はビルトイン image_gen を使用。親担当が最終WebPの寸法・容量・アルファを検査し、箱の重ね画像と明暗背景で全素材を目視確認した。

背景のみ依頼文書の例外として不透明。その他6点は透過WebP。全7点400,000 bytes未満。原本PNGはプロジェクトには保存していない。コード変更なし。

## 最終ファイル一覧

|ファイル|寸法|bytes|
|---|---|---:|
|`assets/gacha/box-body.webp`|880×1280|101,380|
|`assets/gacha/box-front.webp`|880×1280|174,438|
|`assets/gacha/box-shadow.webp`|1024×300|23,044|
|`assets/gacha/glow-core.webp`|1024×1024|200,444|
|`assets/gacha/glow-rays.webp`|1024×1024|325,054|
|`assets/gacha/rope.webp`|256×1024|37,168|
|`assets/gacha/stage-bg.webp`|1170×2532|396,876|

確認記録: `docs/gacha-assets-verification/README.md`。

---

## 追加依頼: 漆塗りとアプリロゴ（現在の採用版）

# ガチャ木箱の漆塗り素材

2026-09-30に box-body.webp と box-front.webp を差し替えた記録。共通の箱寸法、透明背景、重ね合わせ確認など、元依頼書 docs/codex-gacha-assets.md の要件は引き続き適用する。変更対象はこの2素材と生成・確認記録のみ。コードと他の素材は変更していない。

## 変更内容

- 木箱を明るい桐色から、深い飴色〜黒褐色の拭き漆風に変更。控えめな艶と細かな木目を残し、汚しや傷は抑えた。
- box-front中央にアプリロゴを配置。ロゴ原本は assets/mobidou-opening-emblem.webp。ImageGenに参照入力として渡して図柄を描画させており、原本の画素を直接貼り付ける方式ではない。鳥居、モビー、輪、巻き雲と元の配色を保つよう指示した。
- ImageGen出力は各素材を880×1280に正規化。アルファ値1より大きい範囲を切り出し、780×1130にリサイズして、透明な880×1280キャンバスの座標(50,75)へ配置した。形式変換はRGBA WebP quality 90、method 6、alpha_quality 100。
- box-frontをbox-bodyに重ねた確認画像を制作担当が docs/gacha-assets-verification/box-overlay-review.webp に保存。親担当が box-closed.webp と box-parts-review.webp および明暗背景の all-assets-review.webp を再生成し、隙間なく閉じた箱に見えることを目視確認した。

## 生成元

- box-bodyの編集対象: assets/gacha/box-body.webp（差し替え前）
- box-frontの編集対象: assets/gacha/box-front.webp（差し替え前）
- ロゴ参照画像: assets/mobidou-opening-emblem.webp
- 使用ツール: 組み込みImageGen。透明背景を指定。
- body最終候補: C:\Users\User\.codex\generated_images\01a0f24d-89b1-78e1-871d-75a6e8d68fb3\exec-ac07b153-76c6-46b1-a349-537f3bb4e9ba.png
- front最終候補: C:\Users\User\.codex\generated_images\01a0f24d-89b1-78e1-871d-75a6e8d68fb3\exec-43ce8d13-93b1-405c-a65d-60872afdb3bf.png

## ImageGenへ送ったプロンプト

以下は実際の指示文。frontの後半2回はロゴサイズの調整で、最後の出力を採用した。

### box-body.webp

~~~text
Use case: precise-object-edit
Asset type: transparent layered mobile-game gacha animation asset, box-body.webp
Input images: Image 1 is the edit target. Preserve its exact front-facing portrait box silhouette, alignment, proportions, transparent canvas, and visible bounds; change only the material and finish.
Primary request: transform this open-front Japanese wooden box body into an old-fashioned lacquered box body. Keep the open cavity and all structural geometry from Image 1.
Subject: an empty, front-facing tall rectangular box body, open at the front, viewed perfectly straight-on. The narrow top, left, right, and bottom rails frame a deep empty cavity. Match the source proportions and outer silhouette exactly so a separate matching full-face sliding panel can cover it.
Style/medium: refined Japanese traditional product illustration, believable hand-applied fuki-urushi lacquer on aged wood, restrained natural wood grain beneath lacquer, crafted antique household object.
Composition/framing: isolated object centered on a fully transparent alpha canvas. Keep the same complete object silhouette and placement as Image 1, with 880x1280 portrait proportions. Rails remain slender: about 5% of canvas width at sides and 3.5% of canvas height at top and bottom. No camera angle or perspective.
Lighting/mood: gentle warm studio illumination with soft, narrow lacquer highlights only on the object surface. The cavity remains dark, near-uniform black-brown. No cast shadow or glow outside the object.
Color palette: deep amber-brown to near-black brown urushi, understated muted warm highlights. The open cavity is dark solid brown-black.
Materials/textures: smooth aged wiped lacquer with a quiet satin gloss, subtle fine grain, modest age and hand-crafted variation. Keep it dignified and clean, without excessive dirt, cracks, chips, ornament, or distressing.
Text (verbatim): none.
Constraints: preserve the original box geometry and alignment; open cavity has no front panel; no objects inside; transparent alpha outside the box; no shadow beyond the object; no other assets.
Avoid: light paulownia color, pale wood, red/black random decoration, gold ornament, crest, logo, marks, lettering, symbols, checkerboard, background, backdrop, floor, frame, border around the canvas, perspective, extra panels, handles, prominent damage, grime, smoke, glow, watermark.
~~~

### box-front.webp: 初回の漆塗りとロゴ配置

~~~text
Use case: compositing
Asset type: transparent layered mobile-game gacha animation asset, box-front.webp
Input images: Image 1 is the edit target: preserve its complete front panel silhouette, rounded corners, straight-on alignment, size, and transparent canvas. Image 2 is the exact official Mobidou app emblem, provided as the logo insert reference. Reproduce Image 2 faithfully; do not invent a substitute logo.
Primary request: transform the light wood sliding front panel into a refined antique Japanese fuki-urushi lacquer panel, then place the exact app emblem from Image 2 at the center of the full panel.
Subject: one tall rectangular one-piece sliding panel that completely covers the front of the box. The original top-center finger notch and small understated vermilion braided grip detail may remain at the top edge. The old small circular crest on the source panel must be replaced by the supplied app emblem.
Style/medium: a dignified old Japanese crafted object with hand-applied wiped lacquer, subtly aged wood beneath lacquer, restrained natural wood grain, fine satin-gloss reflections. The emblem should look like a carefully applied traditional inlay or finish on the lacquer, while preserving the exact source artwork and colors.
Composition/framing: perfectly front-facing, centered, portrait 880x1280 transparent alpha canvas. Match Image 1's outer shape and visible bounds exactly, approximately x=50..830 and y=75..1205 within its canvas. The board occupies the same full area as the separate box body. Center the logo precisely on the board's geometric center (canvas center x=440,y=640). Scale the logo artwork to about 30% of the visible panel width (approximately 234 px wide within the 780 px board). Keep enough detail to recognize the original torii, Mobidou character, circular ring, and cloud-scroll motifs.
Lighting/mood: gentle warm studio illumination, restrained narrow reflected highlights on lacquer only; no cast shadow or glow outside the board.
Color palette: deep amber brown through near-black brown lacquer; app emblem keeps its original vermilion red, near-black, and warm antique ivory/gold colors from Image 2.
Materials/textures: smooth, quiet-gloss wiped lacquer with subtle fine grain, modest wear and handmade character. Clean and dignified, without excessive grime or distress.
Text (verbatim): none. The app emblem is a pictorial logo, not text.
Constraints: change only the material finish and central emblem on Image 1; maintain its one-piece full-face sliding panel geometry, outer bounds, top grip/notch, and transparent alpha outside the panel. Use Image 2 as the exact logo insert. Keep logo geometry, color relationships, torii, character face, ring and cloud motifs faithful and intact. No other marks.
Avoid: generic crest, kamon, replacement symbol, simplified logo, altered character face, changed torii, altered rings or clouds, extra ornament, words, lettering, watermark, light paulownia wood, pale wood, checkerboard, opaque backdrop, background, floor, cast shadow, perspective, multiple boards, extra handles, excessive scratches, chips, dirt, or cracks.
~~~

### box-front.webp: ロゴ縮小の調整1

~~~text
Use case: precise-object-edit
Asset type: transparent layered mobile-game gacha animation asset, box-front.webp
Input images: Image 1 is the current complete front panel and is the edit target. Image 2 is the exact official app emblem reference. Preserve every part of Image 1 unchanged except the size of the central emblem.
Primary request: reduce the existing central app emblem to approximately 30% of the visible board width, then center it precisely on the board. It is currently too large, roughly half the board width. Keep it recognizable and faithful to Image 2.
Subject: the same single dark antique Japanese lacquer sliding board from Image 1, with the same shape, wood grain, finish, highlights, finger notch and top braided grip.
Composition/framing: retain the exact panel, canvas, alignment and transparent background from Image 1. The emblem must be centered at the board's geometric center and occupy about 30% of its width, leaving clear lacquer visible around it. Preserve full emblem aspect ratio, do not crop it. Use Image 2 as the source for the emblem; keep its torii, Mobidou character, ring, cloud-scroll motifs, and original red, near-black, and antique-ivory/gold colors intact.
Lighting/mood: unchanged quiet lacquer reflection.
Materials/textures: unchanged fuki-urushi wood and tasteful applied emblem.
Text (verbatim): none.
Constraints: only change emblem scale and any tiny placement adjustment needed to put its center exactly at the center of the board. Do not alter the logo design or color. Do not change the board, grain, highlights, notch, handle, alpha, geometry or silhouette.
Avoid: large emblem, emblem wider than 35% of the board, off-center mark, generic crest, altered or simplified logo, extra ornament, lettering, watermark, background, checkerboard, cast shadow.
~~~

### box-front.webp: ロゴ縮小の調整2（採用出力）

~~~text
Use case: precise-object-edit
Asset type: transparent layered mobile-game gacha animation asset, box-front.webp
Input images: Image 1 is the complete current front panel edit target. Image 2 is the exact official app emblem reference.
Primary request: keep Image 1 unchanged except reduce the central app emblem to a clearly modest small size, exactly about one quarter of the visible panel width (25%, roughly 220 px on the 880px canvas; under 30%). The current emblem is still too large at about 40% of panel width; reduce it to about two-thirds of its current size. Center it precisely on the board.
Subject: same single antique dark brown Japanese fuki-urushi sliding panel with subtle grain, quiet gloss, and top-center notch with small vermilion braided grip.
Composition/framing: preserve the current front panel image, silhouette, position, panel texture, highlights, transparent canvas and top grip. Keep the emblem centered on the geometric center of the board. The full emblem must fit, keep its original square aspect ratio and full edge motifs, and leave generous visible lacquer around it.
Logo fidelity: use the exact artwork in Image 2 as the logo source. Retain its recognizable torii gate, Mobidou character face, circular rings, cloud-scroll ornament, and original vermilion, near-black and antique ivory/gold colors. Do not reinterpret or simplify it.
Text (verbatim): none.
Constraints: only change emblem size and any tiny placement adjustment required for precise centering. The logo artwork should occupy 25% of visible board width, no more than 30%. Maintain actual transparency outside the panel.
Avoid: emblem wider than 30% of board, off-center emblem, generic crest, redesign, extra marks, words, watermark, checkerboard, opaque background, cast shadow, any changes to the board, grain, color, highlights, shape, alpha, notch or grip.
~~~

## 最終確認

親担当の検査で箱2点は880×1280、RGBA、四隅alpha=0、外接矩形(50,75,830,1205)で一致。body 101,380 bytes、front 174,438 bytes。箱以外5点と元ロゴのSHA256は変更前と一致。ユーザー追加指定の漆仕上げ・中央ロゴが初回の桐色・丸い朱紋に優先する。

---

# 初回の箱2点の生成記録（旧版・履歴）

この記録は `box-body.webp` と `box-front.webp` の生成履歴・元画像・後処理をまとめたものです。採用・不採用を含む実際の生成プロンプトを以下に記録します。

## 共通の生成・参照情報

- 生成ツール: Codex built-in `image_gen` (`image_gen__imagegen`)、全呼び出しで `transparent_background: true`。CLIは使用していません。
- 作風確認で開いた既存画像: `assets/ui-round3/collection/collection-wood-pillar-bold-v1.webp` と `assets/ui-round3/collection/collection-goshuin-stand-v1.webp`。どちらも暖色の木肌と立体感の確認に使いました。
- 初回のbody生成2回は画像入力を渡さず、プロンプトに文章で作風を記述しました。front初回以降は、会話上の直近生成画像を `num_last_images_to_include` で参照しました。
- 保存先: `C:\Users\User\.codex\generated_images\01a0f239-f923-7393-8663-d72d63858585\`。

## 試行履歴

### 1. box-body 初回生成（未採用）

- 出力: `exec-ec06379c-a254-43a4-b868-d8479b26d7ee.png`（1039×1513、1,464,288 B）
- 画像入力: なし
- 同じプロンプトでもう一度生成し、次の試行として目視確認しました。

```text
Use case: product-mockup
Asset type: one transparent animation layer for a Japanese mobile game's gacha box; final canvas 880 × 1280 px, portrait ratio 11:16.
Scene/backdrop: genuinely transparent alpha background, with no ground, no cast shadow, and no backdrop.
Subject: a single empty open-front box body, shown perfectly straight-on from the front in orthographic view. Its outer silhouette is a tall, nearly rectangular pale kiri-wood box, softly rounded by tiny hand-finished bevels. The opening is a dark, quiet, nearly uniform warm-brown interior cavity, with no contents and no light. Show only the thin inner side walls and back/bottom of the cavity.
Style/medium: refined softly painterly 3D game prop, matching the hand-rendered wood grain and warm natural material in the provided reference image of the existing Mobidou collection goshuin stand; retain the app's subdued Japanese washi-and-wood world.
Composition/framing: The full box is centered, upright, front-facing, without perspective or rotation. Keep its silhouette inside the canvas with small transparent margins so all four canvas corners remain fully transparent. Reserve consistent exact geometry for a matching separate cover layer: outer box rectangle x≈7.5%..92.5%, y≈5%..95% of canvas. Within it, the opening begins about 5% of outer width from each side and 3.5% of outer height from top and bottom, making slim even pale-wood rails. Clearly show the dark recess behind those rails. Straight horizontal top/bottom and vertical sides.
Materials/textures: warm light kiri wood, honey-beige and pale straw tones, subtle vertical grain, gentle age and fine hand-made surface variation without dirt, knots, ornament, metal, fittings, writing, or symbols. The inside is much darker than the pale frame, a uniform deep warm umber with minimal texture.
Lighting/mood: soft diffuse upper-left natural light reveals the wood material very gently; no dramatic highlights; no shadow cast beyond the box.
Text (verbatim): none.
Constraints: exact alpha transparency; no shadow anywhere; no text, symbols, logos, watermark, checkerboard, background color, extra objects, front panel, lid, contents, glow, or rays. The object is not a box illustration printed on paper and must not include an image background.
```

### 2. box-body 初回の再生成（未採用）

- 出力: `exec-c851555d-e304-4770-aa03-217e74cfcb3c.png`（1040×1513、1,559,027 B）
- 画像入力: なし
- プロンプトは試行1と同一。目視で側壁と上下枠が想定より太く、内側の開口が狭いと判断しました。

### 3. box-front 初回生成（未採用）

- 出力: `exec-70899628-dde5-44cb-bd8a-50902cdb1e30.png`（1040×1512、1,788,356 B）
- 画像入力: `num_last_images_to_include: 1`。直前のbody初回再生成を、外形・位置・素材の参照に指定しました。
- frontは全体を覆う一枚板、上端中央の小さな握り、中央の小さな朱の円形意匠を作る指示です。この候補はbodyの修正後に作り直したため未採用です。

```text
Use case: product-mockup
Asset type: matching transparent animation overlay layer for a Japanese mobile game's gacha box; final canvas 880 × 1280 px, portrait ratio 11:16.
Input images: Image 1 is the generated transparent box-body layer. Use it strictly as a geometry and material reference: match the box's outer silhouette, corner radius, precise placement, scale, frontal orthographic view, light kiri color, fine wood grain, and softly painterly rendering exactly. This new image is the separate closed front panel that will cover the body.
Scene/backdrop: genuinely transparent alpha background; no ground or cast shadow.
Subject: one single solid full-size front board for the box, straight-on and upright. It covers the complete front face of the reference box, from the same outermost left/right/top/bottom edges, with the same softly rounded corners. This is a removable sliding cover layer, not an open box, not a door standing ajar, and not several planks. The whole face is one continuous pale kiri-wood board with subtle vertical grain and discreet hand-finished beveled border.
Composition/framing: match Image 1's exact canvas, outer bounds, scale, centering, and silhouette so the two layers register edge-to-edge when overlaid. Keep all four canvas corners fully transparent. No perspective or rotation. Near the very top center, within the panel's existing silhouette and without extending the outer contour, add a small, shallow finger grip: a modest centered thumb notch with a tiny muted vermilion cord/pull inset, easy to catch but occupying only about 7% of panel width. Put one small vermilion circular maker's seal at the exact center of the board, about 7% of panel width; it is a simple non-lettered ring-and-dot / abstract round crest, understated and fully contained within the board. These are the only ornaments.
Style/medium: refined softly painterly 3D game prop matching Image 1 and the existing Mobidou collection prop reference; warm Japanese handmade woodwork with calm natural material detail.
Materials/textures: warm light kiri wood, honey-beige and pale straw tones, gentle age without dirt; subtle vertical grain, matched to Image 1. Narrow darker edge around the board for thickness, no metal.
Lighting/mood: soft diffuse upper-left natural light, low contrast and matched to Image 1; no external shadow.
Text (verbatim): none.
Constraints: fully transparent background; no text, glyphs, characters, logo, watermark, checkerboard, backdrop, shadow, glow, rays, box body visible around or behind the panel, split boards, hinges, latch, or extra objects. Keep the exact outer shape and placement from Image 1; the pull and seal remain inside its silhouette.
```

### 4. box-body 内枠の修正生成（未採用）

- 出力: `exec-6b1c9d68-2b26-45bb-b93b-33da5864f856.png`（1040×1512、1,393,970 B）
- 画像入力: `num_last_images_to_include: 2`。Image 1をbody初回、Image 2をfront初回として、外形・素材の参照に指定しました。
- 内側の開口を広げ、左右のレール各約5%、上下各約3.5%にする限定修正です。枠がまだ重く見えたため、寸法を具体化した新規生成に進みました。

```text
Use case: product-mockup
Asset type: transparent animation layer edit for the Mobidou Japanese mobile game's gacha box.
Input images: Image 1 is the box-body layer and is the edit target. Image 2 is the separate box-front layer, used only as a reference for the shared outer silhouette, placement, corner radius, pale kiri tone, and fine painterly wood grain.
Primary request: make a corrected box-body layer from Image 1. Preserve its outer box silhouette and placement exactly. Change only the thickness of the inner frame and cavity opening: the left and right pale-wood rails must each be about 5% of the outer box width, so the opening spans about 90% of the outer width; the top and bottom rails must each be about 3.5% of the outer box height. The dark warm-brown cavity should therefore be substantially wider than in Image 1, with slim even rails.
Style/medium: refined softly painterly 3D game prop, unchanged from Image 1 and matched to Image 2.
Composition/framing: same canvas and same outer edge coordinates as Image 1; centered, upright, perfect front orthographic view. Do not move, resize, rotate, or reshape the outer contour. Keep all four canvas corners transparent.
Materials/textures: retain the same warm light kiri wood, subtle grain, gentle upper-left natural light, rounded hand-finished bevels, and deep nearly uniform dark umber cavity. Preserve the current realistic interior depth shading, but keep it within the newly wider cavity.
Constraints: edit only the inner opening/frame proportions. Keep the same transparent canvas and exact outer silhouette/placement, no cast shadow or glow. No front panel, contents, text, marks, checkerboard, backdrop, or external objects.
```

### 5. box-body 最終候補（採用）

- 出力: `exec-cdd803b4-d792-4eaa-be16-284577fcce9e.png`（1040×1512、1,165,591 B）
- 画像入力: `num_last_images_to_include: 1`。直前のbody内枠修正候補を素材・画風の参照に指定しました。
- 開口を広くし、縦横比と枠幅を具体的な数値で説明したプロンプトで新規生成しました。これを `box-body.webp` の元画像に選びました。

```text
Use case: product-mockup
Asset type: separate transparent animation layer for a Japanese mobile game's gacha box.
Input images: Image 1 is a visual reference for Mobidou's warm pale kiri wood material and painterly 3D finish. Create a new box-body prop that will be paired with a separate front-board layer.
Primary request: A single empty open-front box body, viewed perfectly straight-on, with a deep dark warm-brown cavity. The box's exterior is tall and narrow, approximately 1:1.45 width-to-height. The pale wood frame must be truly thin: each left and right rail is exactly about 5% of the outer box width, and the top and bottom rails are about 3.5% of outer height. The cavity opening must look wide and tall, filling about 90% of the box width and 93% of its height. At an 880×1280 final canvas, imagine the exterior bounds x=50..830 and y=75..1205; the cavity opening is approximately x=89..791 and y=115..1165. These are proportions relative to the box itself. Do not make a thick picture-frame bezel.
Style/medium: refined softly painterly 3D game prop with hand-rendered wood grain, matching Image 1's warm natural material and subdued Japanese washi-and-wood world.
Composition/framing: centered, upright, orthographic frontal view, no perspective or rotation. One simple box body with a single rectangular cavity. Make the pale frame rails visibly narrow and even around the opening. Keep the outer shape inside the canvas with small transparent margins, and keep all four canvas corners completely transparent.
Materials/textures: warm light kiri wood, pale straw and honey beige, subtle fine grain and gentle age without dirt. Inside is a nearly uniform deep warm umber, significantly darker than the frame; show a little natural recess depth only at the inner lip.
Lighting/mood: gentle diffuse upper-left natural light. No cast shadow beyond the actual box.
Text (verbatim): none.
Constraints: genuine transparent alpha background. No front panel or lid, contents, glow, rays, text, symbols, logos, watermark, checkerboard, ground, backdrop, or extra objects. Keep side rails near 5% of outer width and top/bottom near 3.5% of outer height; a wider opening is essential.
```

### 6. box-front 最終候補（採用）

- 出力: `exec-4a6ce526-4d4d-4efe-a177-40781a69b608.png`（1040×1512、1,407,889 B）
- 画像入力: `num_last_images_to_include: 1`。採用したbody最終候補を外形・素材・画風参照に指定しました。
- この画像を `box-front.webp` の元画像に選びました。

```text
Use case: product-mockup
Asset type: transparent removable front-board animation layer for a Japanese mobile game's gacha box.
Input images: Image 1 is the final box-body layer. Match its pale kiri wood, subtle grain, frontal view, corner radius, lighting, and outer silhouette precisely. This image must be a separate board placed over that body to make one closed box.
Primary request: Create one single-piece box front panel covering the entire body from edge to edge. The final front board is solid wood across the whole box face, no visible cavity behind it. The board is a tall rounded rectangle with the exact same outer contour and placement as Image 1. Add only a small, shallow finger grip at the very top center, with a tiny muted vermilion cord detail seated inside it, plus one small muted vermilion round maker's seal centered on the panel. The seal is a simple abstract circular crest, no letter or glyph.
Composition/framing: preserve Image 1's outer width, height, position, and softly rounded corners exactly. Straight-on orthographic view, no perspective or rotation. Keep all outer canvas corners transparent. The grip and seal are entirely inside the existing outer silhouette and remain visually small.
Style/medium: refined softly painterly 3D game prop matching Image 1, consistent with the app's existing warm wood assets.
Materials/textures: pale honey-beige kiri, gentle fine vertical grain and understated hand-finished bevels; warm natural wood with modest age, no dirt. Same tone and surface character as Image 1. The center seal is painted muted vermilion, around #A54E42, with a slightly irregular hand-stamped edge.
Lighting/mood: diffuse soft upper-left natural light matched to Image 1; no cast shadow outside the object.
Text (verbatim): none.
Constraints: genuine transparent alpha. The front is one full-size sliding panel, not an open box, not multiple planks. Exact outer shape and placement must register with Image 1; do not protrude. No checkerboard, background, shadow, cavity, contents, hinge, latch, extra decorations, text, symbols, logo, or watermark.
```

## 採用画像の正規化と確認

- `box-body.webp`: `exec-cdd803b4-d792-4eaa-be16-284577fcce9e.png` を使用。アルファ値16以上の外接bbox `(92, 73, 949, 1413)` を基準に透明余白をcrop。
- `box-front.webp`: `exec-4a6ce526-4d4d-4efe-a177-40781a69b608.png` を使用。アルファ値16以上の外接bbox `(91, 70, 950, 1416)` を基準に透明余白をcrop。
- 両方ともRGBAのままLanczosで `780×1130` にリサイズし、`880×1280` の完全透明キャンバス上の `(50, 75)` に配置。WebP quality 90、method 6、alpha_quality 100、exact trueで保存。
- 最終の両画像でalpha値16以上のbboxは `(50, 75, 830, 1205)`。四隅のalpha値はすべて0。`box-body.webp` は58,744 B、`box-front.webp` は62,440 B。
- 目視用の合成画像を `C:\Users\User\AppData\Local\Temp\gacha-boxes-closed-preview.png` に一時作成。前板が箱本体全体を覆い、輪郭に見える隙間やずれがないことを確認。


---

# ガチャ演出エフェクト素材の生成記録

作業ブランチ: codex/v3-followups  
生成方法: Codex 組み込み ImageGen（各素材を個別生成、透明背景を指定）。コード変更・コミットは行っていない。

## 採用した素材

| 素材 | 生成元 | 最終寸法 | 最終サイズ | WebP品質 |
|---|---|---:|---:|---:|
| assets/gacha/box-shadow.webp | exec-9dd1adc1-176f-4e88-b092-298c7fd2b6ed.png | 1024×300 | 23,044 bytes | 90 |
| assets/gacha/glow-core.webp | exec-507a2ac6-1e1d-47a4-9f33-0081d51b8bbb.png | 1024×1024 | 200,444 bytes | 90 |
| assets/gacha/glow-rays.webp | exec-da704deb-3e3b-4aa6-8e8f-a8b45378db38.png | 1024×1024 | 325,054 bytes | 78 |

Pillowで行った後処理は、寸法変更、透明キャンバスへの配置、WebP形式への変換と圧縮のみ。画像のアルファ形状は描き直していない。影は元画像を900×300に縮小して1024×300の透明キャンバス中央へ配置。光芯と光筋は元画像を900×900に縮小し、1024×1024の透明キャンバス中央へ配置した。これにより外周に透明余白を残した。

最終WebPを再度開いて確認し、3点とも指定寸法、アルファ付き、四隅と四辺の非透明ピクセル数0、400,000 bytes未満。チェック柄はアルファ確認用の一時プレビューにのみ使い、素材へは焼き込んでいない。影単体、光芯単体、光筋単体、および光芯と光筋を重ねた画像を目視確認した。

## box-shadow.webp の最終採用プロンプト

~~~text
Use case: stylized-concept
Asset type: transparent 2D game effect texture for the Japanese app Mobidou's gacha reveal animation
Primary request: Make one soft ground shadow to sit beneath the reveal box.
Style/medium: subtle hand-painted sumi wash texture, quiet low-saturation watercolor shading consistent with Mobidou's existing Japanese paper-and-ink illustrations.
Composition/framing: an extra-wide, low horizontal oval in a 1024x300 landscape canvas, centered both horizontally and vertically. Warm charcoal-brown is gently darkest in the middle and becomes progressively lighter, softer, and more transparent outward. The oval stays within the middle 60 percent of the canvas height and middle 78 percent of its width, fading fully away into transparency before every canvas edge. Smooth soft feathering; no visible hard contour.
Color palette: muted warm ink-brown.
Constraints: genuine alpha transparency; all four corners and the full perimeter alpha 0; no opaque backdrop, no white/black fringe, no checkerboard or baked checker pattern.
Avoid: box, floor, object, perspective, text, symbols, logo, watermark, sparks, light rays, glow, border, vignette.
~~~

## glow-core.webp の最終採用プロンプト

~~~text
Use case: stylized-concept
Asset type: transparent 2D game effect texture for the Japanese app Mobidou's gacha reveal animation
Primary request: Create a soft central reveal light that can be composited over a wooden box interior.
Style/medium: Japanese watercolor and delicate gold leaf wash, restrained hand-painted texture matching the existing Mobidou UI art.
Composition/framing: a soft circular radial glow centered in a 1024x1024 square; luminous white core blending gently into pale warm gold, with translucent watercolor softness. The glow should fade smoothly to true full transparency well before every canvas edge and corner. Keep it broad and cloudlike, with no distinct rays or streaks.
Lighting/mood: warm, gentle mystical reveal, soft and diffuse.
Color palette: white, pale champagne gold, very subtle warm ivory.
Constraints: genuinely transparent alpha background; alpha 0 at all canvas edges and all four corners; naturally feather the light to full transparency; no hard disc edge, no white fringe, no opaque background; no checkerboard and no baked-in checker pattern.
Avoid: objects, box, floor, characters, text, symbols, logo, watermark, stars, sparks, sharp rays, border, vignette.
~~~

## glow-rays.webp の最終採用プロンプト

~~~text
Use case: stylized-concept
Asset type: transparent 2D game effect texture for the Japanese app Mobidou's gacha reveal animation
Primary request: Create a rotating radial burst of delicate golden light rays for a wooden box reveal.
Style/medium: hand-painted Japanese watercolor with understated gold-leaf brushwork, matching the existing Mobidou paper-and-ink art; elegant and organic, not digital sci-fi.
Composition/framing: a balanced radial arrangement of fine, tapered golden streaks radiating from the exact center of a 1024x1024 square. Mix a few long soft brushlike rays with many faint short ones, varying widths and gently irregular edges; keep the center mostly open and transparent so it layers over a separate glow core. Rays fade softly toward their ends and to full transparency before the canvas perimeter. Symmetrical overall but naturally hand-painted.
Color palette: subdued pale champagne gold and warm muted ochre, varying translucency.
Constraints: genuine alpha transparency, alpha 0 at all four corners and full canvas edges; no hard circular disc; no opaque backdrop, no fringe, no checkerboard or baked checker pattern; no text or symbols.
Avoid: objects, box, floor, characters, text, logo, watermark, stars, sparkles, glitter dots, sharp geometric polygon rays, lens flare, border, vignette.
~~~

## 未採用プロンプトと試行

box-shadowの初回生成案は横長の影を求める別プロンプトで生成したが、最終採用せず、改めて上記の採用プロンプトで生成した。

~~~text
Use case: stylized-concept
Asset type: transparent 2D game effect texture for the Japanese app Mobidou's gacha reveal animation
Primary request: Create a soft horizontal ground shadow that sits beneath a tall wooden box.
Style/medium: subtle Japanese watercolor and sumi-e wash texture, matching the existing Mobidou UI art; softly painted, restrained and natural.
Composition/framing: wide horizontal ellipse centered precisely in a 1024x300 canvas; darkest soft charcoal-brown concentration at the center, smoothly and naturally fading in every direction to true full transparency well before all four canvas corners. Keep the effect low and flat, with no perspective or visible object.
Color palette: muted warm ink-brown, low saturation.
Constraints: genuinely transparent alpha background; alpha must be 0 at the canvas perimeter and all four corners; feather the shadow naturally to alpha 0 at the edges; no hard outline; no white fringe; no opaque background; no checkerboard; no baked-in checker pattern.
Avoid: box, object, floor, text, symbols, logo, watermark, sparks, glow, border, vignette, shadow outside the central soft horizontal oval.
~~~

glow-coreの初回生成物の外周を整えるため、ImageGenの限定編集も試した。編集出力 exec-6eb91ac3-bb70-4b29-915c-45f68ed49262.png は最終素材に使わず、最終採用素材は上記の初回生成物 exec-507a2ac6-1e1d-47a4-9f33-0081d51b8bbb.png。編集プロンプトは次のとおり。

~~~text
Use case: precise-object-edit
Asset type: transparent 2D game effect texture for Mobidou's gacha animation
Primary request: Clean only the outside transparency of the supplied watercolor glow-core image.
Input images: Image 1: edit target; preserve the existing pale gold radial watercolor glow as closely as possible.
Scene/backdrop: transparent.
Subject: the supplied soft white-to-champagne-gold central radial glow.
Style/medium: preserve the gentle hand-painted Japanese watercolor wash and existing colors.
Composition/framing: retain the same centered circular glow and overall scale. Preserve the artwork inside the outer feathered edge. Make its alpha taper smoothly to exactly zero before the canvas perimeter, leaving a visibly clear transparent margin of roughly 4% on each square canvas side; all four corners and every outer edge pixel must be fully transparent.
Constraints: Change only the outer alpha falloff and remove stray edge flecks/fringing. Keep the center and watercolor texture unchanged. Genuine alpha transparency, no opaque fill.
Avoid: checkerboard, any baked background, bright fringe, colored outline, new objects, rays, text, symbols, logo, watermark, border, hard circular cutoff.
~~~


---

# ガチャ素材 制作記録（rope / stage-bg）

生成日: 2026-09-30

組み込み用の画像はビルトイン image_gen で1点ずつ生成した。参照画像は描線・和紙・木の質感を合わせるためだけに使用した。

参照画像:
- assets/ui-round3/pilgrimage/ceremony-stage.webp
- assets/ui-round3/backgrounds/mobidou-goshuin-book-background-v3.webp

## rope.webp

- 保存先: assets/gacha/rope.webp
- 寸法: 256×1024
- ファイルサイズ: 37,168 bytes
- WebP: quality 90、method 6、alpha quality 100
- 生成元: C:/Users/User/.codex/generated_images/01a0f23a-80a9-70b0-850e-90ccc43a1b9e/exec-4ac32e0b-22b1-4db7-9540-b648b6589cd1.png（797×1974）
- 縦全体を保ち、中央の幅494pxを切り出して256×1024へ縮小した。
- 四隅のアルファはすべて0。紐は上端から続き、下の結び玉と房まで画面内に入っている。影・背景・市松模様は見当たらない。

プロンプト:
> Use case: stylized-concept
> Asset type: production game UI animation sprite, rope.webp, final canvas 256x1024 portrait
> Input images: Image 1 and Image 2 are visual style references only; match their handmade Japanese watercolor and ink-wash finish, warm natural wood and restrained vermilion; do not copy their scene contents.
> Scene/backdrop: genuinely transparent alpha background.
> Subject: one single vermilion pull-cord hanging vertically. Its narrow braided cord enters from above and visibly continues beyond the top edge. At the lower end, form a compact, clear knot ball and a short neat tassel with several fine hanging strands, all fully within the bottom edge. Vermilion close to #A54E42.
> Style/medium: refined hand-painted Japanese washi, watercolor and sumi detail consistent with the references; tactile braided silk cord with subtle fibers, restrained pigment variation.
> Composition/framing: very tall narrow 1:4 canvas. Keep the cord centered on the vertical axis and slim, with generous fully transparent side margins; the cord reaches the top edge; knot and tassel sit near the bottom. Clean isolated game asset, readable at small mobile scale.
> Lighting/mood: soft natural upper-left light, gentle pigment highlights only on the cord itself.
> Color palette: muted vermilion #A54E42 with small warm red variations.
> Materials/textures: braided silk thread, small rounded tied knot, soft thread tassel.
> Constraints: true transparency in every pixel outside the cord; all four canvas corners alpha 0; no shadows or glow; no background, no checkerboard; no letters, numerals, logos, symbols or watermark.
> Avoid: ropes coiled or looped, extra knots, background scene, any cast shadow, cut-off tassel, broad ribbon, bright scarlet, photoreal studio backdrop.

## stage-bg.webp

- 保存先: assets/gacha/stage-bg.webp
- 寸法: 1170×2532
- ファイルサイズ: 396,876 bytes
- WebP: quality 76、method 6
- 生成元: C:/Users/User/.codex/generated_images/01a0f23a-80a9-70b0-850e-90ccc43a1b9e/exec-704ba4c9-abd1-41e0-883b-5a90546e6daa.png（853×1844）
- 全画面を保って指定寸法へリサイズした。依頼にある背景の例外として、背景全体を不透明にしている。書き出し前にRGBAへ変換したが、WebPエンコーダーは全画素が不透明なため冗長なアルファチャンネルを省略した。WebPをRGBAとして読むとアルファは全画素255。
- 中央下の床は広く空き、上部中央にも紐を垂らす余白がある。障子、板張りの床、遠くの灯りを目視確認した。文字・人物・床上の小物・市松模様は見当たらない。

プロンプト:
> Use case: stylized-concept
> Asset type: full-screen mobile game UI background, stage-bg.webp, final portrait canvas 1170x2532
> Input images: Image 1 and Image 2 are visual style references only: match their delicate handmade Japanese watercolor, soft ink wash, layered natural wood grain and washi texture. Do not copy their objects or composition.
> Scene/backdrop: a quiet Japanese wooden engawa veranda just before dawn, seen from inside looking toward the dim courtyard and far hills.
> Subject: broad aged-but-clean plank floor extending from the foreground through the central and lower part of the image; simple shoji panels and dark timber framing along the side; faint cool pre-dawn blue beyond the veranda, with only a few tiny warm distant lantern lights. The central-lower floor must remain wide, open, level, and empty so a tall wooden box can sit there. Leave a quiet open vertical lane at the upper center for a cord to hang down from offscreen; do not draw the cord itself.
> Style/medium: carefully finished two-dimensional Japanese washi watercolor with restrained sumi wash, matching the tactile soft-edged brushwork and natural-material detail of the reference images. Illustration background for a polished mobile app.
> Composition/framing: extremely tall portrait mobile background, approximately 1:2.16 aspect ratio. View straight down the length of the veranda with gently receding floorboard perspective. Keep the floor clear across the full width from just below center to near the bottom. Keep the upper center visually calm and uncluttered for the pull cord; frame the scene with shoji and timber at the sides. No central object.
> Lighting/mood: quiet blue hour before sunrise, a very faint cool sky glow at the far opening and tiny soft amber lanterns in the distance; low contrast, calm, inviting. No dramatic beams or deep black shadows.
> Color palette: muted indigo-blue dawn, warm charcoal-brown timber, aged pale shoji paper, restrained amber light; subdued natural colors.
> Materials/textures: hand-brushed wood grain, finely textured washi panels, soft layered watercolor edges, subtle plank seams.
> Constraints: full-bleed opaque scene, exported as RGBA. The scene itself remains fully opaque. No text, letters, numbers, logos, symbols, people, characters, furniture, objects on the floor, gacha box, rope, checkerboard, watermark or artificial UI.
> Avoid: bright daytime, sunset orange, cluttered floor, central focal object, ornate shrine props, strong perspective distortion, photorealism, heavy contrast, decorative border.


---

# 運び屋モビー・荷車素材（2026-10-01）

ブランチ: codex/gacha-cart-assets。ワークツリー: D:/mobby/mobidou-cart。ImageGenは Codex built-in image_gen を使用し、透明背景を指定した。採用したC-1元画像は exec-4c7a4763-2673-49f8-9ed0-8fb1b5fb3808.png（2172×724）、C-2は exec-875c7da5-3302-4a66-9c58-ab37e8c00459.png（2172×724）。参照は assets/mobies/mobibou.webp、漆塗りの箱2点、engawa背景、採用C-1シート。

## C-1 / C-2 の後処理

各生成セル543×362を、1pxの透明区切りを含む3075×1025シートへ正規化した。セル内の絵を706×471へ縮小し、横中央（x=31）へ配置。アルファ値32以上の最下端が接地線 y=464 になるよう縦位置を合わせた。C-2の1コマ目には正規化前のC-1の1コマ目をコピーした。C-2で見つかった少数の孤立した微小エッジ片は連結成分を見て除き、主絵は保持した。RGBA WebP quality 90、method 6、alpha_quality 100で書き出した。最終シートは617,256 bytesと507,988 bytes。PNG原本はリポジトリへ含めていない。

C-1の別ポーズ修正版 exec-711b9220-d987-4109-b186-b1c448f4c038.png も確認したが、歩行差の改善が小さく赤い色縁が強かったため採用しなかった。

## C-1 採用プロンプト

~~~text
Use case: production mobile game animation sprite sheet.
Asset type: transparent 8-frame side-view carrier-and-handcart walk atlas for assets/gacha/cart/carrier-walk.webp.
Input image 1 (assets/mobies/mobibou.webp) is the exact identity reference for Moby only: keep its shaggy black plush body, familiar silhouette, one large cream eye on the viewer's left, the round dark mechanical lens on the viewer's right, and the raised dark gamepad cross on the lower front in the same relative positions. Replace its cap with a white hachimaki, and remove the backpack, star patches and dangling hoodie details. Images 2 and 3 (the lacquered box parts) are material references for restrained antique brown wood, warm upper-left highlights and refined Japanese craft. Image 4 (the engawa stage) is a mood and painted-texture reference only.
Primary request: one precise 4-column by 2-row animation atlas, eight consecutive equally spaced poses of one complete walk cycle, ordered left-to-right across the top row, then left-to-right across the bottom row. The whole sheet is a wide 3:1 landscape composition with eight equal landscape cells. Each conceptual cell is 768x512; the final atlas will receive 1-pixel transparent separators during processing. No cell outlines, borders or labels.
Subject: in every cell, Moby walks toward screen-right while pulling an old, empty, two-wheeled Japanese wooden flat handcart behind him on the left. Show the complete Moby and cart in strict side profile. Moby leans forward slightly and grips the two long pull shafts with both hands. Dress him in a short indigo aizome happi coat with a small simple vermilion round crest on the back and a white tied hachimaki. The cart has a flat level upper bed, sturdy dark amber lacquered timber, one clearly visible large wooden spoked wheel and a second far wheel just behind it, both wheels rotating subtly through the cycle. Keep the entire bed completely empty: absolutely no box, load, packages or props on it.
Style/medium: polished tactile game illustration. Moby retains the source's soft individual black fur strands, cream eye, glassy dark lens and raised cross button; cart wood has the quiet antique lacquer grain of the references. Integrate with the delicate Japanese watercolor atmosphere of the engawa, without flattening or redesigning Moby.
Composition/framing: identical camera, object scale, horizontal placement and vertical placement in all eight cells. All parts remain fully inside each cell. The group's feet and both wheel bottoms share a perfectly consistent ground line exactly 48 pixels above each cell's bottom (y=464 on a 512px cell). Leave transparent space below the ground line. Keep the cart bed around the middle height with an unobstructed flat top for a separate box image to be placed later.
Walk-cycle poses: frames 1-8 are eight evenly spaced poses through one natural cycle. Alternate the lead foot and opposite arm swing; show believable passing and lift poses between contacts. Frame 8 must flow naturally into frame 1. The coat hem and fur tips flutter gently. The cart bed bobs only a few pixels (about plus or minus 6) while its wheel spokes advance smoothly around the axle. Moby looks cheerful and effortfully focused.
Lighting/mood: soft dawn light from upper left; highlights stay on fur and wood only. Gentle grounded illustration, quiet early morning.
Color palette: black and charcoal fur, warm cream eye, deep indigo coat, muted vermilion crest, pale white headband, antique amber-brown lacquered wood, subdued brass details.
Materials/textures: tactile plush fur, woven cotton, subtle stitched coat fabric, smooth aged lacquer and visible wooden spokes.
Constraints: true transparent alpha background; no ground plane, floor, cast shadow, light halo, glow, motion blur, perspective shift, text, letters, numbers, logos, watermark or checkerboard. No chest or cargo on the cart. Keep every cell aligned, complete and the same scale.
~~~

## C-2 採用プロンプト

~~~text
Use case: production mobile-game sprite sheet for a single, controlled unload animation.
Asset type: transparent 8-frame carrier, empty handcart and tipping flatbed atlas.
Input image 1 is the exact carrier-walk atlas. It defines the character, face, fur, hachimaki, coat, proportions, cart construction, wood finish, camera, scale and transparent look. Reuse that exact design. The cart's rear unloading end is screen-left; its pull handles extend screen-right. Moby always faces right when at the handles. Keep the cart empty; the wooden box will be composited separately.
Primary request: a very wide 3:1 landscape atlas with exactly four equal columns and two equal rows, eight distinct sequential frames in row-major order. Do not repeat a static pose. No borders, labels or numbers. Each complete object stays inside its own 768x512 conceptual cell.
Invariants: exact same cart wheel size and axle, bed length, handle length, wood tone and Moby scale from the reference. Side profile, no camera movement. Cart and Moby share the same transparent ground baseline. Feet and wheel bottoms sit 48 pixels above each cell bottom. Soft light from upper left.
Frame sequence:
1. Match the reference sheet's first frame exactly: Moby at the right handles, leaning into the pull, bed horizontal.
2. Moby has stopped; feet planted, both hands lowering the handles, wheel motion visibly ended; bed horizontal.
3. Moby releases the handles and moves behind the cart to screen-left. Show one Moby only. The cart remains level.
4. Moby reaches the back-left end and braces with both paws. The bed begins to tip: left/rear end goes down, right/handle end rises slightly.
5. The left end lowers farther; Moby visibly leans and supports the cart from behind.
6. Maximum tilt: the bed is a clear straight ramp sloping down toward screen-left by roughly 18 degrees; Moby braces at its low rear end. Keep the ramp unobstructed for a separate box to slide off.
7. Bed returns horizontal. Moby stands at the rear and wipes sweat from his forehead with one paw.
8. Level cart. Moby has returned beside the right-hand pull shafts in a relaxed ready-to-depart stance. This pose must visually lead back into frame 1.
Style: the same tactile Mobibou plush, cream eye, dark lens and chest cross, same indigo happi and white tied hachimaki, same small plain vermilion back crest, same fine amber-brown lacquered cart illustration. Gentle dawn rendering, not a redesign.
Constraints: true transparent background; no floor, ground plane, contact shadow, halo, glow, motion blur, checkerboard, box, cargo, duplicate or ghost character, extra characters, words, text, numerals, logo, watermark. Keep every figure fully inside its frame; preserve identical scale and camera in all eight cells.
~~~

---


# 緞帳素材（2026-10-01）

分類Wは、漆塗りの箱と朱の意匠になじむ深い朱の無地布に、控えめな金の縁取りを合わせた。縞幕は藍染の運び屋と競合するため採用しなかった。最初の強い内向き弧の候補（exec-5e5632e9-587d-4eb1-bd92-7861874632ac.png）とその部分編集（exec-fa7e3f65-7437-4dea-9db0-872b6e36088d.png）は中央の形が残ったため不採用。採用候補は curtain-right.webp の exec-45b91510-df58-4901-ace8-59e2dd2c43b6.png（798×1972）。

### W-1 の後処理

元画像のalpha>=16外接矩形(189,0,798,1921)を取得し、premultiplied-alphaで高さ2532pxへリサンプルした。各行の内側端を測り、41行中央値で細かな輪郭ゆれをならした後、内側端がx=85（上）からx=100（下）へ少し動くよう、布幅615pxへ横方向に再マッピング。700×2532キャンバスの右パネルを作り、左パネルはその正確な水平反転。quality90、method6、alpha_quality100。最終容量: right 196,388 bytes、left 197,630 bytes。

### W-2 の後処理

valance生成元 exec-bbffc0f9-583b-4c60-a507-18115e33becf.png（2124×740）のalpha>=16外接矩形(13,175,2113,478)を切り出し、縦横比を保って幅1162pxへ縮小。1170×320の透明キャンバスへx=4、y=0で配置。quality90、method6、alpha_quality100。最終74,486 bytes。

## W-1 採用プロンプト

~~~text
Use case: production mobile-game layered sprite, isolated right-hand theatre curtain.
Asset type: curtain-right.webp, one transparent portrait curtain panel, normalized to 700x2532.
Input image 1 is the engawa scene for quiet pre-dawn light and Japanese painted texture. Images 2 and 3 show the dark antique lacquer box and its warm gold detailing; coordinate the curtain color with them.
Primary request: a single heavy deep-vermilion theatre curtain panel with broad vertical pleats and a narrow antique-gold wavy lower hem with evenly spaced small tassels. Plain deep red cloth, no stripes.
Critical geometry of the inner edge: this is the RIGHT curtain, so its center-facing inner edge is on the LEFT side of the cloth. Keep a clear transparent margin on that inner-left side. After normalization to a 700x2532 canvas, the inner edge should stay nearly vertical at x≈85 from top to bottom; allow only a very slight graceful bow, no more than about 20px sideways change over the entire height. Do not create a deep crescent, diagonal opening, gathered-away center, concave bowl or large middle bulge. The mirrored pair must meet and overlap by 60px at screen center when placed on a 1170px-wide screen.
Composition: right-panel cloth starts near x=85 and fills to the right canvas edge; the outside edge at right is straight and can bleed offscreen. Full height. Broad folds are vertical and nearly parallel. The lower hem gently ripples by only a few pixels and carries a neat fine gold edge and small regular tassels. No gold piping along the inner vertical edge; overlapping red fabric should have no bright central seam.
Style: tactile illustrated silk or velvet with refined Japanese watercolor softness, quiet natural highlights, same polished finish as the supplied reference art.
Lighting: soft upper-left light on raised folds only.
Palette: deep muted oxblood / shrine vermilion, warm antique gold.
Materials: rich matte-woven cloth, visible broad folds, no glossy plastic.
Constraints: true alpha transparency wherever there is no cloth; preserve the empty inner margin. No background, floor, shadows, glow, white/black/chromatic fringe, checkerboard, valance, rope, person, writing, symbols, logo or watermark. No oversized curve on the inner edge.
~~~

## W-2 採用プロンプト

~~~text
Use case: production mobile-game transparent layered theatre valance.
Asset type: assets/gacha/curtain-valance.webp, final canvas 1170x320.
Input image 1 is the engawa stage mood and soft dawn light. Input images 2 and 3 are the antique lacquered box parts; match their restrained gold craftsmanship and quiet Japanese color harmony.
Primary request: a single very wide shallow upper valance that hangs across the top of a traditional Japanese theatre curtain, hiding the curtain's hanging point. Deep vermilion cloth with restrained antique-gold edging and embroidery.
Composition: panoramic horizontal strip, about 3.66:1. Full-bleed cloth across the width with transparent background around its silhouette. A straight top edge suitable for placement against the screen top. Lower edge is a graceful sequence of shallow repeated scallops, not a straight line. Keep an unobstructed small round gold ring exactly at the horizontal center (x=585 in the final canvas), attached to the valance to pass a separate cord through; do not draw the cord.
Details: finely woven deep crimson silk, soft vertical folds that visually continue the curtain folds, narrow clean gold piping on the upper and scalloped lower hem, small evenly spaced gold tassels along the lower scallops, one clear polished gold ring at the center. Refined, traditional, delicate, not ornate.
Style: tactile Japanese painted game illustration with soft watercolor edges, subtle fabric weave, craft detail matching the references.
Lighting: gentle soft light from upper left, highlights only on cloth and gold.
Constraints: true transparent alpha beyond the valance; all four corners transparent. No background, stage, floor, poles, rods, ropes, cord, people, text, letters, numbers, logo, watermark, checkerboard, or hard rectangle. No thick side borders or giant central ornament.
~~~

---


# 補助の粉塵シート（2026-10-01）

任意素材U-1も用意した。元画像は exec-37ed3ffb-3946-46ab-a54f-6bccbdd719ed.png（1774×887）。薄い生成り灰色へ色調を合わせ、1コマ256×256の4×2シート、1024×512へ正規化した。各コマでalpha>=24の外接矩形を取得し、3pxの縁を残して縮小。フレームサイズは82/116/150/182/210/176/124/68px幅を上限に配置し、alpha最大値は116/126/136/146/162/126/74/20。RGBA WebP quality90、method6、alpha_quality100で45,086 bytes。床・影・箱・文字は加えていない。

## U-1 採用プロンプト

~~~text
Use case: production mobile-game impact effect sprite sheet.
Asset type: transparent 8-frame dust puff atlas, assets/gacha/cart/dust.webp, final 1024x512.
Input image 1 is the quiet engawa stage. Match its delicate Japanese watercolor softness and warm dawn light, but do not copy scene details.
Primary request: one evenly spaced 4-column by 2-row sprite atlas, eight separate evolving puffs of fine dust from a wooden box touching a clean engawa floor. Read frames left-to-right, top row then bottom row. Each cell is 256x256. No borders, labels or numbers.
Animation: frame 1 a tiny low puff; frames 2-3 lift and widen; frame 4 spreads into soft wisps; frame 5 reaches maximum size, a shallow horizontal cloud; frames 6-7 break apart and fade; frame 8 is almost invisible, with only a faint wisp. All eight frames progress smoothly.
Visual: thin warm greige / pale beige-gray watercolor dust, airy and translucent, soft irregular edges, subtle tiny particles close to the ground. Keep the form low and horizontal, with the center transparent enough that it does not look like a solid blob. No dark smoke.
Composition: centered within each square cell, completely contained; genuine alpha transparency outside the dust. Each cell can loop or play once without clipping.
Lighting and palette: pale warm grey, muted cream and faint amber highlights, soft upper-left dawn light.
Constraints: transparent background, no floor, ground plane, cast shadow, box, character, object, fire, smoke plume, halo, glow, checkerboard, text, letters, numbers, logo or watermark.
~~~

---

# 和風引き幕素材（2026-10-01）

ブランチ: `codex/gacha-wafu-curtain`。ワークツリー: `D:/codex-worktrees/gacha-wafu-curtain/mobidou`。指示書 `docs/codex-gacha-wafu-curtain.md` を全文確認。素材はビルトイン `image_gen` で生成し、既存の `stage-bg.webp`、漆箱、荷車の光と質感を目視して文章のスタイル参照に反映した（画像入力はなし）。コード変更なし。

## 採用案

- W-1 幕: **案A 定式幕**。生成候補で黒・柿色・萌葱の縞と洗い込んだ木綿の質感が成立し、夜明け前の縁側、暗い漆、朱の荷車とよく合う。案Bの朱無地よりも芝居小屋の引き幕として識別しやすく、画面に必要な縦のリズムも作れる。
- W-2 上の飾り: **案A 木の鴨居と生成りの短い垂れ**。箱の飴色の漆と色が連続し、生成り布が幕の明るい襞と調和する。中央の小さな金輪だけを残し、房・金縁・家紋・文字は加えていない。

## W-1 の後処理

採用した共通マスター候補は `C:/Users/User/.codex/generated_images/01a0f722-a276-76f2-be5a-13ae8d7a79d8/exec-3e9048d2-c5b8-4836-aae7-4e7d4657b76b.png`（1024×1536、RGBA）。alpha>=16 の外接矩形 `(8,10,1017,1509)` を切り出し、premultiplied-alpha Lanczos で1400×2532へ正規化。1枚の連続した縞から左右を切り出し、left は x=0..700、right は x=525..1225 を700×2532キャンバスへ配置した。現行 `GachaScreen.tsx` の左右幅（画面幅/2+30）と `contentPosition` に合わせてプレビューし、375×812 と430×932の双方で同じ色の縞から始まり中央の継ぎ目が見えない位置を選んだ。襞と縞は共通マスター由来なので中央の布目も連続する。

WebP quality 90、method 6、alpha_quality 100、RGBAで書き出した。PNG原本はプロジェクトへ含めていない。

## W-2 の後処理

候補 `C:/Users/User/.codex/generated_images/01a0f722-a276-76f2-be5a-13ae8d7a79d8/exec-cdd7c485-17cc-4ae5-92a5-c03a7d5f168a.png`（2172×724、RGBA）の alpha>=16 外接矩形 `(0,275,2172,724)` を切り出し、縦横比を保って幅1170pxに縮小。鴨居と金輪の上端に25px分の木目を連続させて配置し、輪の中心を約 `(585,60)`、直径を約50pxに合わせた。下部は y=200..320 を模様のない暗い飴色の帯に統一（指定の最下100pxを含む）。

RGBA WebP quality 90、method 6、alpha_quality 100で書き出した。確認用プレビューとピクセル監査は `docs/gacha-assets-verification/`。

## ImageGenへ送ったプロンプト W-1

~~~text
Use case: stylized-concept
Asset type: transparent layered mobile-game theatre-curtain master artwork, later cropped into assets/gacha/curtain-left.webp and curtain-right.webp
Primary request: create one extremely tall, straight-on master image of a closed pair of traditional Japanese kabuki hikimaku panels. Make the two panels read as one continuous field of cloth with no central seam, so exact overlapping crops can be made from this single artwork.
Scene/backdrop: none; genuine transparent alpha outside the curtain silhouette.
Subject: a heavy, hanging cotton curtain with exactly twelve equal-width vertical stripes across the entire master width, in this exact repeating order from left to right: black, muted persimmon-orange, deep moegi green; repeat that three-color sequence four times. Every stripe must remain a clean distinct color. No color bleeding at stripe boundaries.
Style/medium: refined Japanese illustrated mobile-game prop, matching the quiet dawn-washed engawa and deep amber-brown lacquer world: soft painterly rendering with believable washed cotton weave, no velvet or silk sheen.
Composition/framing: very tall portrait canvas, front-facing orthographic view, no perspective. The curtain field fills the image from top to bottom and edge to edge; the two future crops must be one uninterrupted design. Stripes run straight vertically and remain parallel. Broad, few, gently weighted pleats; soft upper-left light makes the left side of each fold lighter and the right side darker, while preserving each stripe's base color. A tiny, understated natural-cream cotton hanging tape with evenly spaced small textile loops at the top edge, mostly hidden by a separate valance. Bottom hem almost straight, with only a slight natural wave from cloth weight; allow a thin dark matte weighted hem. The center at half width has no special mark, trim, or seam.
Lighting/mood: soft natural pre-dawn light from upper left, calm and dignified.
Color palette: traditional black, slightly faded persimmon, and deep muted moegi; cotton highlights and shadows remain within those hues.
Materials/textures: washed-in cotton, subtle visible weave, soft hand, broad vertical folds, not glossy.
Text (verbatim): none.
Constraints: exact three-color stripe order and equal stripe widths; twelve stripes total; continuous texture and stripe alignment across the center; true transparent background beyond the fabric; no gold or metallic trim; no tassels or fringe; no border on either vertical edge; no rope or ring; no valance.
Avoid: Western theatre drapes, velvet, silk gloss, scalloped curtain edge, arched center, gathers, family crest, kamon, logo, symbols, letters, numbers, watermark, embroidery, floral motifs, decorative patterns, extra objects, stage or room background, floor, cast shadow, checkerboard, halo, hard outline.
~~~

## ImageGenへ送ったプロンプト W-2

~~~text
Use case: stylized-concept
Asset type: transparent shallow Japanese theatre valance, final asset assets/gacha/curtain-valance.webp at 1170x320
Primary request: create the upper valance for a traditional kabuki hikimaku with black, persimmon and moegi cotton stripes. Use the Japanese wood lintel and cream hanging-cloth option. This must visually belong to the same quiet pre-dawn engawa and warm lacquered game-art world.
Scene/backdrop: none; genuine transparent alpha outside the valance silhouette.
Subject: a refined dark amber-brown wooden kamoi beam across the top, with fine understated lacquered wood grain and warm upper-left highlights. Beneath it hangs a short length of natural-cream cotton cloth, simple and restrained, with only a very shallow straight lower edge. At the midpoint of the beam, attach one small polished antique-gold ring through which a separate pull cord will pass.
Composition/framing: very wide, extremely shallow horizontal composition. A straight top edge spans the full width. Keep the entire lower 100 pixels of the final 1170x320 canvas as a quiet, uninterrupted band with no pattern, no folds, no hardware; its dark warm-brown color should continue naturally from the upper shape. The wood beam and cream cloth occupy only the upper area, ending around two-thirds of the way down. The center ring must be horizontally centered exactly; target center x=585 and y=60, ring diameter about 50 pixels in the final asset (around 4.3% of width). Keep the ring cleanly visible against the beam; the cord itself is absent.
Style/medium: carefully finished Japanese illustrated mobile-game prop, tactile but controlled, soft painterly rendering, subtle wood and cotton texture, not photoreal studio product photography.
Lighting/mood: soft pre-dawn light from upper left, warm restrained highlights on wood and ring.
Color palette: deep amber to dark brown lacquered wood, natural unbleached cream cotton, small muted gold ring; lower quiet band is deep warm charcoal-brown.
Materials/textures: fine subdued wood grain, soft matte cotton, quiet metal sheen only on the ring.
Text (verbatim): none.
Constraints: genuine transparency outside the valance; full-width valance; quiet solid lower band from y=220 to y=320 with no ornament; exact centered small ring; no separate rope. No family crest, kamon, logo, letters, numbers, symbols, watermark, embroidery, tassels, fringe, gold trim, scalloped drapery or Western theater ornaments.
Avoid: velvet, silk gloss, elaborate valance, flags, heraldic details, busy fabric folds in the lower band, background, wall, floor, cast shadow, white/black edge fringe, checkerboard.
~~~
# 2026-10-02 guide-arrow-down.webp

- 保存先: `assets/gacha/guide-arrow-down.webp`
- 生成: built-in image_gen（transparent_background: true）
- 仕様: 256×256、アルファ付き lossless WebP、11,194 bytes（50KB以下）。
- 後処理: 生成アルファを保持し、アルファ外接矩形を切り出して縦横比を維持して縮小。透明な256×256キャンバスの中央へ配置。
- 四隅のアルファ: すべて0。非透明領域の外接矩形は `[47, 88, 204, 180]`、余白は左47・上88・右52・下76px。
- 暗色 `#302D25` と明色 `#C79A62` に重ね、暖白のV字と細い焦げ茶の縁が両方で読めることを目視確認。軸、文字、追加記号、描き込んだ影、背景色、市松模様はなし。
- 検証記録: `docs/gacha-assets-verification/guide-arrow-down-audit.json`、`guide-arrow-down-overlay.webp`。
- 指定資料はこの古いチェックアウトに存在しなかったため、`D:/mobby/mobidou-claude/docs/codex-gacha-arrow-asset.md` と共通ルールを参照。同チェックアウトの既存プロンプト記録を引き継いで本項を追加。既存の箱・紐素材を目視して作風を確認。
- `scripts/audit-image-assets.cjs` はこのチェックアウトには存在しない。参照先の同スクリプトは画像参照を検査するもので、アルファ検査はPillowで保存後のWebPを再読込して実施。

プロンプト:
> Use case: stylized-concept. Create one isolated production Japanese game UI asset, guide-arrow-down, on genuinely transparent alpha background. Square canvas. Exactly one downward V-shaped chevron, bilaterally symmetric, no shaft. Thick hand-painted Japanese brush strokes, warm ivory white near #FFF8E9, with subtle dry-brush grain and slight washi-like pigment bleeding confined to the strokes. A very fine faint dark burnt-brown contour gives legibility against dark #302D25 and light tan #C79A62. Rounded lower point and softly rounded stroke ends. Center the chevron, occupy about 76 percent of canvas width and 45 percent height, keep at least 10 percent fully transparent margin on every side. Refined tactile restrained handmade finish matching Japanese watercolor game props, natural wood and vermilion aesthetic, but the arrow itself stays warm white. Flat pigment, no lighting effects. No text, letters, numbers, additional symbols, shaft, cast shadow, drop shadow, glow, background color, paper rectangle, checkerboard, border, watermark. Transparent empty space everywhere outside the single chevron.
