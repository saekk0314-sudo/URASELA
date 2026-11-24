# 実務スキルと実行環境の棚卸し

> 作成: CEO（AI）/ 2026-11-24。オーナーが用意した「KYOVEL 実務スキルパック」（24本）を導入し、この環境で実際に使える機能を確かめた結果。
> 状態は **READY**（いま使える）／**SETUP_REQUIRED**（接続・設定・費用の承認があれば使える）／**BLOCKED**（いまは使えない）の3つ。使えないものを「使える」とは書かない。

## 1. 導入したスキル（24本・`.claude/skills/kyovel-*`）

既存の経営方針・承認ルール・部門エージェント・定例スキルはそのまま。スキルは「手順の追加」で、外部サービスの権限やお金を自動で与えるものではない。

| スキル | 主に使う部門 | 既存のしくみとの関係 |
| --- | --- | --- |
| kyovel-ceo-orchestration | CEO | 週次経営会議（`weekly-board`）の前後で、優先順位・担当・停止条件を決める |
| kyovel-approval-gate | CEO | 実行直前の確認。決裁の処理は `owner-approval`、権限は `company/org/authority.md` |
| kyovel-compliance-review | 法務 | 公開前チェックは `legal` エージェント（CLAUDE.md 絶対ルール4）。規程は `company/ops/compliance.md` |
| kyovel-finance-control | 経理 | 月次は `monthly-close`、帳簿の実データは非公開リポジトリ `urasela-hq` |
| kyovel-data-analytics | 経営企画 | KPIは `company/strategy/kpi.md`、ダッシュボードは非公開ページ |
| kyovel-market-research | 経営企画 | 公式・一次情報 → 市場データ → レビューの順で確認 |
| kyovel-sns-operations | マーケ | 投稿の文面と予約時刻はCEO、投稿・予約はオーナー |
| kyovel-creative-design / kyovel-creative-video | マーケ・制作 | 画像はSVG・HTMLから書き出し、短い動画はffmpegで作る（A-026） |
| kyovel-paid-marketing | マーケ | 広告は前月売上の12%以内・ROAS 200%以上（A-013） |
| kyovel-sales-conversion / kyovel-lead-generation | 営業 | Studioの窓口は当面ココナラだけ（A-024）。送信は承認後 |
| kyovel-customer-support | 営業 | 返信の下書きまで。返金・補償・送信は承認 |
| kyovel-web-development / kyovel-quality-verification | 制作開発 | `npm run check && npm test && npm run build`、本番反映はオーナーのマージ（A-007） |
| kyovel-document-production | 全部門 | Word・Excel・PowerPoint・PDFを作れる（下の表） |
| kyovel-account-onboarding / kyovel-account-security | CEO | 開設はオーナー本人。文面は開設キット（`company/owner/setup-kit.md`）。秘密は扱わない |
| kyovel-email-calendar | 営業・CEO | Gmailの接続はまだない（下の表） |
| kyovel-automation-scheduling | CEO | 定期実行は承認を取ってから（A-006 など） |
| kyovel-mcp-integration | CEO | 接続はオーナーが公式画面で許可する |
| kyovel-ec-operations | — | いまの事業計画には物販がないので使わない |
| kyovel-skill-builder | CEO | 未習得の業務に出会ったら、公式情報を調べて検証し、スキルとして残す（4章） |
| kyovel-browser-operations | 全部門 | 下の表のとおり、この環境では「公開ページの読み取り」まで |

公開リポジトリに置くため、ほかの事業の名前が出てくる2か所（ceo-orchestration・lead-generation）だけ一般的な書き方に直した。原本は非公開リポジトリの `skills-source/` に保管。

## 2. この環境で使える機能（2026-11-24 に確認）

