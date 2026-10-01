# アプリアイコンの生成プロンプトと制作記録

生成日: 2026-10-02 (Asia/Tokyo)。指示書 docs/codex-app-icon-prompts.md を全文確認。専用ワークツリー D:/codex-worktrees/app-icon-proposals/mobidou を作成し、用意済み codex/app-icon に切替。claude/ui-navigation-overhaul の最新ローカル基点 22679383a12c77acc4467ddf0af6162be5b4ecf3 へ fast-forward。既存コードへの編集は行っていない。画像と2文書だけを1コミット、pushしない。

組み込み ImageGen、透過なしを使用。ロゴと3体を各初期生成で参照入力に渡した。安全余白、ロゴ幅、背景の簡略化を画像編集で調整。RGB PNGへの寸法・形式正規化と確認用プレビューのみPillowで処理。初期生成の参照順はロゴ、もびりん、モビ坊、ばぶモビー。案1初回は同じ共通条件の英語指示、案2〜5および案1の追加候補は指定日本語共通文を冒頭に付けた。

## 最終ファイル一覧

|ファイル|寸法|容量(bytes)|色空間|アルファ|
|---|---|---:|---|---|
|icon-1.png|1024×1024|1,802,376|sRGB (ICC埋込)|なし RGB|
|icon-2.png|1024×1024|1,890,609|sRGB (ICC埋込)|なし RGB|
|icon-3.png|1024×1024|1,979,434|sRGB (ICC埋込)|なし RGB|
|icon-4.png|1024×1024|2,243,135|sRGB (ICC埋込)|なし RGB|
|icon-5.png|1024×1024|1,814,033|sRGB (ICC埋込)|なし RGB|

## アルファ・ピクセル・色空間の確認

PNGを再度開き、全画素をデコード。5点ともRGB、IHDR color type=2、tRNSチャンクなし、デコードした生データは3,145,728 bytes (1,048,576 pixels×3)。RGBAへの確認用変換後のアルファ最小/最大=255/255、アルファ255の画素=1,048,576、255未満=0。保存ファイル自体にアルファチャンネルは存在しない。ICCを読み直しsRGB built-inを確認。四角全面塗り、角丸はプレビューのみ。

~~~json
[
  {
    "file": "icon-1.png",
    "size": "1024×1024",
    "bytes": 1802376,
    "mode": "RGB",
    "IHDR": 2,
    "tRNS": false,
    "alpha_extrema": [
      255,
      255
    ],
    "opaque_pixels": 1048576,
    "space": "sRGB built-in",
    "sha256": "0b00b7dd2f299e447f0fcca232c2640913ae9d2ece6ac4da10af000b79db10ad"
  },
  {
    "file": "icon-2.png",
    "size": "1024×1024",
    "bytes": 1890609,
    "mode": "RGB",
    "IHDR": 2,
    "tRNS": false,
    "alpha_extrema": [
      255,
      255
    ],
    "opaque_pixels": 1048576,
    "space": "sRGB built-in",
    "sha256": "1c84dae2d002972ec71068fb0d7bbb06ce14bb35876f512021ee1298a7f123fa"
  },
  {
    "file": "icon-3.png",
    "size": "1024×1024",
    "bytes": 1979434,
    "mode": "RGB",
    "IHDR": 2,
    "tRNS": false,
    "alpha_extrema": [
      255,
      255
    ],
    "opaque_pixels": 1048576,
    "space": "sRGB built-in",
    "sha256": "2efee6476ffab109fcce05a1818b45924d3156d1b2d821b5214f179da892475c"
  },
  {
    "file": "icon-4.png",
    "size": "1024×1024",
    "bytes": 2243135,
    "mode": "RGB",
    "IHDR": 2,
    "tRNS": false,
    "alpha_extrema": [
      255,
      255
    ],
    "opaque_pixels": 1048576,
    "space": "sRGB built-in",
    "sha256": "47f4fb07e8a8cca58151da541a4c4efe4d30d2a9b59f9fc489ec444c228f99a5"
  },
  {
    "file": "icon-5.png",
    "size": "1024×1024",
    "bytes": 1814033,
    "mode": "RGB",
    "IHDR": 2,
    "tRNS": false,
    "alpha_extrema": [
      255,
      255
    ],
    "opaque_pixels": 1048576,
    "space": "sRGB built-in",
    "sha256": "1b10cf0489a5e150349f938c9862b4cb97a5899b5073bff0618723684c15659f"
  }
]
~~~

