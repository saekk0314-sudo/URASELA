// 年運 完全版の原稿を組み立て、無料版のエンジンと月の流れが一致するか確かめる
// 使い方: node company/tools/year-report-check.mjs <原稿.md> <個人年数1〜9>
// 原稿と同じフォルダの ura-common.md（裏のテーマ・全記事共通）を {{URA_COMMON}} に差し込み、<原稿>.full.md を出力する。
// 有料の本文は公開リポジトリに置かない（非公開リポジトリ urasela-hq の content/ で使う）。
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { MONTH_RHYTHM, YEAR_THEMES } from "../../src/data.js";
const [file, n] = [process.argv[2], Number(process.argv[3])];
const dir = dirname(file);
let text = readFileSync(file, "utf8").replace("{{URA_COMMON}}", readFileSync(join(dir, "ura-common.md"), "utf8").trim());
const root = (x) => { while (x > 9) x = String(x).split("").reduce((a, b) => a + +b, 0); return x; };
const errors = [];
if (!text.includes(`「${YEAR_THEMES[n].keyword}」`)) errors.push(`表のキーワード「${YEAR_THEMES[n].keyword}」が本文にない`);
for (let m = 1; m <= 12; m++) {
  const r = MONTH_RHYTHM[root(n + m)];
  const line = text.match(new RegExp(`^### ${m}月　(\\S+) ― (.+?)(【|$)`, "m"));
  if (!line) { errors.push(`${m}月の見出しがない`); continue; }
  if (line[1] !== r.level || line[2].trim() !== r.note) errors.push(`${m}月: 原稿「${line[1]} ― ${line[2].trim()}」≠ エンジン「${r.level} ― ${r.note}」`);
  const peak = [1, 8].includes(root(n + m)), rest = [7, 9].includes(root(n + m));
  const fullLine = text.match(new RegExp(`^### ${m}月.*$`, "m"))[0];
  if (peak !== fullLine.includes("【勝負の月】")) errors.push(`${m}月: 勝負の月の印が合わない`);
  if (rest && r.level !== "休む") errors.push(`${m}月: 休む月の扱い`);
}
const banned = ["必ず", "絶対", "確実", "保証", "不幸", "災い", "厄", "投資す"];
for (const w of banned) if (text.includes(w)) errors.push(`注意語「${w}」を含む: ${text.slice(Math.max(0, text.indexOf(w) - 20), text.indexOf(w) + 20).replace(/\n/g, " ")}`);
// 法務チェック（2026-11-24）で決めた注意書き。購入前に見える部分（有料ラインより上）に置く
const PAIDLINE_MARK = "<!-- ここに note の有料ライン -->";
const freePart = text.split(PAIDLINE_MARK)[0];
if (!text.includes(PAIDLINE_MARK)) errors.push("有料ラインの印がない");
for (const w of ["娯楽と自己理解のための参考情報", "AIを活用して作成しています", "保護者の方の同意", "キャンセル・返金はできません"]) if (!freePart.includes(w)) errors.push(`購入前の注意書き「${w}」が有料ラインより上にない`);
if (!text.includes("専門家の助言を優先")) errors.push("3章末の注意書き「専門家の助言を優先」がない");
const out = file.replace(/\.md$/, ".full.md");
writeFileSync(out, text);
const [free, paid] = text.split("<!-- ここに note の有料ライン -->");
console.log(`${out}\n文字数: 全体 ${text.length}／無料部分 ${free.length}／有料部分 ${paid?.length ?? 0}`);
console.log(errors.length ? "要確認:\n- " + errors.join("\n- ") : "チェックOK（月の流れ・勝負の月・注意語）");
