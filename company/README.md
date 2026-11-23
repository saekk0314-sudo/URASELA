# URASELA 本社（HQ）

> AIが経営する会社の本社機能。CEO（AI）が毎週「現在地」を更新する。
> **このリポジトリは公開されている。** 帳簿・顧客情報・実数字は非公開リポジトリ（`urasela-hq`）にだけ置く。

## 会社概要

| 項目 | 内容 |
| --- | --- |
| 屋号 | **KYOVEL**（オーナーの個人事業。開業届はURASELAの内容で先に出し、ほかの事業は決まったら同じ個人事業に足す） |
| 事業・ブランド | URASELA（ウラセラ） |
| 形態 | 個人事業（**2026-11-28 開業**）→ 目標シナリオでは2027年7月に合同会社化（2027年5月に判断） |
| オーナー | 会長・最終決裁者（承認・本人操作・ストップのみ） |
| CEO | AI |
| 事業 | ① 診断Webアプリ「URASELA」（月額会員 PLUS を含む） ② 診断コンテンツ制作・AI導入支援「URASELA Studio」 ③ 診断メーカー（SaaS） ④ 実録「AI社長」（講座を含む） |
| ミッション | 人の「裏」を、楽しく可視化する。 |
| 目標 | **開業12ヶ月目（2027年11月）に年商5000万円ペース（月商417万円以上）**。コミットラインは月利100万円（標準シナリオ）。ビジョンは3年で年商10億円 |
| 原則 | 手出しゼロ（支出は売上から）・オーナーの稼働は週1時間以内・[CEOの思考法](strategy/ceo-thinking.md) |

## 現在地（2026-11-23 更新）

| 項目 | 状態 |
| --- | --- |
| フェーズ | 0 開業（〜2026-12-31）。**11/28 開業** |
| 今週の山場 | **URASELAのリニューアル**（実装済み。プルリクエストをオーナーがマージすると公開）、開業届と青色申告承認申請書の下書き |
| 次の山場 | **12/10「2027年 表と裏の運勢」公開** |
| 数字 | 売上 0円（目標シナリオの12月計画は約0.4万円。年運の完全版で初売上） |
| 承認待ち | 0件（2026-11-23 全部承認）＋質問6件 → [承認キュー](owner/approvals.md) |
| 経営ダッシュボード | [オーナー専用の非公開ページ](https://claude.ai/artifact/8SiCwBeJhWqR9sGh3nz1TJ)（計画・感度分析・承認待ち・ロードマップ・組織。月次決算後にCEOが更新） |

## 目次

| 区分 | 文書 |
| --- | --- |
| オーナー向け | [オーナーの仕事](owner/guide.md) ・ [承認キュー](owner/approvals.md) ・ [決裁ログ](owner/decision-log.md) ・ [開業届の下書き](owner/kaigyo-draft.md) |
| 報告 | [計画改定報告（v2・年商5000万円）](reports/2026-11-23-plan-v2.md) ・ [CEO就任報告（v1）](reports/2026-11-23-ceo-inauguration.md) |
| 戦略 | [CEOの思考法](strategy/ceo-thinking.md) ・ [事業計画書](strategy/business-plan.md) ・ [ロードマップ](strategy/roadmap.md) ・ [KPI設計](strategy/kpi.md) |
| 財務・経理 | [PL計画](finance/pl-plan.md) ・ [経理規程](finance/accounting-policy.md) ・ [税務カレンダー](finance/tax-calendar.md) ・ [法人化計画](finance/incorporation.md) ・ [勘定科目](finance/accounts.json) ・ [請求書テンプレ](finance/templates/invoice-template.md) |
| 組織 | [組織図と役割分担](org/org-chart.md) ・ [決裁権限規程](org/authority.md) |
| 運営 | [会議体と運営リズム](ops/operating-rhythm.md) ・ [コンプライアンス規程](ops/compliance.md) |
| 企画 | [01 URASELA集客と収益化](projects/01-urasela-monetization.md) ・ [02 URASELA Studio](projects/02-diagnosis-studio.md) ・ [03 実録「AI社長」](projects/03-ai-ceo-media.md) ・ [04 年商5000万円への拡張](projects/04-scale-to-50m.md) |
| AI組織 | `.claude/agents/`（strategy・cfo・cmo・sales・cto・legal）・ `.claude/skills/`（weekly-board・monthly-close・owner-approval） |

## 道具

```bash
node company/tools/plan.mjs            # PL計画を前提値から再生成（--check で最新か確認、--json で数値を出力）
node company/tools/ledger.mjs check 仕訳帳.csv   # 帳簿の検証（tb / pl / bs / blue / close も）
```

帳簿ツールの動作は架空のサンプル `finance/templates/journal-sample.csv` で確認できる。
