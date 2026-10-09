# Codex 向け イベント専用の画面素材（イベント感）

分析と全体像は `docs/event-feel-plan.md`。ここでは画像だけを依頼する。テーマと禁止事項は `docs/codex-event-assets-taste.md` と同じ（藍と金の縁、昭和のネオンと平成のキラキラ、**当時の新品**、実在のブランド名・ロゴ・商品名・キャラクターを描かない、暴走族・不良の描写をしない）。

## 共通ルール（重要）
- **既存の画像と、同じ大きさ・同じ透過/不透過・同じ位置関係で作る。** コードは既存画像の形を前提に組まれているので、輪郭や位置が変わると崩れる。作る前に、対応する既存画像を開き、重ねて見比べながら、**表面の絵柄・色・質感だけ**をイベント用に描き直す。
- 置き場所: `assets/event-toki/feel/`。ファイル名は `event-` を頭につけた同名（例: 既存 `gacha/stage-bg.webp` → `feel/gacha/event-stage-bg.webp`）。形式は WebP 品質90。
- 画像内に文字は描かない。
- 色: 藍（#2F4A6B）と金（#C9A24B）が基調。差し色は、昭和側のネオン（マゼンタ、シアン、ナトリウム灯のオレンジ）と、平成側のパステル（ピンク、水色）とホログラムの虹。
- 読みやすさ: 文字やボタンが重なる面（巻物の紙、シートの背景、パネル）は、**明るさと落ち着きを保つ**（柄は縁に寄せ、中央は無地寄り）。
- 時間を節約するため、条件を満たしていればそこで止める。磨き込みや全点の再生成はしない。コミットはバッチごとに1回。MANIFEST にはファイル名・寸法・容量だけ。確認用画像は、バッチごとに「既存（左）／イベント版（右）」を並べた1枚だけ。

## バッチE1: ガチャの舞台と木箱（最優先）

| 既存 → 新規 | 寸法・形式 | 内容 |
|---|---|---|
| `assets/gacha/stage-bg.webp` → `feel/gacha/event-stage-bg.webp` | 1170×2532、不透過 | 舞台の背景。藍の床と壁、金の梁、奥に昭和の夜街と平成の昼のキラキラが、左右に分かれて見える（中央は暗めで、箱が目立つ） |
| `curtain-left.webp` / `curtain-right.webp` → `event-curtain-left.webp` / `event-curtain-right.webp` | 各700×2532、透過 | 左は**昭和のネオン**（深い紫紺に、マゼンタ・シアンのネオン管の縞）、右は**平成のホログラム**（パステルのグラデーションにラメと虹の光沢）。ひだと形は既存と同じ |
| `curtain-valance.webp` → `event-curtain-valance.webp` | 1170×320、透過 | 上の飾り幕。藍に金の縁と房飾り、中央に小さな金の紋（昭和の車と平成のハートを組んだ意匠、文字なし） |
| `box-body.webp` / `box-front.webp` → `event-box-body.webp` / `event-box-front.webp` | 各880×1280、透過 | **「時の宝箱」**。木箱の形と開く位置は既存と**完全に同じ**。表面だけ、藍の漆塗りの木箱に金の金具、前面の中央に金の紋（昭和の車と平成のハート）、縁にネオンとホログラムの細い線 |
| `box-shadow.webp` → `event-box-shadow.webp` | 1024×300、透過 | 形は同じ（色味だけ藍がかった影） |
| `rope.webp` → `event-rope.webp` | 256×1024、透過 | ひも。上は藍×白のねじり、下に向かってピンク×水色の編みに変わり、先端に金のタッセル。太さと結び目の位置は既存と同じ |
| `glow-core.webp` / `glow-rays.webp` → `event-glow-core.webp` / `event-glow-rays.webp` | 各1024×1024、透過 | 箱が開くときの光。金を主役に、縁に虹色のホログラム。形（放射の本数、芯の大きさ）は既存と同じ |
| `ui-round8/gacha/panel-dark-v1.webp` → `event-panel-dark.webp` | 1024×512、透過、**九分割**（四隅110px固定） | 下のパネル。深い藍の漆に金の細線、角に小さな金具。中央は無地寄りで、明るい文字と赤いボタンが乗っても読める |

運び屋のシート（`assets/gacha/cart/*`）は作らない（通常のまま使う）。

## バッチE2: ポップアップとシート

| 既存 → 新規 | 寸法・形式 | 内容 |
|---|---|---|
| `assets/ui-washi/goshuin/index-popup.webp` → `feel/popup/event-scroll.webp` | 1024×1400、透過 | 吊り下げ巻物。**紙の範囲・上下の軸・縁の位置は既存と同じ**。軸と房は藍×金、紙は明るいクリーム色のまま（文字が乗る）、縁に昭和のネオンと平成のホログラムの細い線 |
| `assets/ui-round7/sheet/sheet-bg-v1.webp` → `feel/sheet/event-sheet-bg.webp` | 1170×2532、不透過 | シートの背景。明るい和紙を基調に、縁と四隅だけ藍と金、昭和と平成の透かし模様（薄く） |
| `sheet-header-v1.webp` → `event-sheet-header.webp` | 1536×192、不透過、**横三分割**（左右96px固定） | シートの見出し帯。藍に金の線、左端に昭和のネオン管、右端に平成のホログラムの星 |
| `section-plate-v1.webp` → `event-section-plate.webp` | 480×72、透過、横三分割（左右36px固定） | 小見出しの札。藍の札に金の縁 |
| `assets/ui-round3/backgrounds/goshuin-detail-washi-v1.webp` → `feel/popup/event-detail-bg.webp` | 1024×1536、不透過 | 詳細ポップアップの背景。和紙の上に、縁に藍と金の飾り罫、四隅に昭和と平成の小さな意匠 |

