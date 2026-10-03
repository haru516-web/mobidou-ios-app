# Codex 向け指示書：BGM と操作音（もび道 / 2026-10-03）

ブランチ: `codex/bgm-sfx`（`claude/finish-polish` の `24fbaa8` から作成）。ワークツリーは自分で作成する（例: `git worktree add D:\codex-worktrees\bgm-sfx codex/bgm-sfx`）。push・PR はユーザーの指示があるまで行わない。

## 0. 現状（調査結果）
- アプリに**音の仕組みは未導入**。`package.json` に `expo-audio` / `expo-av` なし。音声ファイルも `assets/` に無い。
- 触覚（`expo-haptics`）は `data.haptics`（設定「ふれあいの振動」）で ON/OFF。使用箇所は `GachaScreen`（`HAPTIC_BEATS`、settle、revealed）、`PilgrimageAward`（御朱印出現）、`PullableCompanion`（タップ・お参り・引っぱり）。**音はこれらと同じタイミングに合わせると漏れが少ない**。
- ボタンは `src/components.tsx` の `Button` / `Pressable`（`WashiPressable`、`src/components/Washi.tsx`）、`PopButton`、`Close`、`Icon` ボタンに集約されている。共通部品に音フックを入れれば大半が網羅できる（後述 §3）。

## 1. 作るもの（成果物）
音声ファイルは `assets/audio/bgm/` と `assets/audio/sfx/` に置く。形式は **m4a（AAC）**（iOS ネイティブ想定。web 検証用に必要なら mp3 を併記可）。ファイル名は下表の ID。
- 作曲・効果音の制作はあなたの裁量（生成・合成・フリー素材の自作加工いずれでも可）。**権利が不明な素材は使わない**。使った素材・ツール・ライセンスを `docs/audio-credits.md` に記録する。
- 容量: BGM 合計 6MB 以内目安（128kbps 前後、ループ曲は 40〜90 秒）、効果音は各 50KB 以下目安（0.05〜1.5 秒）。
- BGM は**継ぎ目なくループ**すること（先頭・末尾の無音/クリックなし）。
- 世界観（最重要）: **和風、とくに日本の伝統芸能・伝統音楽を主な参照元にする**。西洋的な音（ピアノ、ハープ、ストリングス、シンセパッド、ゲーム的なファンファーレ）を土台にしない。やわらかく静かで、主張しすぎない。歌・ボーカル・強いビートは避ける。
  - 雅楽（神社・巡礼の主軸）: 笙（持続和音）、篳篥、龍笛、琵琶、楽太鼓・鞨鼓・鉦鼓。ゆったり伸びる「間（ま）」を活かす。結願・御朱印授与・ガチャの開封は、雅楽の間と序破急を参考にする。
  - 神事: 神楽鈴、柏手、大太鼓の遠い脈動、玉砂利、鳥の声。祝詞のような静けさ（声は使わない）。
  - 能・狂言: 能管の鋭い一声、小鼓・大鼓の打音（掛け声なし）、足拍子。ガチャの「溜め→解放」に序破急を使う。
  - 歌舞伎: 柝（拍子木）の「チョン」を場面の切り替え・幕開けに。下座音楽（三味線、鳴り物）を軽く。
  - 箏曲・地歌・文楽: 三味線、箏（琴）、尺八、十七弦。ホーム曲（`bgm_main`）の中心。
  - 日本の環境音・民俗: 風鈴、鹿威し、水琴窟、虫の音、梵鐘、木魚、木鉦、祭り囃子の笛と太鼓。
  - 音階は陽旋法・陰旋法・都節音階・呂律など日本の旋法を基本にする。長調の明るい西洋和声進行は避ける。
  - シンセやサンプルを使う場合も、音色は和楽器・和の質感に寄せて加工し、洋楽器に聞こえないこと。
- 歩きながら使うアプリなので、**音量は小さめ前提**でミックス（ラウドネス目標: BGM -20 LUFS 前後、効果音 -16 LUFS 前後、ピークは -1dBFS 以下）。

## 2. BGM（5 曲）
基本方針: **ガチャ以外は共通 BGM**。ガチャだけ別曲。結願など特別な演出は専用ジングル（BGM を一時的に下げて/止めて再生）。

