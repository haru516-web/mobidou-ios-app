# もび道 本公開前チェックリスト

調査日: **2026-10-12（日本時間）**。作業先: `D:\mobby\mobidou-events`。ブランチ: `codex/prerelease-audit`（`claude/events` から作成）。対象ベースコミット: `a6e537bf28249b45c21539a30b399796e28781e3`。日本向けiOS公開。2026-10-01版を全面置換した。

## 公開ブロッカー（10件・未解消）

この一覧が残る間は本公開不可。実装不足と、実装済みでも公開環境の証跡がない事項を区別する。優先順位は金銭・データ損失、個人情報、審査・公開設定の順。

領域別表45項目の集計: 確認済み12、要修正7、要判断10、要人手16。人手の作業パッケージは末尾の10件。ブロッカー10件とは重複するため加算しない。

| ID / 重大度 | 公開を止める理由 | 閉じ方 / 担当 | 対応項目 |
|---|---|---|---|
| BL01 / P0 | 有料抽選の結果保存と操作ID削除に永続化の競合がある。保存失敗・強制終了で復元不能、逆の順序で再適用による重複の懸念 | 保存成功後に操作IDを削除し、適用済みIDを永続化する方式を設計・実装し、保存失敗と強制終了を試験 / 開発者 | C03 |
| BL02 / P0 | サブスク返金・取消で `entitlements` と月次木札を取り消さない。通知欠落時のServer API再照合もない | 取引と契約期間の対応を保持し、返金・取消・逆順通知・再送を試験。権利回収の方針も承認 / 開発者・運営者 | C05 |
| BL03 / P1 | Sign in with Apple の鍵未設定・トークン交換失敗時に、Apple取消なしでアカウント削除できる | 本番secret・トークン保存を確認。交換失敗／旧アカウントを含め取消を保証する処理を整備しApple実環境で試験 / 開発者・Apple担当 | D02 |
| BL04 / P1 | 本番D1の移行、secret、通知URL、環境分離、実Apple署名・購入復元を確認できていない | 人手リスト M01〜M03 の証跡を提出 / Cloudflare・Apple担当 | B03・C02・I01 |
| BL05 / P1 | サポートURL・法的表記の適法性、未成年上限、HealthKit用途・同意、App Privacyの最終承認がない | 法律・Apple要件を実際の購入状態図と送信一覧で確認。連絡先を含むHTTPSページを指定 / 運営者・専門家 | C07・D03〜D05・H02 |
| BL06 / P1 | イベント歩数が手入力を除外せず、サーバーもクライアントの数値を信用する | 手入力除外と不正対策の採用範囲を決定、コード修正と実機試験 / 開発者・運営者 | D03 |
| BL07 / P1 | 最終iOSビルドのPrivacy Manifest・Required Reason API、フォント等のライセンス同梱が未検証 | Archiveで宣言と同梱ライセンスを確認、不足を修正 / Apple担当・開発者 | B02・G01 |
| BL08 / P1 | 依存監査に critical 1 / high 28 が残る。実行経路と適用可能な修正版の評価が未完了 | ビルドツール・端末実行を分けて評価し、互換性を確認した最小更新または採用根拠を記録 / 開発者 | A04 |
| BL09 / P1 | 提出画像は旧UIで、18体・42種など現行構成と一致しない。提出メタデータも下書きのみ | 現行署名ビルドで撮り直し、メタデータ・年齢回答を承認 / Apple担当・運営者 | G03・H01 |
| BL10 / P1 | 最終実機QA、通報対応・販売停止・復旧の運用証跡がない | 3サイズ・最古対応OS・オフライン・購入・削除の試験と、通報／障害対応訓練 / QA・運営者 | E02・F01〜F04・I03 |

### 2026-10-13 の対応（コード修正済み・実機/Sandbox試験は未実施）

- BL02: 返金は未使用分の回収のみ（負債なし）に決定・実装。プラスは返金通知で当該期間を即時終了し、未使用の月次1回分を回収。使用後の返金が180日で2回あるとサーバーが `restricted` を返し、購入を停止（アプリは文言を表示）。Apple通知の欠落時のServer API再照合は未実装のまま。
- BL06: HealthKitの歩数読取から手入力サンプルを除外（`MobiHealthModule.swift`。実機で要確認）。改造クライアントへの対策（サーバー側の急増検知など）は今回は見送り（日次10万歩の上限のみ）。
- 特商法表記の返金の文言を新方針に合わせて更新。プラス月額の記載追加は未対応（要判断・専門家確認）。

## 公開後の返金・審査リジェクト・法的問題につながる事項

- BL01/BL02 は有料資産の喪失・重複・返金後の継続利益につながる。ローカルテスト成功を実Apple/D1の証明にしない。
- 年齢別購入上限は購入前のクライアント確認が主で、サーバーの取引検証は上限超過を止めない。更新課金・別端末・同時購入時の扱いを決める（C06）。既に決済された正当な取引を単に付与拒否する修正はしない。
- TestFlight向けギフトが本番と同じ `GIFTS_JSON` にある。公開キャンペーンとしての扱い、Sandbox受付期間、イベント開始日を決める（B04）。勝手に停止・削除しない。
- 通報・ブロックは実装済みだが、既存チーム内のブロック後の表示・歩数集計と運営の対応期限は要判断（E02）。
- 引き継ぎコードは匿名アカウントの秘密を含む。共有すると他人が資産へアクセスできるため、サポートへの送付・一般共有・紛失時の失効手順を決める（D04）。値は記録しない。
- 設定・アカウント管理は縦 `ScrollView` を使う。全画面で縦スクロールなしという方針の例外を承認するか、別途UI修正が必要（F01）。見た目は今回変更しない。

