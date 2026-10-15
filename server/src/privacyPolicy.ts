/*
 * The privacy policy, in one place. The server shows it at /privacy; `docs/privacy-policy.md` is a copy kept in step by a test.
 * When the app's handling of data changes, change this text and `docs/app-store-privacy.md` together.
 */

export const PRIVACY_POLICY_TITLE = "プライバシーポリシー";

export const PRIVACY_MARKDOWN = `# プライバシーポリシー

制定日：2026年10月4日
変更：2026年10月15日（通知の宛先と通知サービス、アプリを開いていないときの歩数の送信、端末内のお知らせを追記。10月14日：Apple連携の認可情報の保存、端末に保存するアカウントの鍵と引き継ぎコード、削除後に残る情報と復旧用の保管、未成年の方へ、本人確認）
運営者：Mobby
連絡先：info@mobby.online

「もび道」（以下「本アプリ」）は、歩いた分だけ御朱印を集めるアプリです。本アプリが取り扱う情報と、その使い道を説明します。

## 1. 端末に保存する情報

次の情報は端末の中に保存されます。Apple IDとつなぐと記録の全体をサーバーに保存します。また、Apple IDとつながなくても、最初に選んだモビー・モビーの所持記録・結願で得た無料ガチャの記録・ガチャの結果はサーバーに送ります。イベントにチームで出発した場合は、イベントの日ごとの歩数の合計も送ります。詳しくは第2項・第3項をご確認ください。

- 歩数（iPhoneの「ヘルスケア」または「モーションとフィットネス」から読み取ります）
- 集めた御朱印、集めたモビー、ふれあいの回数、設定

位置情報（GPS）は使いません。ヘルスケアへ書き込むこともありません。

端末には、サーバーに接続するための**アカウントの鍵**（ランダムな文字列）も保存されます。引き継ぎコードには、記録だけを入れ、アカウントの鍵は入れません。木札・フレンド・プロフィールは、Apple IDとつないで、新しい端末でサインインして戻します。Apple IDとつないでいない場合は、これらは引き継げません。

チームで出発している間は、毎晩20時すぎの「歩数をチームに届けましょう」というお知らせを、端末の中だけで予約します。これはサーバーには送りません。設定の「お知らせの通知」で、オフにできます。

毎朝8時に、おみくじのお知らせを、同じく端末の中だけで予約します。通知を許可した場合に届き、設定の「毎朝のおみくじ」で、オフにできます。

また、アプリを5日と12日開かなかった場合に、歩数が反映されなくなる前のお知らせを、端末の中だけで予約します。設定の「お知らせの通知」で、オフにできます。

## 2. サーバーに送る情報

本アプリは、遊ぶために、運営者のサーバーに次の情報を送ります。氏名やメールアドレスは、送りません。

| 情報 | 内容 | 目的 |
|---|---|---|
| 匿名のID | アプリが自動で作る、ランダムなID | 木札やフレンドなどを、端末ごとの匿名のアカウントとして扱うため |
| はじめに選んだモビー、モビーの所持記録、結願で得た無料ガチャの記録 | モビーの種類・所持数、巡礼の名前 | 所持記録の同期と、無料ガチャを巡礼ごとに一度だけ付与するため |
| 購入の記録 | Appleの取引ID、商品、日時 | 購入した木札を付与し、二重に付与しないため |
| ガチャの結果 | 引いたモビー、日時 | 抽選の公平さの確認と、購入・返金の確認のため |
| 年齢の区分 | 15歳以下／16〜19歳／20歳以上のいずれか（自己申告） | 毎月の購入の上限を設けるため。生年月日は取得しません |
| プロフィール（フレンド機能を使う場合） | 表示名（自由入力）、メインモビー、フレンドコード | フレンドに表示するため |
| フレンドの関係 | フレンドと、フレンド申請 | フレンド機能のため |
| 通知の宛先（通知を許可した場合） | 端末ごとの通知用の識別子（通知トークン）と、通知の種類の設定 | チームの申請・返事、フレンドの申請などを、通知でお知らせするため。通知をオフにすると削除します（通信できないときは、端末で保留し、つながったときに削除します） |
| ブロックと通報（フレンドやチームの相手を、ブロック・通報した場合） | ブロックした相手、通報した相手、理由、短いメモ | 迷惑な行為を防ぎ、安全に遊べるようにするため。通報は、運営者が内容を確認します |
| イベントのチーム（イベントに参加する場合） | チームコード、チームのメンバー、出発したかどうか | イベントのチームをつくり、参加するため |
| イベントの歩数（チームで出発した場合） | チームで出発してから（あとから入った人は、参加してから）歩いた、日ごとの歩数の合計。報酬を受け取った記録 | チーム全員の歩数を合わせて、イベントの道を進め、報酬を一度だけ渡すため |

フレンドに見えるのは、**表示名とメインモビーだけ**です。歩数や御朱印の数は、見えません。

イベントのチームのメンバーには、**表示名、メインモビー、チームで歩いた歩数の合計**が見えます。チームをつくった人が参加を承認すると、その人とフレンドになります。イベントの歩数は、チームで出発したときから、アプリを開いたときと、iPhoneが歩数の更新を知らせたとき（アプリを開いていないときを含みます）に、その日の合計を送ります。出発するまでは、送りません。

## 3. Appleでサインインを使った場合に保存する情報

「Appleでサインイン」で、アカウントとApple IDをつなぐと、機種変更のために次を行います。

- **Appleが発行するID（このアプリ専用のもの）** を、匿名のアカウントと結びつけて保存します。**氏名とメールアドレスは、受け取りません。**
- **Appleが発行する認可情報（リフレッシュトークン）** を保存します。アカウントを削除するときに、Appleへ「このアプリの利用許可を取り消す」連絡をするためだけに使います。
- **記録の全体を、サーバーに保存します。** 歩数の合計、日ごとの歩数、御朱印、集めたモビー、設定です。新しい端末で、記録と木札を戻すために使います。

ヘルスケアから読み取った歩数に由来する情報は、機種変更のための保存と、チームで出発したイベントの歩数集計に使います。広告、マーケティング、データの販売には、使いません。Apple IDとつながず、イベントのチームでも出発していない場合は、歩数を送りません。

## 4. 接続元の情報

不正な大量の登録を防ぐため、接続元のIPアドレスを**一時的に**使います。記録は、定期削除が正常に動作している場合、**最長73時間で自動的に削除されます。**（稼働中のデータベースでの期間です。復旧用の保管については、第7項をご覧ください。） 通信を提供する事業者（Cloudflare）が、運用のために接続の記録を持つことがあります。

## 5. 広告・分析・位置情報

本アプリには、**広告も、アクセス解析も、ありません。** ほかの会社が、本アプリを使う人を追いかける（トラッキング）ことも、しません。

## 6. 第三者への提供・委託

次の事業者の仕組みを使います。

- **Apple：** 購入（App内課金）、Appleでサインイン、ヘルスケア。購入の支払いの情報は、Appleが管理し、運営者には届きません。
- **Expo（Expo Push通知サービス）：** 通知を届けるため、通知用の識別子（通知トークン）と、通知の文面（「参加の申請が届いています」など。個人名は入りません）を、Expoを通じてAppleの通知の仕組みへ取り次ぎます。通知を許可しなければ、送りません。
- **Cloudflare, Inc.：** サーバーとデータベースの提供。データは、Cloudflareの設備に保存されます。保存場所は、日本以外の国や地域の場合があります。

上記以外の第三者に、個人に関する情報を提供することは、法令に基づく場合を除き、ありません。

## 7. 保存する期間と、削除

- サーバーの情報は、アカウントを削除するまで保存します。
- **削除の方法：** 本アプリの「設定」→「アカウント管理」→「アカウントを削除する」。3回の確認のあとに、サーバーの情報（プロフィール、フレンド、木札、ガチャと購入の記録、保存された記録、Apple IDとのつながり）と、端末の記録が、すべて消えます。**元に戻せません。**
- **削除できないことがあるもの：** 以前に使っていたアカウントで、この端末に残っている鍵が、サーバーに受け付けられなくなっている場合は、この端末からは削除できません。削除のあとに、そのアカウントの番号が画面に表示されます（番号は、端末の記録を消すまで、この端末に残ります）。サポートへお伝えいただければ、運営者が削除します。
- **削除後にも残るもの：** 返金の二重処理を防ぐため、返金された取引の番号（Appleの取引ID）だけは、アカウントとは結びつかない形で残ります。氏名やプロフィールなど、個人を特定する情報は含みません。
- **復旧用の保管：** データベースには、障害からの復旧のため、過去の状態に戻すための保管があります。削除した情報も、最長30日間、その中に残ることがあります。この保管は、復旧のためだけに使い、復元した場合は、削除済みのアカウントを、あらためて削除します。
- 本アプリを削除するだけでは、サーバーの情報は消えません。先に、上の操作をしてください。
- Appleに残る購入の履歴は、Appleの規約に従います。
- 削除の操作ができない場合は、下の連絡先に、ご連絡ください。

## 8. 未成年の方へ

本アプリでは、年齢の区分に応じて、毎月の購入に上限を設けています（15歳以下は月5,000円、16〜19歳は月10,000円まで）。この上限は、年齢の区分の自己申告と、アプリでの購入前の確認にもとづきます。15歳以下の方は、保護者の方と一緒にこの内容をご確認のうえ、ご利用ください。保護者の方は、iPhoneの「スクリーンタイム」や「承認と購入のリクエスト」もご利用ください。

## 9. 安全のための措置

通信は暗号化（HTTPS）されます。アカウントの鍵は、サーバーに、元の形では保存されません。

## 10. 開示・訂正・削除のご請求

保有する情報について、開示・訂正・削除のご請求は、下の連絡先で受け付けます。ご本人かどうかを確かめるため、アプリの画面でご本人しか見られない情報（アカウント画面の表示内容など）をお尋ねすることがあります。フレンドコードだけでは、本人確認になりません。

## 11. この文書の変更

内容を変えるときは、この文書を更新し、制定日の下に、変更の日付を記します。

## 12. 連絡先

Mobby
info@mobby.online
`;

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (text: string) => escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