| ID | 使う場所 | 雰囲気 | 長さ/ループ |
|---|---|---|---|
| `bgm_main` | ホーム／御朱印帳／おでかけ（歩数・絵図）／あつめる（部屋・御朱印・ミニチュア・パス）／設定／各ポップアップ／ソーシャルシート／おみくじ待機 | のどかな朝の境内。箏・三味線・篠笛・尺八・ほのかな鈴、風や水琴窟の環境音。穏やかで長時間聞いても疲れない。テンポ遅め | 60〜90 秒ループ |
| `bgm_opening` | 起動演出（`OpeningExperience`）、初回チュートリアル（`firstRunStage`: route〜floatingDrag、presentBox） | `bgm_main` の導入版。静かに始まり、期待感。ロゴ表示に合わせて淡く盛り上がる | 30〜45 秒（ループ or 終端で `bgm_main` にクロスフェード） |
| `bgm_gacha` | ガチャ画面（`GachaScreen` のショップ含む入場〜演出前の待機） | 「ご縁を結ぶ」。少し神秘的で、期待が高まる。笙の持続和音、神楽鈴、遠い大太鼓の脈動、能管のかすかな一声。雅楽〜能の序破急で期待を高める。`bgm_main` より少しだけ華やか | 45〜60 秒ループ |
| `bgm_walk_award` | 結願・御朱印授与演出（`PilgrimageAward`: approach〜leave） | 参道を歩く厳かな雅楽調。足取り（とことこ）に合わせた木鉦や小鼓の穏やかなリズム、笙と龍笛。pray フェーズで静かになる | 約 134 フレーム≒12 秒の演出に合う 12〜20 秒（ワンショット可） |
| `bgm_omikuji` | おみくじを引く全画面（`omikujiModal`） | 静かな緊張から結果で開ける。`bgm_main` を少し下げ、鈴の余韻中心 | 20〜30 秒ループ、または `bgm_main` を継続して SFX のみでも可（提案してよい） |

ガチャ演出内の切り替え（`gachaTimeline.ts` の phase: `curtain → roll → settle → ready → charge → hold → fade → revealed`）:
- 入場〜`ready` まで: `bgm_gacha` を流す。
- `charge`（板を引き上げ開始）〜`hold`: BGM を 0.3 秒でダックし、SFX 主体（溜め→解放）。
- `revealed`: ジングル（§4 `jingle_gacha_reveal`）→ `bgm_gacha` を小さく戻す。
- ガチャ画面を閉じたら `bgm_gacha` をクロスフェード（0.8 秒）で `bgm_main` に戻す。

### BGM 制御の仕様
- クロスフェード 0.8〜1.2 秒。アプリがバックグラウンドに行ったら一時停止、復帰で再開（`AppState`）。
- 音量設定: **BGM 音量・効果音音量・各 ON/OFF を設定モーダルに追加**（`SettingsModal.tsx` の「ふれあいの振動」の並びに「BGM」「効果音」スイッチ＋音量）。初期値は BGM ON（音量 40%）、効果音 ON（音量 70%）。
- 保存は `AsyncStorage` に専用キー（例: `mobidou.audio.v1`）。**`useJourney.ts` / `App.tsx` は Claude 担当**なので、触らずに済む設計にする（音声サービスは自前で状態を持ち、`useAudioSettings()` のような hook を公開）。どうしても App.tsx への配線が要る場合は、必要な変更案を報告書に書く。
- iOS: 他アプリの音楽を止めない（`mixWithOthers` 相当）、マナーモード（サイレントスイッチ）に従う。イヤホン抜けで一時停止してよい。
- 同じ効果音の連打は 80ms 以内の重複を抑制。同時再生数の上限（例: 6）。
- 低消費電力: 画面がオーバーレイ（設定・ポップアップ）でも BGM は継続。ホームを離れても止めない。

## 3. 効果音（SFX）の一覧と配置場所
命名は `sfx_<名前>`。「共通フック」は共通部品に 1 箇所入れるだけで全箇所に効く方式。**まず共通フックで網羅し、個別音は専用の場所だけ追加**する。

