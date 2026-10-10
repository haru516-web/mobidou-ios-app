# Codex 向け イベント御朱印に、イベントモビーを描き足す

15枚の和の御朱印（`assets/event-toki/goshuin/`）に、イベント専用の4体のモビーを描き足した版を作る。もとの御朱印（和紙・墨の筆文字の社名・朱印・左下の「もび」落款・景色・アイテム）は**そのまま**で、モビーを1〜2体、景色のなかに登場させるだけ。

## 参照するモビー（透過、1254×1254）
`assets/mobies/` にある4体。**デザインは変えず**、そのまま登場させる（髪型・服・小物・色・顔・胸のゲームパッドを維持）。

| id | 名前 | 章 | ファイル |
|---|---|---|---|
| shotamobby | 翔太モビー（茶髪ロン毛のチャラ男） | 平成 | `assets/mobies/shotamobby.webp` |
| satomimobby | さとみモビー（ギャル） | 平成 | `assets/mobies/satomimobby.webp` |
| norikomobby | のりこモビー（やんちゃ女） | 昭和 | `assets/mobies/norikomobby.webp` |
| yasumobby | やすモビー（角刈りヤンキー） | 昭和 | `assets/mobies/yasumobby.webp` |

## 描き方
- **既存の御朱印に描き足す（編集）。** 全体を描き直さない。社名の墨書き、朱印、左下の「もび」落款、景色、アイテムの形と位置は変えない。
- **配置と大きさ:** 通常の御朱印（`assets/goshuin/akane.webp`）で、モビーが右下の景色のなかに立っているのと同じ感じ。カード幅の約1/4〜1/3の大きさで、足を地面（石段、道、床）につける。アイテムや社名の墨書きを隠さない。アイテムが右下にある絵では、アイテムの隣（左寄り）に立たせる。
- **ポーズ:** そのアイテムを見る、触る、持つ、すすめる、など、アイテムに関わる自然な動き（手や体の向きを少し変えてよい。顔・服は変えない）。
- **質感と光:** 景色の光（夕焼け、ネオン、桜の光）に合わせて、モビーにも同じ向きの光と影を入れ、浮かない。
- **画像の中の文字:** 増やさない。

## 割り当て（登場させるモビー）
昭和は昭和のモビー（のりこ、やす）、平成は平成のモビー（翔太、さとみ）。4体がまんべんなく登場するように回す。

| id（社） | 登場するモビー | 動き |
|---|---|---|
| showa-car（ひだまり商店街の小社） | やす | 旧車の横に立って、腕を組んで誇らしげ |
| showa-bike（峠のカーブ祠） | のりこ | バイクにもたれて、峠の景色を見る |
| showa-tv（街頭テレビ広場の社） | やす、のりこ | 人だかりの端で、テレビを見上げる（2体） |
| showa-mirrorball（ディスコ通りの社） | のりこ | ミラーボールの光の下で、軽くポーズ |
| showa-record（レコード坂の御堂） | やす | レコードを手に取って眺める |
| heisei-md（イヤホンの丘の祠） | 翔太 | イヤホンを片耳につけて、石段に座る |
| heisei-pager（ポケベル橋のたもと社） | さとみ | ポケベルを見せる、橋のたもとで |
| heisei-cd（歩道橋のたもと社） | さとみ | CDプレーヤーを持って、歩道橋の上でダンス |
| heisei-sticker（文房具屋の角の社） | さとみ | シール帳をのぞきこむ |
| heisei-phs（アンテナ山の祠） | 翔太 | PHSで電話するポーズ |
| heisei-loose（駅前ロータリーの社） | さとみ | ルーズソックスの隣で、くるっとポーズ |
| heisei-keitai（放課後の公園ほこら） | 翔太 | ガラケーを開いて、ベンチに座る（元の絵は `heisei-park.webp`） |
| heisei-boots（ファッションビル屋上の社） | さとみ | 厚底ブーツの隣で、背伸び |
| heisei-digicam（世紀末の見晴らし社） | 翔太 | コンデジを構えて撮るポーズ（元の絵は `heisei-century.webp`） |
| heisei-strap（ミレニアムの星祭り社） | さとみ、翔太 | 星祭りで、デコストラップを一緒に眺める（2体） |

元の絵: `assets/event-toki/goshuin/<id>.webp`。ただし `heisei-keitai` は `heisei-park.webp`、`heisei-digicam` は `heisei-century.webp` を元にする（新しい id のファイルに保存）。

## 出力
- 保存先: `assets/event-toki/goshuin/mobby/<id>.webp`（15枚。id は上の表の id）。既存のファイルは上書きしない。
- 1024×1536、不透過、WebP品質90。
- 確認用: 15枚が並んだ1枚（previews/）。

## 守ること
- 条件を満たしていればそこで止める。磨き込みや全点の再生成はしない。コミットは5枚ごとに1回、MANIFEST にはファイル名・寸法・容量だけ。
- 実在のブランド名・ロゴ・商品名・キャラクターは描かない。暴走族・不良の描写（旗、特攻服、武器、危険運転）はしない。
- コードは触らない（追加は `assets/event-toki/` と MANIFEST のみ）。

---

# 簡易プロンプト

```
ブランチ codex/event-assets のワークツリー D:/mobby/mobidou-event-assets で作業してください（D:/mobby/mobidou-events と D:/mobby/mobidou-claude は編集しない）。まず `git merge claude/events` で最新にしてください。
指示書は docs/codex-event-goshuin-mobby.md です（`git show claude/events:docs/codex-event-goshuin-mobby.md` でも読めます）。

やること: assets/event-toki/goshuin/ にある15枚の和の御朱印に、イベント専用の4体のモビー（assets/mobies/ の shotamobby.webp、satomimobby.webp、norikomobby.webp、yasumobby.webp）を描き足した版を作ります。
- 既存の御朱印に「描き足す（編集）」だけにしてください。社名の墨書き、朱印、左下の「もび」落款、景色、アイテムの形と位置は変えない。全体を描き直さない。
- モビーのデザイン（髪型・服・小物・色・顔・胸のゲームパッド）は、assets/mobies/ の透過画像のまま変えない。大きさはカード幅の約1/4〜1/3、足を地面につけ、景色の光に合わせた光と影を入れて浮かせない。アイテムや社名を隠さない。assets/goshuin/akane.webp でモビーが右下に立っているのが、配置の参考です。
- どの社に、どのモビーを、どんな動きで登場させるかは、文書の「割り当て」の表のとおりです（2体登場するのは showa-tv と heisei-strap）。heisei-keitai の元の絵は heisei-park.webp、heisei-digicam の元の絵は heisei-century.webp です。
- 保存先は assets/event-toki/goshuin/mobby/<id>.webp（15枚、1024×1536、不透過、WebP品質90）。既存のファイルは上書きしない。
- 時間を節約したいので、条件を満たしていればそこで止めてください。磨き込みや全点の再生成はしない。コミットは5枚ごとに1回、MANIFEST はファイル名・寸法・容量のみ。確認用は15枚が並んだ1枚（previews/）。
禁止: 実在のブランド名・ロゴ・商品名・キャラクターを描かない、暴走族・不良の描写をしない、コードを触らない。
```
