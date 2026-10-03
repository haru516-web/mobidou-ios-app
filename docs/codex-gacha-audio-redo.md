# Codex 向け指示書：ガチャ画面の音を専用に作り直す（2026-10-03）

ブランチ: `codex/bgm-sfx`（`e1e6a2d` 以降）。元仕様は `docs/codex-bgm-sfx-spec.md`（和の世界観・伝統芸能参照・制作条件はそのまま有効）。この指示書は**ガチャ画面に限り、既存のガチャ関連音を捨てて全面的に作り直す**もの。

## 0. 方針（ユーザー指示）
1. 現在のガチャ演出の音源は不採用。**作り直す**。
2. ガチャ演出の BGM は**専用曲**にする。
3. 演出の**動きごとに音を分けて**作る（曲とは別に、各場面の効果音）。
4. ガチャ画面では**共通の音源を一切使わない**。ボタン、タブ、閉じる、詳細、ショップ、スキップ、下部ナビを含め、ガチャ画面内の音はすべてガチャ専用音（接頭辞 `gacha_`）にする。

## 1. 作り直しの範囲
- 既存のガチャ関連音は置き換え対象: `bgm_gacha`、`sfx_gacha_enter`、`sfx_curtain`、`sfx_roll_walk`、`sfx_unload`、`sfx_box_settle`、`sfx_rope_ready`、`sfx_rope_pull`、`sfx_rope_catch`、`sfx_rope_cancel`、`sfx_gacha_charge`、`sfx_gacha_burst`、`sfx_gacha_burst_rare`、`jingle_gacha_reveal`、`jingle_gacha_reveal_rare`、`sfx_card_flip`、`sfx_ticket_use`、`sfx_shop_buy`、`sfx_cart_add`、`sfx_cart_remove`、`sfx_duplicate`。
- 新規は `gacha_` 接頭辞のファイル名（例: `assets/audio/gacha/gacha_curtain.m4a`）。旧ファイルは、他画面で使っていないことを確認してから削除し、`audioAssets.ts` と `docs/audio-manifest.md` を更新する。`sfx_duplicate` や `sfx_cart_*` を他画面でも使っている場合は、ガチャ専用版を新規に作り、旧版は他画面用に残す。
- `GachaScreen.tsx` / `GachaShop.tsx` 内の `Button` / `Pressable` / `WashiPressable` / `PopButton` / `Close` は**すべて `soundless` にして、ガチャ専用音を自前で鳴らす**。ガチャ画面に重なる下部ナビ（`HomeBottomNavigation`、`gachaActive` 時）も、ガチャ表示中はガチャ専用のタップ音に切り替える（共通 `sfx_tab` を鳴らさない）。切替方法は設計を任せる（例: 音のスコープ/テーマ指定を `audio.ts` に追加）。
- ガチャ画面が開いている間は、**共通 BGM（`bgm_main`）を止めて**ガチャ専用 BGM のみ（クロスフェードで入退場）。共通の効果音（`sfx_tap` など）が鳴らないこと。画面を閉じたら通常どおり共通音に戻す。

## 2. 世界観と制作条件
- 世界観は元仕様 §1 と同じ。**和風、日本の伝統芸能・伝統音楽が主**。ガチャは特に、`gachaTimeline.ts` のコメントにあるとおり **能・歌舞伎の「間（ま）」「見得」「序破急」** が演出の芯。音も「大きな音より、直前の静けさで効かせる」設計にする。
  - 雅楽（笙の持続和音、龍笛、篳篥）、能（能管、小鼓・大鼓）、歌舞伎（柝、見得の「ツケ」＝ツケ板を打つ音、下座の鳴り物）、神楽（神楽鈴、大太鼓）、箏・三味線・尺八、水琴窟・風鈴・鳥や虫の環境音。
  - ピアノ・ハープ・ストリングス・シンセパッド・ゲーム的ファンファーレは使わない。ボーカルなし。