### 3-1. 共通（共通部品にフックを入れる）
| ID | 鳴らす操作 | 入れる場所 | 音の方向性 |
|---|---|---|---|
| `sfx_tap` | 通常ボタン、リンク、カード、リスト行、タブ以外の `Pressable` 全般 | `Washi.tsx` の `WashiPressable`（`onPress` ラップ）。`artwork={false}` のカードも含む | 木をやさしく叩く、短い（50〜80ms） |
| `sfx_tap_primary` | 主要ボタン（`plate="primary"`、`Button` 部品） | `src/components.tsx` の `Button` | `sfx_tap` より少し丸く温かい、鈴の余韻を少し |
| `sfx_tap_round` | 丸ボタン・ピル（`plate="round"`/`"pill"`、前後ページ送り以外、設定歯車など） | `WashiPressable` の `plate` で分岐 | 小さな「ぽん」 |
| `sfx_pop` | `PopButton`（目次、絵図/歩数切替、あつめるの 4 ボタン） | `PopButton.tsx` | ふくらむ/ぽんと弾む。選択中の切替は少し高い音 |
| `sfx_close` | `Close`（×）、背景タップで閉じる（ポップアップ・詳細・おみくじ・設定） | `Close` 部品と各 Modal の背景 `Pressable` | 紙を畳む/とじる、下降 |
| `sfx_open` | モーダル・ポップアップ・シートが開く（設定、御朱印詳細、ホームポップアップ、ソーシャルシート、目次、アカウント、週の振り返り） | 各 Modal の `onShow` 時、またはシート側の mount | 紙が広がる、上昇、短い |
| `sfx_toggle_on` / `sfx_toggle_off` | スイッチ切替（`WashiSwitch`） | `WashiSwitch.tsx` | カチッと軽い2種（高/低） |
| `sfx_disabled` | 無効状態のボタンを押した | `WashiPressable` で `disabled` 時の押下（検知できる範囲で） | 小さく鈍い「こつ」。うるさくしない |
| `sfx_tab` | 下部ナビ（`HomeBottomNavigation`: ホーム／御朱印帳／おでかけ／あつめる、ガチャ） | `HomeNavigation.tsx` | 木札/木枠を打つ。選択切替が分かる。ガチャボタンだけ `sfx_gacha_enter`（§3-4） |
| `sfx_toast` | マイルストーンのお知らせ、エラーのお知らせ、お知らせ表示 | `milestoneToast` 表示時、`journey.error` 表示時（エラーは控えめな別音 `sfx_error`） | 鈴 1 打、やさしい |

### 3-2. ホーム・コンパニオン（モビー）
| ID | 操作 | 場所 |
|---|---|---|
| `sfx_mobby_pet` | モビーをタップして反応（`triggerButtonReaction`） | `PullableCompanion.tsx:337` 付近（触覚 Light と同じ位置） |
| `sfx_mobby_pray` | お参りボタン（二礼二拍手一礼） | `PullableCompanion.tsx:376` 付近。拍手フレーム（`clapFrames`）で `sfx_clap`（柏手）を鳴らす（`:389`）、礼の部分は鈴 or 無音 |
| `sfx_pull_stretch` | モビーを引っぱっている間（ゴム/布の伸び。引く量に比例して音程が上がる）| `onPanResponderMove`（`:523`）。連続音は軽く |
| `sfx_pull_release` | 離す（ぱちん/ぽよん）。10 回目の特別（`special`）は `sfx_pull_release_special`（きらきら付き） | `PullableCompanion.tsx:458` 付近 |
| `sfx_mobby_drag` | フローティングモビー（`FloatingMobby`）を掴む／離す／メニュー展開 | `FloatingMobby.tsx`（掴む＝小さな鳴き声風、離す＝ぽん）。キャラ別の鳴き声は不要（共通 1 種） |
| `sfx_menu_open` / `sfx_menu_close` | モビーのメニュー（`mobbyMenuOpen`）開閉 | `App.tsx` の `setMobbyMenuOpen` 周辺（※App.tsx は Claude 担当なので変更案を報告） |
| `sfx_home_card_edit` | ホームカード長押しで編集モードに入る／ドロップ | `App.tsx`（`editHomeCards`）→ 同上、変更案を報告 |
| `sfx_bond_up` | 好感度が上がる（`onBond`）。頻繁なので**短く小さく**、連続時は間引き | `onBond` 呼び出し側 |

### 3-3. 御朱印帳
| ID | 操作 | 場所 |
|---|---|---|
| `sfx_page_turn` | ページめくり（前/次ボタン、スワイプ、目次から移動） | `BookPageTurn.tsx`（アニメ開始に合わせる）。**短いめくり音を 2〜3 種作ってランダム**（ループ感を避ける）。長距離ジャンプは速めの連続めくり `sfx_page_flip_fast` |
| `sfx_book_open` | 御朱印帳タブ入場で表紙を開く／表紙変更 | `NativeBookPageTurn.ios.tsx` / `GoshuinBook.tsx` |
| `sfx_stamp_view` | 御朱印詳細を開く／拡大表示 | 詳細 Modal の `onShow`、`openDetailStampPreview` |
| `sfx_stamp_press` | 御朱印を押す・授与される瞬間（後述 §3-5 の結願と同じ音） | — |
| `sfx_cover_change` | 御朱印帳の表紙デザイン変更（選択） | 表紙選択 UI |

