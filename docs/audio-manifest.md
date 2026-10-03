# 音源一覧

BGM5曲、SFX・ジングルは全てオリジナル手続き合成。再生成: `node scripts/create-audio.cjs`。検査: `node scripts/check-audio.cjs`。

| ID | ファイル | 秒 | bytes | ループ | 配置 |
|---|---|---:|---:|---|---|
| bgm_main | assets/audio/bgm/bgm_main.m4a | 72 | 903885 | 有 | 共通画面（audio.tsのシーン所有権） |
| bgm_opening | assets/audio/bgm/bgm_opening.m4a | 36 | 430031 | 有 | src/components/OpeningExperience.tsx |
| bgm_gacha | assets/audio/bgm/bgm_gacha.m4a | 54 | 727496 | 有 | src/components/GachaScreen.tsx |
| bgm_walk_award | assets/audio/bgm/bgm_walk_award.m4a | 16 | 185981 | 無 | src/components/PilgrimageAward.tsx |
| bgm_omikuji | assets/audio/bgm/bgm_omikuji.m4a | 24 | 286839 | 有 | src/components/OmikujiExperience.tsx |
| sfx_tap | assets/audio/sfx/sfx_tap.m4a | 0.075 | 2042 | 無 | src/components/Washi.tsx |
| sfx_tap_primary | assets/audio/sfx/sfx_tap_primary.m4a | 0.24 | 3973 | 無 | src/components/Washi.tsx, src/components.tsx |
| sfx_tap_round | assets/audio/sfx/sfx_tap_round.m4a | 0.18 | 3390 | 無 | src/components/Washi.tsx |
| sfx_pop | assets/audio/sfx/sfx_pop.m4a | 0.18 | 3379 | 無 | src/components/PopButton.tsx |
| sfx_close | assets/audio/sfx/sfx_close.m4a | 0.32 | 4613 | 無 | src/components/HomeNavigation.tsx, src/components/ModalParts.tsx, src/components/ScrollPopup.tsx, src/components/SocialSheets.tsx |
| sfx_open | assets/audio/sfx/sfx_open.m4a | 0.32 | 4940 | 無 | src/components/HomeNavigation.tsx, src/components/SettingsModal.tsx, src/components/SocialSheets.tsx |
| sfx_toggle_on | assets/audio/sfx/sfx_toggle_on.m4a | 0.18 | 3279 | 無 | src/components/WashiSwitch.tsx |
| sfx_toggle_off | assets/audio/sfx/sfx_toggle_off.m4a | 0.18 | 3292 | 無 | src/components/WashiSwitch.tsx |
| sfx_disabled | assets/audio/sfx/sfx_disabled.m4a | 0.18 | 3231 | 無 | 未配置：NativePressableのdisabledは押下イベントを発火しない。無効セマンティクスを維持 |
| sfx_tab | assets/audio/sfx/sfx_tab.m4a | 0.18 | 3340 | 無 | src/components/HomeNavigation.tsx |
| sfx_toast | assets/audio/sfx/sfx_toast.m4a | 0.85 | 10514 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_error | assets/audio/sfx/sfx_error.m4a | 0.18 | 3232 | 無 | src/components/SocialSheets.tsx |
| sfx_mobby_pet | assets/audio/sfx/sfx_mobby_pet.m4a | 0.18 | 3287 | 無 | src/components/PullableCompanion.tsx |
| sfx_mobby_pray | assets/audio/sfx/sfx_mobby_pray.m4a | 0.18 | 3317 | 無 | src/components/PullableCompanion.tsx |
| sfx_clap | assets/audio/sfx/sfx_clap.m4a | 0.18 | 3321 | 無 | src/components/PilgrimageAward.tsx, src/components/PullableCompanion.tsx |
| sfx_pull_stretch | assets/audio/sfx/sfx_pull_stretch.m4a | 0.18 | 3380 | 無 | src/components/PullableCompanion.tsx |
| sfx_pull_release | assets/audio/sfx/sfx_pull_release.m4a | 0.18 | 3314 | 無 | src/components/FloatingMobby.tsx, src/components/PullableCompanion.tsx |
| sfx_pull_release_special | assets/audio/sfx/sfx_pull_release_special.m4a | 0.85 | 10578 | 無 | src/components/PullableCompanion.tsx |
| sfx_mobby_drag | assets/audio/sfx/sfx_mobby_drag.m4a | 0.18 | 3338 | 無 | src/components/FloatingMobby.tsx |
| sfx_menu_open | assets/audio/sfx/sfx_menu_open.m4a | 0.32 | 4601 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_menu_close | assets/audio/sfx/sfx_menu_close.m4a | 0.32 | 4524 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_home_card_edit | assets/audio/sfx/sfx_home_card_edit.m4a | 0.18 | 3316 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_bond_up | assets/audio/sfx/sfx_bond_up.m4a | 0.24 | 3977 | 無 | src/components/PullableCompanion.tsx |
| sfx_page_turn_1 | assets/audio/sfx/sfx_page_turn_1.m4a | 0.32 | 4549 | 無 | src/services/audio.ts（playPageTurn）→BookPageTurn/NativeBookPageTurn.ios |
| sfx_page_turn_2 | assets/audio/sfx/sfx_page_turn_2.m4a | 0.32 | 4583 | 無 | src/services/audio.ts（playPageTurn）→BookPageTurn/NativeBookPageTurn.ios |
| sfx_page_turn_3 | assets/audio/sfx/sfx_page_turn_3.m4a | 0.32 | 4567 | 無 | src/services/audio.ts（playPageTurn）→BookPageTurn/NativeBookPageTurn.ios |
| sfx_page_flip_fast | assets/audio/sfx/sfx_page_flip_fast.m4a | 0.32 | 4573 | 無 | GoshuinBook BookIndexPopup→playPageTurn(true) |
| sfx_book_open | assets/audio/sfx/sfx_book_open.m4a | 0.32 | 4710 | 無 | src/components/GoshuinBook.tsx |
| sfx_stamp_view | assets/audio/sfx/sfx_stamp_view.m4a | 0.18 | 3359 | 無 | src/components/NativeBookPageTurn.ios.tsx |
| sfx_stamp_press | assets/audio/sfx/sfx_stamp_press.m4a | 0.18 | 3349 | 無 | 未配置：専用の操作フックが未実装（共通タップは有効） |
| sfx_cover_change | assets/audio/sfx/sfx_cover_change.m4a | 0.18 | 3287 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_gacha_enter | assets/audio/sfx/sfx_gacha_enter.m4a | 0.18 | 3298 | 無 | src/components/HomeNavigation.tsx |
| sfx_curtain | assets/audio/sfx/sfx_curtain.m4a | 1.1 | 13361 | 無 | src/components/GachaScreen.tsx |
| sfx_roll_walk | assets/audio/sfx/sfx_roll_walk.m4a | 1.28 | 9969 | 無 | src/components/GachaScreen.tsx |
| sfx_unload | assets/audio/sfx/sfx_unload.m4a | 0.18 | 3312 | 無 | src/components/GachaScreen.tsx |
| sfx_box_settle | assets/audio/sfx/sfx_box_settle.m4a | 0.18 | 3310 | 無 | src/components/GachaScreen.tsx |
| sfx_rope_ready | assets/audio/sfx/sfx_rope_ready.m4a | 0.18 | 3353 | 無 | 仕様に従い無音。待機はbgm_gacha |
| sfx_rope_pull | assets/audio/sfx/sfx_rope_pull.m4a | 0.18 | 3413 | 無 | src/components/GachaScreen.tsx |
| sfx_rope_catch | assets/audio/sfx/sfx_rope_catch.m4a | 0.18 | 3299 | 無 | src/components/GachaScreen.tsx |
| sfx_rope_cancel | assets/audio/sfx/sfx_rope_cancel.m4a | 0.18 | 3273 | 無 | src/components/GachaScreen.tsx |
| sfx_gacha_charge | assets/audio/sfx/sfx_gacha_charge.m4a | 1.5 | 19012 | 無 | src/components/GachaScreen.tsx |
| sfx_gacha_burst | assets/audio/sfx/sfx_gacha_burst.m4a | 0.18 | 3303 | 無 | src/components/GachaScreen.tsx |
| sfx_gacha_burst_rare | assets/audio/sfx/sfx_gacha_burst_rare.m4a | 0.18 | 3304 | 無 | 未配置：現行PullResultにレア度なし。音源のみ制作 |
| sfx_card_flip | assets/audio/sfx/sfx_card_flip.m4a | 0.18 | 3334 | 無 | src/components/GachaScreen.tsx |
| sfx_ticket_use | assets/audio/sfx/sfx_ticket_use.m4a | 0.18 | 3298 | 無 | src/components/GachaScreen.tsx |
| sfx_shop_buy | assets/audio/sfx/sfx_shop_buy.m4a | 0.18 | 3347 | 無 | src/components/GachaShop.tsx |
| sfx_cart_add | assets/audio/sfx/sfx_cart_add.m4a | 0.18 | 3389 | 無 | 未配置：この版のショップにカート/数量/購入確定コールバックなし |
| sfx_cart_remove | assets/audio/sfx/sfx_cart_remove.m4a | 0.18 | 3310 | 無 | 未配置：この版のショップにカート/数量/購入確定コールバックなし |
| sfx_purchase_done | assets/audio/sfx/sfx_purchase_done.m4a | 0.18 | 3398 | 無 | 未配置：この版のショップにカート/数量/購入確定コールバックなし |
| sfx_duplicate | assets/audio/sfx/sfx_duplicate.m4a | 0.18 | 3308 | 無 | 未配置：重複の変換演出なし |
| sfx_award_footsteps | assets/audio/sfx/sfx_award_footsteps.m4a | 0.18 | 3402 | 無 | src/components/PilgrimageAward.tsx |
| sfx_bow | assets/audio/sfx/sfx_bow.m4a | 0.32 | 4966 | 無 | src/components/PilgrimageAward.tsx |
| sfx_stamp_reveal | assets/audio/sfx/sfx_stamp_reveal.m4a | 0.85 | 10342 | 無 | src/components/PilgrimageAward.tsx |
| sfx_special_reveal | assets/audio/sfx/sfx_special_reveal.m4a | 0.85 | 10290 | 無 | src/components/PilgrimageAward.tsx |
| sfx_keychain_roll | assets/audio/sfx/sfx_keychain_roll.m4a | 0.18 | 3362 | 無 | 未配置：抽選はonArriveで即時確定。抽選中の演出なし |
| sfx_keychain_get | assets/audio/sfx/sfx_keychain_get.m4a | 0.85 | 10514 | 無 | src/components/PilgrimageAward.tsx |
| sfx_arrive_point | assets/audio/sfx/sfx_arrive_point.m4a | 0.85 | 10320 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_scroll_open | assets/audio/sfx/sfx_scroll_open.m4a | 0.32 | 4706 | 無 | src/components/ScrollPopup.tsx |
| sfx_steps_refresh | assets/audio/sfx/sfx_steps_refresh.m4a | 0.18 | 3350 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_demo_walk | assets/audio/sfx/sfx_demo_walk.m4a | 0.18 | 3312 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_route_advance | assets/audio/sfx/sfx_route_advance.m4a | 0.18 | 3340 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_omikuji_shake | assets/audio/sfx/sfx_omikuji_shake.m4a | 0.18 | 3334 | 無 | src/components/OmikujiExperience.tsx |
| sfx_omikuji_reveal | assets/audio/sfx/sfx_omikuji_reveal.m4a | 0.85 | 10342 | 無 | src/components/OmikujiExperience.tsx |
| sfx_omikuji_rank_great | assets/audio/sfx/sfx_omikuji_rank_great.m4a | 0.85 | 10290 | 無 | src/components/OmikujiExperience.tsx |
| sfx_omikuji_rank_good | assets/audio/sfx/sfx_omikuji_rank_good.m4a | 0.85 | 10476 | 無 | src/components/OmikujiExperience.tsx |
| sfx_omikuji_rank_quiet | assets/audio/sfx/sfx_omikuji_rank_quiet.m4a | 0.85 | 10514 | 無 | src/components/OmikujiExperience.tsx |
| sfx_omikuji_tie | assets/audio/sfx/sfx_omikuji_tie.m4a | 0.32 | 4694 | 無 | 未配置：結ぶ/しまう操作なし |
| sfx_room_place | assets/audio/sfx/sfx_room_place.m4a | 0.18 | 3277 | 無 | 未配置：この版の部屋に飾りのドラッグ操作なし |
| sfx_room_pick | assets/audio/sfx/sfx_room_pick.m4a | 0.18 | 3327 | 無 | 未配置：この版の部屋に飾りのドラッグ操作なし |
| sfx_pet_select | assets/audio/sfx/sfx_pet_select.m4a | 0.18 | 3341 | 無 | src/components/HomeNavigation.tsx |
| sfx_item_unlock | assets/audio/sfx/sfx_item_unlock.m4a | 0.18 | 3212 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_gift_open | assets/audio/sfx/sfx_gift_open.m4a | 0.85 | 11605 | 無 | 共通Sheetのsfx_openで代替 |
| sfx_gift_receive | assets/audio/sfx/sfx_gift_receive.m4a | 0.85 | 10342 | 無 | src/components/SocialSheets.tsx |
| sfx_send | assets/audio/sfx/sfx_send.m4a | 0.18 | 3314 | 無 | src/components/SocialSheets.tsx |
| sfx_success | assets/audio/sfx/sfx_success.m4a | 0.85 | 10476 | 無 | src/components/SocialSheets.tsx |
| sfx_opening_logo | assets/audio/sfx/sfx_opening_logo.m4a | 0.85 | 11605 | 無 | src/components/OpeningExperience.tsx |
| sfx_tutorial_next | assets/audio/sfx/sfx_tutorial_next.m4a | 0.18 | 3282 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| sfx_tour_step | assets/audio/sfx/sfx_tour_step.m4a | 0.18 | 3379 | 無 | 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案 |
| jingle_gacha_reveal | assets/audio/sfx/jingle_gacha_reveal.m4a | 4 | 45832 | 無 | src/components/GachaScreen.tsx |
| jingle_gacha_reveal_rare | assets/audio/sfx/jingle_gacha_reveal_rare.m4a | 5 | 50103 | 無 | 未配置：現行PullResultにレア度なし。音源のみ制作 |
| jingle_complete | assets/audio/sfx/jingle_complete.m4a | 5 | 50120 | 無 | src/components/PilgrimageAward.tsx |