## 狙い

- 案1: 朱の和紙に大きな円と下側の三体。安定した並びと強い朱色で、最も素直な識別を狙う。
- 案2: 夜明けの空と石段を縦に重ね、円を朝日のように見せる。三体が見上げる旅の始まり。
- 案3: 生成り和紙と朱のにじみ、周囲の三角配置。御朱印を思わせる静かな白地の案。
- 案4: 藍染と大きな青海波、金の外縁。円を左右から支える配置で工芸的な落ち着きを出す。
- 案5: 桜色と若草色の山道、上側の二体と下側の赤ちゃん。春の明るさと動きを出す。

## 造形確認と正直な差分

reference-review.pngで原本と全案を比較。3体の色、毛/布、片目カメラ、左側十字ボタンと右側2ボタン、帽子、ひげ、パイプ、赤い前髪と袋、ボンネット、よだれかけ、肉球を確認。ただし原本の画素を直接貼った方式ではなくImageGenによる再描画。ロゴの鳥居・モビー・円・巻き波・石段と配色を維持したが、細い輪郭、毛の形、円と石段の比率、線幅は原本と完全一致ではない。

- 案1: 原本に近い正面の三体。毛束、帽子のしわ、口ひげとパイプの輪郭、装飾の寸法に差。円は幅約60%を狙い拡大。
- 案2: 見上げる3/4向きに再描画。原本と身体角度・レンズの見え方・帽子の傾きが違う。ばぶモビーの視線も上向き。背面化はせず顔の識別を保った。
- 案3: もびりんの右手を上げ、上左の円に寄り添う。原本の正面静止姿勢との差。ばぶモビーの身体と足の角度にも差。
- 案4: もびりんの右手、モビ坊の挙げる手の左右/向きが原本と異なる。キャラ全体が少し傾き、円を支えるポーズ。原本画素そのままの条件を厳密には満たさない。
- 案5: もびりんは帽子のつばに手を添えて持ち上げるしぐさ、完全に帽子が頭から離れた姿ではない。モビ坊の挙手方向とばぶモビーの顔/身体の傾きも原本との差。最終背景は浮遊花びら5枚。

主役と3体の重要な顔は中央に収まる。案4の手/毛先は約100pxの安全目安より少し外側に出るが、22.37%角丸確認で欠けないことを目視確認する。生成による上記差分を残しており、厳密な原本画素一致版とは呼ばない。

## プレビュー検証

small-preview.png: 120pxと60pxをLANCZOSで縮小、明暗背景の4行。表示アプリの拡大縮小による見え方には依存するが、ファイル内の各アイコンは指定ピクセル寸法。rounded-preview.png: 160px角、半径160×0.2237=35.792px、4倍解像度マスクから縮小し明暗背景へ合成。iOS実機の連続曲率マスクの厳密再現ではなく、指定の22.37%角丸半径での安全確認。

最終目視確認済み: 120px/60pxの明暗4行で、全5案とも円の輪郭と黄色・黒褐色・桃色の三体を区別できる。60pxでは帽子、レンズ、ひげや小物の細部の読解まではできない。案2と5は円・三体が相対的に小さく、案1/3/4より識別に注意が必要だが、三体がいることは確認できる。22.37%角丸の明暗2行では、全案のロゴと三体の顔・全身に欠けなし。外周の墨枠や文様は切れるが主役には影響しない。文字・数字・透かしは最終5アイコン内に見当たらず、背景と布はマットで光沢のあるCGレンダリング風の背景ではない。カメラレンズの反射は参照素材由来。

## 生成元