## 読み方と監査範囲

「確認済み」は**記載した範囲の事実**を確認した意味で、公開承認ではない。「要修正」は具体的な不足、「要判断」は仕様・価格・確率・運用方針の決定、「要人手」は実機・管理画面・法律確認、「未確認」は検証証跡がない項目。各行に方法・結果・証跡・担当を付けた。行番号は今回の最小修正後に変わり得るため、関数・設定名も併記する。

本番への書き込み、デプロイ、購入、secret閲覧、D1読み書き、App Store Connect操作は実施していない。公開URLへの認証不要GETのみ実施した。価格・抽選確率・画面構成・機能フラグは変更していない。既存の未追跡スプライト資料・画像は保存した。

## A. コード品質

| ID / 項目 | 確認方法 | 結果 | 証跡 | 状態 | 担当 |
|---|---|---|---|---|---|
| A01 アプリ型検査 | `npm run typecheck` | 終了0 | TypeScript出力エラーなし。検証表 V01 | 確認済み | 開発者 |
| A02 アプリテスト | `npm test`、最終文言変更後は購入テスト再実行 | 207/207成功、失敗・skip 0。初回は206件、今回回帰1件追加 | `tests/purchase.test.ts`、V02/V03 | 確認済み | 開発者 |
| A03 サーバー品質 | serverでtypecheck/test | 型検査終了0、58/58成功、失敗・skip 0 | `server/tests/`、V04/V05 | 確認済み | 開発者 |
| A04 依存脆弱性 | 両方で `npm audit --omit=dev` | ルート47件: moderate18/high28/critical1。criticalは `shell-quote`。serverは0。`--omit=dev`でもExpoのビルド依存が入るため端末での悪用可能性は未判定。破壊的更新を含む `audit fix --force` は実施せず | V08/V09、`package-lock.json` | 要修正 | 開発者 |
| A05 Expo健全性 | `npx expo-doctor` | 17/18成功、直接依存 `expo-modules-core` / `@expo/prebuild-config` を指摘。前者はネイティブAPIの直接importあり、削除だけでは済まない | `package.json:33`・`:46`、`src/services/steps.ts:2`、`NativeBookPageTurn.ios.tsx:3`、V06 | 要修正 | 開発者 |
| A06 公開設定 | `npx expo config --type public` | 終了0。Swiftビルド・署名・実deployment targetを保証しない | `app.json`、`app.config.js`、V07 | 確認済み | 開発者 |
| A07 デバッグ・仮データ | src/App/server/configをrg検索 | `SHOW_CURL_DEBUG=__DEV__`、IAPログは `__DEV__` 内、全解放は `__DEV__` とenv両方必要。本番のサーバーログに例外messageがある。準備中文言は未接続時・素材ロード時等にもある | `BookPageTurn.tsx:249`、`appStore.ts:32`、`devUnlock.ts:15`、`worker.ts:683`、`SocialSheets.tsx:131` | 確認済み | 開発者 |
| A08 容量・未使用候補 | Git追跡資産とソースのliteral参照集計 | 1,525資産 / 400,090,917 bytes。literal参照が見つからない候補498 / 111,440,626 bytes。動的・Swift・設定参照を除外できないので「未使用確定」ではなく削除なし。ipa配信容量は要実測 | V12。最大 `assets/icon-proposals/icon-4.png` 2,243,135 bytes | 要人手 | QA |
| A09 ignore | tracked一覧・check-ignore | repo側に `.env*`、`.dev.vars*`、秘密鍵・署名ファイル、`output/`・`.claude/` の保護を追加。local/global ignore依存を避ける。既存追跡ファイルはignoreで消えない | `.gitignore`、V11 | 確認済み | 開発者 |

## B. 秘密情報・公開設定

| ID / 項目 | 確認方法 | 結果 | 証跡 | 状態 | 担当 |
|---|---|---|---|---|---|
| B01 秘密・履歴 | trackedテキスト・敏感なファイル名、全refsの540コミットを `git log --all --name-only -G` 検索。値は非出力 | private keyマーカーは手順・パーサー・テスト生成箇所。preview履歴の検知はembedded base64。検索範囲で実秘密は特定されず。削除済みrefs、外部管理画面、巨大バイナリ、全形式の秘密を網羅する保証ではない | `docs/release-deploy-steps.md:42`、`server/src/crypto.ts:365`、`server/tests/server.test.mjs:1059`、履歴 `1ada2ce` / `ef02874`。V10 | 確認済み | 開発者 |
| B02 iOS/manifest | 設定・widget・追跡ファイルを検索 | bundle `jp.mobby.mobidou`、version1.0.0、remote buildNumber+autoIncrement、Team設定あり、widget17.0、HealthKit read説明・app groupあり。Associated Domains・ATS例外の追加なし。repo内PrivacyInfo.xcprivacyなし。SDK自動生成とRequired Reason APIはArchive未確認。法的ページのiOS15.1記載と最終targetを照合する | `app.json`、`eas.json`、`targets/widget/expo-target.config.js:8`、`server/src/legalNotice.ts:27` | 要人手 | Apple担当 |
| B03 サーバー設定整合 | wrangler・Env・README照合 | D1 IDはUUID形式の具体値でplaceholderではない。bundle整合、public Appleルート証明書あり（秘密ではない）。Apple取消secretはwranglerに含まれず実設定未確認。READMEに不足設定名と現状を追記。明示的staging分離なし | `server/wrangler.toml`、`server/src/types.ts:18`、`server/README.md` | 要人手 | Cloudflare担当 |
| B04 本番キャンペーン | 設定とseed読む | TestFlightギフトが同じWorker設定にあり10/18期限。イベントseed開始10/20 JSTは提案、終了12/1 00:00 JST。`PURCHASE_ENVIRONMENTS`既定はProduction,Sandbox。承認なしに値変更しない | `server/wrangler.toml:20`、`server/migrations/0003_seed_toki_meguru.sql:6`、`worker.ts:73` | 要判断 | 運営者 |
| B05 アプリURL | 設定・HTTP GET | 既定はHTTPSの公開Worker。development app idでもURLは既定の同じWorkerで、試験分離は未保証。公開GETの200をDBや最新revisionの証明にしない | `src/services/server.ts:15`、`app.config.js:4`、V13 | 要判断 | 運営者・開発者 |

