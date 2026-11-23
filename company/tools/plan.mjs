#!/usr/bin/env node
/**
 * URASELA 事業計画PLジェネレーター（依存パッケージなし）
 *
 *   node company/tools/plan.mjs          pl-plan.md の自動生成ブロックと pl-plan.csv を更新
 *   node company/tools/plan.mjs --json   計算結果をJSONで出力（ダッシュボード用）
 *   node company/tools/plan.mjs --check  生成物が前提値と一致しているか検査（不一致なら終了コード1）
 *
 * 前提値は company/finance/plan-assumptions.json。数値を変えたら必ず再生成する。
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const financeDir = resolve(here, "../finance");
const paths = {
  assumptions: resolve(financeDir, "plan-assumptions.json"),
  markdown: resolve(financeDir, "pl-plan.md"),
  csv: resolve(financeDir, "pl-plan.csv")
};

const BEGIN = "<!-- PL:BEGIN（node company/tools/plan.mjs が自動生成。手で編集しない） -->";
const END = "<!-- PL:END -->";
const MILESTONE = 1_000_000;

export const REVENUE_LINES = [
  ["ads", "URASELA 広告", "urasela"],
  ["affiliate", "URASELA アフィリエイト", "urasela"],
  ["paid", "URASELA 有料コンテンツ", "urasela"],
  ["goods", "URASELA グッズ・スタンプ", "urasela"],
  ["projects", "診断制作 受託", "studio"],
  ["retainer", "診断制作 保守運用", "studio"],
  ["membership", "実録 メンバーシップ", "media"],
  ["templates", "実録 テンプレ・有料記事", "media"]
];

export const COST_LINES = [
  ["feePlatformB2B", "受託プラットフォーム手数料"],
  ["feePayment", "決済手数料（有料コンテンツ）"],
  ["feeMedia", "note手数料"],
  ["transfer", "振込手数料等"],
  ["domain", "独自ドメイン"],
  ["tools", "既存ツール按分"],
  ["growth", "成長投資枠"]
];

const GROUPS = [
  ["urasela", "URASELA"],
  ["studio", "診断制作"],
  ["media", "実録"]
];

// 標準シナリオの前提を1つずつ崩して、どの前提が利益を大きく動かすかを見る
const SENSITIVITIES = [
  ["有料コンテンツを解禁しない", (s) => { s.urasela.paidConversion = 0; }],
  ["受託が月2件で頭打ち", (s) => { s.b2b.projects = s.b2b.projects.map((n) => Math.min(n, 2)); }],
  ["受託単価が計画の7割", (s) => { s.b2b.avgPrice = s.b2b.avgPrice.map((n) => Math.round(n * 0.7)); }],
  ["URASELAの集客が計画の半分", (s) => { s.urasela.sessions = s.urasela.sessions.map((n) => Math.round(n / 2)); }],
  ["実録メディアが不発（計画の3割）", (s) => {
    s.media.members = s.media.members.map((n) => Math.round(n * 0.3));
    s.media.templateSales = s.media.templateSales.map((n) => Math.round(n * 0.3));
  }]
];

const sum = (values) => values.reduce((total, value) => total + value, 0);
const roundAll = (record) => {
  for (const key of Object.keys(record)) record[key] = Math.round(record[key]);
  return record;
};

function assertLength(name, array, length) {
  if (!Array.isArray(array) || array.length !== length) {
    throw new Error(`${name} は ${length} ヶ月分の配列が必要です（現在: ${Array.isArray(array) ? array.length : typeof array}）`);
  }
}

function validate(assumptions) {
  const { months, scenarios } = assumptions;
  for (const [id, s] of Object.entries(scenarios)) {
    for (const key of ["sessions", "goods"]) assertLength(`${id}.urasela.${key}`, s.urasela[key], months.length);
    for (const key of ["projects", "avgPrice", "platformShare"]) assertLength(`${id}.b2b.${key}`, s.b2b[key], months.length);
    for (const key of ["members", "templateSales"]) assertLength(`${id}.media.${key}`, s.media[key], months.length);
  }
}

export function simulate(months, common, scenario) {
  const { urasela: u, b2b: b, media: m } = scenario;
  let retainers = 0;
  let previousProjects = 0;
  let cumulativeProfit = 0;
  let cumulativeCash = 0;
  let domainIndex = -1;

  return months.map((month, i) => {
    const sessions = u.sessions[i];
    const completions = sessions * u.completionRate;

    // 手出しゼロ原則: 手元に残った資金（納税準備を除く）でドメイン代を払えた月に購入する
    let domain = 0;
    if (domainIndex < 0 && cumulativeCash >= common.domainCost) {
      domainIndex = i;
      domain = common.domainCost;
    }
    const adsLive = domainIndex >= 0 && i >= domainIndex + u.adApprovalLagMonths && month >= u.adStartMonth;

    // 保守契約: 前月納品分の一部が月額契約へ移行し、毎月一定率が解約する
    retainers = retainers * (1 - b.retainerChurn) + previousProjects * b.retainerConversion;
    previousProjects = b.projects[i];

    const revenue = roundAll({
      ads: adsLive ? sessions * u.adYenPerSession : 0,
      affiliate: month >= u.affiliateStartMonth ? completions * u.affiliateYenPerCompletion : 0,
      paid: month >= u.paidStartMonth ? completions * u.paidConversion * u.paidPrice : 0,
      goods: u.goods[i],
      projects: b.projects[i] * b.avgPrice[i],
      retainer: retainers * b.retainerFee,
      membership: m.members[i] * m.memberPrice,
      templates: m.templateSales[i] * m.templatePrice
    });
    const revenueTotal = sum(Object.values(revenue));

    const costs = roundAll({
      feePlatformB2B: revenue.projects * b.platformShare[i] * b.platformFeeRate,
      feePayment: revenue.paid * u.paidFeeRate,
      feeMedia: (revenue.membership + revenue.templates) * m.feeRate,
      transfer: revenueTotal > 0 ? common.transferFeesPerMonth : 0,
      domain,
      tools: common.existingToolsAllocation,
      growth: month >= common.growthBudgetStartMonth ? revenueTotal * common.growthBudgetRate : 0
    });
    const costTotal = sum(Object.values(costs));

    const operatingProfit = revenueTotal - costTotal;
    const taxReserve = Math.round(Math.max(0, operatingProfit) * common.taxReserveRate);
    cumulativeProfit += operatingProfit;
    cumulativeCash += operatingProfit - taxReserve;

    const groups = Object.fromEntries(GROUPS.map(([key]) => [key, 0]));
    for (const [key, , group] of REVENUE_LINES) groups[group] += revenue[key];

    return {
      month,
      kpi: {
        sessions,
        completions: Math.round(completions),
        projects: b.projects[i],
        retainers: Math.round(retainers * 10) / 10,
        members: m.members[i]
      },
      revenue,
      groups,
      revenueTotal,
      costs,
      costTotal,
      operatingProfit,
      taxReserve,
      takeHome: operatingProfit - taxReserve,
      cumulativeProfit,
      cumulativeCash
    };
  });
}

function summarize(rows, common) {
  const year = rows.filter((row) => row.month.startsWith("2027"));
  const revenue2027 = sum(year.map((row) => row.revenueTotal));
  const profit2027 = sum(year.map((row) => row.operatingProfit));
  const last = rows.at(-1);
  return {
    revenue2027,
    profit2027,
    taxReserve2027: sum(year.map((row) => row.taxReserve)),
    businessIncomeAfterBlue2027: Math.max(0, profit2027 - common.blueReturnDeduction2027),
    firstRevenueMilestone: rows.find((row) => row.revenueTotal >= MILESTONE)?.month ?? null,
    firstProfitMilestone: rows.find((row) => row.operatingProfit >= MILESTONE)?.month ?? null,
    lastMonth: last.month,
    lastRevenue: last.revenueTotal,
    lastProfit: last.operatingProfit,
    lastGroups: last.groups
  };
}

export function build(assumptions) {
  validate(assumptions);
  const { months, common, scenarios } = assumptions;
  return Object.fromEntries(
    Object.entries(scenarios).map(([id, scenario]) => {
      const rows = simulate(months, common, scenario);
      return [id, { id, label: scenario.label, description: scenario.description, rows, summary: summarize(rows, common) }];
    })
  );
}

export function sensitivities(assumptions) {
  const { months, common, scenarios } = assumptions;
  if (!scenarios.base) return [];
  return SENSITIVITIES.map(([label, mutate]) => {
    const scenario = structuredClone(scenarios.base);
    mutate(scenario);
    return { label, summary: summarize(simulate(months, common, scenario), common) };
  });
}

const man = (yen) => (yen / 10_000).toFixed(1);
const table = (header, rows, align) =>
  [
    `| ${header.join(" | ")} |`,
    `| ${align.map((a) => (a === "r" ? "---:" : "---")).join(" | ")} |`,
    ...rows.map((cells) => `| ${cells.join(" | ")} |`)
  ].join("\n");

function renderMarkdown(results, assumptions) {
  const ids = Object.keys(results);
  const list = ids.map((id) => results[id]);
  const out = [BEGIN, "", "単位: 万円（小数1桁）。売上は手数料控除前、費用は手数料・ドメイン・成長投資枠。所得税等は「納税準備」として別建て。", ""];

  out.push("### 3シナリオ比較", "");
  out.push(
    table(
      ["指標", ...list.map((r) => r.label)],
      [
        ["2027-12 の月商", ...list.map((r) => man(r.summary.lastRevenue))],
        ["2027-12 の営業利益", ...list.map((r) => man(r.summary.lastProfit))],
        ["月商100万円 到達月", ...list.map((r) => r.summary.firstRevenueMilestone ?? "未達")],
        ["月利100万円 到達月", ...list.map((r) => r.summary.firstProfitMilestone ?? "未達")],
        ["2027年 売上合計", ...list.map((r) => man(r.summary.revenue2027))],
        ["2027年 営業利益合計", ...list.map((r) => man(r.summary.profit2027))],
        [`青色申告特別控除（${man(assumptions.common.blueReturnDeduction2027)}）後の事業所得`, ...list.map((r) => man(r.summary.businessIncomeAfterBlue2027))],
        [`2027年 納税準備金（利益の${Math.round(assumptions.common.taxReserveRate * 100)}%）`, ...list.map((r) => man(r.summary.taxReserve2027))]
      ],
      ["l", ...list.map(() => "r")]
    ),
    ""
  );

  for (const result of list) {
    out.push(`### ${result.label}シナリオ — ${result.description}`, "");
    out.push(
      table(
        ["月", "URASELA", "診断制作", "実録", "売上計", "費用", "営業利益", "納税準備", "累計利益"],
        result.rows.map((row) => [
          row.month,
          man(row.groups.urasela),
          man(row.groups.studio),
          man(row.groups.media),
          `**${man(row.revenueTotal)}**`,
          man(row.costTotal),
          `**${man(row.operatingProfit)}**`,
          man(row.taxReserve),
          man(row.cumulativeProfit)
        ]),
        ["l", "r", "r", "r", "r", "r", "r", "r", "r"]
      ),
      ""
    );
  }

  const base = results.base;
  if (base) {
    out.push("### 標準シナリオの主要KPI（KPI.md の月次目標と連動）", "");
    out.push(
      table(
        ["月", "URASELAセッション", "診断完了", "受託件数", "保守契約数", "実録会員数"],
        base.rows.map((row) => [
          row.month,
          row.kpi.sessions.toLocaleString("ja-JP"),
          row.kpi.completions.toLocaleString("ja-JP"),
          row.kpi.projects,
          row.kpi.retainers.toFixed(1),
          row.kpi.members
        ]),
        ["l", "r", "r", "r", "r", "r"]
      ),
      ""
    );

    const year = base.rows.filter((row) => row.month.startsWith("2027"));
    const last = base.rows.at(-1);
    const yearRevenue = base.summary.revenue2027;
    out.push("### 標準シナリオの収益内訳", "");
    out.push(
      table(
        ["収益源", `${last.month}`, "2027年計", "2027年構成比"],
        REVENUE_LINES.map(([key, label]) => {
          const total = sum(year.map((row) => row.revenue[key]));
          return [label, man(last.revenue[key]), man(total), `${((total / yearRevenue) * 100).toFixed(1)}%`];
        }),
        ["l", "r", "r", "r"]
      ),
      ""
    );
    out.push("### 標準シナリオの費用内訳", "");
    out.push(
      table(
        ["費用", `${last.month}`, "2027年計"],
        COST_LINES.map(([key, label]) => [label, man(last.costs[key]), man(sum(year.map((row) => row.costs[key])))]),
        ["l", "r", "r"]
      ),
      ""
    );

    out.push("### 感度分析（標準シナリオの前提を1つだけ崩した場合）", "");
    out.push(
      table(
        ["ケース", "2027-12 月商", "2027年 営業利益", "標準との差", "月利100万 到達月"],
        [
          ["標準シナリオそのまま", man(base.summary.lastRevenue), man(base.summary.profit2027), "—", base.summary.firstProfitMilestone ?? "未達"],
          ...sensitivities(assumptions).map(({ label, summary }) => [
            label,
            man(summary.lastRevenue),
            man(summary.profit2027),
            man(summary.profit2027 - base.summary.profit2027),
            summary.firstProfitMilestone ?? "未達"
          ])
        ],
        ["l", "r", "r", "r", "l"]
      ),
      ""
    );
  }

  out.push(END);
  return out.join("\n");
}

function renderCsv(results) {
  const header = [
    "scenario",
    "month",
    "sessions",
    "completions",
    "projects",
    "retainers",
    "members",
    ...REVENUE_LINES.map(([key]) => `rev_${key}`),
    "revenue_total",
    ...COST_LINES.map(([key]) => `cost_${key}`),
    "cost_total",
    "operating_profit",
    "tax_reserve",
    "take_home",
    "cumulative_profit"
  ];
  const lines = [header.join(",")];
  for (const result of Object.values(results)) {
    for (const row of result.rows) {
      lines.push(
        [
          result.id,
          row.month,
          row.kpi.sessions,
          row.kpi.completions,
          row.kpi.projects,
          row.kpi.retainers,
          row.kpi.members,
          ...REVENUE_LINES.map(([key]) => row.revenue[key]),
          row.revenueTotal,
          ...COST_LINES.map(([key]) => row.costs[key]),
          row.costTotal,
          row.operatingProfit,
          row.taxReserve,
          row.takeHome,
          row.cumulativeProfit
        ].join(",")
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

function replaceBlock(document, block) {
  const start = document.indexOf(BEGIN);
  const end = document.indexOf(END);
  if (start < 0 || end < 0 || end < start) {
    throw new Error(`pl-plan.md に自動生成マーカーがありません: ${BEGIN} … ${END}`);
  }
  return document.slice(0, start) + block + document.slice(end + END.length);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const assumptions = JSON.parse(await readFile(paths.assumptions, "utf8"));
  const results = build(assumptions);

  if (args.has("--json")) {
    process.stdout.write(`${JSON.stringify({ months: assumptions.months, results }, null, 2)}\n`);
    return;
  }

  const markdown = replaceBlock(await readFile(paths.markdown, "utf8"), renderMarkdown(results, assumptions));
  const csv = renderCsv(results);

  if (args.has("--check")) {
    const [currentMarkdown, currentCsv] = await Promise.all([
      readFile(paths.markdown, "utf8"),
      readFile(paths.csv, "utf8").catch(() => "")
    ]);
    if (currentMarkdown !== markdown || currentCsv !== csv) {
      console.error("PL計画が前提値と一致していません。node company/tools/plan.mjs を実行してください。");
      process.exitCode = 1;
      return;
    }
    console.log("PL計画は最新です。");
    return;
  }

  await Promise.all([writeFile(paths.markdown, markdown), writeFile(paths.csv, csv)]);
  for (const result of Object.values(results)) {
    const s = result.summary;
    console.log(
      `${result.label}: 2027年売上 ${man(s.revenue2027)}万 / 営業利益 ${man(s.profit2027)}万 / ` +
        `月商100万 ${s.firstRevenueMilestone ?? "未達"} / 月利100万 ${s.firstProfitMilestone ?? "未達"} / ` +
        `${s.lastMonth} 月商 ${man(s.lastRevenue)}万`
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
