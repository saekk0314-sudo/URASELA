import { calculateYearFortune } from "/home/user/URASELA/src/engine.js";
import { YEAR_THEMES } from "/home/user/URASELA/src/data.js";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("/home/user/URASELA/package.json");
const { chromium } = require("playwright");
const F = process.argv[2], OUT = process.argv[3];
const root = x => { while (x > 9) x = String(x).split("").reduce((a, b) => a + +b, 0); return x; };
const months = n => { const p = [], r = []; for (let m = 1; m <= 12; m++) { const x = root(n + m); if (x === 1 || x === 8) p.push(m); if (x === 7 || x === 9) r.push(m); } return { p, r }; };
const lines = {1:"小さく始めたことが、この先の数年を形づくる",2:"誰かと組むほど、道が開ける",3:"好きなものを外に出すほど、人とチャンスが集まる",4:"続けたことが、後半の伸びを決める",5:"環境が変わるタイミングを、味方にできる",6:"手をかけるほど、居場所が強くなる",7:"立ち止まって考えるほど、答えが見つかる",8:"積み重ねが、評価や収入の形になりやすい",9:"手放すほど、次の9年の余白が生まれる"};
const css = `<link rel="stylesheet" href="node_modules/@fontsource/cormorant-garamond/600.css"><link rel="stylesheet" href="node_modules/@fontsource/noto-serif-jp/400.css"><link rel="stylesheet" href="node_modules/@fontsource/noto-serif-jp/500.css">
<style>body{margin:0}#c{position:relative;overflow:hidden;background:#140818;font-family:"Noto Serif JP",serif;color:#F5EBDD}
.l{position:absolute;left:0;top:0;bottom:0;width:50%;background:radial-gradient(ellipse at 40% 20%,#FFF6E6 0%,#EED9BA 50%,#B8966E 100%)}
.r{position:absolute;right:0;top:0;bottom:0;width:50%;background:radial-gradient(ellipse at 60% 20%,#45245C 0%,#22102D 60%,#0E0612 100%)}
.sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,6,18,.05) 0%,rgba(14,6,18,.55) 32%,rgba(14,6,18,.9) 60%,#0E0612 100%)}
.seam{position:absolute;left:calc(50% - 1px);top:0;width:2px;height:42%;background:linear-gradient(#FFF3D8,rgba(232,199,245,0))}
.star{position:absolute;left:50%;top:6%;transform:translate(-50%,-50%);width:70px;height:70px;background:radial-gradient(circle,#FFF8E6 0 12%,rgba(255,243,214,.5) 13%,transparent 45%)}
.box{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px}
.k{font-weight:500;letter-spacing:4px;background:linear-gradient(90deg,#F3D9A2 0%,#EBCB92 45%,#E9C9F2 55%,#D7AEF2 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 8px rgba(0,0,0,.5))}
.lab{color:#E7D7C0;letter-spacing:6px}.sub{color:#F5EBDD}.mo{color:#E6D3F7;border:1px solid rgba(214,174,242,.7);border-radius:40px;background:rgba(24,7,26,.5)}
.logo{position:absolute;bottom:26px;left:0;right:0;text-align:center;font:600 30px/1 "Cormorant Garamond",serif;letter-spacing:6px;color:#E7C98F}
.chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:1000px}.chips span{border:1px solid rgba(231,201,143,.6);border-radius:30px;padding:6px 16px;font-size:24px;color:#F1E3C8}</style>`;
const frame = (w, h, inner, logo = "URASELA ｜ urasela.pages.dev") => `<!DOCTYPE html><html><head><meta charset="utf-8">${css}</head><body><div id="c" style="width:${w}px;height:${h}px"><div class="l"></div><div class="r"></div><div class="sh"></div><div class="seam"></div><div class="star"></div><div class="box">${inner}</div><div class="logo">${logo}</div></div></body></html>`;
const jobs = [];
// note 見出し画像（1280×670）
for (let n = 1; n <= 9; n++) { const kw = YEAR_THEMES[n].keyword, { p, r } = months(n);
  jobs.push([`note/${String(n).padStart(2,"0")}-${kw}.png`, 1280, 670, frame(1280, 670, `<div class="lab" style="font-size:28px;margin-bottom:22px">2027年 表と裏の運勢 完全版</div><div class="k" style="font-size:92px;line-height:1.1">表が「${kw}」の人へ</div><div class="sub" style="font-size:30px;margin:22px 0 26px">${lines[n]}1年</div><div class="mo" style="font-size:28px;padding:10px 30px">勝負の月 ${p.join("・")}月　／　休む月 ${r.join("・")}月</div>`)]); }