## C. 課金・ガチャ

| ID / 項目 | 確認方法 | 結果 | 証跡 | 状態 | 担当 |
|---|---|---|---|---|---|
| C01 商品・価格 | UI/service/wrangler/legalを照合、価格テスト | single300円=1木札、five1,200円=5木札、plus300円/月=1木札/契約期間+miniature100%。SKU末尾 single/five/plus.monthly が一致。ASC実価格・日本配信は別途 | `purchase.ts:20`、`src/data/shop.ts:23`、`server/wrangler.toml:21`、`tests/legalPrices.test.ts` | 確認済み | 開発者 |
| C02 決済・復元 | `purchase.ts`・`appStore.ts`・worker/store/cryptoとテスト読む | 匿名認証→年齢/上限確認→App Store→JWS検証→付与→finish→wallet。検証失敗は未finish、再起動再送。復元はgetAvailablePurchases→同じ検証、別accountTokenは403。保留・遅延・OS終了・real JWS・消費済み復元は実機未実施 | `purchase.ts:183`・`settleCredits`・`restorePurchases`、`appStore.ts:28`、server tests署名/再送 | 要人手 | Apple担当・QA |
| C03 抽選の保存境界 | AppとuseJourney/pendingDrawsの順序読む | `applyPaidPulls` は非同期saveキュー、直後に `void settlePaidDraws`。結果永続化を待たずID削除。`addPending` も書込み失敗を握り潰して送信。修正には画面側を含む保存完了契約と適用済みIDの設計が必要なため、今回の最小修正を超える不足として残した | `App.tsx:328`・`:351`、`useJourney.ts:240`・`:409`、`purchase.ts:addPending`、`pendingDraws.ts:16` | 要修正 | 開発者 |
| C04 再送・競合 | 状態遷移と回帰試験 | D1購入取引ID・ledgerの一意性、抽選opIdの保存・競合時再読・5連原子性あり。429を終端エラー扱いしてIDを捨てる2箇所を修正。新テストで429→429→成功を同一IDで確認。ただしop保存30日で消えた後の同一ID再送と保存失敗は別問題 | `purchase.ts:recoverPaidDraws/drawPaidTickets`、`tests/purchase.test.ts`、`store.ts:recordPurchase/commitDraws/purgeTransientData` | 確認済み | 開発者 |
| C05 サブスク・返金 | 通知とrevokePurchase/activePlanを読む | consumable未使用分回収・消費分refundDebtあり。plusは `paidPulls` 未設定なのでrefundDebt対象外、revokePurchaseはentitlementsを失効させない。月次付与・更新通知はあるが返金後権利取消、請求猶予、通知欠落時Server API再照合なし。単一SQLで全期間を消す修正は正しい契約を壊すため実施せず | `worker.ts:277`・`:445`、`store.ts:199`・`:211`、`server/README.md` incomplete | 要修正 | 開発者・運営者 |
| C06 未成年上限 | client/limits/verifyとSQL読む | under16=5,000円、16to19=10,000円、adult上限なし。下方変更のみ。クライアント購入前確認あり。server verifyに購入上限の強制・同時購入予約はない。更新課金・既決済時の対応・自己申告の信頼性を決める。既存取引は現在のcatalog価格で集計するため価格改定時にも確認が必要 | `purchase.ts:fetchLimits/buyPulls/buyPlan`、`worker.ts:505`・`/purchases/verify`、`store.ts:purchasedProducts` | 要判断 | 運営者・専門家 |
| C07 法的導線 | UIリンクと法的コピー読む | shopにApple標準EULA/privacy/legal/復元、設定にprivacy/legalあり。法的表記は屋号、責任者・住所・電話は請求時開示。plus300円/月の法的ページへの記載不足、即時引渡しと障害時待ちの整合も専門家確認。販売主体・資金決済・カード合わせ・未成年・契約条件を承認する | `GachaShop.tsx:111`、`SettingsModal.tsx:135`、`server/src/legalNotice.ts:16`、下記公式リンク | 要人手 | 専門家・運営者 |
| C08 確率 | pool集合照合と計算 | 通常client/server17ID一致。各1/17=5.882352941…%、UI丸め5.9%。5連は独立、特定1体が1回以上=1−(16/17)^5≈26.149182629%。有償・無料同pool、天井なし。イベント4体=25%、無料木札のみ、premium/shopなし。miniature通常10%、plus100%、最初hatsumobiは100%・既所持は抽選なし | `petCatalog.ts:39`・`:182`、`config/gacha.ts`、`gacha.ts:95`、`GachaScreen.tsx:36`、`useJourney.ts:403`・`:428`、`specialRewards.ts:15`。V14 | 確認済み | 開発者 |
| C09 JWS・認可 | crypto/worker/storeを読む | ES256・x5c鎖・証明書有効期間・信頼ルート・bundle・商品・accountToken・environment検証あり。self-signedテスト成功はApple実署名の証明ではない。Apple推奨の証明書プロファイル・失効確認・通知再照合は実環境確認を要する | `crypto.ts:validateChain/verifySignedPayload/verifySignedTransaction`、`worker.ts:438`、server58tests | 要人手 | Apple担当・開発者 |
| C10 入力・濫用・ログ | 全route/limits/error読む | 名前長・商品・count・歩数等検証、登録5/分30/日、verify60/時、steps120/時等。全routeにrate制限やbody読み込み前のbyte上限はない。500ログに生の例外message。secret/JWS漏れはコードで直接検出されず、実ログ未確認 | `worker.ts:106`・`:434`・`:566`・`:683`、`store.ts:hitRateLimit` | 要判断 | 開発者・運営者 |

