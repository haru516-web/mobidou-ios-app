# イベント更新計画書（毎回、最初に読む）

イベントを入れ替える・新しく始める・終わらせる作業の前に、このファイルを読む。**第2回、第3回、第4回…と、何度でも同じ手順で更新できる**ように書いてある。作業のたびに「9. 追記ログ」と「8. イベント履歴」を更新する。

関連: 第一回の設計は [event-plan.md](event-plan.md)。第一回の画像の制作記録は `assets/event-toki/MANIFEST.md`。

表記: `<event-id>` は新しいイベントのID（小文字ハイフン区切り。例 `toki-meguru`）、`<spot-id>` は地点のID、`<pet-id>` はイベントモビーのID。

## 1. 基本方針（毎回これを守る）

- **イベントを更新（次のイベントを開始）したら、それまでのイベントはすべて「過去のイベント」とみなす。** 現在のイベントは常に1つだけ。
- 過去のイベントは、**コレクション画面 → イベントボタン → 「過去」タブの中にだけ**表示する。
  - 「開催中」タブ、ホーム、御朱印帳のイベントボタン、おでかけのイベント、イベントガチャ、通知、お知らせなど、ほかの入口には出さない。
  - 過去のイベントで手に入れたもの（御朱印・ミニチュア・モビー）は、「過去」から開くそのイベントのコレクションで、いつでも見られるようにする。
- イベントは**入れ替えるのではなく、積み上げる**。前のイベントのデータ・画像・サーバーの行は消さない（過去の表示と、報酬の受け取りに必要）。
- 開催期間はサーバーが決める（`events` テーブルの `starts_at` / `ends_at`、UTC）。期間外は、サーバーがイベント歩数の加算・チームの作成・参加を断る（`event_not_active`）。報酬の受け取り（`claim`）は期間外でも可能。
- **日本時間とUTCは9時間ずれる**（JST 0:00 = 前日 15:00 UTC）。期間は、必ず日本時間で決めてからUTCに直す。

## 2. 目指す構造（2回目の更新までに整える）

第一回は「イベントは1つだけ」を前提に作ってあり、そのままでは3回目以降に対応できない。**第2回を始める前に、次の形へ直す。**

| いまの状態（第一回のまま） | 目指す形 |
|---|---|
| 画面が `TOKI_MEGURU` を直接参照（`App.tsx` から約40か所） | `src/data/events.ts` に全イベントの一覧（`EVENTS`）を持つ。「現在のイベント」を1つ返す関数と、「過去のイベント」の一覧を返す関数を用意し、画面はそれ経由で参照する |
| 画像は `assets/event-toki/` 固定、`eventImages.ts` に1イベントぶんだけ | イベントごとに `assets/event-<event-id>/` を作り、画像の対応表もイベントごとに持つ（`EVENT_ART[<event-id>]` のように、IDで引く） |
| イベントモビーが `EVENT_PET_CHARACTERS` に4体固定 | イベントごとの一覧に分け、全体の一覧はそれらを合わせたものにする（過去のイベントのモビーも、持っていれば表示できるように） |
| 「過去」タブは常に空（`EventListPopup`） | 過去のイベントの一覧を出し、選ぶとそのイベントのコレクションを開く |
| ボタンの表示は「サーバーにあるか」だけ | 「現在のイベント」かつ「期間中」のときだけ、ほかの入口のイベントボタンを出す。終了後は、ボタンを隠すか「終了しました」と出す |
| 端末内の記録は `<event-id>` をキーにしている（`@mobidou/event-seen/<id>` など） | そのまま使える（IDが違えば混ざらない） |

この整理は、1回目の更新作業の中で最初にやる。やったら「9. 追記ログ」に書き、この表を「実施済み」に書き換える。

## 3. 1つのイベントに必要なもの（1イベント＝1セット）

**寸法の欄は、第一回の実測値。新しいイベントも原則この寸法で作る。** 変える場合は、その寸法を前提にしたコードも直す（特に9分割の枠、位置の補正値、座標）。形式は WebP（記載のあるものは PNG / JPEG）。「透過」は alpha あり。

### 3-1. 画像アセット（`assets/event-<event-id>/` 配下に、同じ並びで置く）

