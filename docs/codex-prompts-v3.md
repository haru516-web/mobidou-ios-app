# v3 作業分担とCodex用プロンプト

設計の全体は [design-v3-monetization-server.md](design-v3-monetization-server.md)。

## 分担

### Claudeが行う（核となるロジックと、複数ファイルにまたがる変更）

| # | 作業 | 主に触るファイル |
|---|---|---|
| A | 巡礼のデータ化（恒常/イベント）、旧セーブの移行 | `src/data/pilgrimages.ts`, `src/services/useJourney.ts` |
| B | ミニチュア抽選ルール改修（上限1、到達のたびに抽選、旧状態の廃止） | `src/services/specialRewards.ts`, `PilgrimageAward.tsx` |
| C | 再巡礼（歩数の積み直し、結願認定の維持、報酬は初回のみ） | `src/services/progress.ts`, `useJourney.ts` |
| D | 表紙パス廃止、表紙は初回結願で解放 | `CollectionGallery.tsx`, `SocialSheets.tsx`, `specialRewards.ts` |
| E | StoreKit 2、ガチャのクライアント、モビーパック基盤、`PetId` の一般化 | 複数 |
| F | 上記に伴うテスト・検証 | `tests/` |

### Codexに任せる（境界が明確で、Claudeの担当ファイルと重ならない）

| # | 作業 | 触ってよい場所 |
|---|---|---|
| 1 | Cloudflare サーバーの土台 | `server/`（新規ディレクトリのみ） |
| 2 | イベント枠（未開放）のUIと素材 | 新規 `EventSlot.tsx`、新規 `src/data/events.ts`、素材、`PilgrimageScreen.tsx` の**1か所だけ** |
| 3 | UIスモークテスト（変更なし、報告のみ） | なし（`docs/codex-ui-smoke-test.md` に手順） |

**Codexに触らせないファイル:** `App.tsx`, `src/services/*`（`server/` 以外）, `specialRewards.ts`, `progress.ts`, `useJourney.ts`, `CollectionGallery.tsx`, `PilgrimageAward.tsx`, `SocialSheets.tsx`。Claudeの作業と衝突するためです。

## ブランチ

Codexの作業用: **`codex/v3-server-and-events`**（作成済み。ワークツリーは使わず、通常のチェックアウトで作業する）。
Claudeは `claude/ui-navigation-overhaul` で作業します。最後にマージで合流します。

## 共通ルール（3つのプロンプトすべてに適用）

- 作業前に `git checkout codex/v3-server-and-events` し、`git status` で現在地を確認する。
- 触ってよい場所以外は変更しない。必要なら報告して止まる。
- 完成した見た目のUIのみ（仮のデザインや「準備中」表示にしない）。既存の和紙・筆文字のスタイルを守り、勝手に作り替えない。
- 縦スクロールを増やさない。画面に収める（`PagedBody` / `FitToHeight`）。
- 作業の区切りごとに、意味のある単位でコミットする。**pushはしない。**
- 完了前に `npm run typecheck` と `npm test` を通す。
- 本物の鍵・トークン・アカウント情報は作らない、入れない、コミットしない。

---

## プロンプト1: Cloudflareサーバーの土台

```
あなたは「もび道」のバックエンド担当です。ブランチ codex/v3-server-and-events で作業してください。
設計は docs/design-v3-monetization-server.md の「8. サーバー（Cloudflare）」に従います。まずその文書を読んでください。

## 目的
Cloudflare Workers + D1 のサーバーの土台を、リポジトリ直下の `server/` ディレクトリだけに作る。アプリ本体（src/, App.tsx など）は変更しない。デプロイはしない。Cloudflareのアカウント・本物の鍵は使わない。

## 作るもの
1. `server/` に TypeScript の Workers プロジェクト（wrangler.toml、package.json、tsconfig）。依存は最小限（wrangler、@cloudflare/workers-types、テスト用の軽量なもののみ）。ルーターは自作か極小のものにする。
2. `server/schema.sql`: 設計書 8 の表をすべて D1（SQLite）で定義する。次の一意制約を必ず入れる。
   - purchases: apple_transaction_id を主キー
   - gift_claims: (user_id, gift_id) の一意
   - event_steps: (user_id, event_id, day) の一意
3. `server/src/` に、設計書 8 の API 一覧のハンドラ。
   - 認証: 匿名登録（ID と秘密鍵の発行。秘密鍵はハッシュ化して保存）。以降のリクエストは署名または秘密鍵で認証する。
   - ギフト受け取り: 一意制約で二重受取を防ぐ。同じ受け取りが2回来たら、2回目は「受取済み」を返し、付与は1回だけ。
   - 購入検証: StoreKit 2 の署名付き取引情報(JWS)を検証する関数のインターフェースと実装。Appleのルート証明書での検証部分は、テスト用の自己署名の証明書チェーンでテストできる形にする。本番の証明書は差し替え可能な設定にし、コードに埋め込まない。
   - 交換券: 台帳（ticket_ledger）を正とし、残数を計算する。残数が足りない消費は拒否する。月次付与は「期間ごとに1回だけ」冪等にする。
   - ガチャ: サーバー側の乱数で抽選する。提供割合・天井は設定ファイルから読む（数字は仮の値でよいが、コメントで「未決定」と明記）。有償と無償の残高は分ける。
   - イベント歩数: 累計値のみ受け付ける。日付はサーバー時刻（日本時間）で判定する。20:00〜20:30 の受付時間の判定も入れる（設定で変更可能に）。
   - フレンド: 友達コードの発行、申請、承認。
4. 各ハンドラのテスト。特に次を必ず確認する。
   - 同じギフトを2回受け取っても付与は1回
   - 同じ Apple 取引IDを2回送っても付与は1回
   - 交換券の月次付与が二重に入らない
   - 残数不足の券消費が拒否される
   - イベント歩数の累計値を同じ日に2回送っても二重加算されない
5. `server/README.md`: ローカル起動方法（wrangler dev）、D1 の作り方、必要な設定値（環境変数の名前だけ。値は書かない）、未実装・仮の部分の一覧。

## してはいけないこと
- src/ や App.tsx など、server/ 以外の変更。
- 本物の Apple 証明書・秘密鍵・トークンの生成やコミット。
- 実際のデプロイ、Cloudflareのアカウント作成、ネットワーク上のサービスへの接続。

## 完了条件
- server/ 内でテストがすべて通る。ルートの `npm run typecheck` と `npm test` も通る。
- 仮の値・未実装の箇所が server/README.md に一覧されている。
- 意味のある単位でコミットされている（pushはしない）。
```