### 3-4. ガチャ
| ID | 場面（`gachaTimeline` の phase） | 音 |
|---|---|---|
| `sfx_gacha_enter` | 下部ナビのガチャボタン、画面入場 | 鈴＋木札の音。他の `sfx_tab` より特別 |
| `sfx_curtain` | `curtain`（暖簾/幕が開く） | 歌舞伎の柝（拍子木）の「チョン」＋布が左右へすれる音。1.1 秒に合わせる |
| `sfx_roll_walk` | `roll`（モビーが荷を運ぶ。`WALK_MS` ≒ 1.3 秒） | とことこ足音（木の床）。`UNLOAD`（荷下ろし）で `sfx_unload`（ごとん） |
| `sfx_box_settle` | `settle`（荷が着地。触覚 Heavy と同期） | 重めの「どすん」＋小さな揺れ |
| `sfx_rope_ready` | `ready`（紐/板が揺れている）待機中のヒント | 無音でよい（BGM に任せる）。任意で小さな鈴のきらめき |
| `sfx_rope_pull` | 板を引き上げている最中（`PULL_TO_DRAW=64` まで） | 紐が張る/きしむ、引くほど音が高く。`PULL_TO_DRAW` 到達で `sfx_rope_catch`（カチッ） |
| `sfx_rope_cancel` | 引き途中で離して戻る | 紐がゆるむ、すっと戻る |
| `sfx_gacha_charge` | `charge`（光が集まる） | ライザー（上昇音）、溜め。`HAPTIC_BEATS` と同期 |
| `sfx_gacha_burst` | `hold` 直前の光の解放（`burstAt`） | きらめきの炸裂、鈴の和音。レア度が高いほど長い/豪華（`sfx_gacha_burst_rare`）。レアの判定は `pull` の結果から（`GachaScreen` 内で取得できる） |
| `jingle_gacha_reveal` | `revealed`（モビー登場） | 3〜5 秒のジングル。通常/レアの 2 段階 |
| `sfx_card_flip` | 複数引き（10 連）の 1 体ずつ結果を送る・ページ送り | カードめくり、軽い |
| `sfx_ticket_use` | 木札（チケット）を使う、数が減る | 木札がカランと鳴る |
| `sfx_shop_buy` | ショップ（`showShop`）で購入ボタン、カート追加（`gachaCart`）、数量±、削除 | 小銭/木札の音（カート追加 `sfx_cart_add`、削除 `sfx_cart_remove`）。購入確定は `sfx_purchase_done`（祝いすぎない） |
| `sfx_duplicate` | 重複モビーの変換（`DuplicateMobbies`） | ぽんと光がまとまる |

### 3-5. 巡礼・結願・おでかけ
| ID | 場面 | 音 |
|---|---|---|
| `sfx_award_footsteps` | `PilgrimageAward` の `approach`/`enter`/`return`/`leave` | 玉砂利/石畳の足音（フレームに同期、`WALK_FRAME_MS` 準拠）。または `bgm_walk_award` のリズムで代替 |
| `sfx_bow` | `bowIn` / `bowOut`（一礼） | 衣擦れ＋小さな鈴 |
| `sfx_clap` | `pray` の二拍手（柏手 2 回） | 乾いた柏手。`sfx_mobby_pray` と共有可 |
| `sfx_stamp_reveal` | `reveal`（御朱印出現、`BURST_AT` と触覚 Success に同期） | 判を押す「ぽん」＋墨の広がり（`InkReveal`）に合わせたにじみ音＋鈴の余韻。`special`（特別なご縁）は豪華版 `sfx_special_reveal` |
| `jingle_complete` | 結願（最後の地点）の達成 | 4〜6 秒。静かな達成感。派手にしすぎない |
| `sfx_keychain_roll` / `sfx_keychain_get` | 結願で「特別なご縁／キーチェーン」抽選（`onArrive` → `rollKeychain`）の結果。当たりは `sfx_keychain_get` | 抽選中は短いカラカラ、当たりで鈴、外れは無音（落ち込ませない） |
| `sfx_skip` | 「演出を省略して御朱印をみる」 | `sfx_tap` で可 |
| `sfx_arrive_point` | 歩数がたまって次の地点に到達（`milestones`）、お知らせ | `sfx_toast` と別の「到着」鈴 |
| `sfx_map_open` / `sfx_map_toggle` | おでかけの絵図／歩数切替（`PopButton walkMap`）、地点タップ | `sfx_pop` で可。地図の巻物展開は `sfx_scroll_open`（ScrollPopup 系） |
| `sfx_steps_refresh` | 「今日の歩数を更新」押下、歩数加算の完了 | 小さな「しゃらん」。更新失敗は `sfx_error` |
| `sfx_demo_walk` | 体験で 1,000 歩あるく | 足音の短いループ（0.8 秒） |
| `sfx_route_advance` | 「次の巡礼へ進む」 | 木札を替える音。`sfx_tap_primary` + 軽い鈴 |