| 用途 | ファイル | 寸法 | 透過 | 参照する場所 |
|---|---|---|---|---|
| **ポップボタン（6種）** | `pop-buttons/event-home.webp`（ホームのイベント） | 512×512 | ○ | `src/data/popButtonImages.ts` |
| | `pop-buttons/event-book.webp`（御朱印帳のイベント） | 512×512 | ○ | 同上 |
| | `pop-buttons/event-gacha.webp`（イベントガチャ） | 512×512 | ○ | 同上 |
| | `pop-buttons/event-walk.webp`（おでかけのイベント） | 512×512 | ○ | 同上 |
| | `pop-buttons/event-normal.webp`（通常へ戻る。イベントごとの絵は不要なら共通でよい） | 512×512 | ○ | 同上 |
| | `pop-buttons/event-collection.webp`（コレクションのイベント） | 512×512 | ○ | 同上 |
| **イベントのポップ（紹介）** | `key-visual.webp` | 1000×1125 | ○ | `EVENT_KEY_VISUAL`、`EventAnnouncePopup` / `EventListPopup` |
| | `feel/popup/event-scroll.webp`（巻物の枠） | 1024×1400 | ○ | `EVENT_FEEL.scroll` |
| | `feel/popup/event-detail-bg.webp`（詳細カードの背景） | 1024×1536 | × | `EVENT_FEEL.detailBackground` |
| **イベント本画面** | `map.webp`（イベントマップ） | 1024×1536 | × | `EVENT_MAP_IMAGE`、`EventScreen.tsx`（地点は `SPOT_ANCHORS` の座標に重ねる） |
| | `feel/sheet/event-sheet-bg.webp` | 1170×2532 | × | `EVENT_FEEL.sheetBackground` |
| | `feel/sheet/event-sheet-header.webp` | 1536×192 | × | `EVENT_FEEL.sheetHeader` |
| | `feel/sheet/event-section-plate.webp` | 480×72 | ○ | `EVENT_FEEL.sectionPlate` |
| **到着の演出** | `feel/ceremony/event-ceremony-stage.webp` | 1536×1024 | × | `EVENT_FEEL.ceremonyStage` |
| | `feel/ceremony/event-ceremony-gate.webp` | 1214×1295 | ○ | `EVENT_FEEL.ceremonyGate` |
| **背景** | `feel/background/event-outing.webp`（おでかけ） | 1024×1536 | × | `EVENT_FEEL.outingBackground` |
| | `feel/background/event-book-bg.webp`（御朱印帳） | 941×1672 | × | `EVENT_FEEL.bookBackground` |
| | `feel/background/event-collection-room.webp`（コレクションの部屋） | 1024×2240 | × | `EVENT_FEEL.collectionRoom` |
| **イベントの御朱印帳** | `feel/book/event-book-cover.webp`（表紙） | 1024×1536 | ○ | `EVENT_BOOK_COVER` |
| | `feel/book/event-book-cloth.webp`（背の布） | 1024×1536 | ○ | `EVENT_FEEL.bookCloth` |
| | `feel/book/event-page-left.webp` / `event-page-right.webp` | 各 1024×1536 | ○ | `EVENT_FEEL.pageLeft` / `pageRight` |
| **イベントガチャ** | `feel/gacha/event-stage-bg.webp` | 1170×2532 | × | `src/data/gachaArt.ts`（`EVENT_GACHA_ART.stage`） |
| | `feel/gacha/event-box-body.webp` / `event-box-front.webp` | 各 880×1280 | ○ | 同上 |
| | `feel/gacha/event-box-shadow.webp` | 1024×300 | ○ | 同上 |
| | `feel/gacha/event-glow-core.webp` / `event-glow-rays.webp` | 各 1024×1024 | ○ | 同上 |
| | `feel/gacha/event-rope.webp` | 256×1024 | ○ | 同上 |
| | `feel/gacha/event-curtain-left.webp` / `event-curtain-right.webp` | 各 700×2532 | ○ | `EVENT_GACHA_STAGE_ART` |
| | `feel/gacha/event-curtain-valance.webp` | 1170×320 | ○ | 同上 |
| | `feel/gacha/event-panel-dark.webp`（下のパネル） | 1024×512 | ○ | `src/data/gachaUiArt.ts`（`EVENT_GACHA_PANEL_ART`。通常のパネルと同じ大きさ・9分割） |
| **ミニチュア（キーホルダー）** | `keychains/keychain-<spot-id>-v1-transparent.webp` ×地点数 | 各 1024×1536 | ○ | `EVENT_KEYCHAIN_IMAGES`（キーは地点ID） |
| **御朱印** | `goshuin/mobby/<spot-id>.webp` ×地点数 | 各 1024×1536 | × | `EVENT_GOSHUIN_IMAGES` → `STAMP_IMAGES` |

第一回の地点数は15。地点の数が変わるときは、マップの地点座標、必要歩数、ガチャの木札の配分（目標歩数の4分の1ごと）も合わせて見直す。

第一回の `assets/event-toki/` にある、使っていないファイル（`book-cover.webp`、`ticket-event-tag.webp`、`goshuin/` 直下と `goshuin/legacy-poster/`、`keychains/` の旧6点、`feel/e1〜e3-comparison.webp`、`previews/`、`staging-15/`）は、新しいイベントには作らない。**制作中の参考用の画像（比較・プレビュー）は、アプリに入れる前提のフォルダ（`assets/`）に置かず、`docs/` などへ分ける**（アプリの容量が増えるため。10参照）。