### 購入状態遷移の確認範囲

| トリガー | 現行処理 / 失敗時 | 残る穴 |
|---|---|---|
| 年齢未設定・通信不可 | StoreKit開始前に拒否、画面メッセージ | サーバーの上限予約なし |
| ユーザー取消 | cancel後は付与しない。極端に早いcancelは接続失敗表示 | OS実際の取消・Ask to Buyは要実機 |
| 120秒応答なし・保留 | listener解除、後の取引は次回起動で未完了確認 | 支払未確定と断言する旧文言を今回修正。遅延実取引未検証 |
| Apple決済後に検証失敗 | finishしない、次回settleで再検証 | 「課金は保留」と断言する旧文言を今回修正 |
| 検証成功・finish失敗 | 購入一意IDで再付与せずfinish再試行 | Apple実挙動・D1原子性要試験 |
| 抽選応答消失 | 保存opIdで同じ結果を取得。429は今回保持 | 保存成功前のID消去、保存失敗、30日後再送 |
| 復元・別端末 | available purchasesを検証、他accountToken403、Apple連携で同アカウント復旧 | 消費済み商品は単純復元対象にしない。再インストール・匿名ID喪失を実機確認 |
| 返金・更新・取消 | consumable回収/debt、更新periodは一度付与 | plusの取消不足、通知欠落・逆順・請求失敗 |

## D. プライバシー・アカウント・HealthKit

| ID / 項目 | 確認方法 | 結果 | 証跡 | 状態 | 担当 |
|---|---|---|---|---|---|
| D01 説明の整合 | 設定・policy2コピー・App Privacy・権限文言と送信一覧を照合 | 「ログインなし」「記録だけ送る」「Apple未連携なら歩数を送らない」「引継ぎ目的のみ」の古い断言を修正。取消未実装の古い記述も修正。IP最大1日→実装上最大73時間（毎時削除が正常稼働時）へ訂正。cloud保存データと分類の詳細はD05で最終承認 | `SettingsModal.tsx:23`、`docs/privacy-policy.md`、`privacyPolicy.ts`、`docs/app-store-privacy.md`、`store.ts:473` | 確認済み | 開発者 |
| D02 削除・再送 | service/UI/server/schema/tests読む | アプリ内3段階確認、server先に削除、CASCADE・旧認証401あり。Apple refreshが存在しsecret設定済みなら取消失敗502で保持。鍵未設定または交換失敗でrefresh未保存なら取消せず削除。旧アカウントの救済、削除中sync競合・バックアップ復元後再削除も要検証 | `accountDeletion.ts:16`、`AccountCenter.tsx`、`worker.ts:78`・`:314`、`store.ts:23`、server削除tests | 要修正 | 開発者・Apple担当 |
| D03 HealthKit | Swift/steps/event送信経路読む | `toShare:[]` / read stepCountのみ。GPS/広告/分析SDKなし。sample時刻predicateのみで `HKMetadataKeyWasUserEntered` 除外なし。許可完了trueで読取許可確定とみなさない。初回許可・拒否・0歩・手入力・日跨ぎ、イベント同意の表示を実機確認。端末の自動バックアップや引継ぎコードがHealthKit由来データをiCloudへ載せないことも最終ビルドで確認 | `MobiHealthModule.swift:17`・`:29`、`steps.ts:13`、`EventScreen.tsx`、`eventTeamStore.ts:324` | 要判断 | 開発者・運営者 |
| D04 保存・移行・回復 | normalize/transfer/cloud/version tests読む | 破損退避、旧形式移行、cloud stale409、Apple復元あり。引継ぎコードに匿名認証情報を含む。平文相当のコード・AsyncStorage保存について脅威モデルと紛失/共有/失効の運用が必要。権限を持つ端末からの直接編集・再送は試験未実施 | `useJourney.ts:createTransferCode/exportRecord`、`tests/useJourneyBookDesigns.test.ts`、`cloudSave.ts:96`、`server.ts` | 要判断 | 運営者・開発者 |
| D05 App Privacy/年齢 | データ一覧・依存・Apple公式確認 | 名前/fitness/購入/ユーザーID/gameplay/他UGC/年齢/IPは申告候補。Appleサインインrefresh保管・匿名時のowned送信も実送信に含まれる。SDK/Cloudflareログ・保持・バックアップ・第三国・利用者とのリンクを最終回答。課金・ランダム商品・UGC・フレンドを年齢回答へ反映。Kidsカテゴリは未決定 | `docs/app-store-privacy.md`、下表、`server/schema.sql`、Apple App Privacy | 要人手 | 運営者・Apple担当・専門家 |