### 3-6. おみくじ
| ID | 場面 | 音 |
|---|---|---|
| `sfx_omikuji_shake` | 引く（`pulling` ステージ）。筒を振る、棒が出る | カラカラ、短い。長押し/操作中は連続 |
| `sfx_omikuji_reveal` | `revealing`（紙を引き寄せる） | 紙のすべり音、ふわっと |
| `sfx_omikuji_rank_*` | 運勢が出る瞬間（`REVEAL_EFFECTS[rank]` と同期）: 大吉は華やか（鈴＋きらめき）、中吉・吉は穏やか、小吉・末吉は静かな鈴 1 打 | **ランク別 3 種**（大吉／中吉・吉／小吉・末吉）。凶など悪い結果が無いので、全て前向きな音 |
| `sfx_omikuji_tie` | おみくじを結ぶ/しまう（あれば） | 紙を結ぶ音 |

### 3-7. あつめる・コレクション
| ID | 場面 | 音 |
|---|---|---|
| `sfx_collection_tab` | 部屋／御朱印／ミニチュア／パスの切替 | `sfx_pop` |
| `sfx_room_place` / `sfx_room_pick` | 部屋（`CollectionRoom`）で飾りを動かす/置く | 持つ「ぽ」/置く「こと」 |
| `sfx_gallery_open` | `CollectionGallery` の詳細を開く | `sfx_open` |
| `sfx_pet_select` | 相棒（`choosePet`）変更 | 軽い鈴 + `sfx_tap_primary` |
| `sfx_item_unlock` | 新しいもの（背景、御朱印、ミニチュア）を入手・解放 | 小さなきらめき |

### 3-8. ソーシャル・アカウント・設定
| ID | 場面 | 音 |
|---|---|---|
| `sfx_gift_open` | ギフト/プレゼント箱（`presents`）を開く | 箱を開ける、鈴 |
| `sfx_gift_receive` | ギフトを受け取る | 小さな祝いの鈴 |
| `sfx_friend_action` | フレンド申請・承認・送信（`SocialSheets`） | 送信は `sfx_send`（紙飛行機的な「ひゅっ」）、受信は `sfx_toast` |
| `sfx_input_key` | テキスト入力（`WashiInput`） | **無音**（入力は静かに）。フォーカスのみ小さな音でも可 |
| `sfx_settings_*` | 設定内の項目（トグルは §3-1、アカウント画面の移動は `sfx_tap`） | — |
| `sfx_error` | 失敗・エラー（歩数連携失敗、通信エラー） | 低く短い「こと」、不快にならない |
| `sfx_success` | 保存完了、連携完了（歩数連携など） | 小さな鈴 2 打 |

### 3-9. 初回チュートリアル／機能ツアー／起動
| ID | 場面 | 音 |
|---|---|---|
| `sfx_opening_logo` | 起動演出のロゴ出現、「はじめる」（`onEnter`） | 鈴 1 打＋息づかい。`bgm_opening` と同期 |
| `sfx_tutorial_next` | チュートリアルの進行（`firstRunStage` 変化）、`TutorialSpotlight` 表示、`TutorialTapHint` の「タップ」 | `sfx_tap` + 軽い鈴 |
| `sfx_tour_step` | 機能ツアー（`FeatureTour`）の次へ/戻る/終了 | `sfx_tap` / 終了で `sfx_success` |
| `sfx_weekly_open` | 週の振り返り（`WeeklyReview`）表示 | `sfx_open` + 鈴 |
| `sfx_daily_return` | 日次おみくじ自動提案（`omikujiDayChecked`）で表示 | `sfx_open` |

