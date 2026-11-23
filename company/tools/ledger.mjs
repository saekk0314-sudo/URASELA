#!/usr/bin/env node
/**
 * URASELA 帳簿ツール（複式簿記・依存パッケージなし）
 *
 * 仕訳帳CSV: 1行=1仕訳（借方と貸方は同額）。複合仕訳は同じ伝票番号で複数行に分ける。
 *   日付,伝票番号,借方科目,貸方科目,金額,摘要,取引先,証憑
 *   2027-01-20,0001,売掛金:ココナラ,売上高:受託制作,30000,診断制作スタンダード,A様,20270120_ココナラ_30000.pdf
 *
 * 使い方（CSVは複数指定可。会計年度ごとにファイルを分け、年初に close の出力を入れる）
 *   node company/tools/ledger.mjs check <csv...>                         入力チェック（エラーで終了コード1）
 *   node company/tools/ledger.mjs tb    <csv...> [--to 2027-03-31] [--sub]  残高試算表
 *   node company/tools/ledger.mjs pl    <csv...> --year 2027 [--sub]       月次損益計算書
 *   node company/tools/ledger.mjs bs    <csv...> [--to 2027-12-31]         貸借対照表
 *   node company/tools/ledger.mjs blue  <csv...> --year 2027 [--deduction 650000]  青色申告決算書への転記額
 *   node company/tools/ledger.mjs close <csv...> --year 2027               翌年の期首残高仕訳をCSVで出力
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_PATH = resolve(here, "../finance/accounts.json");
const HEADER = ["日付", "伝票番号", "借方科目", "貸方科目", "金額", "摘要", "取引先", "証憑"];
const KEYS = { 日付: "date", 伝票番号: "voucher", 借方科目: "debit", 貸方科目: "credit", 金額: "amount", 摘要: "memo", 取引先: "partner", 証憑: "evidence" };
const REQUIRED = ["日付", "借方科目", "貸方科目", "金額"];
const OWNER_ACCOUNTS = new Set(["事業主貸", "事業主借"]);

const yen = (n) => (n < 0 ? "▲" : "") + Math.abs(n).toLocaleString("ja-JP");

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export function splitAccount(value) {
  const [account, ...rest] = value.trim().split(/[:：]/);
  return { account: account.trim(), sub: rest.join(":").trim() };
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function loadAccounts() {
  const { accounts } = JSON.parse(await readFile(ACCOUNTS_PATH, "utf8"));
  return new Map(accounts.map((account, order) => [account.name, { ...account, order }]));
}

export function readJournal(name, text, accounts) {
  const errors = [];
  const warnings = [];
  const entries = [];
  const rows = parseCsv(text);
  if (!rows.length) return { entries, errors: [`${name}: 空のファイルです`], warnings };

  const header = rows[0].map((cell) => cell.trim());
  const missing = REQUIRED.filter((column) => !header.includes(column));
  if (missing.length) return { entries, errors: [`${name}: 必須列がありません（${missing.join("・")}）。見出しは ${HEADER.join(",")}`], warnings };

  rows.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const where = `${name}:${line}行目`;
    const raw = Object.fromEntries(header.map((column, i) => [KEYS[column] ?? column, (cells[i] ?? "").trim()]));
    const amountText = raw.amount.replace(/[,，円\s]/g, "");
    const entry = {
      file: name,
      line,
      date: raw.date,
      voucher: raw.voucher ?? "",
      memo: raw.memo ?? "",
      partner: raw.partner ?? "",
      evidence: raw.evidence ?? "",
      amount: Number(amountText),
      debit: splitAccount(raw.debit),
      credit: splitAccount(raw.credit)
    };

    if (!isValidDate(entry.date)) errors.push(`${where}: 日付「${raw.date}」は YYYY-MM-DD 形式の実在日付にしてください`);
    if (!/^\d+$/.test(amountText) || entry.amount <= 0) errors.push(`${where}: 金額「${raw.amount}」は1円以上の整数にしてください`);
    for (const side of ["debit", "credit"]) {
      const label = side === "debit" ? "借方" : "貸方";
      if (!entry[side].account) errors.push(`${where}: ${label}科目が空です`);
      else if (!accounts.has(entry[side].account)) errors.push(`${where}: ${label}科目「${entry[side].account}」は accounts.json にありません`);
    }
    if (entry.debit.account === entry.credit.account && entry.debit.sub === entry.credit.sub) {
      errors.push(`${where}: 借方と貸方が同じ科目です`);
    }
    if (entry.credit.account === "売上高" && !entry.partner) warnings.push(`${where}: 売上の取引先が空です`);
    const debitInfo = accounts.get(entry.debit.account);
    if (debitInfo?.group === "費用" && !entry.evidence) warnings.push(`${where}: 経費の証憑（ファイル名）が空です`);
    entries.push(entry);
  });

  const seen = new Map();
  for (const entry of entries) {
    const key = [entry.date, entry.debit.account, entry.debit.sub, entry.credit.account, entry.credit.sub, entry.amount, entry.memo].join("|");
    if (seen.has(key)) warnings.push(`${entry.file}:${entry.line}行目: ${seen.get(key)}行目と同じ内容です（二重計上の可能性）`);
    else seen.set(key, entry.line);
  }
  return { entries, errors, warnings };
}

async function loadAll(files) {
  const accounts = await loadAccounts();
  const result = { accounts, entries: [], errors: [], warnings: [] };
  if (!files.length) result.errors.push("仕訳帳CSVを指定してください");
  for (const file of files) {
    let text;
    try {
      text = await readFile(file, "utf8");
    } catch {
      result.errors.push(`${file}: 読み込めません`);
      continue;
    }
    const { entries, errors, warnings } = readJournal(file, text, accounts);
    result.entries.push(...entries);
    result.errors.push(...errors);
    result.warnings.push(...warnings);
  }
  result.entries.sort((a, b) => a.date.localeCompare(b.date) || a.voucher.localeCompare(b.voucher) || a.line - b.line);
  return result;
}

/** 科目（と補助科目）ごとの借方合計・貸方合計・残高（増える側をプラス）を集計する */
export function balances(entries, accounts, { withSub = false, filter = () => true } = {}) {
  const map = new Map();
  const touch = (ref) => {
    const key = withSub && ref.sub ? `${ref.account}:${ref.sub}` : ref.account;
    if (!map.has(key)) map.set(key, { key, account: ref.account, sub: withSub ? ref.sub : "", debit: 0, credit: 0 });
    return map.get(key);
  };
  for (const entry of entries) {
    if (!filter(entry)) continue;
    touch(entry.debit).debit += entry.amount;
    touch(entry.credit).credit += entry.amount;
  }
  return [...map.values()]
    .map((row) => {
      const info = accounts.get(row.account);
      const balance = info.side === "debit" ? row.debit - row.credit : row.credit - row.debit;
      return { ...row, info, balance };
    })
    .sort((a, b) => a.info.order - b.info.order || a.key.localeCompare(b.key));
}