## 仕様§3 配置チェックリスト

[x]は直接配置または明示した共通音の代替。[ ]は専用音が未配置。

- [x] `sfx_tap`: src/components/Washi.tsx
- [x] `sfx_tap_primary`: src/components/Washi.tsx, src/components.tsx
- [x] `sfx_tap_round`: src/components/Washi.tsx
- [x] `sfx_pop`: src/components/PopButton.tsx
- [x] `sfx_close`: src/components/HomeNavigation.tsx, src/components/ModalParts.tsx, src/components/ScrollPopup.tsx, src/components/SocialSheets.tsx
- [x] `sfx_open`: src/components/HomeNavigation.tsx, src/components/SettingsModal.tsx, src/components/SocialSheets.tsx
- [x] `sfx_toggle_on`: src/components/WashiSwitch.tsx
- [x] `sfx_toggle_off`: src/components/WashiSwitch.tsx
- [ ] `sfx_disabled`: 未配置：NativePressableのdisabledは押下イベントを発火しない。無効セマンティクスを維持
- [x] `sfx_tab`: src/components/HomeNavigation.tsx
- [x] `sfx_gacha_enter`: src/components/HomeNavigation.tsx
- [ ] `sfx_toast`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [x] `sfx_error`: src/components/SocialSheets.tsx
- [x] `sfx_mobby_pet`: src/components/PullableCompanion.tsx
- [x] `sfx_mobby_pray`: src/components/PullableCompanion.tsx
- [x] `sfx_clap`: src/components/PilgrimageAward.tsx, src/components/PullableCompanion.tsx
- [x] `sfx_pull_stretch`: src/components/PullableCompanion.tsx
- [x] `sfx_pull_release`: src/components/FloatingMobby.tsx, src/components/PullableCompanion.tsx
- [x] `sfx_pull_release_special`: src/components/PullableCompanion.tsx
- [x] `sfx_mobby_drag`: src/components/FloatingMobby.tsx
- [ ] `sfx_menu_open`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [ ] `sfx_menu_close`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [ ] `sfx_home_card_edit`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [x] `sfx_bond_up`: src/components/PullableCompanion.tsx
- [x] `sfx_page_turn`: sfx_page_turn_1/2/3（ランダム）、NativeBookPageTurn.iosにも配置
- [x] `sfx_page_flip_fast`: GoshuinBook BookIndexPopup→playPageTurn(true)
- [x] `sfx_book_open`: src/components/GoshuinBook.tsx
- [x] `sfx_stamp_view`: src/components/NativeBookPageTurn.ios.tsx
- [x] `sfx_stamp_press`: sfx_stamp_reveal（授与）
- [ ] `sfx_cover_change`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [x] `sfx_curtain`: src/components/GachaScreen.tsx
- [x] `sfx_roll_walk`: src/components/GachaScreen.tsx
- [x] `sfx_unload`: src/components/GachaScreen.tsx
- [x] `sfx_box_settle`: src/components/GachaScreen.tsx
- [ ] `sfx_rope_ready`: 仕様に従い無音。待機はbgm_gacha
- [x] `sfx_rope_pull`: src/components/GachaScreen.tsx
- [x] `sfx_rope_catch`: src/components/GachaScreen.tsx
- [x] `sfx_rope_cancel`: src/components/GachaScreen.tsx
- [x] `sfx_gacha_charge`: src/components/GachaScreen.tsx
- [x] `sfx_gacha_burst`: src/components/GachaScreen.tsx
- [ ] `sfx_gacha_burst_rare`: 未配置：現行PullResultにレア度なし。音源のみ制作
- [x] `jingle_gacha_reveal`: src/components/GachaScreen.tsx
- [x] `sfx_card_flip`: src/components/GachaScreen.tsx
- [x] `sfx_ticket_use`: src/components/GachaScreen.tsx
- [x] `sfx_shop_buy`: src/components/GachaShop.tsx
- [ ] `sfx_cart_add`: 未配置：この版のショップにカート/数量/購入確定コールバックなし
- [ ] `sfx_cart_remove`: 未配置：この版のショップにカート/数量/購入確定コールバックなし
- [ ] `sfx_purchase_done`: 未配置：この版のショップにカート/数量/購入確定コールバックなし
- [ ] `sfx_duplicate`: 未配置：重複の変換演出なし
- [x] `sfx_award_footsteps`: src/components/PilgrimageAward.tsx
- [x] `sfx_bow`: src/components/PilgrimageAward.tsx
- [x] `sfx_stamp_reveal`: src/components/PilgrimageAward.tsx
- [x] `sfx_special_reveal`: src/components/PilgrimageAward.tsx
- [x] `jingle_complete`: src/components/PilgrimageAward.tsx
- [ ] `sfx_keychain_roll`: 未配置：抽選はonArriveで即時確定。抽選中の演出なし
- [x] `sfx_keychain_get`: src/components/PilgrimageAward.tsx
- [x] `sfx_skip`: sfx_tap_primary（省略ボタンの共通Button）
- [ ] `sfx_arrive_point`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [x] `sfx_map_open`: sfx_pop（walkMap）
- [x] `sfx_map_toggle`: sfx_pop（walkMap）
- [x] `sfx_scroll_open`: src/components/ScrollPopup.tsx
- [ ] `sfx_steps_refresh`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [ ] `sfx_demo_walk`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [ ] `sfx_route_advance`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [x] `sfx_omikuji_shake`: src/components/OmikujiExperience.tsx
- [x] `sfx_omikuji_reveal`: src/components/OmikujiExperience.tsx
- [x] `sfx_omikuji_rank_*`: sfx_omikuji_rank_great/good/quiet（3種）
- [ ] `sfx_omikuji_tie`: 未配置：結ぶ/しまう操作なし
- [x] `sfx_collection_tab`: sfx_pop（4ボタン）
- [ ] `sfx_room_place`: 未配置：この版の部屋に飾りのドラッグ操作なし
- [ ] `sfx_room_pick`: 未配置：この版の部屋に飾りのドラッグ操作なし
- [x] `sfx_gallery_open`: sfx_scroll_open（ScrollPopup）
- [x] `sfx_pet_select`: src/components/HomeNavigation.tsx
- [ ] `sfx_item_unlock`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [ ] `sfx_gift_open`: 共通Sheetのsfx_openで代替
- [x] `sfx_gift_receive`: src/components/SocialSheets.tsx
- [x] `sfx_friend_action`: sfx_tap_primary（申請・承認の共通ボタン。送信成功専用音は未配置）
- [x] `sfx_send`: src/components/SocialSheets.tsx
- [x] `sfx_input_key`: 仕様どおり無音
- [x] `sfx_settings_*`: sfx_toggle_on/off と共通Button
- [x] `sfx_success`: src/components/SocialSheets.tsx
- [x] `sfx_opening_logo`: src/components/OpeningExperience.tsx
- [ ] `sfx_tutorial_next`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [ ] `sfx_tour_step`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [ ] `sfx_weekly_open`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案
- [ ] `sfx_daily_return`: 未配置：App.tsx/歩数/初回チュートリアル/週の振り返り担当。audio-handoff.mdに連携案

## 検証限界

`audio-validation.json`にAACデコード後の実測LUFS/true peak/長さ/容量/境界差分を記録。AACのtrim情報とプレイヤーのループ境界は端末実装依存。iOS実機・シミュレータでの試聴は未確認。楽器の実演録音と同じ音色品質や最終的な聴感品質は未確認。