### 3-2. コレクションワールド（3D）用（`assets/collection/space3d/`）

- 御朱印: `stamps-<spot-id>.jpg`（384×576、JPEG）。`src/data/space3dImages.ts`。
- ミニチュア: `keychains-<spot-id>.png`（384×576、PNG・透過）。同上。
- イベントモビー: `mobbies-<pet-id>.png`（384×384、PNG・透過）。同上。
- 3D用の画像が無い物は、端末で落ちるため、ワールドに出ない。**地点とモビーを足したら、ここも必ず追加する。**

### 3-3. イベントモビー（1体につき、すべて必要）

第一回は4体。画像が足りないものは、あるものにフォールバックする（歩く画像が無ければ静止画、など）。

| 用途 | ファイル | 寸法 | コード |
|---|---|---|---|
| 立ち絵 | `assets/mobies/<pet-id>.webp` | 1254×1254（透過） | `src/petCatalog.ts` |
| 歩く | `assets/mobies/pilgrimage-walk/<pet-id>.webp` | 1536×1024（透過） | `src/data/pilgrimageWalkAtlases.ts` |
| のぞき見 | `assets/mobies/pilgrimage-walk/<pet-id>-map-peek.webp` | 1536×1024（透過） | `src/data/pilgrimagePeekImages.ts`（寸法の補正値 `PILGRIMAGE_PEEK_METRICS` もある） |
| 祈る（柏手・礼） | `assets/mobies/prayer-v2/<pet-id>/rei.webp` と `hakushu.webp` | 4112×514（透過） | `src/data/prayerAtlasesV2.ts` |
| おみくじ | `assets/mobies/omikuji/<pet-id>/draw-v2.webp` | 1680×210（透過） | `src/data/omikujiAtlases.ts` |
| 頬の引っぱり（パーツ） | `assets/mobies/pull/<略称>-body-clean / -lens / -cross / -button-left / -button-right.webp` | 各 1254×1254（透過） | `src/data/mobbyPullAssets.ts`、位置は `src/data/pullPartAnchors.ts` |
| 頬の引っぱり（3D用） | `assets/mobies/pull/gl/<pet-id>-body.png` | 768×768（PNG・透過） | `src/data/pullGlTextures.ts` |
| 背景 | `assets/ui-round3/backgrounds/…` | — | `src/data/petBackgrounds.ts` |
| 文言 | 名前・キャッチコピー・色・意味の言い回し（`meaningTemplates`） | — | `src/petCatalog.ts` |

型の `EventPetId`（`petCatalog.ts`）と、`mobbyPullAssets.ts` のID一覧にも、新しいモビーのIDを足す。元絵（`assets/mobies/reference/event/`）はアプリが参照しないので、`docs/` 側へ置く。

### 3-4. データ・文言（コード）

| 内容 | 場所 |
|---|---|
| イベント本体（ID・名前・キャッチコピー・人数・目標歩数・報酬・各地点の名前／ミニチュア名／必要歩数・期間） | `src/data/events.ts` |
| 御朱印帳の各ページ（場所・2行の説明） | `src/data/eventShrines.ts`（`SPOT_PAGE`）。イベントごとに分ける |
| 地点の座標（マップ画像の上の位置） | `src/components/EventScreen.tsx`（`SPOT_ANCHORS`）。マップ画像を作り替えたら必ず合わせる |
| イベントガチャ（木札は目標歩数の4分の1ごとに1枚・計4枚、出るのはそのイベントのモビー） | `src/services/eventGacha.ts`、`App.tsx` のイベントガチャ部分 |
| 終了時などの文言（「結願。〜旅が終わりました。」など） | `src/components/EventScreen.tsx` |
| 通知（歩数の催促の開始・終了） | `src/services/notificationPlan.ts`（`eventStartsAt` / `eventEndsAt`）、`App.tsx` |
| お知らせの画像 | `assets/ui-round7/notice/notice-event-v1.webp`、`src/data/uiArtRound7.ts` |
| ライセンス・クレジット | `src/data/licenses.ts` |
| 機能ツアー（イベントの紹介が入っている場合） | `src/data/featureTour.ts` |
| テスト | `tests/eventTeam.test.ts`（人数・地点数・目標歩数の前提）。新しいイベントぶんも足す |

### 3-5. サーバー

- `server/migrations/` に、新しいイベントの登録SQLを**連番で**追加する（`0003_seed_toki_meguru.sql` を参考）。`events` に1行：`id`・`name`・`starts_at`・`ends_at`（UTC）・`map_id`・`min_members`・`max_members`・`goal_steps`。
- 前のイベントの行は消さない。
- 本番のデータベースへの反映は、利用者側が `wrangler d1 execute` を実行する。
- 開催期間は日本時間で決めてからUTCに直す（1参照）。