const table = (header, rows, align) =>
  [
    `| ${header.join(" | ")} |`,
    `| ${align.map((a) => (a === "r" ? "---:" : "---")).join(" | ")} |`,
    ...rows.map((cells) => `| ${cells.join(" | ")} |`)
  ].join("\n");

function trialBalance(entries, accounts, { to, withSub }) {
  const rows = balances(entries, accounts, { withSub, filter: (e) => !to || e.date <= to });
  const totalDebit = rows.reduce((t, r) => t + r.debit, 0);
  const totalCredit = rows.reduce((t, r) => t + r.credit, 0);
  return [
    `## 残高試算表${to ? `（${to}時点）` : ""}`,
    "",
    table(
      ["区分", "科目", "借方合計", "貸方合計", "残高"],
      [
        ...rows.map((r) => [r.info.group, r.key, yen(r.debit), yen(r.credit), r.balance < 0 ? `**${yen(r.balance)}**` : yen(r.balance)]),
        ["", "**合計**", `**${yen(totalDebit)}**`, `**${yen(totalCredit)}**`, totalDebit === totalCredit ? "貸借一致" : "**貸借不一致**"]
      ],
      ["l", "l", "r", "r", "r"]
    ),
    "",
    rows.some((r) => r.balance < 0) ? "▲ はマイナス残高。資産・費用の貸方残、負債・収益の借方残は記帳ミスの可能性が高い。" : ""
  ].join("\n");
}

