# Codex 向け: イベント限定モビー4体の動作素材（歩く・のぞき見・参拝・おみくじ、続けて引っ張り）

イベント限定の4体は、静止画（`assets/mobies/<id>.webp`）しかなく、動きのある画面で静止画や汎用の動作に落ちている。既存のモビーと同じ形式の素材を、4体ぶん作る。

| 章 | 名前 | id | 静止画（元にする絵） | 特徴 |
|---|---|---|---|---|
| 平成 | 翔太モビー | `shotamobby` | `assets/mobies/shotamobby.webp` | 茶髪のロン毛、サングラスを頭に、ヒョウ柄の襟のライダース、チェーンとペンダント |
| 平成 | さとみモビー | `satomimobby` | `assets/mobies/satomimobby.webp` | 金髪とピンクのメッシュ、ハイビスカス、ピンクのサングラス、ヒョウ柄とビーズ |
| 昭和 | のりこモビー | `norikomobby` | `assets/mobies/norikomobby.webp` | 黒い巻き髪のリーゼント風、リボン、サングラス、金の刺繍と金ボタンの白い上着 |
| 昭和 | やすモビー | `yasumobby` | `assets/mobies/yasumobby.webp` | 角刈り、サングラス、白い上着と黒いボンタン風のズボン、チェーン |

元の絵（背景つき）は `assets/mobies/reference/event/<id>-source.webp`。**デザインは静止画のまま**。髪型・服・小物・色・顔（大きな目とレンズの目）・胸のゲームパッドを変えない。

## 共通ルール
- 既存モビーの同種の素材と、**同じ形式・同じ並び・同じ寸法**にする。参考は `ojimobby`（`assets/mobies/**/ojimobby*`）と `mobibou`。コードはこちらで合わせるので、寸法と並びを変えない。
- 背景は**本物の透明**（アルファ）。市松模様や白い縁を絵として残さない。毛の細かい端はきれいに残す。
- 画像内に文字を描かない。実在のブランド・ロゴ・キャラクターを描かない。
- 全フレームで、体の大きさ・色・小物の位置・顔の作りがぶれないこと（フレーム間で服や髪が変わらない）。
- 形式は WebP（品質90前後）。容量は、同種の既存素材と同程度まで。
- コードは触らない。追加は `assets/` と、確認画像、`MANIFEST` と記録だけ。

## フェーズ1: 動きのある素材（4体 × 5種）

| # | 種類 | 保存先 | 寸法 | 並び |
|---|---|---|---|---|
| 1 | 歩く | `assets/mobies/pilgrimage-walk/<id>.webp` | 1536×1024 | 横に4コマ（各384×1024）: 接地、沈み、通過、持ち上げ。足元の基準線を4コマで共通にする。参考: `ojimobby.webp` |
| 2 | のぞき見 | `assets/mobies/pilgrimage-walk/<id>-map-peek.webp` | 1536×1024 | 1枚。画面の下の縁から、両手を縁にかけて顔を出す構図。下端は体を切った形（`ojimobby-map-peek.webp` と同じ）。 |
| 3 | 参拝・礼 | `assets/mobies/prayer-v2/<id>/rei.webp` | 4112×514 | 横に8コマ（各514×514、コマの間に1pxの透明な余白）。立つ→前に傾く→深く礼→戻る。 |
| 4 | 参拝・拍手 | `assets/mobies/prayer-v2/<id>/hakushu.webp` | 4112×514 | 横に8コマ（同上）。立つ→手を合わせる→合わせたまま小さく拍手する→戻る。 |
| 5 | おみくじ | `assets/mobies/omikuji/<id>/draw-v2.webp` | 1680×210 | 横に8コマ（各210×210）。コマ0〜4: 筒を両手で持って振る（紙は筒の中）。コマ5〜7: 紙が出て、広げる。参考: `omikuji/ojimobby/draw-v2.webp` |

注意:
- 3と4の8コマは、静止画（待機）と同じ大きさ・同じ足元で始まって終わる。待機から参拝へ切り替えたとき、体が跳ねないこと。
- 5のおみくじの筒は、既存と同じ赤い筒にする。衣装の色と筒がぶつかる場合は、筒を既存のままにして、衣装を変えない。
- 参考にする既存素材は、必ず実際に見て、並び・向き・間合いをそろえる。

