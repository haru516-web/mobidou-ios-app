# Mobby cheek-pull assets

このフォルダは、`C:\Users\User\Downloads\mobby-main\mobby-main\docs\mobby-touch` と `docs/index.html` のほっぺ引っ張り実装から移植した2Dアセットです。

- `*-noneye.webp`: カメラレンズや衣装を残した、通常の目だけを抜いたキャラクター本体。
- `*-eye-1..9.webp`: 引っ張る方向と強さに対応する目の表情。
- `*-mouth-1..10.webp` / `guide-mouth-1..10.webp`: 引っ張り中の口の表情。
- `mobiyan-eye-default.webp`: もびやんの通常時の目。反応時は9種の目に切り替えます。

配置フレームと方向ペアは `src/data/mobbyPullAssets.ts` にまとめています。元実装の `selectPullEye` と同じく、角度を5方向に分け、70px（または画面幅の16%）以上で強い表情へ切り替え、離した後550msだけ反応を残します。

残り5体（ばぶもび、ぽてもび、もびゆら、れおもび、もびぼう）は、元データに専用の目・口素材がないため、公式タッチ実装が用意していた共通のガイド口・既存目セットを使っています。キャラクター本体は各自のnoneye画像なので、9体とも単独表示と引っ張り反応が動作します。

