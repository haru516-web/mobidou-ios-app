# もび道（もびどう）

モビーと歩き、もびの世界の御朱印を集める iOS アプリ。Expo SDK 54 / React Native 0.81 / TypeScript。
公開前の開発中で、課金・オンライン機能（サーバー、フレンド、イベント）はまだアプリにつながっていません（下の「現在の状態」を参照）。

## 起動

```powershell
cd D:\mobby\mobidou
npm install
npm run web
```

ブラウザ確認は http://localhost:8083 。ネットワーク制限下での開発起動は `npx expo start --web --port 8083 --offline`。

### iPhone

- **Expo Go**（SDK 54対応版）: `npx expo start --go --port 8083`。Core Motionの当日歩数を使います。画面・巡礼・ガチャ・抽選などのロジックは、これで確認できます。
- **開発用ビルド（EAS Build）**: Macは不要です。Expo のクラウドでビルドします。`eas build --platform ios --profile development`（Expoアカウント、Apple Developer への端末登録が必要）。`eas.json` に開発／プレビュー／本番プロファイルを同梱しています。HealthKit、ネイティブのページカール、アプリ内課金の試験には、この開発用ビルドが必要です（Expo Go には入っていません）。
- Macがある場合は `npx expo run:ios --device` でも実機ビルドできます。

Windows上ではiOS向けJavaScript/Hermesバンドルの書き出しまで検証済みです。Swiftのコンパイル・署名・iPhone実機での権限画面、実歩数、振動、課金は未検証です。

HealthKitは読み取り専用です。権限要求が完了しても、Appleの仕様上、読み取り許可の拒否はアプリから判別できません。0歩が続く場合の設定案内をアプリ内に表示しています。GPS、位置情報、バックグラウンドでの独自計測は使用しません。AndroidのHealth Connectは今回のiOSアプリには含めていません。

## 実装した体験

- **ホーム**: 今日の歩数、次のポイントまでの進捗、キャラとのふれあい、並べ替えできる2枚のカード（御朱印・おみくじ・巡礼マップ）。重複して手に入れたモビーが、相棒の足元に小さく並びます。
- **巡礼**: 6種類×2コースの全12巡礼。コースを選んで歩いた歩数を積み上げ、最初のポイントは5,000歩。1日の上限なしで順に御朱印を授かり、途中でコースを変えても続きから再開できます。
  - **結願**（初回）: 称号・結願印・そのルートの専用表紙・無料ガチャ1回を授かります。
  - **再巡礼**: 結願済みのルートを選び直すと、結願の記録は保ったまま歩数を0から積み直します。所持済みの御朱印は短い演出になり、結願報酬は初回のみです。
  - イベント巡礼の枠は「未開放」として表示するだけです。
- **御朱印帳**: 見開きのページめくり（iOSはネイティブのページカール）、説明、取得日。表紙は巡礼の結願で解放されます。
- **ミニチュアキーホルダー**: 寺社に到達した演出のときに、持っていなければ抽選（確率10%）。1つの社につき所持は1個まで。持っていれば「もう持ってるよ」と表示して抽選しません。外れたその場で交換券を使うこともできます（過去の外れには使えません）。月額プランの確率50%は、加入状態を仮の値で扱っています（課金は未接続）。
- **モビー**: 全18体。最初のチュートリアルで1体を選び、それ以外はガチャで出会います（全体から完全に均等、有償25回ごとに未所持1体を確定する仕様。基準の実装は `src/services/gacha.ts`）。
- **ガチャ画面**: ひもを引く → 縦長の木箱が転がってくる → 前面の板を上へ引き上げる → 光があふれ、弱まると中のモビーが現れます。アプリでは無料ガチャ（巡礼の初回結願で1回）だけ引けます。箱・光・ひもの絵は図形の代用で、素材は `docs/codex-gacha-assets.md` の依頼書に沿って制作します。
- **おでかけ**: 今日の歩数の更新と巡礼マップ。
- **コレクション**: 全74社の御朱印とミニチュアキーホルダーの展示。
- **おみくじ**: 1日1回。引いた結果は相棒を替えても変わらない。
- **ふれあい**: なでる・おやつ・話す、キャラ固有の一言、ジャンプ／傾き、ハート／団子、ふれあい回数と親密度。
- **授与**: 暗転、御朱印が押される動き、結縁印、光の粒、相棒のお祝い、触覚フィードバック。OSの視差効果を減らす設定に対応。
- **設定**: 歩数連携、振動、体験モード、アカウント管理、プライバシー、アプリ案内。
- **保存**: AsyncStorageに記録を保存。再起動後の復元に加え、引き継ぎコードの書き出しと確認付き読み込みに対応。保存データが読めない場合は元データを `@mobidou/journey/v1/corrupted-backup` に退避して新しい記録で続行します。古い保存形式（以前のミニチュア・パス・モビー選択）は、読み込み時に移行します。

実歩数の御朱印帳と体験用の御朱印帳は別々に保持します。「翌日のめぐりを体験」は体験用の進行だけを進め、端末日付は変えません。選択キャラとふれあいは共通です。

## 現在の状態（公開前に未完了のもの）