## 4. ジングル（BGM を下げて/止めて再生）
- `jingle_gacha_reveal`（通常／レア）、`jingle_complete`（結願）、`sfx_special_reveal`（特別なご縁）。
- 再生中は BGM を 40% までダックし、終了後 1 秒かけて戻す。

## 5. 実装方針（Codex 向け）
1. 依存: `expo-audio`（Expo SDK 54 対応版）を `npx expo install expo-audio` で導入。web（`expo export --platform web`）でも落ちないこと（`Platform.OS === 'web'` では自動再生制限があるので、最初のユーザー操作後に開始）。
2. `src/services/audio.ts`（新規）: BGM プレイヤー（トラック切替・クロスフェード・ダック）、SFX プレイヤー（事前ロード、同時再生制限、デバウンス）、設定（AsyncStorage）、`useAudioSettings()`。API 例: `playSfx('tap')`, `setBgm('main' | 'gacha' | ...)`, `duckBgm(ms)`。
3. `src/data/audioAssets.ts`（新規）: ID → `require(...)` の対応表（Metro は動的 require 不可なので静的に列挙）。
4. 共通フック: `Washi.tsx` の `WashiPressable`、`components.tsx` の `Button`/`Close`、`PopButton.tsx`、`WashiSwitch.tsx`、`HomeNavigation.tsx`。**Pressable に `soundless` プロップを足してオプトアウトできる**ようにする（二重再生防止: 触覚と同じタイミングで個別音を鳴らす箇所、`WashiInput` 等）。
5. 個別: `GachaScreen.tsx`、`PilgrimageAward.tsx`、`PullableCompanion.tsx`、`OmikujiExperience.tsx`、`BookPageTurn.tsx`、`FloatingMobby.tsx`、`OpeningExperience.tsx`、`SettingsModal.tsx`（音量設定 UI。`WashiSwitch` と既存スタイルに合わせる。縦スクロールを増やさない）。
6. **触らない（Claude 担当）**: `App.tsx`、`src/services/useJourney.ts`、`steps.ts`、`progress.ts`、初回チュートリアル本体、歩数表示、週の振り返り。これらに音を足す必要がある箇所（BGM のタブ/画面切替、`mobbyMenuOpen`、`editHomeCards`、`firstRunStage` 遷移、`milestoneToast`、`journey.error`、各 Modal の開閉）は、**「どの state 変化で何を呼ぶか」の変更案を報告書に書いて止める**。
   - BGM の画面別切替の要は App.tsx の `gachaOpen`（`bgm_gacha`）、`awardVisible`（`bgm_walk_award`）、`openingVisible` / `firstRunStage`（`bgm_opening`）、`omikujiModal`（`bgm_omikuji`）、その他（`bgm_main`）。
7. 触覚との関係: `data.haptics` とは独立。音を OFF にしても触覚は残る。逆も同様。

## 6. 検証
- `npm run typecheck`、`npm test` が通る。音声サービスの純粋ロジック（デバウンス、同時再生制限、BGM 状態遷移）は `tests/audio.test.ts` を追加。
- web で起動して例外 0。ネイティブ（iOS）の再生は実機/シミュレータで確認できる範囲を報告（確認できなければ「未確認」と明記）。
- 全 SFX / BGM の一覧（ID、ファイル、長さ、サイズ、ループ有無、使用箇所）を `docs/audio-manifest.md` に表で残す。**§3 の ID が全て配置されたか**のチェックリストも付ける（未配置はその理由つき）。
- 完了報告: 変更ファイル、確認した内容、未確認の点、App.tsx 側に必要な変更案。

## 7. 優先順位（時間が足りない場合）
1. 共通フック（`sfx_tap`／`sfx_tap_primary`／`sfx_close`／`sfx_open`／`sfx_tab`／`sfx_toggle_*`）と `bgm_main`。
2. ガチャ一式（`bgm_gacha`、curtain〜reveal、ジングル）。
3. 御朱印帳のページめくり、結願（`sfx_stamp_reveal`、`jingle_complete`）。
4. モビーのタップ/お参り/引っぱり、おみくじ。
5. その他（ソーシャル、チュートリアル、コレクション部屋、ショップ）。