### コードからの送信データ棚卸し

| 送信先 / 呼出元 | 送信項目 / 目的 | 保持・説明との残る差 |
|---|---|---|
| `/auth/register` / server.ts | ランダムID発行、secretは端末、serverはsecret hash / 匿名認可 | user削除まで。IP rate counterは最大73時間（cron正常時） |
| `/auth/apple`, `/account/apple/link` / appleAccount.ts | identityToken・authorizationCode / 本人認証・Apple連携。serverはappleSubとrefresh tokenを保存 | user削除まで。refreshの保管・取消失敗の扱いをポリシー/運用で補足する必要 |
| `/profile`, `/profile/age-group` / social.ts, purchase.ts | 表示名・petId・ageGroup / フレンド・上限 | user削除まで。メール・氏名の取得要求なし。表示名自体は任意入力 |
| `/pets/starter`, `/pets/sync`, `/free-pulls/claim` / server.ts, purchase.ts | starter、owned全所持数、routeId / 付与・所持同期 | user削除まで。「初めに選んだモビーだけ送る」では不十分 |
| `/purchases/verify` / purchase.ts | signedTransactionInfo / Apple購入検証 | DBは取引ID・product・environment・原取引・台帳等。購入JWS全文の永続保存は当該処理では見られず |
| `/gacha/pull` / purchase.ts | kind・count・opId / 抽選と再送 | DB所持・履歴はuser削除まで、op応答は30日で削除 |
| `/save` / cloudSave.ts, useJourney exportForCloud | secretを除くSaved全体（歩数・日履歴・御朱印・所持・反応・設定・イベント等）とbaseVersion / Apple連携復旧 | Apple-linkedのみ。user削除まで。許可キーの限定ではなくwhole recordであるため申告を実データで点検 |
| `/friends`, `/friend-requests`, `/gifts/:id/claim` / social.ts | friendCode・answer・gift ID / 関係・受取 | user削除まで。DBと端末grantの途中失敗回復を実機で確認 |
| `/events/:id/teams*`, `/steps`, `/claim` / eventTeamStore.ts | eventId・teamCode・day・cumulative・出発/claim / チームと歩数集計 | user削除まで。Apple未連携でも送信。イベント開催期間・出発前後の制約あり |
| `/blocks*`, `/reports` / moderation.ts | target userId・reason（serverはnoteも受付） / 迷惑防止 | user削除CASCADE。専門家と通報保持・削除後の対応記録を確認 |
| HTTPS/Cloudflare、Apple APIs | IP・HTTP運用記録、Apple本人認証と購入 / 通信提供 | provider側ログ保持は管理画面未確認。アプリ側「解析SDKなし」からprovider記録なしとは結論しない |

## E. ソーシャル・UGC

| ID / 項目 | 確認方法 | 結果 | 証跡 | 状態 | 担当 |
|---|---|---|---|---|---|
| E01 公開ゲート | flag・API・画面読む | `SOCIAL_ONLINE=true`。フレンド/ギフト/チームはserver接続済み。demo/local分岐と準備中文言は存在するが通常offlineとは区別。OS pushは依存/実装を確認できず、通知シートとOS通知を混同しない。prodで実APIが動く証明は別 | `social.ts:17`、`SocialSheets.tsx:131`・`:212`、`eventTeamStore.ts`、`package.json` | 確認済み | 開発者 |
| E02 通報・ブロック | UI/API/ngWords/tests読む | friend/menuとteamに入口、ngWords/filter、reports保存、友達解除・申請取消・join拒否あり。既に同じactive teamのブロック後表示と集計、運営の通報回答期限・窓口・実際の対応者を決定 | `SocialSheets.tsx:247`、`moderation.ts`、`worker.ts:/reports`、`store.ts:blockUser`、`release-deploy-steps.md:81` | 要判断 | 運営者・開発者 |
| E03 招待・共有・未接続 | link handlers/service/catch読む | /f・/t公開招待からschemeへ渡す処理、App側初期URLとlistenerあり。Associated DomainsなしなのでUniversal Links保証なし。アプリ未導入、共有取消、Safari→アプリ、保存復旧、prod準備中到達を実機確認 | `worker.ts` invitation routes、`App.tsx` Linking、`eventTeam.ts:teamInviteLink` | 要人手 | QA |

## F. UI・実機品質

