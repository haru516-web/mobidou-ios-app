# Codex 向け UI アセット 第7弾(通知・プレゼント・フレンド画面)

通知、プレゼントボックス、フレンドの3画面(`src/components/SocialSheets.tsx`)で、画像アセットを使っていない部分を専用画像に置き換えます。
作業の進め方と共通スタイルは `docs/codex-ui-asset-prompts-round3.md` の「0. 進め方」「1. 共通スタイル指示」、第6弾(`docs/codex-ui-asset-prompts-round6.md`)の運用と同じです。

- **ワークツリーとブランチは Codex 自身が作る。**
  `D:/mobby/mobidou-claude` で `git worktree add D:/mobby/mobidou-ui-assets7 -b codex/ui-assets-round7 claude/ui-navigation-overhaul` を実行する(同名があれば中身を確認して再利用)。
  `node_modules` は新規インストールせず、`D:/mobby/mobidou-claude/node_modules` へのジャンクションで共有する。
- **コードは触らない。** 追加してよいのは `assets/ui-round7/` 配下の画像と `assets/ui-round7/MANIFEST.md`(ファイル、寸法、用途、スライス指定)だけ。差し替えは Claude がコード側で行う。
- 出力は WebP(品質90前後、アルファ維持)。原本 PNG は残さない。画像ごとに1コミット。
- 生成のたびに、既存の `assets/ui-round3/ui/`(card-frame、button-*、input-frame)、`assets/ui-round3/icons/`、`assets/ui-washi/common/`、`assets/ui-round5/shop/` を開き、**線の太さ・和紙・漆・墨・色味をそろえる**。
- 画像の中に、文字・数字・ロゴを描かない。
- 伸縮する板(plate / strip / frame)は、**四隅や両端の固定幅を MANIFEST に書き**、中央を引き伸ばしても模様が崩れない(中央は無地寄り)ようにする。
- 縮小確認画像(実表示サイズ)をコミットせずに作る。

## 現状の洗い出し(画像を使っていない箇所)

| 画面 | 箇所 | いま | 置き換え |
|---|---|---|---|
| 共通 | シート全体の背景 | 単色の紙色 | N-1 |
| 共通 | ヘッダー(タイトル行と下線) | 単色+細線 | N-2 |
| 共通 | セクション見出し(やること/できごと等) | 文字のみ | N-3 |
| 共通 | 空状態(点線の枠+小アイコン) | 点線枠 | N-4(3枚) |
| 共通 | オフライン案内の帯 | 薄茶の角丸 | N-5 |
| 通知 | 種別アイコンの丸(やること/いまの旅/できごと) | 単色の丸+線アイコン | N-6(3枚) |
| 通知 | 未読の点 | 単色の丸 | N-7 |
| 通知 | 「見る」系ボタン(小) | 線の角丸 | N-8 |
| プレゼント | カード上部のギフトアイコン | 線アイコン | N-9 |
| プレゼント | 中身の行(券+名前+個数) | 薄茶の角丸 | N-10 |
| プレゼント | 「受け取り済み」表示 | 文字のみ | N-11 |
| フレンド | アバターの縁 | 単色の円 | N-12 |
| フレンド | 自分のフレンドコード欄 | 文字のみ | N-13 |
| フレンド | 共有ボタン | 単色の円 | 既存 `round-button.webp` を使う(新規不要) |

ボタンの主要(承認・受け取る・申請)と副次(見送る)は、既存の `button-primary` / `button-secondary` の板をすでに使っているので新規不要。

## 作るもの

### N-1 シート背景 `assets/ui-round7/sheet/sheet-bg-v1.webp`(1170×2532、不透明)
縦長の和紙の面。繊維が淡く見える程度で、文字を読む邪魔にならない。左右の縁をわずかに濃く、中央は明るい。`ui-washi/settings/settings-bg.webp` と並べて違和感がない色味・粒度。

### N-2 ヘッダー板 `assets/ui-round7/sheet/sheet-header-v1.webp`(1536×192、不透明)
シート最上部のタイトル行の背景。上端はシートの縁に合わせてまっすぐ、下端は墨の筆でさっと引いた細い線(かすれ)。中央は無地寄りで、左右 96px は固定の端。タイトル文字は重ねるので何も描かない。

### N-3 見出し板 `assets/ui-round7/sheet/section-plate-v1.webp`(480×72、透過)
セクション見出し(文字は「やること」「受け取れるプレゼント」など最大10字)の下に敷く、淡い和紙の短冊+左端に小さな朱の点。`ui-round5/shop/heading-plate.webp` と同系統だが、より小さく控えめ。横3分割、左右 36px 固定。

### N-4 空状態のカット 3枚(各 256×192、透過)
空の状態の中央に出す、小さな手描きの絵。点線枠の代わり。
- `assets/ui-round7/empty/empty-notices-v1.webp`: 静かな鈴(`icon-bell` の大きい絵版)。お知らせがない
- `assets/ui-round7/empty/empty-gifts-v1.webp`: ふたの閉じた小さな贈り物の箱(包み紙と結び紐)。プレゼントがない
- `assets/ui-round7/empty/empty-friends-v1.webp`: 並んで立つ二つの小さな足跡と、遠くの小さな灯(人物は描かない)。フレンドがいない