const chips = Array.from({ length: 9 }, (_, i) => `<span>${YEAR_THEMES[i + 1].keyword}</span>`).join("");
jobs.push(["note/00-magazine.png", 1280, 670, frame(1280, 670, `<div class="lab" style="font-size:28px;margin-bottom:18px">表のキーワード別・全9タイプ</div><div class="k" style="font-size:84px;line-height:1.15">2027年 表と裏の運勢<br>完全版</div><div class="chips" style="margin-top:28px">${chips}</div>`)]);
jobs.push(["note/00-hayami.png", 1280, 670, frame(1280, 670, `<div class="lab" style="font-size:28px;margin-bottom:18px">無料で読める</div><div class="k" style="font-size:80px;line-height:1.15">2027年 表と裏の運勢<br>9タイプ早見表</div><div class="chips" style="margin-top:28px">${chips}</div>`)]);
// X 投稿画像（1200×675）
for (let n = 1; n <= 9; n++) { const kw = YEAR_THEMES[n].keyword, { p, r } = months(n);
  jobs.push([`x/omote-${n}-${kw}.png`, 1200, 675, frame(1200, 675, `<div class="lab" style="font-size:26px;margin-bottom:18px">#2027年の裏運勢</div><div class="k" style="font-size:96px;line-height:1.1">表が「${kw}」の人</div><div class="sub" style="font-size:32px;margin:20px 0 24px">${lines[n]}1年</div><div class="mo" style="font-size:30px;padding:10px 30px">勝負の月 ${p.join("・")}月　／　休む月 ${r.join("・")}月</div>`, "あなたの<span style=\"font-family:'Noto Serif JP';font-weight:500;letter-spacing:2px\">2027</span>年の表と裏は？ 生年月日だけで無料 ｜ URASELA")]); }
const seen = new Map(); for (let y = 1960; y <= 1968; y++) { const f = calculateYearFortune({ birthdate: `${y}-06-15` }); seen.set(f.mainStar, f); }
["一白水星","二黒土星","三碧木星","四緑木星","五黄土星","六白金星","七赤金星","八白土星","九紫火星"].forEach((star, i) => { const f = seen.get(star);
  jobs.push([`x/ura-${i + 1}-${star}.png`, 1200, 675, frame(1200, 675, `<div class="lab" style="font-size:26px;margin-bottom:18px">#2027年の裏運勢　裏のテーマ</div><div class="k" style="font-size:92px;line-height:1.1">${star}の人</div><div class="sub" style="font-size:34px;margin:20px 0 12px">${f.palace}・${f.flowLabel}　心の奥のキーワード「${f.inner.keyword}」</div><div class="sub" style="font-size:28px;opacity:.85;margin-bottom:8px">${f.flowCopy}</div>`, "あなたの本命星は？ 生年月日だけで無料診断 ｜ URASELA")]); });
jobs.push(["x/launch.png", 1200, 675, frame(1200, 675, `<div class="lab" style="font-size:28px;margin-bottom:18px">公開しました</div><div class="k" style="font-size:96px;line-height:1.15">2027年の<br>表と裏の運勢</div><div class="mo" style="font-size:30px;padding:10px 30px;margin-top:26px">生年月日を入れるだけ・無料・登録不要</div>`)]);
jobs.push(["x/paid.png", 1200, 675, frame(1200, 675, `<div class="lab" style="font-size:28px;margin-bottom:18px">noteで販売中（有料・各480円）</div><div class="k" style="font-size:88px;line-height:1.15">2027年 表と裏の運勢<br>完全版</div><div class="sub" style="font-size:30px;margin-top:22px">表のキーワード別・全9本｜12ヶ月の流れ・恋愛・仕事・お金</div>`)]);
const b = await chromium.launch(); const pg = await b.newPage({ deviceScaleFactor: 1 });
await pg.route("http://local.test/**", r => r.fulfill({ path: path.join(F, decodeURIComponent(new URL(r.request().url()).pathname)) }));
const only = process.argv[4];
for (const [file, w, h, html] of jobs) {
  if (only && !file.includes(only)) continue;
  await pg.setViewportSize({ width: w, height: h });
  await pg.route("http://local.test/page.html", r => r.fulfill({ body: html, contentType: "text/html; charset=utf-8" }));
  await pg.goto("http://local.test/page.html"); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(150);
  await pg.locator("#c").screenshot({ path: path.join(OUT, file) });
  await pg.unroute("http://local.test/page.html");
}
await b.close(); console.log("images:", jobs.length);