| 業務 | 状態 | 確認したこと |
| --- | --- | --- |
| 計画・承認管理・文書の更新 | READY | このリポジトリと `urasela-hq` の読み書き、プルリクエスト |
| サイトの開発・テスト・ビルド | READY | Node.js、テスト22件、Playwright（ヘッドレスのChromium） |
| Web検索 | READY | 検索は使える |
| 公式ページを開いて読む | READY（許可したサイトだけ） | 2026-11-24 に11サイトを許可（消費者庁・e-Gov法令・国税庁・noteヘルプ・ココナラ・X開発者文書・TikTok開発者文書・Cloudflare文書・Claudeのヘルプと文書・example.com）。noteのヘルプはnote側が自動アクセスを断るので開けない（検索で確認） |
| ブラウザでの読み取りテスト | READY | example.com を開いてページの見出し「Example Domain」を読めた |
| オーナーのChromeを操作する（Claude in Chrome） | BLOCKED（この環境） | オーナーのPCで動く機能。有料プラン（Pro以上）で使えるが、同じ使用量の上限を使う。いまは開設などをオーナーが手で行うので不要 |
| Word・Excel・PowerPoint・PDF | READY | python-docx・openpyxl・python-pptx・reportlab・pandoc・LibreOffice・pypdf。日本語フォントあり |
| 画像（図・アイコン・バナー） | READY | SVG・HTMLを描いて画像に書き出す（例: AI社長ゼロのアイコン） |
| AIの画像生成・AI動画（人物など） | BLOCKED | 生成サービスの接続なし。必要になったら費用と規約を調べて起案 |
| 短い動画（文字とスライドの縦型動画） | READY | ffmpeg あり。TikTokの試行（A-026）はこれで作る |
| 非公開ページ・ダッシュボード | READY | 経営ダッシュボード、原稿棚 |
| 定期実行・リマインド | READY | 予約実行の仕組みあり。設定は承認を取ってから |
| GitHub | READY | URASELA と urasela-hq |
| Gmail・Googleカレンダー | SETUP_REQUIRED | 未接続。事業用のGmailを作ったあと、claude.ai のコネクタ設定でオーナーが許可すれば使える（無料）。返信の自動化（A-015）に必要 |
| Google Drive・Canva・Notion・freee・Slack | SETUP_REQUIRED | コネクタは用意されているが未接続。いまは必要ない |
| Xへの自動投稿（X API） | SETUP_REQUIRED（費用あり） | 公式の料金ページを確認：投稿1件 $0.015、URL入りの投稿は $0.200（前払いのクレジット制、無料枠なし）。1日2本・URL入りなら月約 $12。売上が立つまではオーナーが予約投稿（無料） |
| TikTokへの自動投稿（API） | BLOCKED | 公式文書では、審査前のアプリから投稿した動画は非公開になる。いまはオーナーが手で投稿・予約する |
| noteへの自動投稿 | BLOCKED | 公開の投稿APIがない。オーナーが原稿棚から貼る |
| アクセス解析 | SETUP_REQUIRED（無料） | Cloudflare Web Analytics（A-027）。公式手順は Workers & Pages → プロジェクト → Metrics → Web Analytics を Enable。次のデプロイから自動で入る |
| 帳簿・月次決算 | READY | `ledger.mjs`。口座の明細CSVはオーナーが用意 |
| 広告 | BLOCKED（ルール上） | 売上が立つまでは出さない（A-013） |

## 3. 費用の見込み

| 項目 | 月額 | 状態 |
| --- | --- | --- |
| いま使っているもの（GitHub・Cloudflare Pages・note・ココナラ・X） | 0円 | 利用中または開設予定 |
| Claude Max | 約1.5万円（$100） | A-019 で決定済み。売上が立つまでは他の事業の経費 |
| Cloudflare Web Analytics | 0円 | A-027 |
| Gmail・Googleカレンダーのコネクタ | 0円 | 事業用Gmailを作ったら |
| X API（自動投稿） | 約 $1〜12 | 任意。売上が立ってから起案 |
| noteプレミアム（予約投稿） | 500円 | 任意。いまは不要 |
| 独自ドメイン | 年2,000円前後 | A-005（最初の売上で） |

## 4. スキルを増やすルール

1. できない業務に出会ったら、原因を「知識・権限・接続・仕様変更・環境」に分ける（`kyovel-skill-builder`）。
2. 公式文書を確かめる。開けないサイトは、必要な分だけ許可を提案する（環境の変更はオーナーの承認画面を通す）。
3. `.claude/skills/kyovel-<名前>/SKILL.md` を作り、安全なテスト（未接続・承認なし・エラー・外部の怪しい指示）で確かめてから置く。
4. 接続・支出・権限の変更を伴うものは、案として承認キューに出す。既存の経営ルールは書き換えない。
5. この文書の表を更新する。

## 公式資料（確認日 2026-11-24）

- [Claude in Chrome（Claudeヘルプ）](https://support.claude.com/en/articles/12012173-get-started-with-claude-in-chrome)
- [X API の料金（X開発者文書）](https://docs.x.com/x-api/getting-started/pricing)
- [TikTok Content Posting API（TikTok開発者文書）](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [Cloudflare Pages の Web Analytics（Cloudflare文書）](https://developers.cloudflare.com/pages/how-to/web-analytics/)
- [noteプレミアム会員でできること（noteヘルプ）](https://www.help-note.com/hc/ja/articles/360000279862)