- icon-1.png: C:/Users/User/.codex/generated_images/01a0f864-1f43-7b51-8451-593a233e92a6/exec-a13145b9-c094-48f5-93ce-ae43c8344863.png
- icon-2.png: C:/Users/User/.codex/generated_images/01a0f864-1f43-7b51-8451-593a233e92a6/exec-1f1f857d-5d32-46bf-a0a7-aae7df07daef.png
- icon-3.png: C:/Users/User/.codex/generated_images/01a0f864-1f43-7b51-8451-593a233e92a6/exec-23de9308-7289-49e2-87d0-cd79ffc9bb07.png
- icon-4.png: C:/Users/User/.codex/generated_images/01a0f864-1f43-7b51-8451-593a233e92a6/exec-4266e41f-87ee-41d6-b098-2792f9db89e9.png
- icon-5.png: C:/Users/User/.codex/generated_images/01a0f864-1f43-7b51-8451-593a233e92a6/exec-6ca86058-d16c-4a65-877c-e7d28b40c7ee.png

参照原本とSHA-256:

- assets/mobidou-opening-emblem.webp: b3030b11bf3672e8691e0445f328c50b94a0d29806aae55c9162282fe2eafa94
- assets/mobies/mobirin.webp: af7245ae4c6c5d66d8b374e021b7a4166ce1ec9a11782a8c5011a7bce23b5f54
- assets/mobies/mobibou.webp: 9ab0cf058a6997d7024cf37fea40b4f8a0333ff2a9dc93c7150563d6637d1fe0
- assets/mobies/babumoby.webp: 78e151c98942c2683ef3566af419b8363ca5b91172cd743f5838c0dc5b98188c

## ImageGenへ送ったプロンプト

以下は実際の指示文。後続編集の参照入力は直前候補画像1枚。採用原本は生成元一覧に記録。

### 案1: 初期生成

~~~text
Create proposal 1 of 5 for Mobidou iOS app icon. Square 1024x1024 full bleed opaque no rounded corners no text numbers watermark. Japanese tactile handmade washi ink vermilion indigo gold, matte, soft upper left natural light. NO glossy 3D CG. Image1 is exact principal circular app emblem, preserve all shapes colors line widths and details, use intact centrally dominant about 60% image width. Images2/3/4 exact characters yellow Mobirin grey felt hat moustache pipe camera eye dpad; brown Mobibou red cap forelock bag raised hand camera eye dpad; pink seated baby bonnet bib paw soles camera eye dpad. Preserve their original fluffy fabric identity, accessories and button placement. Deep faded vermilion washi background, a few thin matte gold mist clouds. Large logo centered upper middle, Mobirin at lower left and Mobibou lower right, seated baby lower center, all large and separate silhouettes slightly in front of bottom edge of logo without hiding its principal face. Nearly symmetric stable composition, important elements inside x/y 100..924. Circle and all three characters distinguishable at 60px. Complete icon artwork only.
~~~

### 案1: 調整1

~~~text
Use case compositing. Image1 is edit target exact icon artwork. Make exactly one change: SHRINK THE ENTIRE FOREGROUND GROUP (circular emblem plus all 3 characters) uniformly to 80% of its current size about the center. Fill newly revealed perimeter seamlessly with SAME deep vermilion washi and sparse gold mist. The foreground group must now fit wholly inside x=120..904 and y=120..904 on 1024px square. Do not crop any foreground. Keep exact characters, logo geometry, colors, textures, positions relative to each other unchanged. No redraw or redesign. Full bleed square opaque no text no rounded corners, 1024x1024. Need generous 120px background-only border on all four sides.
~~~

### 案1: 調整2

~~~text
Image1 edit target. Change ONLY size of central circular emblem, enlarge to 60% of canvas width (614px on1024), bounds x205..819 y105..719. Keep complete official logo graphic geometry colors details unchanged. Keep all three characters and background EXACTLY unchanged in positions sizes shapes colors. Logo sits behind characters, its bottom edge slightly overlapped but principal face visible. Do not change characters. Opaque square no text no rounded corners.
~~~

### 案2: 初期生成