- 形式・容量・ラウドネス・ループ条件は元仕様 §1 と同じ。ガチャ BGM は 45〜90 秒でシームレスにループ。
- 全音源を `scripts/create-audio.cjs`（または同等の再現可能なスクリプト）で生成する方針を維持し、`docs/audio-credits.md` を更新。外部素材は使わない。
- 各音は**対応する動きの長さに合わせて**作る（下表の ms は `src/components/gachaTimeline.ts` の定数）。尺がずれると演出と合わないので、定数に連動して鳴らす（既存の phase 検知や `ms` 判定を使う）。

## 3. ガチャ専用 BGM
| ID | 場面 | 内容 |
|---|---|---|
| `gacha_bgm_lobby` | ガチャ画面に入ってから、板を引き上げるまで（ロビー、幕、運搬、着地、`ready`、紐を引く前後、ショップタブ含む） | 専用曲。笙の持続和音を土台に、龍笛と箏の控えめな旋律、遠い大太鼓の脈動。期待を静かに高める。和風・神秘的。ループ。**運搬の足音や幕の効果音が乗る前提で、旋律は薄く**する。 |
| `gacha_bgm_open` | 板を引き上げた後の溜め（`charge`）以降 | 開封中の専用曲（または**無音＋効果音のみ**にしてよい。選んだ方を報告）。BGM をダックするのではなく、`gacha_bgm_lobby` を 0.3 秒でフェードアウトし、開封の瞬間に静けさ（MA）を作る設計を推奨。`revealed` 後に余韻として `gacha_bgm_after`（下記）。 |
| `gacha_bgm_after` | `revealed`（結果画面、カード送り、おわる/つぎへ） | 結ばれたご縁の余韻。穏やかで温かい。笙と箏、水琴窟。ループ。10連のカード送り中も継続。 |
| `gacha_bgm_shop` | 購入タブ（`shopOpen`）。省略可（`gacha_bgm_lobby` を継続してよい） | 落ち着いた市（いち）の雰囲気、控えめ。 |

## 4. 演出の動きごとの効果音
`gachaTimeline.ts` の定数・phase に沿って分ける。ms は画面入場（再生開始）からの時間。

### 4-1. 入場〜運搬〜着地（`phase`: curtain → roll → settle → ready）
| ID | 動き | タイミング・長さ | 内容 |
|---|---|---|---|
| `gacha_enter` | ガチャ画面に入る（下部ナビのガチャ押下、ホームからの遷移） | 約 0.6 秒 | 神楽鈴の一振りと木札の音。共通音ではなく専用。 |
| `gacha_curtain` | 幕（暖簾）が開く（`CURTAIN_MS` = 1100） | 1.1 秒 | **歌舞伎の柝（拍子木）の「チョチョン」→ 幕が左右へ引かれる布の摩擦音**（ゆっくり加速して止まる）。 |
| `gacha_walk` | モビーが荷を運んで歩く（`WALK_START_MS` 350〜、`WALK_MS` = 1280、1 歩 80ms） | 約 1.3 秒、歩行 16 歩 | 木の床を踏む足音。荷の重みで一歩ごとに小さく軋む。ゆったりとしたテンポ（足拍子の質感）。 |
| `gacha_unload` | 荷を下ろす（`UNLOAD_START_MS`〜、1 コマ 180ms × 8） | 約 1.4 秒 | 荷が持ち上がり、下ろされる摩擦音。軋み、紐のほどける音。 |
| `gacha_slide` | 荷が滑り込む（`SLIDE_START_MS`、`SLIDE_MS` = 360） | 0.36 秒 | 木箱が板の上を滑る「すーっ」。 |
| `gacha_settle` | 着地（`ROLL_MS`、`SETTLE_MS` = 350、`landingShake` 420ms） | 約 0.5 秒 | 重い木箱の「どすん」＋大太鼓の遠い一打、画面の揺れに合わせた余韻の減衰。触覚 Heavy と同期。 |
| `gacha_exit_walk` | 荷を置いたモビーが画面外へ歩き去る（`EXIT_MS` = 1280） | 約 1.3 秒 | 足音が遠ざかる（徐々に小さく・高域が落ちる）。 |
| `gacha_ready_loop` | `ready`（板が揺れて引き上げを待つ。`seamGlow` の光の呼吸） | 2〜3 秒ループ、極小音量 | 箱の隙間から漏れる光のかすかな共鳴音（笙の倍音、水琴窟の一滴）。BGM に埋もれない程度。 |

