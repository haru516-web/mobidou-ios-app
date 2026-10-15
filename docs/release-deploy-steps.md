# 公開前に、運営者が行う手順（サーバーとアプリ）

コードの変更は、この順番で反映します。順番を変えると、サーバーが、まだ無い列を読もうとして、エラーになります。

## 公開日の切り替え（公開日に必ず行う）

テスト・開発用のものは、公開日をもって、次のとおり外す。

1. **テスト用ギフトを消す。** `server/wrangler.toml` の `GIFTS_JSON`（`testflight-2026-10`）を `'[]'` にして、`npx wrangler deploy`。
2. **イベント（「時をめぐる道」）は、§2 の seed を流した時点から始まる。** 開始は 2026-10-13 00:00 JST、終了は 2026-12-01 00:00 JST。公開日の作業は不要（審査より前に seed を流しておく）。
3. **Sandbox の購入を受け付けている間は、`PURCHASE_ENVIRONMENTS` を変えない。** 審査（と TestFlight）は Sandbox で購入する。審査が通って公開できた後に、`Production` だけにする（§4）。
4. **開発用の機能が、製品ビルドに出ないことを確認する。** 開発用の表示・解除（`__DEV__`、`EXPO_PUBLIC_DEV_UNLOCK_ALL`）は、製品版では動かない。ビルドの環境変数に `EXPO_PUBLIC_DEV_UNLOCK_ALL` と `EXPO_PUBLIC_SERVER_URL`（開発用）が入っていないことを確認する。
5. **サポート・プライバシー・特商法の3ページが開く**ことを確認する（`/support` `/privacy` `/legal`）。App Store Connect のサポート URL には `/support` を入れる。

## 1. データベースの更新（既存の本番 D1 に、一度だけ）

`server/` で、番号の順に実行します（新しいデータベースなら `schema.sql` だけで足ります）。

```bash
npx wrangler d1 execute mobidou --remote --file migrations/0002_event_teams.sql
npx wrangler d1 execute mobidou --remote --file migrations/0004_gacha_ops.sql
npx wrangler d1 execute mobidou --remote --file migrations/0005_purchase_environment.sql
npx wrangler d1 execute mobidou --remote --file migrations/0006_apple_refresh_token.sql
npx wrangler d1 execute mobidou --remote --file migrations/0007_blocks_and_reports.sql
npx wrangler d1 execute mobidou --remote --file migrations/0008_event_join_requests.sql
npx wrangler d1 execute mobidou --remote --file migrations/0009_revoked_transactions_and_indexes.sql
npx wrangler d1 execute mobidou --remote --file migrations/0010_push_notifications.sql
npx wrangler d1 execute mobidou --remote --file migrations/0011_rate_limit_expiry.sql
```

| ファイル | 内容 |
|---|---|
| 0002 | イベントのチーム（人数・招待コード・出発・報酬の受け取り） |
| 0004 | 有料ガチャの操作ID（応答が失われても、結果を受け取り直せる）と、同時の抽選の防止 |
| 0005 | 購入の環境（Production / Sandbox）の記録 |
| 0006 | Sign in with Apple のリフレッシュトークン（削除時の取消用） |
| 0007 | ブロックと通報 |
| 0008 | イベントのチームへの参加の申請（つくった人が承認する） |
| 0009 | 返金の記録（購入より先に届いた返金も覚える）と、検索を速くする索引。**Worker を更新する前に必ず適用する**（先に Worker だけ更新すると、購入の確認と返金の通知が失敗します） |
| 0010 | 通知の宛先（端末の通知トークン）と、一度だけ送る通知の記録。**Worker を更新する前に適用する** |
| 0011 | 回数制限のカウンターに「いつ消してよいか」(`expires_at`)を持たせ、索引をつける。**Worker を更新する前に適用する**(先に Worker だけ更新すると、カウンターの書き込みが失敗します) |

## 2. イベントの登録

`migrations/0003_seed_toki_meguru.sql` を実行します。開催期間（`starts_at` / `ends_at`、UTC）は、2026-10-13 00:00 JST 〜 2026-12-01 00:00 JST（終了は含まない）です。実行した時点でイベントが始まります。期間外は、チームをつくれず、歩数も受け付けません。

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

コード上の `PURCHASE_ENVIRONMENTS` の既定は `Production` のみです。TestFlight と審査は Sandbox で購入するため、`server/wrangler.toml` に `Production,Sandbox` を明示しています。一般公開の前に `Sandbox` を外してください（外さないと、無料のSandbox購入が木札になります）。

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