| ID / 項目 | 確認方法 | 結果 | 証跡 | 状態 | 担当 |
|---|---|---|---|---|---|
| F01 収まり・スクロール | PagedBody/FitToHeight・全ScrollView検索、QA既存記録 | SettingsModalとAccountCenterは縦scroll。collection等横scrollは区別。旧QAに375×667/390×844/430×932の履歴があっても今回commitの結果ではない。各3サイズで全画面と新event/shopを再撮影する必要 | `SettingsModal.tsx:59`、`AccountCenter.tsx:48`、`PagedBody.tsx`、`docs/QA.md`、`docs/qa-smoke-20260930.md` | 要判断 | 運営者・QA |
| F02 日本語・仮文言 | 日本語含むsrc/App65ファイルをrg収集、疑わしい語/数字/旧断言を点検 | privacyと購入失敗の誤説明を修正。shopの無callback「準備中」、素材ロード中、demoのsampleを確認。全保存状態・通知・動的文字列の視覚校正は未実施。新規コピー方針は変更なし | `SettingsModal.tsx:23`、`purchase.ts:unavailableText/purchaseFollowUp`、`GachaShop.tsx:51`、V15 | 要人手 | QA |
| F03 アクセシビリティ | label・ReduceMotion・固定サイズを検索 | 共通button/一部画面にlabelとReduceMotionあり。ただしGachaScreenのMotionArrow loopはReduceMotion独立。FitToHeightの縮小と文字拡大の実効性、VoiceOverフォーカス・modal裏操作・コントラスト・装飾読み上げは未検証 | `src/components.tsx:86`、`PullableCompanion.tsx:62`、`GachaScreen.tsx:MotionArrow`、`PagedBody.tsx` | 要人手 | QA・開発者 |
| F04 起動・オフライン・初回 | request timeout/storage catch/readyとテスト読む | AbortController、store接続15秒・商品取得timeout・購入120秒、破損退避・readOnlyあり。基本機能offline設計。void async呼出しの拒否・ネイティブ例外・全初回routeを実機クラッシュログで検証。Webやnode testsで代用しない | `server.ts:51`、`appStore.ts:18`、`useJourney.ts:240`・`:247`、App.tsx boot effects | 要人手 | QA |

## G. アセット・ライセンス・内容

| ID / 項目 | 確認方法 | 結果 | 証跡 | 状態 | 担当 |
|---|---|---|---|---|---|
| G01 音源・フォント・OSS | audio credits、node_modules licenses、設定about読む | 音源は手続き合成の原作という制作記録。実機音量・AAC継ぎ目未検証。Shippori Mincho/Yuji SyukuにLICENSE_FONTあり、repo/UIにOFL/OSSの全文・credit導線を確認できず。iOS bundle同梱を確認し不足を足す | `docs/audio-credits.md`、`node_modules/@expo-google-fonts/*/LICENSE_FONT`、`SettingsModal.tsx:24` | 要修正 | 開発者・運営者 |
| G02 創作・権利 | 巡礼データ・about・画像一覧読む | aboutは全寺社・地名を創作と明示。現実寺社への公認・実授与を主張しない。全1,525資産の第三者類似・生成サービス条件・原参照権利はコードだけで判定できない | `SettingsModal.tsx:24`、`src/data/pilgrimages.ts`、画像制作docs | 要人手 | 運営者・専門家 |
| G03 アイコン・ストア画像 | Pillow寸法/mode/bytes/alpha、一覧画像を目視 | icon1024² RGB PNG非透過。5スクショ1320×2868 RGB PNG非透過、形式OK。旧ナビ/旧book/18体・42種を目視。現行通常17体+event4体、旧撮影2026-09-10。現在の内容と不一致なので公開用再撮影が必要 | `assets/icon.png`、`docs/app-store/README.md`、`iphone-6.9/*.png`、V12 | 要修正 | Apple担当・QA |

## H. App Store Connect

| ID / 項目 | 確認方法 | 結果 | 証跡 | 状態 | 担当 |
|---|---|---|---|---|---|
| H01 メタデータ草稿 | docs/app-storeの追跡資料を調査 | スクショ資料のみだったためmetadata-ja.mdを追加。名称・subtitle・description・keywords・URL候補・age質問根拠・審査手順を記載。文章承認・実管理画面入力は未実施 | `docs/app-store/metadata-ja.md` | 要判断 | 運営者・Apple担当 |
| H02 公開URL | 認証なしGET・route確認 | /health /privacy /legalは200。/support /termsは401（存在を示すものではなく、未認証routeに認証判定が先行）。標準EULA利用。supportは連絡先が載るprivacyページを候補にし、運営者が正式URL・受信対応を確認 | V13、`worker.ts:211`・`:214`、`GachaShop.tsx:116` | 要人手 | 運営者 |
| H03 審査説明・年齢 | 現行機能を草稿へ整理 | 匿名アカウントは自動作成、基本利用にAppleログイン不要。ただしApple連携は任意、完全な「アカウント不要」ではない。購入/復元/削除/HealthKit/UGC手順とイベント期間制約を記載。審査時に開催中のイベントを用意するか時期を決める | `docs/app-store/metadata-ja.md`、`server/migrations/0003_seed_toki_meguru.sql` | 要人手 | Apple担当・運営者 |

## I. サーバー運用

| ID / 項目 | 確認方法 | 結果 | 証跡 | 状態 | 担当 |
|---|---|---|---|---|---|
| I01 デプロイ順 | 手順とschema/migrations/index比較 | 既存DBは0002→0004→0005→0006→0007、0003は開催日承認後。新規DB schema→0003。production state未確認、既適用SQLを盲目再実行しない。時刻20:00はクライアント送信窓、Worker cronは毎時23分cleanupであり20時歩数自動収集のcronではない | `docs/release-deploy-steps.md`、`server/migrations/`、`index.ts`、`wrangler.toml:8`、`eventSteps.ts` | 要人手 | Cloudflare担当 |
| I02 コスト・上限 | limits/書込と運用資料読む | rate制限・cloud debounce・expiry cleanupあり。一方登録rateチェックもD1書込、gacha/save等すべてに強制限なし、環境分離・請求上限/alerts・負荷の実測なし。無料枠停止と予算通知を総請求上限保証にしない | `worker.ts:limit`、`store.ts:hitRateLimit`、`cloudSave.ts:shouldUpload`、Cloudflare公式 | 要判断 | 運営者・Cloudflare担当 |
| I03 バックアップ・障害・販売停止 | deploy/READMEを点検 | RPO/RTO・復旧訓練・削除再適用・通知監視・通報SLA・新規販売停止と既購入復元維持の手順が不足。購入受付environment変更だけではStoreKit新規販売を止めない。勝手な停止は未実施 | `docs/release-deploy-steps.md`、`server/README.md`、Cloudflare D1 Time Travel | 要人手 | 運営者・Cloudflare担当 |