### 3-6. ストア・宣材

- App Store のスクリーンショット（`docs/app-store-screenshots/`）、説明文に、前のイベントの画像や名前が残っていないか確認する。

## 4. 更新作業の手順（毎回、上から順にやる）

1. **前のイベントの後始末を決める**（5の未決定を先に確認）。
2. **サーバー**: 新しいイベントを登録する（3-5）。前のイベントは残す。期間が重ならないか、日本時間で確認する。
3. **画像を作る**: 3-1、3-2、3-3を、上の寸法で作り、`assets/event-<event-id>/` などに置く。前のイベントの画像は消さない。
4. **データを足す**: 3-4を、新しいイベントの定義として追加する（前のイベントの定義は残す）。
5. **「現在のイベント」を切り替える**: 一覧（2の `EVENTS`）で、現在のイベントを新しいものにする。前のイベントは自動的に「過去」になる。
6. **「過去」タブ**: 前のイベントが一覧に出て、選ぶとそのコレクションが開くことを確認する。
7. **ほかの入口から外す**: ホーム、御朱印帳、おでかけ、イベントガチャ、通知、お知らせに、前のイベントが出ていないことを確認する。
8. **終了の表示**: 終了したイベントは、歩数が進まないことが画面で分かるようにする。
9. **未受け取りの報酬**: クリアした人が、終了後も受け取れるか確認する。
10. **確認**: 開発用の全解放モード（`mobidou-events-web-unlock`）で、新旧両方のコレクション・御朱印帳・ガチャ・マップを確認する。
11. **検査**: `npm test` と `npm run typecheck` を通す。
12. **記録**: 「8. イベント履歴」に1行足し、「9. 追記ログ」に決めたことと気づきを書く。この計画書で足りなかった手順があれば、3・4を直す。

## 5. 決めること（未決定）

- 終了後、イベントのボタンを隠すか、「終了しました」と表示するか。
- 目標に届かなかったチームの救済をするか。
- 過去のイベントのコレクションで、ミニチュアのガチャ・交換券などを使えるようにするか。
- 過去のイベントのモビーを、通常のモビー一覧（選択画面）に出し続けるか。
- 過去のイベントが増えたとき、「過去」タブの並び順（新しい順など）と、表示する数。

## 6. 注意（毎回ひっかかりやすいところ）

- **寸法違い**: 9分割の枠、位置の補正値、座標を前提にしている画像は、寸法を変えるとずれる。
- **3D用の画像の追加漏れ**: ワールドに出ない原因になる。
- **日本時間／UTCの取り違え**: 期間が9時間ずれる。
- **前のイベントの定義を消してしまう**: 過去の表示と受け取りが壊れる。
- **イベントIDの使い回し**: 端末内の記録（見た到着、お知らせを隠す設定）が前のイベントのものと混ざる。IDは必ず新しくする。
- **コメントと実寸の食い違い**: 例）`key-visual.webp` の実寸は 1000×1125（`eventImages.ts` のコメントは 1024×1152 のまま）。作業のついでに直す。

## 7. 容量と整理

イベントを積み上げると、画像（1イベントで約45点＋モビー）がアプリの容量に加わる。更新のたびに、次を確認して記録する。

- 追加した画像の合計サイズ（第一回の `assets/event-toki` は、制作用を含めて約158ファイル）。
- 過去のイベントの画像を、アプリに同梱し続けるか、別の方法（必要になったときに取得）にするか。
- 使っていない画像・制作用の画像が、アプリに入っていないか。

## 8. イベント履歴

| 回 | ID | 名前 | 期間（日本時間） | 状態 | 画像の場所 | 備考 |
|---|---|---|---|---|---|---|
| 第1回 | `toki-meguru` | 時をめぐる道 | 2026-10-13 0:00 〜 2026-12-01 0:00 | 開催中（2026-10-20 時点） | `assets/event-toki/` | 15地点・360,000歩・チーム2〜4人・イベントモビー4体（翔太・さとみ・のりこ・やす） |

## 9. 追記ログ

- 2026-10-20: このファイルを作成。イベント更新時は、現在のイベントを「過去のイベント」とみなし、コレクション画面のイベントボタン内「過去」タブだけに表示する方針を決定。
- 2026-10-20: 入れ替え対象の一覧（画像・寸法・コード・サーバー）を追記。
- 2026-10-20: 3回目以降の更新にも使えるよう、全面的に書き直し。イベントを積み上げる方針、目指す構造（2）、毎回の手順（4）、注意（6）、容量（7）、履歴（8）を追加。
