# 参拝3D環境・リアル版

作業日: 2026-11-01。作業場所: `.worktrees/prayer-first-person`、ブランチ: `codex/prayer-first-person`。
既存の `shrine-world.blend` / `.glb` / `-preview.png` は上書きしない。リアル版の編集用Blendとアプリ用GLBは別ファイルとして作成。リアル版のGLBは参拝画面の3D背景として接続する。

## 成果物

- `assets/prayer-first-person/shrine-world-realistic.blend`: 部材を編集できるシーン。既存2Dの `walk.png` をカメラ前に配置。外部画像はパックする。
- `assets/prayer-first-person/shrine-world-realistic.glb`: 環境のみ。2Dの手・カメラ・照明・HDRI・非表示の旧樹木は含めない。描画用に材質ごとに部材を結合する。
- `assets/prayer-first-person/shrine-world-realistic-preview.png`: 720×1280、一人称カメラからのCyclesレンダー。
- `assets/prayer-first-person/shrine-world-realistic-prayer-preview.png`: 拝殿へ近づいた別カメラ、720×1280。

アプリ用GLBはモバイル向けに最大1Kのテクスチャで書き出す。環境背景にはPoly HavenのForest Slopeから変換した `shrine-sky.jpg` を使う。GLBへ背景や照明は含めず、アプリ側でHDRI背景画像、環境反射、環境光、トーンマッピングを設定する。

## 使用素材・ライセンス

全てPoly Haven公式配布。CC0 1.0。商用利用・改変・再配布可、著作者表示は必須ではない。出典を保持するため以下を記録する。
公式ライセンス: https://polyhaven.com/license
CC0: https://creativecommons.org/publicdomain/zero/1.0/

| 素材 | 作者 | 使用箇所 | 出典 |
|---|---|---|---|
| Stone Tiles 02 | Charlotte Baglioni | 石畳・灯籠等の石材。2Kカラー・粗さ・法線 | https://polyhaven.com/a/stone_tiles_02 |
| Forest Slope | Andreas Mischok | 森林の環境光・背景、2K HDRI | https://polyhaven.com/a/forest_slope |
| Pine Tree 01 の画像素材 | Rob Tuytel（撮影）、Rico Cilliers（元モデル） | 樹皮・針葉写真を自作の立体樹木に適用、1K。元の高密度モデルは最終環境に不使用 | https://polyhaven.com/a/pine_tree_01 |
| Rock Moss Set 01 | Kless Gyzen | 苔石の実物系3Dモデル、1Kテクスチャ | https://polyhaven.com/a/rock_moss_set_01 |
| Forest Floor | eye-candy.xyz | 参道脇の土・落ち葉、2Kカラー・粗さ・法線 | https://polyhaven.com/a/forest_floor |
| Wood Planks Dirt | Rob Tuytel | 拝殿・手水舎等の風化木部、2Kカラー・粗さ・法線 | https://polyhaven.com/a/wood_planks_dirt |

任意のクレジット例: “Environment assets from Poly Haven (CC0): Charlotte Baglioni, Andreas Mischok, Rob Tuytel, Rico Cilliers, Kless Gyzen, eye-candy.xyz.”

建築の細部、材質のばらつき、樹木の配置と枝葉の立体形状はBlender内で制作。キャラクターの3Dモデルは制作していない。手はリポジトリ既存の2D `walk.png` を使用し、原画像を改変していない。
枝葉の透過画像は公式のalphaとmaskを乗算し、カラーと同じRGBA画像へ格納。元アトラスの針葉部分だけをUVで参照する。試作の丸い樹冠・苔クッション・動物型の石像は非表示で残す。

`realistic-sources/<asset>/info.json` に公式作者情報、`files.json` に取得時のURL・MD5情報を保存。`scripts/fetch-shrine-cc0.ps1` は取得ファイルを公式MD5と照合する。Poly Haven APIを使用した取得処理: Powered by Poly Haven。

## ライブラリ状態と制作方法

Blender MCP 1.8 / Blender 5.2.0 LTSに接続。ユーザー指示によりPoly Haven・Poly Pizzaのチェックを有効化。Poly Havenの利用成功を確認。Poly PizzaはAPIキー未設定のため利用不可で、同ライブラリの素材は使用しない。有料素材・課金生成は不使用。

松の高密度モデルのMCP取得はタイムアウト後に遅れて完了した。最終成果物には使用せず、公式APIで画像と苔石モデルを別途取得。既存試作をバックグラウンドBlenderで読み込み、別名で保存する。ライブBlenderで開かれていた元の試作は保存しない。

## 参拝画面への接続

`src/components/FirstPersonPrayer.tsx` が従来の参拝14ステップと入力・音・触覚を管理し、背景部分を `Prayer3DWorld` に差し替える。GLBの環境に3Dカメラを重ね、歩行、拝殿前での礼、柏手、願い事、振り返り、帰路を既存の2D手素材とともに表示する。3Dキャラクターは使わない。

MetroにはGLBをアセット形式として登録し、`app.json` のAsset設定へ追加する。3Dワールドと手素材の両方が読み込まれた後に参拝操作を有効にする。

## 再現と確認範囲

素材取得後、既存試作を `scripts/refine-shrine-realistic.py` で精細化し、`scripts/finalize-shrine-realistic.py` で仕上げ・書き出す。最終プレビューはレンダー後に画像として確認する。

GLBにはCyclesの照明・環境背景は入らない。アプリ側で環境光・露出・トーンマッピング・カメラと2D手の重ね合わせを設定する。アプリの型チェックとWeb書き出しで読み込み経路を確認する。iOS/Android実機の見え方・フレームレートは未検証。720×1280のオフラインレンダーと実機品質を同一と扱わない。

検証記録: `realistic-glb-roundtrip.json` は空のBlenderへのGLB再読み込み結果（27メッシュ、21画像、画像解決成功、カメラ・照明・手なし）。`realistic-environment-validation.json` は成果物の形式・寸法・容量・SHA-256とGLB構造の検査結果。入口側の露出と画角、枝葉の透過、拝殿側の手首の画面下への接続を画像で確認する。

照明の再現目安: Forest Slope強度0.65、太陽強度3.0、前方の大きな面光源1800W・直径8m、AgX・露出+0.65。入口カメラはBlender座標(-0.16, -15.6, 1.63)、焦点距離27mm。拝殿側は(0.65, -0.8, 1.63)、23mm。レンダラー間では露出や光源単位が異なるため、これらの値だけで同じ見え方になるとは保証しない。