### 4-2. 板を引き上げる（`ropeReady`、`PULL_TO_DRAW` = 64、`MAX_PULL` = 110）
| ID | 動き | 内容 |
|---|---|---|
| `gacha_rope_pull_loop` | 板/紐を引いている間（`onPanResponderMove`）。引く量 0〜1 に応じて**音程と音量が連続的に変化** | 紐が張る/きしむ、木の板が持ち上がる摩擦。`playbackRate` 0.7〜1.5 で連続再生できるループ素材。無音の間（指を止める）は停止。 |
| `gacha_rope_threshold` | 引いた量が `PULL_TO_DRAW` に達した瞬間 | 「カチッ」と掛け金が外れる木の音＋小さな鈴。 |
| `gacha_rope_open` | 離して開封に進む（`resolveRelease` = open） | 板が一気に持ち上がる音、封が解ける。 |
| `gacha_rope_cancel` | 離して戻る（途中、cancel） | 紐がゆるみ、板が静かに戻る。 |
| `gacha_ticket_use` | 木札を消費して引く（`sfx_ticket_use` の置換） | 木札が 1 枚、カランと鳴って箱に収まる。 |

### 4-3. 開封（`phase`: charge → hold → fade → revealed、`AFTER_OPEN_MS` = 9600）
開封の演出は能・歌舞伎の序破急と「間」。時刻は板を引き上げた時点（openedFor）から。