function profitAndLoss(entries, accounts, { year, withSub }) {
  const inYear = entries.filter((e) => e.date.startsWith(`${year}-`));
  const lastMonth = inYear.reduce((m, e) => Math.max(m, Number(e.date.slice(5, 7))), 0);
  if (!lastMonth) return `## ${year}年 月次損益計算書\n\n${year}年の仕訳がありません。`;
  const months = Array.from({ length: lastMonth }, (_, i) => String(i + 1).padStart(2, "0"));
  const perMonth = months.map((month) =>
    balances(inYear, accounts, { withSub, filter: (e) => e.date.slice(5, 7) === month }).filter((r) => r.info.statement === "pl")
  );
  const keys = [...new Map(perMonth.flat().map((r) => [r.key, r])).values()].sort((a, b) => a.info.order - b.info.order || a.key.localeCompare(b.key));
  const value = (monthRows, key) => monthRows.find((r) => r.key === key)?.balance ?? 0;
  const groupTotal = (monthRows, group) => monthRows.filter((r) => r.info.group === group).reduce((t, r) => t + r.balance, 0);
  const line = (label, fn) => {
    const cells = perMonth.map(fn);
    return [label, ...cells.map(yen), yen(cells.reduce((t, n) => t + n, 0))];
  };
  const rows = [
    ...keys.filter((k) => k.info.group === "収益").map((k) => line(k.key, (m) => value(m, k.key))),
    line("**収益計**", (m) => groupTotal(m, "収益")),
    ...keys.filter((k) => k.info.group === "費用").map((k) => line(k.key, (m) => value(m, k.key))),
    line("**費用計**", (m) => groupTotal(m, "費用")),
    line("**所得（営業利益）**", (m) => groupTotal(m, "収益") - groupTotal(m, "費用"))
  ];
  return [`## ${year}年 月次損益計算書（青色申告特別控除前）`, "", table(["科目", ...months.map((m) => `${Number(m)}月`), "合計"], rows, ["l", ...months.map(() => "r"), "r"])].join("\n");
}

function balanceSheet(entries, accounts, { to }) {
  const rows = balances(entries, accounts, { withSub: true, filter: (e) => !to || e.date <= to });
  const bs = rows.filter((r) => r.info.statement === "bs" && r.balance !== 0);
  const income = rows.filter((r) => r.info.group === "収益").reduce((t, r) => t + r.balance, 0) - rows.filter((r) => r.info.group === "費用").reduce((t, r) => t + r.balance, 0);
  const assets = bs.filter((r) => r.info.group === "資産");
  const right = bs.filter((r) => r.info.group !== "資産");
  const assetTotal = assets.reduce((t, r) => t + r.balance, 0);
  const rightTotal = right.reduce((t, r) => t + r.balance, 0) + income;
  return [
    `## 貸借対照表${to ? `（${to}時点）` : ""}`,
    "",
    table(["資産の部", "金額"], [...assets.map((r) => [r.key, yen(r.balance)]), ["**合計**", `**${yen(assetTotal)}**`]], ["l", "r"]),
    "",
    table(
      ["負債・資本の部", "金額"],
      [...right.map((r) => [r.key, yen(r.balance)]), ["青色申告特別控除前の所得金額", yen(income)], ["**合計**", `**${yen(rightTotal)}**`]],
      ["l", "r"]
    ),
    "",
    assetTotal === rightTotal ? "貸借一致。" : `**貸借不一致（差額 ${yen(assetTotal - rightTotal)}）。前年の仕訳が混ざっていないか、期首残高仕訳があるか確認。**`
  ].join("\n");
}

