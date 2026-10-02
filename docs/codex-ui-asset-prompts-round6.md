# Codex 向け UI アセット 第6弾(ガチャ木札)

ガチャを「木札(ガチャ木札)1枚で、ひもを1回引ける」仕組みにしました。木札の専用画像がまだなく、いまは仮の画像
(ホーム上部のバッジはアイコン、プレゼントの木札はガチャ箱の画像)を使っています。これを専用の画像に置き換えます。

作業の進め方と共通スタイルは `docs/codex-ui-asset-prompts-round3.md` の「0. 進め方」「1. 共通スタイル指示」と同じです。

- **ワークツリーとブランチは Codex 自身が作る。**
  `D:/mobby/mobidou-claude` で `git worktree add D:/mobby/mobidou-ui-assets6 -b codex/ui-assets-round6 claude/ui-navigation-overhaul` を実行する(同名がすでにあれば中身を確認して再利用)。
  `node_modules` は新規インストールせず、`D:/mobby/mobidou-claude/node_modules` へのジャンクションで共有する。
- **コードは触らない。** 追加してよいのは `assets/ui-round6/` 配下の画像と、`assets/ui-round6/MANIFEST.md`(ファイル、寸法、用途の一覧)だけです。差し替えは私がコード側で行います。
- 出力は WebP(品質90前後、アルファ維持)。原本 PNG は残さない。
- 画像ごとに1コミット。
- 生成のたびに、既存の画像(`assets/ui-round3/tickets/ticket-keychain-drop-v2.webp`、`assets/ui-round3/icons/`、`assets/gacha/`)を開き、**線の太さ・紙・漆・木目・色味をそろえる**。
- 画像の中に、文字・数字・ロゴを描かない(文字はアプリ側で重ねる)。
- **「木札」と「ミニチュア引換券」(`ticket-keychain-drop-v2.webp`)は別物。** 見分けがつくよう、木札は「木の札」の形・素材にし、紙の券に見せない。

## 木札とは

神社の絵馬・護符に近い、小さな木の札。1枚で、ガチャの紐を1回引ける。ホーム上部に所持数を出し、プレゼントや購入で増える。

## K-1 木札のアイコン `assets/ui-round6/icons/icon-gacha-tag.webp`(192×192、透過)

ホーム上部のバッジ(表示サイズは約 18〜22px)に使う。

```
小さな木札のアイコン。
- 題材: 上部が山形(五角形)の、小さな木の札。上端に穴が1つあり、そこに細い赤い紐が結ばれて短く垂れる。
- 表面は薄い木目。札の中央に、小さな朱の丸い印を1つだけ(文字や模様は描かない)。
- 既存の `assets/ui-round3/icons/` と同じ、手描きの墨の線画の質感。ただし木の色(明るい茶)の淡い塗りを許可する。
- 22px まで縮小しても、山形の札・紐・朱の印の3点が見分けられること。
- 透過背景。縁に白フチを出さない。
```

## K-2 木札の絵 `assets/ui-round6/tickets/ticket-gacha-tag-v1.webp`(縦長 256×384、透過)

プレゼントボックスのカードに、約 30×44px で出す。`ticket-keychain-drop-v2.webp` と同じ縦横比・同じ画面内の大きさに収まること。

```
ガチャ木札の絵。K-1 と同じ札を、細部まで描いた版。
- 山形の木札。木目、角の摩耗、上端の穴、赤と白を撚った紐。
- 札の中央に、朱の丸い印を1つ。その周りに薄い金の細い輪を一筋(かすれさせる)。
- 縮小しても、木の札だと分かること。紙の券に見えないこと。
- 透過背景。接地影は右下に薄く、物の輪郭に沿ってだけ。
```

## K-3 木札の山(任意)`assets/ui-round6/tickets/ticket-gacha-tag-stack-v1.webp`(384×256、透過)

将来、購入画面の商品カードに使う。K-2 の札が3〜4枚、少しずつずらして重なっている構図。
K-1 と K-2 の見た目が決まってから描く。時間がなければ省略してよい。

## 完了の報告に入れること

- 画像ごとのファイル名・寸法・容量(`MANIFEST.md` と同じ内容でよい)
- 22px / 44px に縮小した確認画像のパス(コミットしない)
- 触ってはいけないファイル(コード全般)に触っていないこと

---

# 簡易プロンプト(Codex にそのまま貼る用)

```
まず D:/mobby/mobidou-claude で、ワークツリー D:/mobby/mobidou-ui-assets6 をブランチ codex/ui-assets-round6(基点 claude/ui-navigation-overhaul)として自分で作成し、node_modules はジャンクションで共有してください。以降の作業はそのワークツリーだけで行い、D:/mobby/mobidou-claude は編集しないでください。
詳しい指示は docs/codex-ui-asset-prompts-round6.md にあります(`git show claude/ui-navigation-overhaul:docs/codex-ui-asset-prompts-round6.md` でも読めます)。

やること: ガチャ木札(小さな木の札。紐付き)の画像を作る。
K-1: assets/ui-round6/icons/icon-gacha-tag.webp(192×192、透過、ホーム上部バッジ用アイコン)
K-2: assets/ui-round6/tickets/ticket-gacha-tag-v1.webp(256×384、透過、プレゼントカード用の絵)
K-3(任意): 木札の山 384×256

禁止: コードは触らない(追加は assets/ui-round6/ と MANIFEST.md のみ)。画像内に文字を描かない。ミニチュア引換券(紙の券)と混同させない。既存の和紙・漆・墨線の質感に合わせる。画像ごとに1コミット。
最後に、ファイル名・寸法・容量と、22px/44px 縮小確認のパスを報告してください。
```
