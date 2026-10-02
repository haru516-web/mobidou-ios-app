# Codex 向け UI アセット 第8弾(ガチャ画面の下パネル)

ガチャ画面の下に出る半透明の黒い板(木札がないときの案内、結果の表示、演出省略ボタンの背景)を、専用の画像に置き換えます。
運用は `docs/codex-ui-asset-prompts-round7.md` と同じ(ワークツリー `D:/mobby/mobidou-ui-assets8`、ブランチ `codex/ui-assets-round8`、基点 `claude/ui-navigation-overhaul`、`node_modules` はジャンクション共有、コードは触らない、WebP 品質90・アルファ維持、文字を描かない、画像ごとに1コミット、MANIFEST.md にスライス指定を書く)。

## P-1 暗い案内板 `assets/ui-round8/gacha/panel-dark-v1.webp`(1024×512、透過)

背景はガチャ画面の暗い幕(黒・深緑・朱の縦縞)。その上に重ねる、暗い漆の板。

- 題材: 黒漆の板。縁は手ちぎりの和紙のようにわずかに欠け、内側に細い金のかすれ線を一筋。四隅に小さな金の留め金具の跡。
- 色は #211A13 付近の暗い茶黒。ほぼ不透明(アルファ約90%)だが、縁の外側は完全に透明。
- 中央は無地寄りで、明るい文字(#FFF8E9)と赤い大ボタン(`assets/ui-round3/ui/button-primary.webp`)が重なっても読める。模様は縁に寄せる。
- 縮小・引き伸ばしても崩れないよう、**九分割**(四隅 110px 固定、上下左右の辺と中央は引き伸ばし)。表示は幅約 350〜360pt、高さ約 100〜330pt。
- 既存の `assets/ui-round3/ui/card-frame.webp` の縁の質感・線の太さにそろえる(色だけ暗くする)。

MANIFEST.md には、画像の外形(box)と固定幅(left/right/top/bottom)を必ず書く。

---

# 簡易プロンプト

```
まず D:/mobby/mobidou-claude で、ワークツリー D:/mobby/mobidou-ui-assets8 をブランチ codex/ui-assets-round8(基点 claude/ui-navigation-overhaul)として自分で作成し、node_modules はジャンクションで共有してください。以降の作業はそのワークツリーだけで行い、D:/mobby/mobidou-claude は編集しないでください。
詳しい指示は docs/codex-ui-asset-prompts-round8.md にあります(`git show claude/ui-navigation-overhaul:docs/codex-ui-asset-prompts-round8.md` でも読めます)。

やること: ガチャ画面の下パネル用の暗い漆の板 1枚(assets/ui-round8/gacha/panel-dark-v1.webp、1024×512、透過、九分割 四隅110px固定)を作る。
禁止: コードは触らない(追加は assets/ui-round8/ と MANIFEST.md のみ)。画像内に文字を描かない。既存の assets/ui-round3/ui/card-frame.webp の質感に合わせる。
最後に、ファイル名・寸法・容量・スライス指定と、350pt幅に縮小した確認画像のパスを報告してください。
```