function blueReturn(entries, accounts, { year, deduction }) {
  const inYear = entries.filter((e) => e.date.startsWith(`${year}-`));
  const rows = balances(inYear, accounts).filter((r) => r.info.statement === "pl");
  const byLine = new Map();
  for (const r of rows) byLine.set(r.info.blue, (byLine.get(r.info.blue) ?? 0) + r.balance);
  const order = [...accounts.values()].filter((a) => a.statement === "pl").map((a) => a.blue);
  const lines = [...new Set(order)].filter((label) => byLine.has(label));
  const revenue = rows.filter((r) => r.info.group === "収益").reduce((t, r) => t + r.balance, 0);
  const expenses = rows.filter((r) => r.info.group === "費用").reduce((t, r) => t + r.balance, 0);
  const net = revenue - expenses;
  const blue = Math.max(0, Math.min(deduction, net));

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    const sales = balances(inYear, accounts, { filter: (e) => e.date.slice(5, 7) === month })
      .filter((r) => r.info.group === "収益")
      .reduce((t, r) => t + r.balance, 0);
    return [`${i + 1}月`, yen(sales)];
  });

  return [
    `## ${year}年分 青色申告決算書への転記額（一般用・損益計算書）`,
    "",
    table(["決算書の欄", "金額"], lines.map((label) => [label, yen(byLine.get(label))]), ["l", "r"]),
    "",
    table(
      ["計算", "金額"],
      [
        ["売上（収入）金額", yen(revenue)],
        ["経費計", yen(expenses)],
        ["差引金額", yen(net)],
        [`青色申告特別控除額（上限 ${yen(deduction)}）`, yen(blue)],
        ["**所得金額**", `**${yen(net - blue)}**`]
      ],
      ["l", "r"]
    ),
    "",
    "### 月別売上（収入）金額（決算書2ページ目）",
    "",
    table(["月", "売上（収入）金額"], monthly, ["l", "r"]),
    "",
    "e-Taxの確定申告書等作成コーナーで上の金額を入力する。65万円（2027年分以降で要件を満たせば75万円）控除は、複式簿記・貸借対照表の添付・期限内のe-Tax申告が条件。"
  ].join("\n");
}

function closingEntries(entries, accounts, { year }) {
  const rows = balances(entries, accounts, { withSub: true, filter: (e) => e.date <= `${year}-12-31` }).filter(
    (r) => r.info.statement === "bs" && r.info.group !== "資本" && !OWNER_ACCOUNTS.has(r.account) && r.balance !== 0
  );
  const date = `${Number(year) + 1}-01-01`;
  const memo = `期首残高（${year}年からの繰越）`;
  const lines = [HEADER.join(",")];
  let capital = 0;
  for (const r of rows) {
    const isAsset = r.info.group === "資産";
    const positive = r.balance > 0;
    const amount = Math.abs(r.balance);
    const debit = isAsset === positive ? r.key : "元入金";
    const credit = isAsset === positive ? "元入金" : r.key;
    capital += isAsset ? r.balance : -r.balance;
    lines.push([date, "期首", debit, credit, amount, memo, "", ""].join(","));
  }
  return { csv: `${lines.join("\n")}\n`, capital };
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const flags = new Set(rest.filter((a) => a.startsWith("--")));
  const valueFlags = new Set(["--to", "--year", "--deduction"]);
  const files = rest.filter((a, i) => !a.startsWith("--") && !valueFlags.has(rest[i - 1]));
  const usage = "使い方: node company/tools/ledger.mjs <check|tb|pl|bs|blue|close> <仕訳帳.csv...> [--year YYYY] [--to YYYY-MM-DD] [--sub] [--deduction 650000]";
  if (!["check", "tb", "pl", "bs", "blue", "close"].includes(command)) {
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  const { accounts, entries, errors, warnings } = await loadAll(files);
  if (errors.length) {
    console.error(`エラー ${errors.length}件:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  const year = option(rest, "--year", entries.at(-1)?.date.slice(0, 4) ?? String(new Date().getFullYear()));

  switch (command) {
    case "check": {
      const total = entries.reduce((t, e) => t + e.amount, 0);
      console.log(`OK: ${entries.length}件の仕訳、借方・貸方とも ${yen(total)}円（1行1仕訳のため常に一致）`);
      if (warnings.length) console.log(`確認事項 ${warnings.length}件:\n- ${warnings.join("\n- ")}`);
      break;
    }
    case "tb":
      console.log(trialBalance(entries, accounts, { to: option(rest, "--to"), withSub: flags.has("--sub") }));
      break;
    case "pl":
      console.log(profitAndLoss(entries, accounts, { year, withSub: flags.has("--sub") }));
      break;
    case "bs":
      console.log(balanceSheet(entries, accounts, { to: option(rest, "--to") }));
      break;
    case "blue":
      console.log(blueReturn(entries, accounts, { year, deduction: Number(option(rest, "--deduction", "650000")) }));
      break;
    case "close": {
      const { csv, capital } = closingEntries(entries, accounts, { year });
      process.stdout.write(csv);
      console.error(`${Number(year) + 1}年の期首元入金: ${yen(capital)}円（事業主貸・事業主借は元入金に振り替え済み）`);
      break;
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