~~~text
スマートフォンのアプリアイコン(正方形、全面塗りつぶし、1024×1024)。アプリ「もび道」(歩いて架空の御朱印を集める巡礼アプリ)。
和風。実物の和紙、墨、朱、金、麻、藍染の手ざわりのある、手作りの工芸品のような絵。光沢のある 3D レンダリング風
(つるつる、ガラスの反射、CG 的なグラデーション)は禁止。縁は筆で引いたかすれ。光源は左上の柔らかい自然光。
参照画像のアプリロゴ(円の中の鳥居とモビー)を、形と配色を変えずに、絵の中心の主役にする。
参照画像の3体のキャラクター(もびりん、モビ坊、ばぶモビー)を、造形をそのままに、すべて入れる。
文字・数字・透かしを描かない。透過はなし、角丸にしない。
Image1 exact emblem, Image2 yellow Mobirin felt hat gold camera eye moustache pipe dpad, Image3 dark Mobibou red cap forelock bag raised hand camera eye dpad, Image4 seated pink baby bonnet bib paw soles camera eye dpad. Preserve source shapes and accessory positions, no redesign. Large clear separate silhouettes at 60px, important features inside x/y 100..924. Full logo pictorial content visible and dominant. Matte handmade textures, no glossy CG.
案2 夜明けの参道: 藍から朱、淡い金へ水彩と和紙のぼかし、遠い山の影。下半分に石段が奥へ延びる。中央上に大きい円ロゴが朝日のように昇る、ロゴ全図柄は隠さない。手前で3体、黄色左/ピンク中央座る/黒褐色右、横向きか3/4向きでロゴを見上げる、カメラ目とボタンは見える。縦の奥行き、旅の始まり。
~~~

### 案2: 調整1

~~~text
Use case precise-object-edit. Image1 edit target. Keep its style, character identity, accessories, logo exact artwork, texture colors. Change only layout safety: shrink foreground emblem+3 characters group uniformly to 80% current size around center, so ALL foreground fits inside x=120..904,y=120..904 of 1024px canvas. Continue same background across full square seamlessly. Need 120px perimeter of background on all four sides. No character clipped. No rounded corners no text opaque full square 1024x1024.
~~~

### 案2: 調整2

~~~text
Image1 edit target, keep the exact foreground circular emblem and three characters unchanged including positions sizes identity colors textures accessories. ONLY simplify and quiet BACKGROUND for a readable 60px app icon. Remove all autumn leaves trees extra torii buildings shrines lanterns. Replace background with simple distant dark indigo mountain SILHOUETTES and softly blended matte watercolor dawn sky indigo upper / vermilion horizon / pale gold. Keep clear simple stone stairs in lower half receding into distance, no elaborate rocks or foliage. Emblem appears as rising sun.
~~~

### 案3: 初期生成

~~~text
スマートフォンのアプリアイコン(正方形、全面塗りつぶし、1024×1024)。アプリ「もび道」(歩いて架空の御朱印を集める巡礼アプリ)。
和風。実物の和紙、墨、朱、金、麻、藍染の手ざわりのある、手作りの工芸品のような絵。光沢のある 3D レンダリング風
(つるつる、ガラスの反射、CG 的なグラデーション)は禁止。縁は筆で引いたかすれ。光源は左上の柔らかい自然光。
参照画像のアプリロゴ(円の中の鳥居とモビー)を、形と配色を変えずに、絵の中心の主役にする。
参照画像の3体のキャラクター(もびりん、モビ坊、ばぶモビー)を、造形をそのままに、すべて入れる。
文字・数字・透かしを描かない。透過はなし、角丸にしない。
Image1 exact emblem, Image2 yellow Mobirin felt hat gold camera eye moustache pipe dpad, Image3 dark Mobibou red cap forelock bag raised hand camera eye dpad, Image4 seated pink baby bonnet bib paw soles camera eye dpad. Preserve source shapes and accessory positions, no redesign. Large clear separate silhouettes at 60px, important features inside x/y 100..924. Full logo pictorial content visible and dominant. Matte handmade textures, no glossy CG.
案3 御朱印の白地と朱印: 生成りの繊維ある和紙、四辺に墨のかすれた細い枠。中央円ロゴはそのまま黒朱生成りを保ち、外周だけ朱の印影のにじみ。円幅の40%程度の3体が円の周囲に寄り添う、もびりん左上寄り、モビ坊右下寄り、ばぶモビー左下寄り、三角の配置。静かで余白あり品よく。円全体と三体を明瞭に。
Strict safety: full emblem top >=110px, three character complete silhouettes and extremities all within x=110..914 y=110..914, no clipping. Logo width 560..620px, do not enlarge beyond 64%. 
~~~

### 案3: 調整1