---

## プロンプト2: イベント枠（未開放）のUI

```
あなたは「もび道」のUI担当です。ブランチ codex/v3-server-and-events で作業してください。
背景は docs/design-v3-monetization-server.md の「2. 巡礼」を読んでください。

## 目的
巡礼の一覧に、将来の「イベント巡礼」の枠を、「まだ開かれていない」状態で表示する。日付や内容は約束しない。仮のデザインや「準備中」といった文字だけの表示にはしない。既存の和紙・筆文字のスタイルに合わせた、完成した見た目にする。

## 作るもの
1. `src/data/events.ts`（新規）: イベント枠の型とデータ。
   - 型: `{ id, name, status: 'locked' | 'open' | 'ended', startsAt?: string, endsAt?: string }`
   - いまは、`status: 'locked'` の枠を1〜2件だけ定義する。名前は世界観に合う、内容を約束しない表現にする（例:「まだ開かれていない道」）。
2. `src/components/EventSlot.tsx`（新規）: 枠のUI。
   - 既存の鍵札(`LockTag.tsx`)と和紙の部品(`Washi.tsx`)を使う。
   - `locked` のときは押しても遷移せず、押したときに軽い反応（触覚・小さな揺れなど、既存の部品に合うもの）だけ返す。
   - アクセシビリティのラベルを付ける。OSの視差効果を減らす設定に従う。
3. `src/components/PilgrimageScreen.tsx` に、枠を差し込む**1か所だけ**の変更。既存の巡礼カードの並びや挙動は変えない。
4. 素材が新たに必要な場合は、既存の素材と同じ手順（`scripts/gen-ui-art.cjs`、`docs/codex-ui-asset-prompts*.md` の書式）で作り、`assets/ui-round3` 配下の既存フォルダ構成に置く。素材のプロンプトは `docs/` に記録する。

## してはいけないこと
- 触ってよいのは、上記のファイルと素材だけ。特に `App.tsx`, `src/services/*`, `specialRewards.ts`, `progress.ts`, `useJourney.ts`, `CollectionGallery.tsx`, `PilgrimageAward.tsx`, `SocialSheets.tsx` は変更しない。
- 縦スクロールを増やさない。既存の画面に収める。
- 既存の見た目を作り替えない。

## 確認
- `npm run web` で 375×667 / 390×844 の両方で、枠が切れずに表示されることを確認し、スクリーンショットを `docs/` 配下でなく作業ログに貼る（コミットには含めない）。
- `npm run typecheck` と `npm test` が通る。
- 意味のある単位でコミットする（pushはしない）。
```

---

## プロンプト3: UIスモークテスト

```
あなたは「もび道」の検証担当です。ブランチ codex/v3-server-and-events で作業してください。
docs/codex-ui-smoke-test.md の手順に従って、UIスモークテストを実施してください。

コードは一切変更しません。結果だけを、docs/codex-ui-smoke-test.md に書かれた報告形式（サイズ×画面の表と、NGの詳細）で、
`docs/qa-smoke-YYYYMMDD.md` として保存してコミットしてください（pushはしない）。
NGがあった場合は、画面名・サイズ・症状・スクリーンショットのパスを添え、修正はしないでください。
```
