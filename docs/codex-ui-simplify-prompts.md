# Codex 向け「選択を減らす UI 整理」プロンプト

## 背景(ユーザー指示の要約)

ユーザーの選択が多くてごちゃごちゃするため、次の方針で整理する。

- ガチャは**木札(ガチャ木札)制**にする。木札を持っていれば紐を引ける。持っていなければ「購入」か「巡礼で入手」へ案内する。ボタンでの操作は廃止し、**紐を引く一択**にする。
- 木札の所持数と、ミニチュアパス(旧「旅の授与札」)の所持数は、**ホーム画面の上部に小さく**表示する。
- 御朱印帳の**表紙パス(表紙替え券)は廃止**。コレクション画面の「授与品」ボタンも削除する。
- 巡礼ルートは選ばせず、**固定順で自動進行**する(イベントだけ参加の有無を選ぶ)。
- 未開放の御朱印は、タップしても中身が見えないようにする。
- お出かけ画面の地図は今回触らない(保留)。

## 担当分け

| 担当 | 範囲 |
|---|---|
| **Codex(このファイル)** | C0 オープニング文言 / C1 ホーム上部バッジ部品(新規ファイル) / C2 コレクション画面の整理 / C3 未開放の御朱印を押せなくする(見た目側) |
| **Claude** | 木札のデータ(`src/services/gacha.ts`, `useJourney.ts`)、`GachaScreen.tsx`、`App.tsx` 全般(ホームへのバッジ組み込み、チュートリアル順序変更、ペット位置固定、巡礼の固定順化、未開放カードの詳細ガード)、`HomeNavigation.tsx`、`FeatureTour.tsx` |

## 作業ルール(最初に渡す)

- **ワークツリーとブランチは Codex 自身が作る**(最初の作業)。
  1. `D:/mobby/mobidou-claude` で `git worktree add D:/mobby/mobidou-ui-codex -b codex/ui-simplify claude/ui-navigation-overhaul` を実行する(基点は `claude/ui-navigation-overhaul` の最新コミット)。同名のワークツリー・ブランチがすでにあれば、中身を確認してから再利用する。
  2. 依存は新規インストールせず、`D:/mobby/mobidou-claude/node_modules` へのジャンクションを `D:/mobby/mobidou-ui-codex/node_modules` に作って共有する(PowerShell: `New-Item -ItemType Junction -Path D:mobbymobidou-ui-codex
ode_modules -Target D:mobbymobidou-claude
ode_modules`)。
  3. 以降の作業・コミットはすべて `D:/mobby/mobidou-ui-codex` で行う。`D:/mobby/mobidou-claude` のファイルは編集しない(Claude の作業場所)。
- **触ってはいけないファイル**(Claude が同時に書き換える)
  - `App.tsx`
  - `src/components/GachaScreen.tsx`、`GachaShop.tsx`、`HomeNavigation.tsx`、`FeatureTour.tsx`
  - `src/services/*`(`useJourney.ts`、`gacha.ts`、`specialRewards.ts` など)
  - `src/components/PullableCompanion.tsx`、`MobbyPullMesh*`、`FloatingMobby.tsx`
- 既存のビジュアル(和紙調)を変えない。指示にない色・形・配置を変えない。画像は生成しない。
- **全画面はスクロールなしで収める**(`PagedBody` / `FitToHeight` の既存方針)。
- 用語: **木札** = ガチャを1回引ける札(新規)。**ミニチュアパス** = 既存の「旅の授与札」(`special.passes.keychainDrop`、ミニチュアキーホルダー引換券)。**交換券**とは別物なので混ぜない。
- タスクごとに1コミット(メッセージに C0〜C3 を入れる)。
- `npx tsc --noEmit` を通す。ただし `App.tsx` 側の呼び出しが原因の型エラーは Claude が直すので、報告に書くだけでよい(C2 のみ該当。下記参照)。
- 完了時に、変更ファイルと実施した確認を報告する。

---

## C0 オープニング文言

