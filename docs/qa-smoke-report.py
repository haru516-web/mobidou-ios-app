"""Aggregate independent Playwright runs; create screenshot indexes for visual review."""
import json
from pathlib import Path
from collections import Counter
from PIL import Image, ImageDraw

DOCS = Path(__file__).resolve().parent
OUT = DOCS / 'qa-smoke-screens'
SIZES = ['375x667', '390x844', '430x932']
results = [row for size in SIZES for row in json.loads((OUT / f'{size}-results.json').read_text(encoding='utf-8'))]
(OUT / 'playwright-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
for size in SIZES:
    rows = [r for r in results if r['size'] == size]
    for start in range(0, len(rows), 8):
        canvas = Image.new('RGB', (1000, 1400), '#eee8df')
        draw = ImageDraw.Draw(canvas)
        for i, row in enumerate(rows[start:start + 8]):
            x, y = (i % 4) * 250, (i // 4) * 700
            draw.text((x + 5, y + 5), row['screen'], fill='black')
            file = DOCS.parent / row['screenshot']
            if file.exists():
                shot = Image.open(file).convert('RGB')
                shot.thumbnail((246, 670))
                canvas.paste(shot, (x + 2, y + 25))
        canvas.save(OUT / f'{size}-index-{start // 8 + 1}.jpg', quality=88)
print(dict(Counter(r['status'] for r in results)))
for row in results:
    if row['status'] != 'OK':
        print(row['size'], row['screen'], row['status'], row['reason'].split('Call log:')[0])

titles = {
    'opening': 'オープニング', 'home-duplicates': 'ホーム（実記録・重複所持）',
    'home-trial': 'ホーム（体験モード）', 'home-card-edit': 'ホームのカード編集',
    'route-selection': '巡礼選択・出発', 'route-event': '巡礼選択のイベント枠',
    'map': '地図', 'goshuin-book': '御朱印帳の表紙', 'goshuin-pages': '御朱印帳のページ送り',
    'goshuin-index': '御朱印帳の目次', 'collection': 'コレクション',
    'omikuji': 'おみくじ（引く前）', 'omikuji-result': 'おみくじ（抽選・結果）',
    'settings': '設定（全項目へのスクロール）', 'settings-privacy': '設定・プライバシー',
    'settings-about': '設定・もび道について', 'settings-account': '設定・アカウント',
    'settings-controls': '設定・歩数連携／振動／体験切替', 'mobby-selection-locks': 'モビー選択・ロック表示',
    'gacha-rope': 'ガチャ・ひも', 'gacha-box': 'ガチャ・箱', 'gacha-lift': 'ガチャ・前板を引き上げ中',
    'gacha-result': 'ガチャ・保存済み結果の復帰', 'gacha-drag-result': 'ガチャ・ひもと前板の実ドラッグ→結果→終了',
    'completion-animation': '結願・参拝演出中', 'completion-award': '結願・授与結果',
    'replay-award': '再巡礼・短縮された授与演出', 'presents': 'プレゼント箱（体験）',
    'friends': 'フレンド（体験）', 'notifications': '通知',
}
counts = Counter(r['status'] for r in results)
lines = [
    '# UI スモークテスト報告（2026-09-30・Playwright再実施）', '',
    '## 結果', '',
    f"3サイズ×{len(titles)}画面・状態、計{len(results)}セルを独立して検証。OK {counts['OK']}、NG {counts['NG']}、未検証 {counts['未検証']}。全画面合格ではない。", '',
    '対象は `D:\\mobby\\mobidou` の `codex/v3-followups`（サーバー実装 `d5ee691`、SQLiteの5連途中失敗テスト補強 `969a9d0`）。アプリ本体・依存定義は変更せず、UIの不具合は修正していない。push・デプロイ・Cloudflare/Apple接続は行っていない。', '',
    '## 実行方法と証跡', '',
    '`npm run web` のローカルExpo Webを、外部のPlaywright CLIから `npx` 経由で操作。Chrome headless、locale ja-JP、Asia/Tokyo、375×667／390×844／430×932。サイズごとに別Chrome、画面ごとに別BrowserContext・ページ・保存データを用い、オープニングをスワイプして対象へ進んだ。', '',
    '保存JSON・再実行コマンドは [qa-smoke-fixtures.md](qa-smoke-fixtures.md)、検証本体は [qa-smoke-playwright.spec.cjs](qa-smoke-playwright.spec.cjs)。[playwright-results.json](qa-smoke-screens/playwright-results.json) に到達、戻る操作、console、ボタン境界を記録した。表の各判定はその画面のPNGへのリンク。画像一覧JPGもサイズ別に保存し、目視レビューを実施した。', '',
    '途中のセレクター不一致・ページ送り不足・画面遷移の待機不足を調整して該当画面を再実行した。最終表は再実行後の記録。Playwrightランナーの「passed」は採取ループの完走を示し、UI合格数とは異なる。', '',
    '## サイズ×画面', '', '| 画面・状態 | 375×667 | 390×844 | 430×932 |', '|---|---|---|---|',
]
lookup = {(r['screen'], r['size']): r for r in results}
for screen, title in titles.items():
    cells = []
    for size in SIZES:
        row = lookup.get((screen, size))
        cells.append(f"[{row['status']}](qa-smoke-screens/{size}-{screen}.png)" if row else '未検証（記録なし）')
    lines.append('| ' + title + ' | ' + ' | '.join(cells) + ' |')
lines += ['', '## NGの詳細', '']
for row in results:
    if row['status'] == 'NG':
        reason = row['reason'].split('Call log:')[0].strip().replace('\n', ' ')
        if row['screen'] == 'map':
            reason = 'Reactのconsole error: Invalid DOM property `transform-origin`. Did you mean `transformOrigin`? 地図は表示されホームへ戻れるが、console errorなしの基準に不合格。'
        elif row['screen'] == 'mobby-selection-locks':
            reason = 'ロック付き未所持モビーは選択不可。ただし下部の「決定」（隣の「閉じる」も）が親のoverflow:hiddenで切れる。' + reason
        lines += [f"- **{titles.get(row['screen'], row['screen'])} / {row['size']}**: {reason} 証跡: [{row['screenshot']}](qa-smoke-screens/{row['size']}-{row['screen']}.png)。"]
        if row.get('returnScreenshot'):
            lines.append(f"  戻る操作失敗時: [{row['returnScreenshot']}](qa-smoke-screens/{Path(row['returnScreenshot']).name})。")
lines += ['', '## 操作・レイアウトの確認範囲', '',
    'ホーム・地図・御朱印帳・コレクションは下部タブから遷移しホームへ戻る。設定と各情報シート、カード編集、ソーシャル画面は閉じる操作を確認。初回ルート未選択の状態では選択画面を閉じられない仕様のため、通常ルートを選び出発してホームへ進む。イベント枠はページを送って表示し、タップしても未開放のままであることを確認。', '',
    '設定は全項目にスクロールして到達し、振動スイッチ、Webでの歩数連携、体験モード開始・終了も操作。アカウント画面は小サイズではページ送り後にデータ引き継ぎボタンが表示される。今回の検証は引き継ぎ操作そのものを実行するものではない。', '',
    'モビー選択は横スクロールで未所持カードとロックを表示し、disabledを確認。上部×で戻れるが、下部ボタンの表示欠けをNGにした。ガチャのひもを実際に下へ引き、前板を上へ動かして結果まで到達し「おわる」で戻る操作は3サイズとも成功。箱と板を引き上げ中の状態は別ページで撮影。保存された未開示結果の復帰も確認。', '',
    '結願は参拝演出中と授与結果を独立して撮影し御朱印帳にしまう操作を確認。再巡礼は既所持の御朱印に対する短縮演出となり、通常の長い参拝演出・省略ボタンを表示せず直接授与場面へ進む。', '',
    '固定画面のボタン境界を測定し、PNGと画像一覧で主な文字・絵・ボタンを目視。設定の縦スクロール、モビー選択・コレクションの横スクロール、巡礼・長い本文のページ送りは許容する。DOMの非表示測定用要素を、画面からのはみ出しとして数えない。', '',
    '## Consoleとwarning分類', '',
    'console error / pageerrorは地図3セルのDOM属性エラー。以下はWeb互換・非推奨APIのwarningで、errorとは分けて記録した。', '',
    '| 分類 | 内容 |', '|---|---|',
    '| スタイル非推奨 | `shadow*` → `boxShadow`、`textShadow*` → `textShadow` |',
    '| props非推奨 | `props.pointerEvents` → `style.pointerEvents` |',
    '| 画像API非推奨 | `style.tintColor` → `props.tintColor` |',
    '| Webアニメーション互換 | `useNativeDriver` 未対応でJSへフォールバック |', '',
    'Node側の `MODULE_TYPELESS_PACKAGE_JSON`、実験的SQLite、Playwrightの `NO_COLOR / FORCE_COLOR` 警告はテスト実行環境の警告で、画面consoleとは別。', '',
    '## 必須チェックと制約', '',
    '- ルート `npm run typecheck`: 成功。`npm test`: 84/84成功。',
    '- `server/` の `npm run typecheck`: 成功。`npm test`: 18/18成功。5連の3体目保存失敗で、残数・所持・履歴・天井のロールバックをSQLiteで確認。',
    '- プロンプト4の均等18体・有償25回ごとの天井・無料の巡礼ごと一回・starter一回・購入ユーザー照合・通知の取引内appAccountTokenは既存コミットとテストで確認した。',
    '- Web検証のためHealthKit/iOS権限・触覚・StoreKit決済の実機挙動は対象外。プレゼントとフレンドはオンライン未接続の体験用サンプルであり、本通信の成立を意味しない。', '',
]
(DOCS / 'qa-smoke-20260930.md').write_text('\n'.join(lines), encoding='utf-8')