| ID | 動き | タイミング | 内容 |
|---|---|---|---|
| `gacha_charge_heartbeat_1`〜`_4` | 4 つの鼓動（`BEATS` = 700 / 1350 / 1900 / 2230ms、強さ .16 / .24 / .34 / .44、触覚 light/light/medium/medium と同期） | 各 0.3〜0.5 秒 | **小鼓・大鼓の打音**。1 → 4 に向けて強く、間隔が詰まる（序破急の「破」へ）。4 つは別素材（または同素材で強さ違い）。 |
| `gacha_charge_gather` | 光の粒が集まる（`gatherAt`）、溜め全体（`CHARGE_MS` = 2600） | 約 2.6 秒 | 笙の持続和音がじわじわ上昇、風が吸い込まれるような音。鼓動の下で鳴り続ける。 |
| `gacha_ma` | **間**（`MA_MS` = 320、`CHARGE_MS - 320`〜`CHARGE_MS`）。最後の鼓動が消え、箱の震えも止まる | 0.32 秒 | **ほぼ無音**。直前の音をすべて止める（全音源のフェードアウト）。ここが演出の核。 |
| `gacha_burst` | 開封の一撃（`CHARGE_MS` = 2600、触覚 heavy、FLASH 620ms） | 約 1.2 秒 | **見得の「ツケ」（ツケ板を強く一打）＋ 柝の「チョン」＋ 大太鼓の一撃＋ 神楽鈴の和音の炸裂**。白いフラッシュ（`FLASH_MS` = 620）に合わせて鋭く、減衰は長め。 |
| `gacha_burst_answer` | 一撃への返し（`CHARGE_MS + 140`、触覚 medium） | 約 0.4 秒 | 小鼓の軽い返し。 |
| `gacha_burst_rare` | レア時の炸裂（レア度が現行データに無いため、分岐ポイントだけ用意し、現状は未使用でよい） | 約 1.6 秒 | `gacha_burst` に龍笛の一声と神楽鈴の連打を足す。 |
| `gacha_rays` | 光の筋が放射される（`burstAt`、`BURST_MS` = 1100） | 1.1 秒 | 空気が広がる高域のきらめき、神楽鈴の余韻。 |
| `gacha_pillar` | 光の柱が立つ（`pillarAt`） | 約 1〜1.5 秒 | 笙の合竹（あいたけ）のような厚い和音が立ち上がる。 |
| `gacha_pop` | モビーが飛び出す（`popAt`、`MIE_MS` = 280 の見得の静止） | 約 0.6 秒 | 小さな「ぽん」＋能管の短い一声。**見得の 280ms は音を一瞬止める**（ツケの余韻だけ）。 |
| `gacha_sparkle` | きらめきの粒（`sparklesAt`） | 短く、ランダム間隔で散らす（3〜5 種を重ならないように） | 鈴・水琴窟のきらめき。 |
| `gacha_hold` | 光が満ちて静止（`HOLD_MS` = 1400） | 約 1.4 秒 | 笙の持続和音が最大に、静かな充足。 |
| `gacha_petals` / `gacha_confetti` | 花びら・紙吹雪（`blossomsAt`、`confettiAt`） | 約 2〜3 秒 | 紙がひらひら舞う軽い衣擦れ。 |
| `gacha_dust` | 光の粒が床へ降る（`dustAt`） | 約 2 秒 | 微細なきらめきの余韻。 |
| `gacha_fade_spring` / `_summer` / `_autumn` / `_winter` | **四季が一年分巡る**（`FADE_MS` = 5600、`seasonRateAt`: 光が満ち退く間に春→夏→秋→冬）。季節ごとに降るもの（花びら、蛍/光、紅葉、雪）が変わる | 各約 1.4 秒（合計 5.6 秒に連続） | 春: 鶯・風、夏: 風鈴・蝉・水、秋: 虫の音、冬: 風・雪の静けさ。季節間はクロスフェード。薄い環境音。 |
| `gacha_mobby_settle` | モビーが定位置へ（`mobbyAfterOpen`、`FADE_MS` の後半） | 約 2.8 秒 | 光が収まる、小さな鈴の余韻。 |
| `gacha_reveal` | `revealed`（結果表示）のジングル | 3〜4 秒 | 雅楽調。笙の和音に龍笛の短い旋律、神楽鈴。「ご縁が結ばれました」の厳かで温かい達成感。通常用。 |
| `gacha_reveal_rare` | レア結果のジングル（現状未使用の分岐用） | 4〜5 秒 | 上記に篳篥と楽太鼓を足した華やかな版。 |
| `gacha_new` | 初めて出会うモビー（`isNew`）の追加音 | 約 1 秒 | 小さな祝いの鈴（結果ジングルに重ねる）。`isNew` でない場合は鳴らさない。 |
| `gacha_guaranteed` | 確定枠（`guaranteed`）の演出があれば | 約 1 秒 | `gacha_new` と区別できる別の鈴。 |

### 4-4. 結果の送り・10連・詳細・操作
| ID | 動き | 内容 |
|---|---|---|
| `gacha_card_next` | 10連で次のモビーへ（`sfx_card_flip` の置換、`つぎへ`） | 紙をめくる軽い音＋鈴。短い。 |
| `gacha_card_last` | 最後（`おわる`） | `gacha_card_next` より少し長い余韻。 |
| `gacha_result_zoom` / `gacha_result_unzoom` | モビーを大きく/小さく戻す（`canZoom` ボタン） | 小さな「ぽ」の上昇/下降。 |
| `gacha_skip` | 「演出を省略」 | 柝の「チョン」1 回＋短い布の音（演出が早送りで切り替わる感じ）。省略時は再生中の演出音をすべて停止し、結果ジングルに即移行。 |
| `gacha_btn` | ガチャ画面の通常ボタン（開ける、詳細、もどる、とじる、つぎへ以外の全般） | 木札を軽く打つ短い音。共通 `sfx_tap` とは別素材。 |
| `gacha_btn_primary` | 主要ボタン（「1回引く」「10回引く」「開ける」「おわる」「木札を購入する」） | `gacha_btn` に鈴を足した温かい音。 |
| `gacha_btn_disabled` | 押せないボタン（木札不足の「10回引く」など） | 小さく鈍い音。 |
| `gacha_detail_open` / `gacha_detail_close` | 「詳細」（`GachaDetail`）を開く/閉じる | 紙が広がる/畳まれる。 |
| `gacha_tab_draw` / `gacha_tab_shop` | 引く/購入タブ切替 | 木札を返す音。 |
| `gacha_nav` | ガチャ画面に重なる下部ナビ（ホーム・御朱印帳・おでかけ・あつめる） | 木枠を打つ短い音（共通 `sfx_tab` とは別素材）。ガチャ画面を離れる遷移を示す。 |
| `gacha_close` | とじる（画面を閉じる） | 幕が静かに閉じる短い音。 |