`src/components/OpeningExperience.tsx` の下部ヒント文言を変更する。

```
現在: 画面をタップ、またはスライドしてね
変更後: タップしてね
```

- 文字列だけを変える。`accessibilityLabel` など同じ意味の文言が他にあれば、あわせて直す。
- スライドで開始できる挙動(PanResponder)は、そのまま残す。文言だけ。
- 札(`openingHintPlate`)の幅に余白ができても、レイアウトは崩さない。

---

## C1 ホーム上部バッジ部品(新規)

目的: ホーム上部に出す「木札の所持数」と「ミニチュアパスの所持数」の小さな表示部品を、**新規ファイルで**作る。画面への組み込み(`App.tsx`)は Claude が行う。

```
新規: src/components/HomeStatusBar.tsx

export function HomeStatusBar(props: {
  tickets: number;            // 木札の所持数
  miniaturePasses: number;    // ミニチュアパスの所持数
  onPressTickets?: () => void;
  onPressPasses?: () => void;
}): JSX.Element
```

要件:
1. 横並びの小さなバッジ2つ(左: 木札、右: ミニチュアパス)。画面上部に重ねて置く前提で、高さは 36〜44 程度、全体で幅 220 以内。
2. 見た目は既存の和紙調に合わせる。`WashiPressable`(`plate="secondary"` など)、`PillText`、`SlicedArt` の既存部品を使い、新しい色や形を作らない。`src/components/Washi.tsx` と `src/data/uiArt.ts` を見て、既存の札・プレートを流用する。
3. アイコン: 木札は既存の Ionicons または既存アートで代用する(例: `pricetag-outline`)。ミニチュアパスは `CollectionGallery.tsx` の `KEYCHAIN_DROP_TICKET` を縮小して使う。専用の木札画像は後で差し替えるので、アイコン部分は1か所の定数にまとめる。
4. 数字は `fontVariant: ['tabular-nums']`、fontSize 13 以上。0 枚でも表示する(0 のとき数字をやや薄くしてよい)。
5. 押せる場合は `accessibilityRole="button"` と、`木札 3枚` のようなラベルを付ける。押せない場合(onPress なし)は `accessible` のテキストだけ。
6. `GestureResponder` を奪わない。ホームのモビーをドラッグする操作の邪魔にならないよう、バッジ以外の領域は `pointerEvents="box-none"` にする。
7. 画面には組み込まない。確認は、一時的な確認用の呼び出し(コミットしない)で、数字が 0 / 12 / 120 のときの見た目を見るだけでよい。

---

## C2 コレクション画面の整理

`src/components/CollectionGallery.tsx` から、表紙パスと「授与品」ボタンを削除する。

やること:
1. **「授与品」ボタンを削除**する。`CollectionPage` の `'passes'` と、それを開くボタン、`ScrollPopup visible={page === 'passes'}` の中身を取り除く。`CollectionPage` の型から `'passes'` を外す。
2. **表紙パス**関連を削除する: `coverPickerOpen` / `coverNotice` / `showCoverPicker` / `chooseCover`、表紙選択の `Modal`、`GOSHUIN_BOOK_COVERS` / `getGoshuinBookCover` の import、それ専用のスタイル。
3. 関数の props から `activeRoute`(表紙のためだけに使っている場合)、`coverOwned`、`selectedCover`、`onSelectCover` を取り除く。他の用途で `activeRoute` を使っているなら残す。
4. ミニチュアパスの所持数の表示(`所持 {special.passes.keychainDrop}枚`)はここからは消してよい(ホーム上部に移す)。
5. `special.passes.keychainDrop` や `KEYCHAIN_DROP_TICKET` の定義そのものは、他で使われているか確認する。使われているものは消さない(C1 が使う)。
6. 削除で空いた配置は、残る部品(部屋・御朱印・ミニチュア)で自然に収まるようにする。余白を無理に埋めない。スクロールを発生させない。
7. 呼び出し側の `App.tsx` は触らない。props を減らしたことによる型エラー(`App.tsx` の `<CollectionGallery ... />`)は、報告に書く。Claude が直す。

