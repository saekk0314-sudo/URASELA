#!/usr/bin/env node
/**
 * URASELA 事業計画PLジェネレーター（依存パッケージなし）
 *
 *   node company/tools/plan.mjs          pl-plan.md の自動生成ブロックと pl-plan.csv を更新
 *   node company/tools/plan.mjs --json   計算結果をJSONで出力（ダッシュボード用）
 *   node company/tools/plan.mjs --check  生成物が前提値と一致しているか検査（不一致なら終了コード1）
 *
 * 前提値は company/finance/plan-assumptions.json。数値を変えたら必ず再生成する。
 * シナリオに無い項目は0として扱う（保守・標準は既存3事業だけ、目標は全レバー）。
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
const MONTHLY_100 = 1_000_000;

export const REVENUE_LINES = [
  ["ads", "URASELA 広告", "urasela"],
  ["affiliate", "URASELA アフィリエイト", "urasela"],
  ["paid", "URASELA 有料レポート", "urasela"],
  ["plus", "URASELA PLUS（月額会員）", "urasela"],
  ["goods", "URASELA グッズ・スタンプ", "urasela"],
  ["projects", "Studio 診断制作の受託", "studio"],
  ["retainer", "Studio 保守運用", "studio"],
  ["consulting", "Studio AI導入支援", "studio"],
  ["saas", "診断メーカー（SaaS）", "saas"],
  ["membership", "実録 メンバーシップ", "media"],
  ["templates", "実録 テンプレ・有料記事", "media"],
  ["course", "実録 講座", "media"]
];

export const COST_LINES = [
  ["feePlatformB2B", "受託プラットフォーム手数料"],
  ["partnerCommission", "パートナー紹介料"],
  ["feePayment", "決済・販売手数料"],
  ["feeMedia", "note手数料（実録）"],
  ["affiliateCommission", "アフィリエイト報酬（講座）"],
  ["outsourcing", "外注費（人の手が要る作業）"],
  ["fixedTools", "ツール・専門家費用"],
  ["transfer", "振込手数料等"],
  ["domain", "独自ドメイン"],
  ["tools", "Claude（Max）のURASELA負担分"],
  ["oneTime", "一時費用（法人設立など）"],
  ["growth", "広告・成長投資"]
];

export const GROUPS = [
  ["urasela", "URASELA"],
  ["studio", "Studio"],
  ["saas", "SaaS"],
  ["media", "実録"]
];

// 見出しシナリオの前提を1つずつ崩して、どの賭けが外れると痛いかを見る
const SENSITIVITIES = [
  ["B2Cのヒットが出ない（集客と会員が1/3）", (s) => {
    s.urasela.sessions = s.urasela.sessions.map((n) => Math.round(n / 3));
    if (s.urasela.plusSubscribers) s.urasela.plusSubscribers = s.urasela.plusSubscribers.map((n) => Math.round(n / 3));
  }],
  ["月額会員（PLUS）を出さない", (s) => { if (s.urasela.plusSubscribers) s.urasela.plusSubscribers = s.urasela.plusSubscribers.map(() => 0); }],
  ["有料化しない（A-004却下: 有料レポートもPLUSも無し）", (s) => {
    s.urasela.paidConversion = 0;
    if (s.urasela.plusSubscribers) s.urasela.plusSubscribers = s.urasela.plusSubscribers.map(() => 0);
  }],
  ["パートナー経由の受託が取れない", (s) => {
    const share = s.b2b.partnerShare ?? [];
    s.b2b.projects = s.b2b.projects.map((n, i) => Math.round(n * (1 - (share[i] ?? 0))));
    s.b2b.partnerShare = s.b2b.projects.map(() => 0);
  }],
  ["受託単価が計画の7割", (s) => { s.b2b.avgPrice = s.b2b.avgPrice.map((n) => Math.round(n * 0.7)); }],
  ["SaaSが立ち上がらない", (s) => { if (s.saas) s.saas.subscribers = s.saas.subscribers.map(() => 0); }],
  ["講座が売れない", (s) => { if (s.media.courseSales) s.media.courseSales = s.media.courseSales.map(() => 0); }],
  ["AI導入支援が取れない", (s) => { if (s.b2b.consultingProjects) s.b2b.consultingProjects = s.b2b.consultingProjects.map(() => 0); }]
];

const sum = (values) => values.reduce((total, value) => total + value, 0);
const roundAll = (record) => {
  for (const key of Object.keys(record)) record[key] = Math.round(record[key]);
  return record;
};
const at = (array, i) => (Array.isArray(array) ? array[i] ?? 0 : 0);

function assertLength(name, array, length) {
  if (array === undefined) return;
  if (!Array.isArray(array) || array.length !== length) {
    throw new Error(`${name} は ${length} ヶ月分の配列が必要です（現在: ${Array.isArray(array) ? array.length : typeof array}）`);
  }
}

function validate(assumptions) {
  const { months, scenarios } = assumptions;
  const n = months.length;
  for (const [id, s] of Object.entries(scenarios)) {
    for (const key of ["sessions", "goods", "plusSubscribers"]) assertLength(`${id}.urasela.${key}`, s.urasela[key], n);
    for (const key of ["projects", "avgPrice", "platformShare", "partnerShare", "consultingProjects"]) assertLength(`${id}.b2b.${key}`, s.b2b[key], n);
    for (const key of ["members", "templateSales", "courseSales"]) assertLength(`${id}.media.${key}`, s.media[key], n);
    assertLength(`${id}.saas.subscribers`, s.saas?.subscribers, n);
    assertLength(`${id}.costs.fixedMonthly`, s.costs?.fixedMonthly, n);
    months.forEach((month, i) => {
      if (at(s.b2b.platformShare, i) + at(s.b2b.partnerShare, i) > 1 + 1e-9) {
        throw new Error(`${id} ${month}: platformShare と partnerShare の合計が1を超えています`);
      }
    });
  }
  if (!scenarios[assumptions.headline]) throw new Error(`headline「${assumptions.headline}」のシナリオがありません`);
}

export function simulate(months, common, scenario) {
  const { urasela: u, b2b: b, media: m } = scenario;
  const saas = scenario.saas ?? {};
  const costs = scenario.costs ?? {};
  const growthRate = costs.growthBudgetRate ?? common.growthBudgetRate;
  const growthStart = costs.growthBudgetStartMonth ?? common.growthBudgetStartMonth;
  let retainers = 0;
  let previousProjects = 0;
  let cumulativeProfit = 0;
  let cumulativeCash = 0;
  let domainIndex = -1;
  let toolsStarted = false;

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
    // Claude などの共用ツールの負担も、URASELAの手元資金で払えるようになった月から始める
    if (!toolsStarted && common.existingToolsAllocation > 0 && cumulativeCash >= common.existingToolsAllocation) toolsStarted = true;

    // 保守契約: 前月納品分の一部が月額契約へ移行し、毎月一定率が解約する
    retainers = retainers * (1 - b.retainerChurn) + previousProjects * b.retainerConversion;
    previousProjects = b.projects[i];

    const revenue = roundAll({
      ads: adsLive ? sessions * u.adYenPerSession : 0,
      affiliate: month >= u.affiliateStartMonth ? completions * u.affiliateYenPerCompletion : 0,
      paid: month >= u.paidStartMonth ? completions * u.paidConversion * u.paidPrice : 0,
      plus: at(u.plusSubscribers, i) * (u.plusPrice ?? 0),
      goods: u.goods[i],
      projects: b.projects[i] * b.avgPrice[i],
      retainer: retainers * b.retainerFee,
      consulting: at(b.consultingProjects, i) * (b.consultingPrice ?? 0),
      saas: at(saas.subscribers, i) * (saas.price ?? 0),
      membership: m.members[i] * m.memberPrice,
      templates: m.templateSales[i] * m.templatePrice,
      course: at(m.courseSales, i) * (m.coursePrice ?? 0)
    });
    const revenueTotal = sum(Object.values(revenue));

    const cost = roundAll({
      feePlatformB2B: revenue.projects * b.platformShare[i] * b.platformFeeRate,
      partnerCommission: revenue.projects * at(b.partnerShare, i) * (b.partnerCommissionRate ?? 0),
      feePayment:
        revenue.paid * u.paidFeeRate +
        revenue.plus * (u.plusFeeRate ?? 0) +
        revenue.saas * (saas.feeRate ?? 0) +
        revenue.course * (m.courseFeeRate ?? 0),
      feeMedia: (revenue.membership + revenue.templates) * m.feeRate,
      affiliateCommission: revenue.course * (m.courseAffiliateShare ?? 0) * (m.courseAffiliateRate ?? 0),
      outsourcing: costs.outsourcingRate && month >= costs.outsourcingStartMonth ? revenueTotal * costs.outsourcingRate : 0,
      fixedTools: at(costs.fixedMonthly, i),
      transfer: revenueTotal > 0 ? common.transferFeesPerMonth : 0,
      domain,
      tools: toolsStarted ? common.existingToolsAllocation : 0,
      oneTime: costs.oneTime?.[month] ?? 0,
      growth: month >= growthStart ? revenueTotal * growthRate : 0
    });
    const costTotal = sum(Object.values(cost));

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
        plus: at(u.plusSubscribers, i),
        projects: b.projects[i],
        retainers: Math.round(retainers * 10) / 10,
        saas: at(saas.subscribers, i),
        members: m.members[i],
        course: at(m.courseSales, i)
      },
      revenue,
      groups,
      revenueTotal,
      costs: cost,
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
  const firstYear = rows.slice(0, 12);
  const runRate = common.runRateTarget / 12;
  const last = rows.at(-1);
  const twelfth = rows[11] ?? last;
  const minCashRow = rows.reduce((min, row) => (row.cumulativeCash < min.cumulativeCash ? row : min), rows[0]);
  return {
    revenue2027: sum(year.map((row) => row.revenueTotal)),
    profit2027: sum(year.map((row) => row.operatingProfit)),
    taxReserve2027: sum(year.map((row) => row.taxReserve)),
    firstYearRevenue: sum(firstYear.map((row) => row.revenueTotal)),
    firstYearProfit: sum(firstYear.map((row) => row.operatingProfit)),
    twelfthMonth: twelfth.month,
    twelfthRevenue: twelfth.revenueTotal,
    twelfthProfit: twelfth.operatingProfit,
    firstRevenueMilestone: rows.find((row) => row.revenueTotal >= MONTHLY_100)?.month ?? null,
    firstProfitMilestone: rows.find((row) => row.operatingProfit >= MONTHLY_100)?.month ?? null,
    firstRunRateMilestone: rows.find((row) => row.revenueTotal >= runRate)?.month ?? null,
    minCash: minCashRow.cumulativeCash,
    minCashMonth: minCashRow.month,
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
  const { months, common, scenarios, headline } = assumptions;
  return SENSITIVITIES.map(([label, mutate]) => {
    const scenario = structuredClone(scenarios[headline]);
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
  const list = Object.values(results);
  const head = results[assumptions.headline];
  const runRateMan = man(assumptions.common.runRateTarget / 12);
  const out = [
    BEGIN,
    "",
    "単位: 万円（小数1桁）。売上は手数料控除前。費用は手数料・紹介料・外注・ツール・広告など。所得税等は「納税準備」として別建て（CSV参照）。",
    ""
  ];

  out.push("### 3シナリオ比較", "");
  out.push(
    table(
      ["指標", ...list.map((r) => r.label)],
      [
        [`${head.summary.twelfthMonth}（開業12ヶ月目）の月商`, ...list.map((r) => man(r.summary.twelfthRevenue))],
        [`年商5000万円ペース（月商${runRateMan}万円）到達月`, ...list.map((r) => r.summary.firstRunRateMilestone ?? "未達")],
        ["月商100万円 到達月", ...list.map((r) => r.summary.firstRevenueMilestone ?? "未達")],
        ["月利100万円 到達月", ...list.map((r) => r.summary.firstProfitMilestone ?? "未達")],
        ["開業12ヶ月（2026-12〜2027-11）の売上合計", ...list.map((r) => man(r.summary.firstYearRevenue))],
        ["開業12ヶ月の営業利益合計", ...list.map((r) => man(r.summary.firstYearProfit))],
        ["2027年（1〜12月）の売上合計", ...list.map((r) => man(r.summary.revenue2027))],
        ["2027年の営業利益合計", ...list.map((r) => man(r.summary.profit2027))],
        [`2027年の納税準備金（利益の${Math.round(assumptions.common.taxReserveRate * 100)}%）`, ...list.map((r) => man(r.summary.taxReserve2027))],
        ["手出しゼロの検証（手元資金が一度もマイナスにならない）", ...list.map((r) => (r.summary.minCash >= 0 ? "OK" : `NG（${r.summary.minCashMonth}）`))]
      ],
      ["l", ...list.map(() => "r")]
    ),
    ""
  );

  for (const result of list) {
    out.push(`### ${result.label}シナリオ — ${result.description}`, "");
    out.push(
      table(
        ["月", ...GROUPS.map(([, label]) => label), "売上計", "費用", "営業利益", "累計利益"],
        result.rows.map((row) => [
          row.month,
          ...GROUPS.map(([key]) => man(row.groups[key])),
          `**${man(row.revenueTotal)}**`,
          man(row.costTotal),
          `**${man(row.operatingProfit)}**`,
          man(row.cumulativeProfit)
        ]),
        ["l", ...GROUPS.map(() => "r"), "r", "r", "r", "r"]
      ),
      ""
    );
  }

  out.push(`### ${head.label}シナリオの主要KPI（KPI.md の月次目標）`, "");
  out.push(
    table(
      ["月", "セッション", "診断完了", "PLUS会員", "受託件数", "保守契約", "SaaS契約", "実録会員", "講座販売"],
      head.rows.map((row) => [
        row.month,
        row.kpi.sessions.toLocaleString("ja-JP"),
        row.kpi.completions.toLocaleString("ja-JP"),
        row.kpi.plus.toLocaleString("ja-JP"),
        row.kpi.projects,
        row.kpi.retainers.toFixed(1),
        row.kpi.saas,
        row.kpi.members,
        row.kpi.course
      ]),
      ["l", "r", "r", "r", "r", "r", "r", "r", "r"]
    ),
    ""
  );

  const firstYear = head.rows.slice(0, 12);
  const twelfth = head.rows[11];
  const firstYearRevenue = head.summary.firstYearRevenue;
  out.push(`### ${head.label}シナリオの収益内訳`, "");
  out.push(
    table(
      ["収益源", `${twelfth.month}`, "開業12ヶ月計", "構成比"],
      REVENUE_LINES.map(([key, label]) => {
        const total = sum(firstYear.map((row) => row.revenue[key]));
        return [label, man(twelfth.revenue[key]), man(total), `${((total / firstYearRevenue) * 100).toFixed(1)}%`];
      }),
      ["l", "r", "r", "r"]
    ),
    ""
  );
  out.push(`### ${head.label}シナリオの費用内訳`, "");
  out.push(
    table(
      ["費用", `${twelfth.month}`, "開業12ヶ月計"],
      COST_LINES.map(([key, label]) => [label, man(twelfth.costs[key]), man(sum(firstYear.map((row) => row.costs[key])))]),
      ["l", "r", "r"]
    ),
    ""
  );

  out.push(`### 感度分析（${head.label}シナリオの賭けを1つだけ外した場合）`, "");
  out.push(
    table(
      ["ケース", `${twelfth.month} の月商`, "年商5000万ペース到達", "開業12ヶ月の売上", "目標との差"],
      [
        [`${head.label}シナリオそのまま`, man(head.summary.twelfthRevenue), head.summary.firstRunRateMilestone ?? "未達", man(firstYearRevenue), "—"],
        ...sensitivities(assumptions).map(({ label, summary }) => [
          label,
          man(summary.twelfthRevenue),
          summary.firstRunRateMilestone ?? "未達",
          man(summary.firstYearRevenue),
          man(summary.firstYearRevenue - firstYearRevenue)
        ])
      ],
      ["l", "r", "l", "r", "r"]
    ),
    ""
  );

  out.push(END);
  return out.join("\n");
}

function renderCsv(results) {
  const header = [
    "scenario",
    "month",
    "sessions",
    "completions",
    "plus_subscribers",
    "projects",
    "retainers",
    "saas_subscribers",
    "members",
    "course_sales",
    ...REVENUE_LINES.map(([key]) => `rev_${key}`),
    ...GROUPS.map(([key]) => `grp_${key}`),
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
          row.kpi.plus,
          row.kpi.projects,
          row.kpi.retainers,
          row.kpi.saas,
          row.kpi.members,
          row.kpi.course,
          ...REVENUE_LINES.map(([key]) => row.revenue[key]),
          ...GROUPS.map(([key]) => row.groups[key]),
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
    process.stdout.write(`${JSON.stringify({ months: assumptions.months, headline: assumptions.headline, results, sensitivities: sensitivities(assumptions) }, null, 2)}\n`);
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
      `${result.label}: ${s.twelfthMonth}月商 ${man(s.twelfthRevenue)}万 / 年商5000万ペース ${s.firstRunRateMilestone ?? "未達"} / ` +
        `開業12ヶ月売上 ${man(s.firstYearRevenue)}万 / 2027年利益 ${man(s.profit2027)}万 / 手元資金の最小 ${man(s.minCash)}万`
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
