# 音声実装の引き継ぎ（2026-10-03）

作業場所: `D:/codex-worktrees/bgm-sfx`。指定ブランチがClaude側で使用中だったため、同じHEADからdetached worktreeを作成。元のチェックアウトを切り替えずに作業。push・PRなし。

## Claude担当ファイルの変更案

App.tsx、useJourney.ts、steps.ts、progress.ts、初回チュートリアル本体、歩数表示、WeeklyReviewは編集していません。

音声サービスのIDはファイルと同じ完全名。`playSfx('sfx_tap')`、`setBgm('bgm_main')`、`playJingle('jingle_complete')`。

既存のGachaScreen/OpeningExperience/PilgrimageAward/OmikujiExperienceは `useSceneBgm` で音の所有権を持ち、非表示・unmountで下の画面へ復帰します。Appで同じ4シーンのsetBgmを重複させないでください。常設の通常タブはbgm_mainです。SettingsModalもBGMを切り替えません。

| state変化 | 呼び出し案 |
|---|---|
| App起動 | `void initAudio()`。Webは初回pointerdown/keydownでunlock済み。自動再生はしない |
| gachaOpen false→true/true→false | GachaScreenのmount/unmountでbgm_gacha/mainへクロスフェード。非表示のままmountを保持する構成ならenabledをpropで渡す |
| awardVisible false→true/true→false | PilgrimageAwardのmount/unmountでbgm_walk_award/下の曲へ復帰 |
| openingVisible false→true/true→false | OpeningExperienceのmount/unmountでbgm_opening/下の曲へ復帰 |
| omikujiModal false→true/true→false | OmikujiExperienceのvisibleでbgm_omikuji/下の曲へ復帰 |
| firstRunStageがroute〜floatingDragまたはpresentBox | App内で `useSceneBgm('bgm_opening', 対象ステージ && !openingVisible, 50)`。対象を抜けたら共通曲へ戻る |
| firstRunStageの前進 | 初回の初期化時を除き `playSfx('sfx_tutorial_next')`。初回本体に直接追加しない |
| mobbyMenuOpen false→true/true→false | `playSfx('sfx_menu_open'/'sfx_menu_close')` |
| editHomeCards false→true / card drop成功 | `playSfx('sfx_home_card_edit')`、ドラッグ中は連打しない |
| milestoneToastが新しい地点IDで表示 | `playSfx('sfx_arrive_point')`。同一IDのrerenderで再生しない |
| journey.errorが空→非空/別エラーへ | `playSfx('sfx_error')`。毎renderで鳴らさない |
| Appに直接ある各ModalのonShow/背景閉じる | `playSfx('sfx_open'/'sfx_close')`、背景Pressableは `soundless`。SettingsModal/Sheet/ScrollPopupは既に開く音があるので重複させない |
| stamp詳細onShow / openDetailStampPreview成功 | `playSfx('sfx_stamp_view')`。iOS NativeBookPageTurnからの詳細は配置済み |
| 表紙選択成功 | `playSfx('sfx_cover_change')`。選択ボタンの通常音はsoundlessで抑制 |
| choosePet成功 | `playSfx('sfx_pet_select')` |
| 歩数更新成功/失敗 | `playSfx('sfx_steps_refresh'/'sfx_error')` |
| 体験歩行開始/次の巡礼確定 | `playSfx('sfx_demo_walk'/'sfx_route_advance')` |
| WeeklyReview表示/日次おみくじ提案 | `playSfx('sfx_open')`。OmikujiExperience側にBGM所有権あり |
| FeatureTour進行/終了 | `playSfx('sfx_tap'/'sfx_success')`。初回本体は担当側で対応 |
| 保存/連携成功 | `playSfx('sfx_success')` |
| 新しい背景/ミニチュア等の入手確定 | `playSfx('sfx_item_unlock')` |

## 現行データとの差

PullResultはpetId/isNew/guaranteed/kindのみでレア度なし。勝手にisNewをレアとみなしていません。レア度が追加された場合、GachaScreenのhold/revealedでsfx_gacha_burst_rare/jingle_gacha_reveal_rareに分岐してください。カート数量・削除・購入確定はこの版に存在しないため、sfx_cart_add/remove/purchase_doneは音源のみ。Settingsの音量は10%刻み、既存の振動行を横方向にまとめて縦スクロールの項目を増やしていません。

## 検証

typecheck成功、npm testは144件すべて成功。web export成功。Webの設定操作・紐引き・運搬・板引上げ・開封完了を新規セッションで確認し、修正後のブラウザーerrorログ0件。全86音源のAAC検査成功、BGM合計2,534,232bytes、デコード後true peak最大-1.05dBTP。詳細はaudio-validation.json。iOS再生・サイレントスイッチ・他アプリの音楽とのミックス・イヤホン抜去・実端末でのループ試聴は未確認。expo-audio追加後は開発ビルドを作り直してください。録音を使わないためpluginのマイク権限は無効化。

変更ファイルはapp.json/package.json/package-lock.json、src/components.tsxと関連コンポーネント、src/services/audio.ts/audioLogic.ts/audioPlayer.ts、src/data/audioAssets.ts、tests/audio.test.ts、scripts/create-audio.cjs/check-audio.cjs/document-audio.cjs、docs/audio-*.md/json、assets/audio以下86個のm4a。音源合成はピアノ・ハープ・ストリングス・シンセパッドを使用していません。

変更したコンポーネント: BookPageTurn.tsx、FloatingMobby.tsx、GachaScreen.tsx、GachaShop.tsx、GoshuinBook.tsx、HomeNavigation.tsx、ModalParts.tsx、NativeBookPageTurn.ios.tsx、OmikujiExperience.tsx、OpeningExperience.tsx、PilgrimageAward.tsx、PopButton.tsx、PullableCompanion.tsx、ScrollPopup.tsx、SettingsModal.tsx、SocialSheets.tsx、Washi.tsx、WashiSwitch.tsx。

未配置の専用音はaudio-manifest.mdのチェックリストに記載。App側の呼び出し、現行版に存在しない機能、無効Pressableの押下、機能ツアーの専用音が残っています。共通部品による通常タップ音は機能ツアーにも適用されます。