3枚とも同じ画風・同じ余白・同じ接地影の向き(右下)で。

### N-5 案内帯 `assets/ui-round7/ui/notice-strip-v1.webp`(960×120、透過)
オフライン案内用。端の欠けた薄い和紙の帯で、左に小さな麻ひもの結び目の跡。文字は重ねるので描かない。横3分割、左右 48px 固定。色は少し黄みを足して、通常のカードと見分けられるように。

### N-6 通知の種別アイコン 3枚(各 128×128、透過)
丸い小さな印。表示は約 38px。
- `assets/ui-round7/notice/notice-todo-v1.webp`: **やること**。朱の漆の丸に、白抜きで小さな筆の「はね」(文字ではない)
- `assets/ui-round7/notice/notice-status-v1.webp`: **いまの旅**。藍墨の丸に、小さな足跡
- `assets/ui-round7/notice/notice-event-v1.webp`: **できごと**。生成り和紙の丸に、小さな朱の花
縮小して38pxでも3種の違いが色と形で分かること。

### N-7 未読の点 `assets/ui-round7/notice/unread-dot-v1.webp`(64×64、透過)
墨の筆でぽんと置いた朱の点(完全な円にしない、わずかに揺れる)。表示は約 10px。

### N-8 小ボタン板 `assets/ui-round7/ui/button-small-v1.webp`(320×96、透過)
通知カード内の「見る」ボタン用。淡い和紙に細い朱の縁。`button-secondary.webp` を小さくした印象で、縁の太さは同じ。横3分割、左右 40px 固定。押下版 `button-small-pressed-v1.webp` も作る(少し濃く、わずかに沈む)。

### N-9 ギフトのカット `assets/ui-round7/gift/gift-header-v1.webp`(128×128、透過)
プレゼントカード上部用。包み紙の小さな贈り物に朱の結び紐。`icon-gift.webp` の線画より一段細かく、縮小(約 28px)しても結び目が見える。

### N-10 中身の行板 `assets/ui-round7/gift/item-row-v1.webp`(960×128、透過)
券+名前+個数を載せる横長の台。薄い木の盆または生成りの敷き紙のような質感。左端 24px は券の置き場として少し濃く。横3分割、左右 48px 固定。

### N-11 受け取り済みの印 `assets/ui-round7/gift/stamp-received-v1.webp`(256×256、透過)
文字なしの朱の丸い印(判子)。かすれと少しの傾きで押した感じ。外周に二重の輪、中央は何も描かない(文字は重ねる)。カードに薄く重ねて使う。

### N-12 アバター縁 `assets/ui-round7/friend/avatar-ring-v1.webp`(192×192、透過)
モビ坊の顔を円で囲む縁。内径は全体の 80%(中身は透過)。墨の細い輪+外側に薄い和紙の縁取り。表示は 52〜64px。

### N-13 コード札 `assets/ui-round7/friend/code-plate-v1.webp`(960×160、透過)
フレンドコード(例 `MOBI-ABCD-2345`)を載せる横長の札。絵馬のような木の札の形で、左右どちらかに小さな紐穴(穴は左端)。中央は無地で文字が読める明るさ。横3分割、左 72px・右 40px 固定。

## 完了の報告に入れること

- 画像ごとのファイル名・寸法・容量・スライス指定(`MANIFEST.md` と同じ内容でよい)
- 実表示サイズへ縮小した確認画像のパス(コミットしない)
- コードに触っていないこと

---

# 簡易プロンプト(Codex にそのまま貼る用)

```
まず D:/mobby/mobidou-claude で、ワークツリー D:/mobby/mobidou-ui-assets7 をブランチ codex/ui-assets-round7(基点 claude/ui-navigation-overhaul)として自分で作成し、node_modules はジャンクションで共有してください。以降の作業はそのワークツリーだけで行い、D:/mobby/mobidou-claude は編集しないでください。
詳しい指示は docs/codex-ui-asset-prompts-round7.md にあります(`git show claude/ui-navigation-overhaul:docs/codex-ui-asset-prompts-round7.md` でも読めます)。

やること: 通知・プレゼント・フレンド画面用の画像 N-1〜N-13(計21枚: シート背景、ヘッダー板、見出し板、空状態3枚、案内帯、通知種別アイコン3枚、未読点、小ボタン板(通常/押下)、ギフトのカット、中身の行板、受け取り済みの印、アバター縁、コード札)を assets/ui-round7/ に作る。寸法・透過・スライス固定幅は指示書どおり。

禁止: コードは触らない(追加は assets/ui-round7/ と MANIFEST.md のみ)。画像内に文字・数字を描かない。既存の assets/ui-round3/ui/、assets/ui-washi/common/、assets/ui-round5/shop/ の和紙・漆・墨線の質感に合わせる。画像ごとに1コミット。独立した画像は並列で生成してよい。要件未達の画像だけ作り直す。
最後に、ファイル名・寸法・容量・スライス指定と、実表示サイズの縮小確認画像のパスを報告してください。
```
