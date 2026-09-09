# もび道（もびどう）

モビーと歩き、もびの世界の御朱印を集める iOS アプリの MVP。Expo SDK 54 / React Native 0.81 / TypeScript。

## 起動

```powershell
cd D:\mobby\mobidou
npm install
npm run web
```

ブラウザ確認は http://localhost:8083 。初回の「まずは体験してみる」で、歩数操作と授与演出を試せます。ネットワーク制限下での開発起動は `npx expo start --web --port 8083 --offline`。

### iPhone

- Expo Go（SDK 54対応版）: `npx expo start --go --port 8083`。Core Motionの当日歩数を使用します。
- HealthKit版: Mac + Xcodeで `npx expo run:ios --device`。同梱のローカルExpoモジュール `modules/mobi-health` がHealthKitを読み取ります。
- EAS利用時はアカウント・Apple署名設定後に `eas build --platform ios --profile development`。`eas.json` に開発／プレビュー／本番プロファイルを同梱しています。クラウドビルドや配信はまだ行っていません。

Windows上ではiOS向けJavaScript/Hermesバンドルの書き出しまで検証済みです。Swiftのコンパイル・署名・iPhone実機での権限画面、実歩数、振動は未検証です。

HealthKitは読み取り専用です。権限要求が完了しても、Appleの仕様上、読み取り許可の拒否はアプリから判別できません。0歩が続く場合の設定案内をアプリ内に表示しています。GPS、位置情報、バックグラウンドでの独自計測は使用しません。AndroidのHealth Connectは今回のiOS MVPには含めていません。

## 実装した体験

- ホーム: 今日の歩数、次の御朱印までの進捗、キャラとのふれあい。
- 御朱印帳: 見開き、取得済み／未取得フィルター、説明、取得日と獲得時歩数。
- おでかけ: 1,000 / 3,000 / 5,000歩で1日最大3種。翌日は未取得の続きから。全6種でひとめぐり。
- モビー: `D:\english-ios-app\src\petCatalog.ts` の現行26体をすべて選択可能。元リポジトリは読み取りのみ。
- ふれあい: なでる・おやつ・話す、キャラ固有の一言、ジャンプ／傾き、ハート／団子、ふれあい回数と親密度。
- 授与: 暗転、御朱印が押される動き、結縁印、光の粒、相棒のお祝い、触覚フィードバック。OSの視差効果を減らす設定に対応。
- 設定: 歩数連携、振動、体験モード、プライバシー、アプリ案内。
- AsyncStorageに記録を保存。再起動後の復元、日付変更、重複防止、未表示の授与演出のキュー保存。

実歩数の御朱印帳と体験用の御朱印帳は別々に保持します。「翌日のめぐりを体験」は体験用の進行だけを進め、端末日付は変えません。選択キャラとふれあいは共通です。端末データの削除・クラウド同期機能はありません。

## 画像と世界観

御朱印6枚はビルトインimage_genで新規生成。追加参照画像の片目レンズ・十字キー・丸ボタン2つを維持したモビ神を描いています。`assets/goshuin/` に1024×1536 PNGを同梱。最終プロンプトは `docs/prompt-*.txt`、制作記録は `docs/ARTWORK.md`。

各社名には「もび」を含め、創作の名前を採用。実在施設とは関連しないことをアプリ内に明記しています。同名施設は公開Web検索では確認されていませんが、未公開の名称も含めた絶対的な非一致を証明するものではありません。

全画像・日本語フォントはアプリ内同梱。インストール済みiOS本番ビルドでは通信なしで基本機能を利用できます。Web開発プレビューではローカルサーバーが必要です。日本語フォントとアイコンは使うファイルだけを直接読み込み、不要なフォントの同梱を抑えています。

## 検証

```powershell
npm run typecheck
npm test
npx expo install --check
npm run export:web
npx expo export --platform ios --output-dir dist-ios
```

純粋な進行処理のテストは `tests/progress.test.ts`。検証記録は `docs/QA.md`。

## 構成

- `App.tsx`: ナビゲーション、画面、初回案内、設定。
- `src/components.tsx`: 共通UI、モビーのリアクション、御朱印、授与演出。
- `src/services/useJourney.ts`: 保存・復元、実歩数連携、体験モード。
- `src/services/progress.ts`: 現地日付、しきい値、順次解放、保存形式の検査。
- `src/services/steps.ts`: HealthKit / Core Motionの切り替え。
- `modules/mobi-health/ios/MobiHealthModule.swift`: HealthKitの当日累積歩数。
- `src/data/shrines.ts`: 架空の社と御朱印の対応。

参照仕様書: `docs/original-design.md`。iOSを優先し、通知・サウンド・課金・アカウントは導入していません。

技術参照: [Expo SDK 54 Pedometer](https://docs.expo.dev/versions/v54.0.0/sdk/pedometer/)、[Expo Image](https://docs.expo.dev/versions/v54.0.0/sdk/image/)。フォント: Shippori Mincho（SIL Open Font License、ライセンスは依存パッケージ内に同梱）。