### フェーズ1の確認
- 4体 × 5種を、`docs/event-mobby-motion-verification/` に、確認画像として出す（濃い背景 `#302D25` と明るい背景 `#C79A62` の上）。
- 寸法・アルファ・容量を一覧にする（`docs/event-mobby-motion-verification/sizes.md`）。
- `ojimobby` の同種素材と並べて、大きさが極端に違わないこと。

## フェーズ2: 引っ張り（フェーズ1のあと、4体）

ほっぺを引っ張る機能の素材。仕組みは `assets/mobies/pull/README.md` と `docs/codex-pull-body-prompts.md` を読む。体から目だけを抜いた画像と、胸のパーツを別に切り出す。

| # | 種類 | 保存先 | 寸法 |
|---|---|---|---|
| 6 | 体（通常の目だけを抜いたもの） | `assets/mobies/pull/<short>-body-clean.webp` | 1254×1254 |
| 7 | レンズ | `assets/mobies/pull/<short>-lens.webp` | 1254×1254（同じ位置に、パーツだけを残す） |
| 8 | 十字キー | `assets/mobies/pull/<short>-cross.webp` | 1254×1254 |
| 9 | 丸ボタン左 | `assets/mobies/pull/<short>-button-left.webp` | 1254×1254 |
| 10 | 丸ボタン右 | `assets/mobies/pull/<short>-button-right.webp` | 1254×1254 |

`<short>` は、`shota` `satomi` `noriko` `yasu`。体の画像は、足元に市松模様が残らないこと（`docs/codex-pull-body-prompts.md` の注意を守る）。目と口の差分は、既存の共通素材を使うので、作らない。アンカー座標と GL テクスチャは、こちらのスクリプト（`scripts/measure-pull-part-anchors.cjs`、`scripts/build-pull-gl-textures.cjs`）で作るので、触らない。

## 手順と報告
1. まず、フェーズ1を、**1体（`shotamobby`）だけ**作って、確認画像を出す。問題がなければ、残り3体へ。
2. 4体そろったらコミット（寸法と容量を書く）。続けてフェーズ2。
3. 条件を満たしていれば、そこで止める。細かい磨き込みや全点の再生成はしない。具体的に足りない素材だけを直す。
4. コミットは `codex/event-mobby-motion` にだけ。push と PR はしない。

---

# 簡易プロンプト（Codex に貼る）

```
ブランチ codex/event-mobby-motion のワークツリー D:/mobby/mobidou-event-motion で作業してください（作成済み。node_modules が必要なら D:/mobby/mobidou-events のものを参照）。
先に docs/codex-event-mobby-motion.md を読んでください（git show claude/events:docs/codex-event-mobby-motion.md でも読めます）。

やること: イベント限定モビー4体（shotamobby、satomimobby、norikomobby、yasumobby）の動作素材を作る。静止画 assets/mobies/<id>.webp のデザインを変えず、既存モビー（ojimobby、mobibou）と同じ寸法・並び・形式にする。
フェーズ1（まず shotamobby だけ作って確認画像を出し、問題なければ残り3体）:
- 歩く 1536×1024（4コマ横並び）: assets/mobies/pilgrimage-walk/<id>.webp
- のぞき見 1536×1024: assets/mobies/pilgrimage-walk/<id>-map-peek.webp
- 参拝 4112×514（8コマ）2種: assets/mobies/prayer-v2/<id>/rei.webp と hakushu.webp
- おみくじ 1680×210（8コマ）: assets/mobies/omikuji/<id>/draw-v2.webp
参考は assets/mobies/**/ojimobby* を実際に見て、並び・向き・足元の基準線をそろえる。
背景は本物の透明。文字は描かない。全コマで体の大きさ・色・服・顔がぶれないこと。
確認画像（濃い #302D25 と明るい #C79A62 の背景）と寸法・容量の一覧を docs/event-mobby-motion-verification/ に出す。
フェーズ2（引っ張り。フェーズ1のあと）: 書類の表のとおり、体と胸のパーツ4つ（各1254×1254）を assets/mobies/pull/ に。
コードは触らない。時間を節約したいので、条件を満たしていればそこで止めてください。全点の再生成はしない。コミットは codex/event-mobby-motion にだけ（push と PR はしない）。
```