~~~text
Use case precise-object-edit. Image1 edit target. Keep its style, character identity, accessories, logo exact artwork, texture colors. Change only layout safety: shrink foreground emblem+3 characters group uniformly to 80% current size around center, so ALL foreground fits inside x=120..904,y=120..904 of 1024px canvas. Continue same background across full square seamlessly. Need 120px perimeter of background on all four sides. No character clipped. No rounded corners no text opaque full square 1024x1024.
~~~

### 案4: 初期生成

~~~text
スマートフォンのアプリアイコン(正方形、全面塗りつぶし、1024×1024)。アプリ「もび道」(歩いて架空の御朱印を集める巡礼アプリ)。
和風。実物の和紙、墨、朱、金、麻、藍染の手ざわりのある、手作りの工芸品のような絵。光沢のある 3D レンダリング風
(つるつる、ガラスの反射、CG 的なグラデーション)は禁止。縁は筆で引いたかすれ。光源は左上の柔らかい自然光。
参照画像のアプリロゴ(円の中の鳥居とモビー)を、形と配色を変えずに、絵の中心の主役にする。
参照画像の3体のキャラクター(もびりん、モビ坊、ばぶモビー)を、造形をそのままに、すべて入れる。
文字・数字・透かしを描かない。透過はなし、角丸にしない。
Image1 exact emblem, Image2 yellow Mobirin felt hat gold camera eye moustache pipe dpad, Image3 dark Mobibou red cap forelock bag raised hand camera eye dpad, Image4 seated pink baby bonnet bib paw soles camera eye dpad. Preserve source shapes and accessory positions, no redesign. Large clear separate silhouettes at 60px, important features inside x/y 100..924. Full logo pictorial content visible and dominant. Matte handmade textures, no glossy CG.
案4 藍染と青海波: 濃い藍の木綿、白い糸目、淡い藍の大きな青海波を少数。中央円ロゴは原本そのまま、その外縁の外側に細い金縁。もびりんが円の左、モビ坊が円の右、円を支えるような三角配置。ばぶモビー円の真下で座る。上下対称の案1とは違い左右に大きく配置。黒朱藍金生成り、落ち着いた工芸。
Strict safety: full emblem top >=110px, three character complete silhouettes and extremities all within x=110..914 y=110..914, no clipping. Logo width 560..620px, do not enlarge beyond 64%. 
~~~

### 案4: 調整1

~~~text
Use case precise-object-edit. Image1 edit target. Keep its style, character identity, accessories, logo exact artwork, texture colors. Change only layout safety: shrink foreground emblem+3 characters group uniformly to 80% current size around center, so ALL foreground fits inside x=120..904,y=120..904 of 1024px canvas. Continue same background across full square seamlessly. Need 120px perimeter of background on all four sides. No character clipped. No rounded corners no text opaque full square 1024x1024. Also raise yellow and dark characters to FLANK the circle on left and right at its vertical midpoint, baby stays beneath circle, so this becomes a diamond composition rather than bottom row. Circle center (512,410), yellow center(240,510), dark center(784,510), seated baby center(512,790).
~~~

### 案4: 調整2

~~~text
Image1 edit target. Change ONLY background material to authentic INDIGO-DYED COTTON CLOTH with visible soft white yarn weave, NOT crumpled washi or paper. Keep large sparse pale indigo seigaiha waves, gold accents, exact foreground logo and three characters positions sizes colors textures unchanged. Matte hand dyed textile, no glossy3D. Opaque full square no text no rounded corners.
~~~

### 案5: 初期生成

