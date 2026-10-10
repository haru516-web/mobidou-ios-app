# 公開前に、運営者が行う手順（サーバーとアプリ）

コードの変更は、この順番で反映します。順番を変えると、サーバーが、まだ無い列を読もうとして、エラーになります。

## 1. データベースの更新（既存の本番 D1 に、一度だけ）

`server/` で、番号の順に実行します（新しいデータベースなら `schema.sql` だけで足ります）。

```bash
npx wrangler d1 execute mobidou --remote --file migrations/0002_event_teams.sql
npx wrangler d1 execute mobidou --remote --file migrations/0004_gacha_ops.sql
npx wrangler d1 execute mobidou --remote --file migrations/0005_purchase_environment.sql
npx wrangler d1 execute mobidou --remote --file migrations/0006_apple_refresh_token.sql
npx wrangler d1 execute mobidou --remote --file migrations/0007_blocks_and_reports.sql
```

| ファイル | 内容 |
|---|---|
| 0002 | イベントのチーム（人数・招待コード・出発・報酬の受け取り） |
| 0004 | 有料ガチャの操作ID（応答が失われても、結果を受け取り直せる）と、同時の抽選の防止 |
| 0005 | 購入の環境（Production / Sandbox）の記録 |
| 0006 | Sign in with Apple のリフレッシュトークン（削除時の取消用） |
| 0007 | ブロックと通報 |

## 2. イベントの登録

`migrations/0003_seed_toki_meguru.sql` の **開催期間**（`starts_at` / `ends_at`、UTC）を決めて、実行します。期間外は、チームをつくれず、歩数も受け付けません。

```bash
npx wrangler d1 execute mobidou --remote --file migrations/0003_seed_toki_meguru.sql
```

## 3. 秘密情報の設定（Sign in with Apple のトークン取消用）

アカウント削除で、Apple のトークンを取り消すために必要です。**未設定のままでも動きますが、Apple の要件（削除時の取消）を満たしません。**

Apple Developer で、Sign in with Apple 用の鍵（.p8）を作り、次を設定します。

```bash
npx wrangler secret put APPLE_TEAM_ID
npx wrangler secret put APPLE_SIGN_IN_KEY_ID
npx wrangler secret put APPLE_SIGN_IN_PRIVATE_KEY   # .p8 ファイルの中身（-----BEGIN PRIVATE KEY----- から）
```

## 4. 購入の環境（任意）

`PURCHASE_ENVIRONMENTS` の既定は `Production,Sandbox`（TestFlight と審査は Sandbox で購入します）。審査と TestFlight の期間が終わったら、`Production` だけにすると、Sandbox の購入は、木札になりません。

## 5. 不適切な名前の追加語（任意）

`NG_WORDS`（カンマ区切り）で、名前に使えない語を、アプリを更新せずに足せます。

## 6. デプロイ

```bash
npx wrangler deploy
```

毎時23分に、通信元の記録と、古い抽選の記録を消す処理が走ります（`wrangler.toml` の `[triggers]`）。

## 7. アプリのビルド

- `app.json` の歩数の権限文言が変わっています（イベントの歩数送信）。ビルドで反映されます。
- ビルド前に、`SHOW_CURL_DEBUG` が `__DEV__` のみであることを確認します（製品版では、診断枠は出ません）。

## 8. App Store Connect

- App Privacy の申告に、イベントの歩数（チームで出発した場合に送信）・ブロックと通報を追加します（`docs/app-store-privacy.md`）。
- 審査メモに、通報とブロックの場所（フレンド画面の「…」、イベントのチームのメンバー）を書きます。
- 通報は、`user_reports` に溜まります。運営者が、`SELECT * FROM user_reports WHERE handled_at IS NULL` で読み、対応後に `handled_at` を更新します。