/** Just enough Markdown for the policy: headings, paragraphs, bullet lists, tables and bold. Everything is escaped first. */
export function markdownToHtml(markdown: string): string {
  const out: string[] = [];
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith("# ")) { out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (line.startsWith("### ")) { out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## ")) { out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(`<li>${inline(lines[i].slice(2))}</li>`), i++;
      i--;
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((cell) => cell.trim());
        if (!cells.every((cell) => /^-+$/.test(cell))) rows.push(cells);
        i++;
      }
      i--;
      const [head, ...body] = rows;
      out.push(`<table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    // Consecutive plain lines belong to one paragraph, kept on separate lines.
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|- |\|)/.test(lines[i])) paragraph.push(inline(lines[i])), i++;
    i--;
    out.push(`<p>${paragraph.join("<br>")}</p>`);
  }
  return out.join("\n");
}

/** A plain, readable page for a legal document. */
export function documentPageHtml(title: string, markdown: string): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>もび道 ${escapeHtml(title)}</title>
<style>body{font-family:-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;background:#f6efe0;color:#3f2a20;margin:0;padding:24px 16px 56px;line-height:1.8}main{max-width:720px;margin:0 auto}h1{font-size:24px}h2{font-size:18px;margin-top:32px;border-bottom:1px solid #d8c7a8;padding-bottom:4px}table{border-collapse:collapse;width:100%;font-size:14px;margin:12px 0}th,td{border:1px solid #d8c7a8;padding:8px;text-align:left;vertical-align:top}th{background:#efe3c9}ul{padding-left:1.4em}</style></head>
<body><main>${markdownToHtml(markdown)}</main></body></html>`;
}

export const privacyPageHtml = (): string => documentPageHtml(PRIVACY_POLICY_TITLE, PRIVACY_MARKDOWN);
