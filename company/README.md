# URASELA 本社（HQ）

> AIが経営する会社の本社機能。CEO（AI）が毎週「現在地」を更新する。
> **このリポジトリは公開されている。** 帳簿・顧客情報・実数字は非公開リポジトリ（`urasela-hq`）にだけ置く。

## 会社概要

| 項目 | 内容 |
| --- | --- |
| 屋号 | URASELA（ウラセラ） |
| 形態 | 個人事業（開業予定日 2027-01-01）→ 2028年1月に法人化予定（2027年10月に判断） |
| オーナー | 会長・最終決裁者（承認・本人操作・ストップのみ） |
| CEO | AI |
| 事業 | ① 診断Webアプリ「URASELA」 ② 診断コンテンツ制作「URASELA Studio」 ③ 実録「AI社長」 |
| ミッション | 人の「裏」を、楽しく可視化する。 |
| 目標 | 2027年10月に月商100万円、11月に月利100万円（標準シナリオ） |
| 原則 | 手出しゼロ・固定費ゼロ・オーナーの稼働は週30分以内 |

## 現在地（2026-11-23 更新）

| 項目 | 状態 |
| --- | --- |
| フェーズ | 0 創業（〜2026-12-31） |
| 今週の山場 | 承認キュー第1回への回答、アカウント開設の準備 |
| 次の山場 | **12/10「2027年 表と裏の運勢」公開** |
| 数字 | 売上 0円（12月の計画も 0円。準備月） |
| 承認待ち | 10件＋質問5件 → [承認キュー](owner/approvals.md) |

## 目次

| 区分 | 文書 |
| --- | --- |
| オーナー向け | [オーナーの仕事](owner/guide.md) ・ [承認キュー](owner/approvals.md) ・ [決裁ログ](owner/decision-log.md) |
| 報告 | [CEO就任報告](reports/2026-11-23-ceo-inauguration.md) |
| 戦略 | [事業計画書](strategy/business-plan.md) ・ [ロードマップ](strategy/roadmap.md) ・ [KPI設計](strategy/kpi.md) |
| 財務・経理 | [PL計画](finance/pl-plan.md) ・ [経理規程](finance/accounting-policy.md) ・ [税務カレンダー](finance/tax-calendar.md) ・ [法人化計画](finance/incorporation.md) ・ [勘定科目](finance/accounts.json) ・ [請求書テンプレ](finance/templates/invoice-template.md) |
| 組織 | [組織図と役割分担](org/org-chart.md) ・ [決裁権限規程](org/authority.md) |
| 運営 | [会議体と運営リズム](ops/operating-rhythm.md) ・ [コンプライアンス規程](ops/compliance.md) |
| 企画 | [01 URASELA集客と収益化](projects/01-urasela-monetization.md) ・ [02 URASELA Studio](projects/02-diagnosis-studio.md) ・ [03 実録「AI社長」](projects/03-ai-ceo-media.md) |
| AI組織 | `.claude/agents/`（strategy・cfo・cmo・sales・cto・legal）・ `.claude/skills/`（weekly-board・monthly-close・owner-approval） |

## 道具

```bash
node company/tools/plan.mjs            # PL計画を前提値から再生成（--check で最新か確認、--json で数値を出力）
node company/tools/ledger.mjs check 仕訳帳.csv   # 帳簿の検証（tb / pl / bs / blue / close も）
```

帳簿ツールの動作は架空のサンプル `finance/templates/journal-sample.csv` で確認できる。