| 項目 | 状態 |
|---|---|
| アプリ内課金（ガチャ購入、ミニチュアの月額プラン） | **未接続**。StoreKitは未実装。加入状態は仮の値 |
| サーバー（`server/`） | Cloudflare Workers + D1 の土台と、ガチャ・購入検証・ギフト・フレンド・イベント歩数のAPIを実装。**未デプロイ、アプリから未接続**。テストは 18 件 |
| プレゼント・フレンド・お知らせ | 画面はあるが、オンライン未接続。体験モードでは見本を表示。**公開前に出し分けを決める**（`docs/design-v3-monetization-server.md`） |
| イベント巡礼 | 「未開放」の枠のみ |
| モビーの追加ダウンロード | 未実装（現在の18体は同梱。追加分はダウンロードで配信する設計） |
| ガチャ演出の素材 | 図形で代用中 |
| プライバシー表記 | アプリ内の「サーバー送信はありません」は、サーバーにつなぐ時点で**書き換えが必要**（匿名ID、フレンド名、購入履歴を扱うため）。プライバシーポリシーのURLも要用意 |

設計の全体、決定事項、実装の順番は [docs/design-v3-monetization-server.md](docs/design-v3-monetization-server.md)。

## 画像と世界観

御朱印86枚はビルトインimage_genで生成。`mobbyyellow.PNG` をモビ神の造形参照にし、片目レンズ・十字キー・丸ボタン2つ・短い手足を維持しています。`assets/goshuin/` に1024×1536で同梱（PNG44枚、WebP42枚）。全86社の生成プロンプトは `docs/prompt-*.txt`、共通ルールは `docs/ARTWORK.md` に記録しています。

各社名には「もび」を含め、創作の名前を採用。実在施設とは関連しないことをアプリ内に明記しています。同名施設は公開Web検索では確認されていませんが、未公開の名称も含めた絶対的な非一致を証明するものではありません。

現在の18体のモビー、画像、日本語フォントはアプリ内同梱。インストール済みiOS本番ビルドでは、通信なしで基本機能を利用できます。Web開発プレビューではローカルサーバーが必要です。

## 検証

```powershell
npm run typecheck
npm test                      # アプリの純粋な処理のテスト（84件）
npx expo install --check
npm run export:web
npx expo export --platform ios --output-dir dist-ios
```

サーバーは `server/` で `npm install` のあと `npm run typecheck` と `npm test`（[server/README.md](server/README.md)）。

- 進行・再巡礼: `tests/progress.test.ts`、`tests/pilgrimages.test.ts`
- ミニチュア抽選・パス: `tests/specialRewards.test.ts`
- ガチャ・モビーの所持: `tests/gacha.test.ts`、演出の時間割: `tests/gachaTimeline.test.ts`
- 保存形式の移行: `tests/useJourneyBookDesigns.test.ts`
- 画面の検証: Playwrightによる3サイズ×30画面の記録は `docs/qa-smoke-20260930.md`（手順は `docs/qa-smoke-fixtures.md`）。過去の記録は `docs/QA.md`。

## 構成

- `App.tsx`: ナビゲーション、画面、初回案内。
- `src/components.tsx`: 共通UI（色・ボタン・御朱印スタンプなど）。
- `src/components/`: 各画面の部品。設定は `SettingsModal.tsx`、ガチャは `GachaScreen.tsx`（時間割は `gachaTimeline.ts`）、授与演出は `PilgrimageAward.tsx`、重複モビーは `DuplicateMobbies.tsx`、イベント枠は `EventSlot.tsx`。
- `src/services/useJourney.ts`: 保存・復元、実歩数連携、体験モード、モビーの所持、ミニチュア。
- `src/services/progress.ts`: 現地日付、しきい値、順次解放、再巡礼、保存形式の検査。
- `src/services/specialRewards.ts`: ミニチュアの抽選と交換券の規則。
- `src/services/gacha.ts`: モビーの所持とガチャの規則（基準の実装）。
- `src/services/steps.ts`: HealthKit / Core Motionの切り替え。
- `src/services/social.ts`: プレゼント・フレンド（サーバー接続の入口。現在はオフライン）。
- `src/data/pilgrimages.ts`: 12巡礼のコース・目標歩数（恒常/イベントの区分）。
- `src/data/shrines.ts`: 架空の社と御朱印の対応。
- `modules/mobi-health/`: HealthKitの当日累積歩数（Swift）。
- `modules/mobi-page-curl/`: 御朱印帳のネイティブページカール。
- `server/`: Cloudflare Workers + D1 のサーバー。

## ドキュメント

- 設計と決定事項: `docs/design-v3-monetization-server.md`
- Codexへの依頼: `docs/codex-prompts-v3.md`、`docs/codex-prompts-v3-followups.md`、ガチャ素材 `docs/codex-gacha-assets.md`
- 世界観・素材: `docs/ARTWORK.md`、`docs/pilgrimage-v2-route-world.md`
- 参照仕様書: `docs/original-design.md`（古い部分があります。最新は上の設計書）

技術参照: [Expo SDK 54 Pedometer](https://docs.expo.dev/versions/v54.0.0/sdk/pedometer/)、[Expo Image](https://docs.expo.dev/versions/v54.0.0/sdk/image/)。フォント: Shippori Mincho（SIL Open Font License、ライセンスは依存パッケージ内に同梱）。