---

## C3 未開放の御朱印を「押せない」見た目にする

目的: 未開放(未所持)の御朱印は、タップしても何も開かない見た目と挙動にする。中身(名前・読み・説明・絵)がタップで見えてしまう経路をふさぐ。詳細モーダルを開くかどうかの最終判断(`setDetail`)は `App.tsx` 側で Claude がガードする。ここでは**部品側**を担当する。

対象: `src/components.tsx`、`src/components/GoshuinBook.tsx`、`src/components/PilgrimageScreen.tsx`、`src/components/CollectionGallery.tsx` のうち、未所持の御朱印を表示する箇所。

やること:
1. 未所持の御朱印が出る部品を洗い出す(`Stamp` の `locked`、`PagedShrineGrid` の `ownedIds`、`BookIndexPopup`、`RouteMap` の `onStop`、ホームの御朱印カード用の部品など)。洗い出した一覧を、最後の報告に書く。
2. 未所持のタイルは `onPress` を呼ばない。`accessibilityState={{ disabled: true }}` と、`未取得の御朱印` のようなラベルにする。押したときに別の画面が開かないこと。
3. 未所持のタイルの見た目に「まだ見ぬご縁」の札(`LockTag`)は残してよいが、**名前・読み・テーマ・場所**など中身が分かるテキストを出さない。すでに隠れているものは触らない。
4. `onSelect` / `onStop` / `onOpenDetail` のようなコールバック名・シグネチャは変えない(`App.tsx` が使っている)。呼ばないだけにする。
5. 「所持しているのに押せなくなる」ことがないように、`ownedIds` / `locked` の判定は既存のまま使い、反転させない。

---

## 完了の報告に入れること

- 変更したファイルの一覧とコミット番号(C0〜C3)
- `npx tsc --noEmit` の結果(`App.tsx` 起因の既知エラーは分けて書く)
- C3 で洗い出した「未所持の御朱印を表示する部品」の一覧と、`App.tsx` 側でガードが必要な箇所
- 触ってはいけないファイルに触らなければならなかった場合は、触らずに理由を書く

---

# 簡易プロンプト(Codex にそのまま貼る用)

```
まず D:/mobby/mobidou-claude で、ワークツリー D:/mobby/mobidou-ui-codex をブランチ codex/ui-simplify(基点 claude/ui-navigation-overhaul)として自分で作成し、node_modules はジャンクションで共有してください(手順は下記ファイルの「作業ルール」)。以降の作業はそのワークツリーだけで行い、D:/mobby/mobidou-claude は編集しないでください。
詳しい指示は docs/codex-ui-simplify-prompts.md にあります(claude/ui-navigation-overhaul 上のファイルです。`git show claude/ui-navigation-overhaul:docs/codex-ui-simplify-prompts.md` でも読めます)。最初に読み、C0〜C3 を順にやってください(タスクごとに1コミット)。

C0: OpeningExperience.tsx の下部ヒントを「タップしてね」に変更。
C1: ホーム上部用に、木札とミニチュアパスの所持数を出す小さなバッジ部品 src/components/HomeStatusBar.tsx を新規作成(画面への組み込みはしない)。
C2: CollectionGallery.tsx から「授与品」ボタン、集めたパスのページ、表紙パス(表紙選択モーダル含む)を削除。
C3: 未所持の御朱印のタイルを、押しても何も開かない見た目と挙動にする(App.tsx 側のガードは Claude がやる)。

禁止: App.tsx、GachaScreen.tsx、GachaShop.tsx、HomeNavigation.tsx、FeatureTour.tsx、src/services/*、PullableCompanion.tsx、MobbyPullMesh*、FloatingMobby.tsx は触らない。和紙調のデザインは変えない。画像は生成しない。スクロールを発生させない。
最後に npx tsc --noEmit を実行し、変更ファイル・型チェック結果・C3で洗い出した部品一覧を報告してください。
```