### 4-5. ショップ（購入タブ）
| ID | 動き | 内容 |
|---|---|---|
| `gacha_shop_open` | 購入タブに切替 | 市の鈴、木札が並ぶ音。 |
| `gacha_shop_select` | 商品の選択 | 木札を手に取る。 |
| `gacha_shop_buy` | 購入ボタン | 木札を渡す音。祝いすぎない。 |
| `gacha_cart_add` / `gacha_cart_remove` / `gacha_qty` | カート追加・削除・数量±（現行版に存在しなくても音源は用意） | 小さな木札の音。 |

### 4-6. 重複モビー（`DuplicateMobbies`、ガチャ結果に付随する場合）
| ID | 動き | 内容 |
|---|---|---|
| `gacha_duplicate` | 重複を変換 | 光がひとつにまとまる、鈴 1 打。 |

## 5. 実装
- ID → ファイルの対応は `src/data/audioAssets.ts` に静的に追加。命名は `gacha_*`。ディレクトリは `assets/audio/gacha/`。
- `GachaScreen.tsx` の音の呼び出しを、上表の ID と `gachaTimeline.ts` の定数に合わせて全面的に置き換える。**phase の切替検知だけでなく、`ms` / `openedFor` 経過時間で細かい動き（鼓動の 4 打、MA、見得、四季）を鳴らす**（既存 `walkAudio` / `unloadAudio` の方式を拡張。`HAPTIC_BEATS` と同期させ、音を OFF にしても触覚は残る）。
- 演出の中断（スキップ、画面を閉じる、アプリがバックグラウンドへ）時は、**再生中のガチャ音をすべて停止**する。再入場でゴースト音が残らないこと。
- 触覚（`data.haptics`）との二重化を避けつつ、同じタイミングで鳴らす。
- BGM はスコープ方式（`useSceneBgm`、優先度）を維持。ガチャ画面中は共通 BGM と共通 SFX を鳴らさない（ガチャ専用の音のスコープ/ミュート機構を `audio.ts` に追加してよい）。
- **触らない**: `App.tsx`、`useJourney.ts`（Claude 担当）。`HomeBottomNavigation` の `gachaActive` 時の切替は `HomeNavigation.tsx` 側で完結させる。App.tsx 側に必要な変更があれば案を報告。

## 6. 検証
- `npm run typecheck`、`npm test`（`tests/audio.test.ts` にガチャ専用ルールのテストを追加: ガチャ中は共通 SFX/BGM が鳴らない、中断で全停止）。
- web で起動し、ガチャ入場 → 幕 → 運搬 → 着地 → 紐引き → 開封 → 結果 → 10連 → 詳細 → ショップ → 閉じるを通して、例外 0 を確認。**共通の `sfx_*` が 1 つも再生されていない**ことを、再生ログ（開発用の一時フラグで可）で確認し、報告に含める。
- `docs/audio-manifest.md` を更新し、§3・§4 の全 ID の配置チェックリスト（未配置は理由つき）、各音の長さと対応する定数・phase を表で記載。
- ラウドネス・ピーク・ループ検査（`scripts/check-audio.cjs`）を再実行。
- 未確認（実機の再生、実耳での確認）は明記する。
- `codex/bgm-sfx` にコミット。push・PR はユーザーの指示があるまで行わない。
