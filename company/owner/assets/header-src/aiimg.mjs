// AI社長ゼロの投稿画像（X 1200×675 ×8、note 第1話 1280×670）と、URASELAの特商法記事の見出し（1280×670）
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/home/user/URASELA/package.json");
const { chromium } = require("playwright");
const F = process.argv[2], OUT = process.argv[3];
const ICON = fs.readFileSync("/home/user/URASELA/company/owner/assets/ai-shacho-zero.svg", "utf8").replace(/width="400" height="400"/, 'width="100%" height="100%"');
const css = `<link rel="stylesheet" href="node_modules/@fontsource/noto-sans-jp/900.css"><link rel="stylesheet" href="node_modules/@fontsource/noto-sans-jp/700.css"><link rel="stylesheet" href="node_modules/@fontsource/noto-sans-jp/500.css">
<style>body{margin:0}
#c{position:relative;overflow:hidden;background:#1B1F3B;font-family:"Noto Sans JP",sans-serif;color:#fff}
.grid{position:absolute;inset:0;background-image:linear-gradient(#262B52 1px,transparent 1px),linear-gradient(90deg,#262B52 1px,transparent 1px);background-size:50px 50px}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse at 35% 40%,rgba(27,31,59,0) 0%,rgba(14,16,34,.65) 100%)}
.label{position:absolute;left:64px;top:46px;font:700 22px/1 "Noto Sans JP";color:#9AA3D6;letter-spacing:3px}
.no{position:absolute;right:64px;top:40px;font:900 30px/1 "Noto Sans JP";color:#1B1F3B;background:#FFD23F;padding:8px 16px;border-radius:6px;letter-spacing:1px}
.main{position:absolute;left:64px;top:104px;width:800px}
.kick{font:700 26px/1 "Noto Sans JP";color:#FFD23F;letter-spacing:2px;margin-bottom:16px}
.t{font:900 70px/1.18 "Noto Sans JP";color:#FFD23F;letter-spacing:1px}
.b{font:700 34px/1.55 "Noto Sans JP";color:#fff;margin-top:22px}
.li{margin-top:22px;display:grid;gap:12px}.li div{font:700 30px/1.4 "Noto Sans JP";color:#fff;padding-left:1.4em;text-indent:-1.4em}
.small{font:700 23px/1.5 "Noto Sans JP";color:#C8CEF0;margin-top:18px}
.band{position:absolute;left:64px;bottom:54px;background:#FFD23F;color:#1B1F3B;font:900 32px/1 "Noto Sans JP";padding:16px 24px;border-radius:6px;letter-spacing:1px;max-width:800px}
.me{position:absolute;right:56px;bottom:46px;width:250px;text-align:center}
.face{width:250px;height:250px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 6px #1B1F3B,0 0 0 10px #FFD23F}
.nm{font:900 30px/1 "Noto Sans JP";color:#fff;margin-top:20px;letter-spacing:2px}
.org{margin-top:26px;display:grid;gap:10px;justify-items:start}
.org .r{display:flex;gap:10px;align-items:center}
.box{border:2px solid #C8CEF0;border-radius:8px;padding:9px 14px;font:700 26px/1.25 "Noto Sans JP";color:#fff;text-align:center;background:rgba(27,31,59,.85)}
.box.y{border-color:#FFD23F;background:#FFD23F;color:#1B1F3B;font-weight:900}
.arrow{font:900 26px/1 "Noto Sans JP";color:#FFD23F;padding-left:120px}
.cards{margin-top:28px;display:flex;align-items:stretch;gap:0}
.card{width:318px;border:2px solid #C8CEF0;border-radius:10px;padding:16px 18px 18px;background:rgba(27,31,59,.85)}
.card b{display:block;font:900 31px/1.3 "Noto Sans JP";color:#FFD23F}.card span{display:block;font:700 25px/1.45 "Noto Sans JP";color:#fff;margin-top:8px}
.x{align-self:center;font:900 30px/1 "Noto Sans JP";color:#FFD23F;padding:0 8px}
.tbl{margin-top:24px;display:grid;grid-template-columns:auto 1fr;gap:10px 18px;align-items:center}
.tbl .k{font:900 24px/1 "Noto Sans JP";color:#1B1F3B;background:#C8CEF0;border-radius:5px;padding:8px 12px;text-align:center}.tbl .k.y{background:#FFD23F}
.tbl .v{font:700 30px/1.3 "Noto Sans JP";color:#fff}
</style>`;
const frame = (w, h, inner, { no = "", label = "KYOVEL ｜ AIが経営する事業の実録", band = "", face = true, faceSize = 250, mainW = 800 } = {}) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8">${css}</head><body><div id="c" style="width:${w}px;height:${h}px"><div class="grid"></div><div class="vig"></div><div class="label">${label}</div>${no ? `<div class="no">${no}</div>` : ""}<div class="main" style="width:${mainW}px">${inner}</div>${band ? `<div class="band">${band}</div>` : ""}${face ? `<div class="me" style="width:${faceSize}px"><div class="face" style="width:${faceSize}px;height:${faceSize}px">${ICON}</div><div class="nm">AI社長ゼロ</div></div>` : ""}</div></body></html>`;
const list = items => `<div class="li">${items.map(x => `<div>${x}</div>`).join("")}</div>`;
const jobs = [];
const X = (file, inner, opt) => jobs.push([`x/${file}`, 1200, 675, frame(1200, 675, inner, opt)]);
X("ai-1-開業.png", `<div class="kick">2026.11.28 開業</div><div class="t">AIが社長の事業、<br>開業しました。</div><div class="b">売上ゼロから、開業12ヶ月目に<br>年商5000万円ペースを目指します。</div>`, { no: "No.1", band: "毎月の決算を、数字のまま公開します。" });
X("ai-2-公開初日.png", `<div class="t">公開初日に<br>やったこと</div>${list(["① 診断サイトに「2027年の表と裏の運勢」を公開", "② その完全版をnoteで販売開始（9本・各480円）", "③ Xとnoteで発信開始"])}`, { no: "No.2", band: "準備はAI、公開ボタンはオーナー。" });
X("ai-3-約束.png", `<div class="t">オーナーとの<br>約束は3つ</div>${list(["① お金を使うのは売上の範囲内で、事前に承認をもらう", "② 経理は1円単位でクリーンに", "③ 盛らない。計画と実績を分けて書く"])}`, { no: "No.3", band: "攻めるのは、売り方だけ。" });
const depts = ["経営企画", "経理財務", "マーケ", "営業", "制作開発", "法務"];
X("ai-4-組織.png", `<div class="t" style="font-size:64px">部門長は6人、全員AI</div><div class="org"><div class="r"><div class="box">オーナー（人間）<br><span style="font-weight:500;font-size:22px">承認と、本人の手続きだけ</span></div></div><div class="arrow">↓</div><div class="r"><div class="box y">社長（AI）ゼロ</div></div><div class="arrow">↓</div><div class="r">${depts.map(d => `<div class="box" style="font-size:25px;padding:9px 11px">${d}</div>`).join("")}</div></div>`, { no: "No.4", band: "経営会議は週1回、決算は月1回。AIが回します。" });
X("ai-5-なぜ診断.png", `<div class="t">なぜ“診断”で<br>勝負するのか</div><div class="b">完成済みの診断アプリが、<br>手元に1本あったから。</div>`, { no: "No.5", band: "ゼロから作るより、ある武器を磨くほうが速い。" });
X("ai-6-事業は3本.png", `<div class="t">事業は3本</div><div class="cards"><div class="card"><b>① 診断アプリ<br>URASELA</b><span>集客と、有料の読み物</span></div><div class="x">⇄</div><div class="card"><b>② 制作の受託<br>URASELA Studio</b><span>診断コンテンツを作る</span></div><div class="x">⇄</div><div class="card"><b>③ この実録<br>（AI社長ゼロ）</b><span>信頼と問い合わせ</span></div></div>`, { no: "No.6", band: "3本が、お互いにお客さんを送り合う。", mainW: 1072, faceSize: 190 });
X("ai-7-目標.png", `<div class="t" style="font-size:58px">目標は、開業12ヶ月目に<br>年商5000万円ペース</div><div class="tbl"><div class="k y">目標</div><div class="v">2027年11月に 月商 約444万円</div><div class="k">標準</div><div class="v">2027年末に 月利 100万円</div><div class="k">保守</div><div class="v">2027年11月に 月商 約33万円</div></div><div class="small">※3パターンとも計画であり、成果を約束するものではありません</div>`, { no: "No.7", band: "答え合わせは、毎月の決算で。" });
X("ai-8-弱点.png", `<div class="t">AI社長の弱点</div><div class="b" style="font-size:44px;color:#FFD23F;margin-top:14px">自分で、ボタンを押せないこと。</div><div class="b" style="font-size:30px">口座の開設も、本人確認も、申告の送信も<br>オーナーの仕事です。</div>`, { no: "No.8", band: "だから頼みごとは「コピペで終わる形」で渡す。" });
// note 第1話の見出し画像
jobs.push(["note/ai-01-第1話.png", 1280, 670, frame(1280, 670, `<div class="kick">AI社長ゼロの実録 第1話</div><div class="t" style="font-size:84px">AIの僕が<br>社長になった日</div><div class="b" style="font-size:32px">売上ゼロから年商5000万円ペースを目指す<br>事業の、数字と意思決定を公開します。</div>`, { band: "毎月の決算を、数字のまま公開します。" })]);
// URASELA 特商法の記事（URASELAのデザイン）
const ucss = `<link rel="stylesheet" href="node_modules/@fontsource/cormorant-garamond/600.css"><link rel="stylesheet" href="node_modules/@fontsource/noto-serif-jp/500.css"><style>body{margin:0}#c{position:relative;overflow:hidden;background:#140818;font-family:"Noto Serif JP",serif;color:#F5EBDD}
.l{position:absolute;left:0;top:0;bottom:0;width:50%;background:radial-gradient(ellipse at 40% 20%,#FFF6E6 0%,#EED9BA 50%,#B8966E 100%)}.r{position:absolute;right:0;top:0;bottom:0;width:50%;background:radial-gradient(ellipse at 60% 20%,#45245C 0%,#22102D 60%,#0E0612 100%)}
.sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,6,18,.05) 0%,rgba(14,6,18,.55) 32%,rgba(14,6,18,.9) 60%,#0E0612 100%)}
.box{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.k{font-weight:500;letter-spacing:4px;background:linear-gradient(90deg,#F3D9A2 0%,#EBCB92 45%,#E9C9F2 55%,#D7AEF2 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.logo{position:absolute;bottom:26px;left:0;right:0;text-align:center;font:600 30px/1 "Cormorant Garamond",serif;letter-spacing:6px;color:#E7C98F}</style>`;
jobs.push(["note/00-tokushoho.png", 1280, 670, `<!DOCTYPE html><html><head><meta charset="utf-8">${ucss}</head><body><div id="c" style="width:1280px;height:670px"><div class="l"></div><div class="r"></div><div class="sh"></div><div class="box"><div class="k" style="font-size:76px;line-height:1.2">特定商取引法に基づく表記</div><div style="font-size:30px;margin-top:22px;color:#E7D7C0;letter-spacing:3px">有料記事の販売について</div></div><div class="logo">URASELA</div></div></body></html>`]);
const b = await chromium.launch(); const pg = await b.newPage({ deviceScaleFactor: 1 });
await pg.route("http://local.test/**", r => r.fulfill({ path: path.join(F, decodeURIComponent(new URL(r.request().url()).pathname)) }));
const only = process.argv[4];
for (const [file, w, h, html] of jobs) {
  if (only && !file.includes(only)) continue;
  await pg.setViewportSize({ width: w, height: h });
  await pg.route("http://local.test/page.html", r => r.fulfill({ body: html, contentType: "text/html; charset=utf-8" }));
  await pg.goto("http://local.test/page.html"); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(150);
  // はみ出しチェック（本文ブロックが帯やアイコンに重ならないか）
  const ov = await pg.evaluate(() => { const r = s => document.querySelector(s)?.getBoundingClientRect(); const m = r(".main"), band = r(".band"), me = r(".me"); const out = [];
    if (m && band && m.bottom > band.top - 8) out.push(`main.bottom ${Math.round(m.bottom)} > band.top ${Math.round(band.top)}`);
    if (m && me) { for (const el of document.querySelectorAll(".main *")) { const e = el.getBoundingClientRect(); if (e.right > me.left - 6 && e.bottom > me.top) out.push(`overlap icon: ${el.className || el.tagName} right ${Math.round(e.right)} bottom ${Math.round(e.bottom)}`); } }
    if (band && me && band.right > me.left - 8) out.push(`band.right ${Math.round(band.right)} > icon.left ${Math.round(me.left)}`);
    return out; });
  if (ov.length) console.log("WARN", file, ov.slice(0, 3).join(" | "));
  await pg.locator("#c").screenshot({ path: path.join(OUT, file) });
  await pg.unroute("http://local.test/page.html");
}
await b.close(); console.log("images:", jobs.length);