~~~text
スマートフォンのアプリアイコン(正方形、全面塗りつぶし、1024×1024)。アプリ「もび道」(歩いて架空の御朱印を集める巡礼アプリ)。
和風。実物の和紙、墨、朱、金、麻、藍染の手ざわりのある、手作りの工芸品のような絵。光沢のある 3D レンダリング風
(つるつる、ガラスの反射、CG 的なグラデーション)は禁止。縁は筆で引いたかすれ。光源は左上の柔らかい自然光。
参照画像のアプリロゴ(円の中の鳥居とモビー)を、形と配色を変えずに、絵の中心の主役にする。
参照画像の3体のキャラクター(もびりん、モビ坊、ばぶモビー)を、造形をそのままに、すべて入れる。
文字・数字・透かしを描かない。透過はなし、角丸にしない。
Image1 exact emblem, Image2 yellow Mobirin felt hat gold camera eye moustache pipe dpad, Image3 dark Mobibou red cap forelock bag raised hand camera eye dpad, Image4 seated pink baby bonnet bib paw soles camera eye dpad. Preserve source shapes and accessory positions, no redesign. Large clear separate silhouettes at 60px, important features inside x/y 100..924. Full logo pictorial content visible and dominant. Matte handmade textures, no glossy CG.
案5 桜の山道: 淡い桜色と若草色の和紙水彩の霞。大きめ桜花びら6枚のみ。中央円ロゴ原本を忠実に、その背後に曲がって上る山道。もびりん左側で灰色帽子を少し持ち上げる(パイプとひげ保持)、モビ坊右上で手を挙げる、ばぶモビー下中央で座って見上げる。造形と片目カメラ、ボタン、小物を保つ。明るく親しみやすい動的非対称構図。
Strict safety: full emblem top >=110px, three character complete silhouettes and extremities all within x=110..914 y=110..914, no clipping. Logo width 560..620px, do not enlarge beyond 64%. 
~~~

### 案5: 調整1

~~~text
Use case precise-object-edit. Image1 exact edit target. Only shrink the complete circular emblem and all three characters TOGETHER to 80% current size about canvas center, to occupy within x=120..904,y=120..904 on 1024px square. Keep characters' exact faces accessories fluffy texture camera eyes dpads poses, logo artwork colors shapes. Seamlessly fill perimeter with same pale pink/young green matte washi mountain trail spring scene. No extra petals, keep six large floating petals. Full bleed square opaque no rounded corners no text. Generous 120px perimeter margin around foreground. Avoid changing relative arrangement.
~~~

### 案5: 調整2

~~~text
Image1 edit target, keep the exact foreground circular emblem and three characters unchanged including positions sizes identity colors textures accessories. ONLY simplify and quiet BACKGROUND for a readable 60px app icon. Remove all detailed flowering cherry trees, extra torii shrine and intricate foliage. Replace background with very soft pale sakura-pink and pale young-grass green washi watercolor mist, a simple winding mountain path rising BEHIND the circle. Keep EXACTLY SIX large scattered pink petals, no other blossoms. Airy light pastel background, quiet negative space.
~~~

### 案1: 不採用の追加候補プロンプト

安全余白が十分改善しなかったため、初回候補を編集した結果を採用。

~~~text
スマートフォンのアプリアイコン(正方形、全面塗りつぶし、1024×1024)。アプリ「もび道」(歩いて架空の御朱印を集める巡礼アプリ)。
和風。実物の和紙、墨、朱、金、麻、藍染の手ざわりのある、手作りの工芸品のような絵。光沢のある 3D レンダリング風
(つるつる、ガラスの反射、CG 的なグラデーション)は禁止。縁は筆で引いたかすれ。光源は左上の柔らかい自然光。
参照画像のアプリロゴ(円の中の鳥居とモビー)を、形と配色を変えずに、絵の中心の主役にする。
参照画像の3体のキャラクター(もびりん、モビ坊、ばぶモビー)を、造形をそのままに、すべて入れる。
文字・数字・透かしを描かない。透過はなし、角丸にしない。
Image1 exact emblem, Image2 yellow Mobirin felt hat gold camera eye moustache pipe dpad, Image3 dark Mobibou red cap forelock bag raised hand camera eye dpad, Image4 seated pink baby bonnet bib paw soles camera eye dpad. Preserve source shapes and accessory positions, no redesign. Large clear separate silhouettes at 60px, important features inside x/y 100..924. Full logo pictorial content visible and dominant. Matte handmade textures, no glossy CG.
案1: 深い褪せた朱の和紙、金の細い霞。中央に幅60%の大きな円ロゴ。左下もびりん、右下モビ坊、下中央ばぶモビー。ほぼ左右対称で安定。3体はロゴ底辺に少し重なり、ロゴの顔を隠さない。
厳密な安全余白: ロゴの最上端はy=110以上、円の幅は600px。全キャラの全身と手、帽子、パイプはx=110..914,y=110..914以内。三体を底辺に詰めず少し上へ。金霞は細く少ない。
~~~
