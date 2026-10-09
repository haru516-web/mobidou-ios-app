# イベント感を出す箇所の分析（2026-10-09）

ねらい: イベントの画面に入った瞬間に「イベントだ！」と分かるよう、**画面の背景・ガチャの舞台・木箱・ポップアップ・演出の舞台**を、イベント専用の見た目にする。共通の色は**藍（#2F4A6B）と金（#C9A24B）**、中身は**昭和のネオンと平成のキラキラ**。

## いま、イベントの中でも通常と同じ見た目の箇所

| 画面・部品 | いまの素材 | イベント専用にする？ | 優先 |
|---|---|---|---|
| **ガチャの舞台**（背景、左右のカーテン、上の飾り幕） | `assets/gacha/stage-bg.webp` ほか | する | **最優先** |
| **ガチャの木箱**（本体、前面、影） | `assets/gacha/box-body.webp` ほか | する（「時の宝箱」） | **最優先** |
| ガチャのひも、光（芯と放射） | `rope.webp`、`glow-core.webp`、`glow-rays.webp` | する | 最優先 |
| ガチャの下のパネル（ひく・詳細・とじる） | `ui-round8/gacha/panel-dark-v1.webp` | する | 高 |
| **イベントのポップアップ**（開催中・過去） | `ui-washi/goshuin/index-popup.webp`（吊り下げ巻物） | する | **高** |
| イベント画面のシート（チーム・マップ） | `ui-round7/sheet/sheet-bg-v1.webp`、`sheet-header-v1.webp`、`section-plate-v1.webp` | する | 高 |
| 地点到達の参拝演出の舞台 | `ui-round3/pilgrimage/ceremony-stage.webp`、`ceremony-gate.webp` | する（「時のゲート」） | 高 |
| 御朱印・ミニチュアの詳細ポップアップの背景 | `ui-round3/backgrounds/goshuin-detail-washi-v1.webp` | する | 中 |
| おでかけ画面の背景（イベントモード） | `ui-round3/backgrounds/outing/daily-omikuji-shrine-v1.webp` | する | 中 |
| 歩数の円（イベントモード） | `ui-washi/walk/enso-stroke.webp`、`enso-track.webp` | する（金と虹の筆） | 中 |
| 御朱印帳画面の背景（イベントモード） | `ui-round3/backgrounds/mobidou-goshuin-book-background-v3.webp` | する | 中 |
| コレクション展示室の背景（イベントモード） | `ui-round3/collection/collection-room-harmony-v6.webp` | する（棚と柱の位置は同じ） | 中 |
| 「通常／イベント」の木の札 | `ui-washi/collection/tab-plaque.webp`、`tab-plaque-active.webp` | する（藍の札） | 低 |
| ガチャの運び屋（モビーが箱を運ぶシート） | `assets/gacha/cart/*.webp`（8コマ×2、3075×1025） | **しない**（重い。通常のまま） | — |

コードだけでできること（画像不要）は、私のほうで入れる: イベントの通知バナーの色、見出しの色、演出の光の色（金と虹）、効果音の差し替え。

## 作り方の方針
- **形・大きさ・位置は、いまの画像と同じにする。** 箱の輪郭や開く位置、カーテンの幅、巻物の紙の範囲、棚と柱の高さ、九分割の固定幅は、コードがその前提で組まれている。変えるのは**表面の絵柄・色・質感**だけ。
- 同じファイル名の `event-` 付き（例: `event-stage-bg.webp`）で、`assets/event-toki/feel/` の下に置く。コードは、イベントのときだけそのファイルに差し替える。
- 文字は入れない。

## 実装の順序
1. 画像（Codex）: バッチE1 ガチャ一式 → E2 ポップアップ・シート → E3 演出・背景 → E4 小物。
2. コード（私）: ガチャ画面・巻物・シート・演出・背景に「イベントの見た目」を切り替える仕掛けを入れる（画像が届いたものから順に）。
3. 実機相当の確認（ブラウザ）。
