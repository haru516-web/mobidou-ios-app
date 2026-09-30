# UIスモーク検証の保存データと再実行

対象ブランチは `codex/v3-followups`。アプリ本体や依存定義は変更しない。

## 実行

1. ルートで `npm run web` を起動し、`http://127.0.0.1:8083` を使う。
2. Playwrightをプロジェクトの依存に追加せず、外部に用意されたPlaywrightで実行する。Chromeが必要。

通常の外部Playwright環境では、`PLAYWRIGHT_MODULE_PATH` にその `node_modules/playwright` の絶対パスを指定し、`npx playwright test docs/qa-smoke-playwright.spec.cjs --fully-parallel --workers=3 --reporter=line` を実行する。

今回のCodex付属環境で実際に使用したPowerShellコマンド:

```powershell
$env:PLAYWRIGHT_MODULE_PATH = 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
npx --no-install -c "node C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/cli.js test docs/qa-smoke-playwright.spec.cjs --fully-parallel --workers=3 --reporter=line"
```

`SMOKE_SCREENS` にカンマ区切りの画面名を指定すると、その画面だけ独立して再検証し、同サイズの既存JSONの該当行を置き換える。解除すると全画面を実行する。

```powershell
$env:SMOKE_SCREENS = 'map,gacha-drag-result'
# 上の実行コマンドで再検証
Remove-Item Env:SMOKE_SCREENS
```

サイズごとに別Chromeを起動し、画面ごとに新しいBrowserContextとページを作る。ページ読み込み前の `addInitScript` で `@mobidou/journey/v1` に保存JSONを書き、アプリ起動時に読み込ませる。前画面の操作履歴やブラウザ制御の再接続に依存しない。生成日にはAsia/Tokyoの当日を使う。各コンテキストの保存領域は本物のユーザーデータとは独立している。

スクリーンショットは `qa-smoke-screens/<size>-<screen>.png`、コンソール・到達・戻る操作・ボタン境界の記録は `<size>-results.json`。ランナーが完走したことと画面が合格したことは別で、合否はJSONと報告表を見る。

## 保存データの雛形

そのまま使える全JSONは [fixtures.json](qa-smoke-screens/fixtures.json)。定義元は [検証スクリプト](qa-smoke-playwright.spec.cjs) の `fresh / partial / completed / base / fixtures`。

| キー | 用途 | 主な状態 |
|---|---|---|
| base | 実記録・複数所持・重複ホーム | `onboarded:true`, `demo:false`, `real.routeId:"sanctuary"`, `pet:"mobibou"`, `owned:{mobibou:2,mobirin:1,mobichi:1}` |
| trial | 体験モード・プレゼント・フレンド | `demo:true`, `trial:partial()`。実記録と体験記録を別々に持つ |
| noRoute | 巡礼選択とイベント枠 | 実記録を `fresh()` にして `routeId` を持たない。オープニング後に巡礼選択が自動で開く |
| omikuji | おみくじを引く前 | `omikujiDay:null`, `omikujiPetId:null`。巡礼選択済みなのでホームで自動的におみくじが開く |
| completion | 初回結願の授与演出 | 全5社を獲得し、`completedAt` が当日、`pending:["morikage"]` |
| replay | 結願済みの再巡礼演出 | 結願・所持御朱印を残したまま `lapBase` を持ち、`pending:["rain"]` |
| gachaResult | 途中で終了したガチャの結果復帰 | `unrevealed:[{petId:"mobichi",isNew:true,guaranteed:false,kind:"free"}]`、無料残数0 |

`base` のガチャ状態は `paidPulls:24`, `freePulls:1`, `freePullRoutes:["sanctuary"]`, `unrevealed:[]`。無料で引いても有償の天井回数を進めない。

御朱印の歩数メタデータは既存の途中作業から引き継いだ旧しきい値の保存データ。アプリの移行処理が、獲得済みの御朱印を保ちつつ現在のルート歩数へ補正する。これは通常の新規プレイの歩数例ではない。再巡礼では結願済みの所有記録を消さない。

JSONを手動で使う場合は、対象ページのコンソールで次を実行して再読み込みする（`fixture` に `fixtures.json` の1項目を渡す）:

```js
localStorage.setItem('@mobidou/journey/v1', JSON.stringify(fixture));
location.reload();
```

## 判定と画像レビュー

エラーを収集し、主要画面への到達と戻る操作を確認する。縦横のボタン境界では、非表示の測定用DOMと意図的なスクロール領域の外側を除外する。設定は縦スクロール、モビー選択とコレクションは横スクロール、巡礼と情報本文はページ切り替えが仕様。

PNGを目視し、主要な文字・絵・ボタンの欠けを確認する。`qa-smoke-report.py` をPillowのあるPythonで実行すると全サイズのJSONを集約し、画像一覧JPGを生成する。戻る操作を実行した行は `backChecked:true`。ガチャの箱・引き上げ中の途中画面は、そのまま撮影するため戻る操作を個別には実行せず、`gacha-drag-result` でひも→板→結果→終了の一連の操作を確認する。

Web検証ではiOSのHealthKit権限、触覚、StoreKit決済、オンライン未接続の機能の本通信は検証できない。プレゼントとフレンドは体験モードのサンプル表示を確認する。
