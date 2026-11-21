# Codex 監査依頼: 初回オンボーディングが進行不能にならないこと

## 背景
App Store 審査（Guideline 2.1(a)、v1.0.0 build 16、iPhone 17 Pro Max / iOS 27.2.1）で
「オンボーディングのチュートリアル中に画面をタップしても何も起きず先へ進めない」と指摘され、リジェクトされた。
再提出で同じ指摘を絶対に受けたくない。

## 既に入れた対策（ブランチ claude/ipad-collection-fix）
- 7f751b8 `PullableCompanion.tsx`: お参りアトラス未読込でも、タップで onBond を呼び先へ進める。読込失敗も準備完了扱い。
- 未コミット: `App.tsx` に fail-safe。homeCompanion / floatingMenu / floatingDrag / homeOmikuji は 15 秒無反応なら自動で次へ。

## 監査してほしいこと
App.tsx の `FirstRunStage`
(`route → homeCompanion → floatingMenu → floatingDrag → homeOmikuji → drawOmikuji → presentBox → gacha → connectSteps → null`)
と、その前段（OpeningExperience → AccountEntry → beginFirstRun）について:

1. 各ステージで「進む条件」が満たされない端末・状況がないか（タップ対象の測定失敗、`TutorialTarget` の rect が null、
   `pointerEvents`/`disabled` による無効化、重なったモーダル、Safe Area・Dynamic Island・大画面での位置ずれ）。
2. 進行がネットワーク・HealthKit・IAP・ファイル読込（アトラス/GL テクスチャ）に依存していて、失敗・遅延で止まる箇所。
   特に drawOmikuji / presentBox / gacha / connectSteps（fail-safe 未対応）。
3. 他のモーダルの優先制御（`awardVisible` 等、`firstRunStage === null` 条件）が、チュートリアル中に
   全画面モーダルを残して操作不能にしないか。
4. `selectPilgrimageRoute` / `journey.ready` 待ちの effect（App.tsx 942 行付近）が初回インストールで確実に発火するか。
5. fail-safe の副作用（途中でメニュー/モーダルが二重に開く、状態不整合）。

## 再現環境
- 実機が最良。Web 版は `npx expo start --web --port 8091` で `?onboarding-preview=1` を付けるとチュートリアルを再現できる。
- 完全なクリーンインストール（初回起動）で、全ステージを通して最後までホームに到達できることを確認。

## 出力形式
進行不能になり得る箇所を、ファイル:行・再現条件・推奨修正の順で重大度付きに列挙。コード変更はせず指摘のみ。