## 今回の変更と検証コマンド

### 変更ファイル（10ファイル）

| ファイル | 変更理由 |
|---|---|
| `src/services/purchase.ts` | 一時的429でopIdを削除しない。未確認の課金を「未課金／保留」と断言しない |
| `tests/purchase.test.ts` | 429→429→成功の同一opId再送を1件追加 |
| `.gitignore` | ローカル生成物・env・鍵・署名のrepo側保護 |
| `src/components/SettingsModal.tsx` | 実送信に反する古いプライバシー説明を修正 |
| `docs/privacy-policy.md` | イベント送信・匿名送信・IP保存期間の矛盾を修正 |
| `server/src/privacyPolicy.ts` | 上記公開ページ用コピーを同時更新。同期テストあり |
| `docs/app-store-privacy.md` | IP保持・Apple取消未実装という古い記述を修正 |
| `server/README.md` | 未接続・仮D1・未実装の古い記述と不足設定名を修正 |
| `docs/prerelease-checklist.md` | 全面監査結果へ更新 |
| `docs/app-store/metadata-ja.md` | 不足していた提出用草稿 |

修正は金額・確率・有効フラグ・機能方針・和紙デザインを変更しない範囲。BL01/BL02/BL03等は、保存トランザクション・契約期間・旧利用者への移行を含むため、単純な部分修正で保証できず残した。コミットは修正・ignore・説明・監査成果物に分離しpushしない。

### 実行結果

| ID / 場所 | コマンド / 検査 | 結果 |
|---|---|---|
| V01 root | `npm run typecheck` | 成功、exit0。購入関連最終修正後にも成功 |
| V02 root | `npm test` | 初回206/206、回帰追加後207/207、fail/skip0、exit0 |
| V03 root | `node --experimental-strip-types --test tests/purchase.test.ts` | 最終文言修正後27/27成功、fail/skip0、exit0 |
| V04 server | `npm run typecheck` | 成功、exit0 |
| V05 server | `npm test` | 58/58、fail/skip0、exit0。最後のpolicy表記調整後はprivacy policy同期テスト1/1成功（exit0） |
| V06 root | `npx expo-doctor` | 17/18、失敗1、exit1。直接依存2件の警告 |
| V07 root | `npx expo config --type public` | 成功、exit0。値全体を文書へコピーせず設定の必要箇所のみ記載 |
| V08 root | `npm audit --omit=dev`（JSON要約も取得） | exit1。47件=18 moderate+28 high+1 critical。`shell-quote` critical |
| V09 server | `npm audit --omit=dev` | 成功、exit0、0件 |
| V10 root | trackedテキストとfilename検索、`git log --all --name-only -G` | 540commit対象。初回はGitのPOSIX regexと不整合で失敗、POSIX対応式に変更して成功。値を出力しない。埋込み画像の文字列検知とprivate-key手順を区別 |
| V11 root | `git check-ignore -v` と `git ls-files` | 生成物・credentialsのrepo規則を最終確認。既存untracked資料はcommit対象外 |
| V12 root | Pillow画像検査・literal asset参照集計 | icon+5画像の寸法/mode/alpha/bytes成功、preview目視済み。assets1525/400,090,917 bytes |
| V13 公開GET | PowerShell Invoke-WebRequest、timeout20秒 | health/privacy/legal200、support/terms401。認証・本番DB・secretは未操作 |
| V14 root | PowerShell数値計算とpool集合照合 | 通常client17/server17・集合差0、event4。1回5.88235294117647%、5連1回以上26.1491826289549%、event25% |
| V15 root | `rg -n '[ぁ-んァ-ン一-龯]' src App.tsx`、旧断言・TODO等検索 | 日本語含む65ソースファイル・1,202行を抽出。静的点検と動的画面の未確認を区別 |
| V16 root | `git diff --check` / 指定ファイルdiff / branch確認 | 成功、exit0（LF/CRLF変換warningのみ）。変更は指定10ファイル。無関係な資料は保持、pushなし |

Nodeのtype-less package/experimental SQLite警告はテスト失敗ではない。Expo Doctor/脆弱性は失敗として残す。検証は端末/iOS署名コンパイルを含まない。ローカルログは `%TEMP%/mobidou-audit-*-tests.log` / `*-typecheck.log`、公開設定は `%TEMP%/mobidou-audit-config.txt` に保存した（ログ全体はコミットしない）。既存画像の検査プレビューは `C:\Users\User\.codex\visualizations\2026\10\12\01a12fef-2895-7d43-ba68-1b30c3ff6a49\audit-existing-images.jpg`。