## バッチE3: 参拝演出と画面の背景

| 既存 → 新規 | 寸法・形式 | 内容 |
|---|---|---|
| `assets/ui-round3/pilgrimage/ceremony-stage.webp` → `feel/ceremony/event-ceremony-stage.webp` | 1536×1024、不透過 | 演出の舞台。奥の一本道が、手前の昭和の夜街（ネオン）から奥の平成の桜と青空へつながる。モビーが歩く床の位置と高さは既存と同じ |
| `ceremony-gate.webp` → `event-ceremony-gate.webp` | 1214×1295、透過 | **「時のゲート」**。鳥居の形と柱の位置は既存と同じ。藍と金の鳥居に、ネオン管の縁取りとホログラムのしめ縄 |
| `assets/ui-round3/backgrounds/outing/daily-omikuji-shrine-v1.webp` → `feel/background/event-outing.webp` | 1024×1536、不透過 | おでかけ（イベントモード）の背景。中央は落ち着かせ（歩数の円と文字が乗る）、周りに昭和のネオン街から平成の桜の道へ |
| `assets/ui-round3/backgrounds/mobidou-goshuin-book-background-v3.webp` → `feel/background/event-book-bg.webp` | 941×1672、不透過 | 御朱印帳画面の背景。藍の机と金の縁、昭和と平成の小物の影 |
| `assets/ui-round3/collection/collection-room-harmony-v6.webp` → `feel/background/event-collection-room.webp` | 1024×2240、不透過 | 展示室。**上の棚（ミニチュアを吊る横木）と下の棚（御朱印を立てる棚）、柱の位置と高さは既存とまったく同じ**。壁と柱を藍と金に、棚に小さなネオン管 |

## バッチE4: 小物

| 既存 → 新規 | 寸法・形式 | 内容 |
|---|---|---|
| `assets/ui-washi/collection/tab-plaque.webp` / `tab-plaque-active.webp` → `feel/small/event-tab-plaque.webp` / `event-tab-plaque-active.webp` | 各640×192、透過 | 「通常／イベント」の札。藍の札に金の縁（選択中は金が強く光る） |
| `assets/ui-washi/walk/enso-stroke.webp` / `enso-track.webp` → `feel/small/event-enso-stroke.webp` / `event-enso-track.webp` | 各1024×1024、透過 | 歩数の円。筆の形は既存と同じ。ストロークは金から虹へ、トラックは薄い金 |

---

# 簡易プロンプト

```
ブランチ codex/event-assets のワークツリー D:/mobby/mobidou-event-assets で作業してください（D:/mobby/mobidou-events と D:/mobby/mobidou-claude は編集しない）。まず `git merge claude/events` で最新にしてください。
文書は docs/codex-event-feel-assets.md（今回の指示）と docs/event-feel-plan.md（分析）です（`git show claude/events:docs/codex-event-feel-assets.md` でも読めます）。テーマと禁止事項は docs/codex-event-assets-taste.md と同じです。

やること: イベント「時をめぐる道」のガチャの舞台・木箱・ポップアップ・演出などを、イベント専用の見た目にします。まずバッチE1（ガチャの舞台と木箱、10点）を作ってください。
最重要: 既存の画像と、同じ大きさ・同じ透過/不透過・同じ位置関係で作ります。コードは既存画像の形を前提に組まれているので、輪郭や位置が変わると崩れます。作る前に、対応する既存画像を開き、重ねて見比べながら、表面の絵柄・色・質感だけをイベント用（藍と金、昭和のネオンと平成のキラキラ）に描き直してください。木箱の形と開く位置、カーテンのひだ、ひもの太さと結び目、光の放射の本数は、既存と完全に同じにします。
ファイルは assets/event-toki/feel/ の下に、既存と同名で頭に event- をつけて置く（表は文書のとおり）。WebP品質90。画像内に文字は描かない。
進め方（時間を節約したいので）: 条件を満たしていればそこで止める。磨き込みや全点の再生成はしない。コミットはバッチごとに1回、MANIFEST にはファイル名・寸法・容量だけ。確認用画像は「既存（左）／イベント版（右）」を並べた1枚だけ。E1 が終わったら報告して承認を待ち、承認後に E2、E3、E4 を同じ要領で作ってください。
禁止: 実在のブランド名・ロゴ・商品名・キャラクターを描かない、暴走族・不良の描写をしない、コードを触らない（追加は assets/event-toki/ と MANIFEST のみ）。
```
