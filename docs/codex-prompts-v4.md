# Codex用プロンプト（ガチャ素材の組み込み / 公開前チェックリスト）

設計の全体は [design-v3-monetization-server.md](design-v3-monetization-server.md)。素材の制作記録は [gacha-assets-prompts.md](gacha-assets-prompts.md)、確認記録は [gacha-assets-verification/README.md](gacha-assets-verification/README.md)。

## 分担

| # | 作業 | ブランチ / ワークツリー | 触ってよい場所 |
|---|---|---|---|
| 1 | ガチャ素材の組み込みと見た目の調整 | `codex/gacha-art-wiring` / `D:\mobby\mobidou-gacha` | `src/data/gachaArt.ts`, `src/components/GachaScreen.tsx`, `src/components/gachaTimeline.ts`, `tests/gachaTimeline.test.ts`, `docs/` |
| 2 | 公開前チェックリストの作成（調査のみ） | `codex/prerelease-checklist` / `D:\mobby\mobidou-prerelease` | `docs/prerelease-checklist.md`（新規）のみ |

Claudeは `claude/ui-navigation-overhaul` で、アプリ側のイベント歩数送信などを進めます。最後にマージで合流します。

**Codexに触らせないファイル:** `App.tsx`, `src/services/*`, `server/`, `specialRewards.ts`, `progress.ts`, `useJourney.ts`, `CollectionGallery.tsx`, `PilgrimageAward.tsx`, `SocialSheets.tsx`。

## 共通ルール

- 作業前に `git status` で現在地（指定ブランチ）を確認する。
- 触ってよい場所以外は変更しない。必要なら報告して止まる。
- 完成した見た目のUIのみ（仮のデザインや「準備中」表示にしない）。既存の和紙・筆文字のスタイルを守り、勝手に作り替えない。
- 縦スクロールを増やさない。画面に収める（`PagedBody` / `FitToHeight`）。
- 作業の区切りごとに、意味のある単位でコミットする。**pushはしない。**
- 完了前に `npm run typecheck` と `npm test` を通す。
- 本物の鍵・トークン・アカウント情報は作らない、入れない、コミットしない。

---

## プロンプト1: ガチャ素材の組み込み

```
あなたは「もび道」のUI担当です。ワークツリー D:\mobby\mobidou-gacha、ブランチ codex/gacha-art-wiring で作業してください。

## 目的
assets/gacha/ にある7枚の素材を、既存のガチャ画面に組み込み、箱が開く演出を完成した見た目にする。

## 事前に読むもの
- docs/gacha-assets-prompts.md の「最終ファイル一覧」（各素材の寸法と役割）
- docs/gacha-assets-verification/README.md（箱の本体と前板は同じ880×1280キャンバスで、重ねると閉じた箱になる。紐は上端まで続く）
- src/data/gachaArt.ts（素材の差し込み口。全部 null で、null の部品は仮の図形で描かれる）
- src/components/GachaScreen.tsx, src/components/gachaTimeline.ts（演出の流れ。転がり→止まる→前板を手で持ち上げる→光→もびが出る）

## やること
1. gachaArt.ts の7つを assets/gacha/ の実ファイルに差し替える（body, front, shadow, glowCore, glowRays, rope, stage）。
2. GachaScreen.tsx で、各素材の重なり順・位置・大きさを調整する。
   - 背景(stage) → 影(shadow) → 箱本体(body) → 光(glowCore / glowRays) → 前板(front) → 紐(rope) の順を基本とし、実際に見て自然な順に直してよい。
   - 本体と前板は同じキャンバスサイズなので、同じ位置・同じ大きさで重ね、前板を持ち上げる動きで開く。
   - 前板中央にあるアプリのロゴが、閉じた状態で正しく見えること。
3. 仮の図形の描画コードは、素材が揃ったので不要になったら削除する。
4. 画面の高さ・幅が違っても（小さいiPhone、大きいiPhone）、箱ともびが画面内に収まり、縦スクロールが出ないこと。

## 守ること
- 演出のタイミング（gachaTimeline.ts の定数と関数）は、変える必要が見つかった場合のみ変更し、変えたら tests/gachaTimeline.test.ts も更新する。
- サーバー・ガチャの抽選（src/services/）には触らない。
- 素材ファイル（assets/gacha/）は変更しない。問題があれば報告する。

## 検証
- npm run typecheck と npm test が通ること。
- 実際に画面を動かして確認する（Web版でよい）。docs/qa-smoke-playwright.spec.cjs を参考に、箱が転がる→止まる→前板を持ち上げる→光→もびが出る、の各段階のスクリーンショットを撮り、docs/gacha-assets-verification/ に scene-*.png または .webp で保存する（容量が大きい場合は縮小する）。
- 結果をREADMEの末尾に追記する（段階ごとに何を確認したか、直した点、残る問題）。

## 完了時の報告
変更したファイル、確認した画面サイズ、直した点、残る問題を短くまとめる。
```

---

## プロンプト2: 公開前チェックリストの作成（調査のみ）

```
あなたは「もび道」の公開準備担当です。ワークツリー D:\mobby\mobidou-prerelease、ブランチ codex/prerelease-checklist で作業してください。コードは一切変更しません。作るのは docs/prerelease-checklist.md の1ファイルだけです。

## 目的
iOSアプリ「もび道」を App Store で公開する前に確認すべきことを、抜けなく、実行できる形のチェックリストにする。

## 事前に読むもの
- docs/design-v3-monetization-server.md（全体設計。特に 8. サーバー、10. 未決定、11. 進捗）
- README.md、server/README.md
- ソーシャル機能の現状（フレンド・共有まわり）: src/components/SocialSheets.tsx と、リポジトリ内の「サーバー送信はありません」等のプライバシー表記を grep で探す

## 調べて書く項目
1. 法規: 資金決済法（有償の石を持たない形にするか）、景品表示法・ガチャの確率表示、特定商取引法に基づく表記、未成年の課金上限、サブスクリプションの表示義務。各項目について、現状のアプリの仕様がどう関わるか、確認が必要な点を書く。断定せず「専門家に確認が必要」と分けて書く。
2. App Store 審査: ガイドライン上のIAP、ソーシャル機能（ユーザー生成コンテンツ・フレンド）、サブスクの審査要件、プライバシー栄養表示（App Privacy）、HealthKitの利用目的文言、アカウント削除の要件。Appleの公式文書を根拠にし、URLを付ける。
3. プライバシー: サーバー接続を始めると、アプリ内の「サーバー送信はありません」表記が事実と合わなくなる。書き換えが必要な箇所の一覧（ファイルと行）を作る。
4. ソーシャルの出し分け: 公開前に無効化または限定すべき機能の一覧と、各機能の現状（コードのどこにあるか）。
5. 実機検証: StoreKit サンドボックス、HealthKit、通知、機内モード、容量、古い端末での動作。実施手順と合格基準を書く。
6. サーバー運用: 本番のシークレット設定、ログに個人情報を出さないこと、費用の上限と監視、バックアップ。

## 書き方
- 各項目は「確認すること / 根拠（URLかファイル） / 状態（未確認・確認済み・要専門家） / 担当（開発者・専門家）」の表またはチェックボックスで書く。
- 推測と事実を分ける。調べて分からなかったことは、分からないと書く。
- 日本語で書く。

## 守ること
- docs/prerelease-checklist.md 以外のファイルを変更しない。
- 法的助言として断定しない。

## 完了時の報告
最も重要だと考える上位5項目と、調べて分からなかったことを短くまとめる。
```