### 現行要件の公式根拠（2026-10-12参照）

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — UGC1.2、ランダム商品の購入前確率・IAP3.1.1、継続契約、プライバシー・HealthKitの確認に使用。
- [Apple Account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) / [TN3194](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple) — Appleトークン取消を含む削除確認。
- [Apple Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) / [Privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) — 提出画像とArchive検査。
- [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/) — 送信データの申告を管理画面で確認する際に使用。
- [消費者庁 通信販売](https://www.no-trouble.caa.go.jp/what/mailorder/) / [カード合わせQ&A](https://www.caa.go.jp/policies/policy/representation/fair_labeling/faq/card) — 個別適法性は専門家へ。木札を直接購入するだけで資金決済法適用外とは断定しない。
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/) / [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) — Free7日/Paid30日の復旧窓を本番契約で確認。バックアップの存在を復旧訓練の代わりにしない。

## 人手で閉じる作業リスト（末尾・手順と期待結果）

| ID / 担当 | 手順 | 期待結果・必要な証跡 |
|---|---|---|
| M01 Apple Developer / 開発者 | app/widget IDs・HealthKit・Sign in with Apple・App Group・Teamを確認。Archiveを生成しdeployment target、Info.plist、entitlements、Privacy Manifest・Required Reason API、OFL/OSS同梱を確認 | 本体とwidgetが署名成功。実最小OSと法的表記一致。Appleのmanifest検証に警告なし。ビルド番号・Archive検査記録・ライセンス所在 |
| M02 App Store Connect / QA | 日本の商品3SKU・価格・期間・グループ・審査情報・通知URLを設定。Sandbox/TestFlightでsingle/five/plus購入、取消、Ask to Buy、120秒超遅延、通信断、再起動、重複・別端末復元、更新・解約・期限切れ・返金・逆順通知を試験 | 正当な取引のみ一度付与。BL01/BL02修正後に保存失敗でも結果回復、返金で権利失効。取引IDは必要範囲で伏せ、ビルド・手順・期待/実測を記録 |
| M03 Cloudflare / 開発者 | 管理画面でDB所属・binding・本番/試験分離・現在revision・適用migrationを確認。バックアップ取得後、必要SQLだけ番号順に適用。Apple取消secretを設定、Apple連携時にrefresh保存・削除時revoke成功を確認 | schema一致、秘密は値を記録しない。実Apple tokenを取消し、旧認証401、関連表CASCADE。取消失敗なら復旧可能なまま削除を完了扱いにしない |
| M04 運営者 / 専門家 | 実購入状態図、木札残高・期限なし、plus月次1枚の持越し、refundDebt、年齢上限・自己申告・取消、請求時開示の販売主体、第三国・データ保持・児童・宗教表現を資料として提示 | 資金決済/景表法/特商法/未成年/個人情報の結論・必要修正・責任者を文書化。価格や確率は承認なしに変更しない |
| M05 実機QA / 開発者 | 375×667・390×844・430×932相当、最古対応OS・大型端末で初回/既存/体験を代表1画面で起動・保存・到達・撮影確認後、全画面へ展開。新event/shop/legal/account、フォント最大、VoiceOver、Reduce Motionを操作 | ボタンと説明が到達可能、裏画面誤操作なし、文字欠けなし。縦scroll例外を承認または修正。端末/iOS/build/画像/クラッシュログ |
| M06 実機QA / 開発者 | HealthKit許可・拒否・取消・0歩・手入力・複数ソース、19:59/20:00 JST・翌朝・出発前後・機内モード・通信復帰を試す。手入力除外修正後にも実施 | 正しい日次累計、出発前送信なし、明示説明・同意、再送重複なし、日上限100,000、拒否でも利用可能。位置・書込み・広告利用なし |
| M07 運営者 / Apple担当 | TestFlightギフト・Sandbox期間・イベント開始日・公開国・support URLを決定。metadata草稿とApp Privacy/年齢回答を承認しASCへ入力。現行署名ビルドのスクショ5枚を撮り直す | 現行UI・体数・寺社数・SKU・URL・審査手順一致。審査で開催中のチーム機能に到達できる。連絡メール受信を試験。承認記録と提出画像 |
| M08 運営者 / Cloudflare担当 | user_reportsの担当・頻度・回答期限を決め、ブロック後のactive team運用を承認。監視で5xx/429・購入通知未着・cron失敗・D1制限・費用通知を設定、低負荷で疎通 | 通報が実際に処理される。ログにsecret/JWS/引継ぎ値なし。IP保持73時間以内を確認。課金費用の計測・アラート・停止責任者 |
| M09 Cloudflare / 開発者 / 運営者 | RPO/RTOを決め、D1 bookmark/exportと設定原本を安全保管。別DBへ復元し台帳・購入一意性・削除済みユーザーの再削除を試験。新規販売停止と既購入復旧を分けた手順を作り訓練 | 復元成功・所要時間・消失許容範囲を記録。停止時にも既購入者を救済。取引JWSやsecretを復旧文書へ貼らない |
| M10 QA / 運営者 | 最終ipaのDL/インストール/キャッシュ/起動時間/peak memoryを実測し、ストレージ不足・破損保存・アップデート・匿名ID紛失・Apple復元・引継ぎ・削除後再送を試験 | 所有者の許容値内、資産喪失なし。不要asset候補は参照確認後に別変更で整理。サポートへのコード漏洩を防止 |

全項目を閉じるときは担当者・確認日・対象ビルド/Worker revision・操作・期待結果・実測・値を伏せた証跡を各行へ追記する。人手試験を行っていない項目を「確認済み」に変更しない。
