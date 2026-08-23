import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CHARACTERS } from "../src/data.js";
import { LEGAL_PAGES } from "./content.mjs";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");
const required = [
  "index.html", "config.js", "src/app.js", "src/analytics.js", "src/ads.js", "src/engine.js",
  "src/data.js", "src/styles.css", "manifest.webmanifest", "assets/icon.svg", "assets/icon-192.png",
  "assets/icon-512.png", "assets/apple-touch-icon.png"
];

for (const file of required) {
  const info = await stat(resolve(root, file));
  if (!info.isFile() || info.size === 0) throw new Error(`Required file is missing or empty: ${file}`);
}

function configured(name, pattern) {
  const value = String(process.env[name] || "").trim();
  if (value && !pattern.test(value)) throw new Error(`${name} has an invalid format`);
  return value;
}

function siteOrigin() {
  const candidate = String(process.env.SITE_URL || "https://urasela.pages.dev").trim().replace(/\/$/, "");
  const parsed = new URL(candidate);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("SITE_URL must be an HTTPS origin without a path, query, or hash");
  }
  return candidate;
}

const siteUrl = siteOrigin();
const gaMeasurementId = configured("GA_MEASUREMENT_ID", /^G-[A-Z0-9]+$/);
const adsenseClientId = configured("ADSENSE_CLIENT_ID", /^ca-pub-\d+$/);
const adsensePublisherId = configured("ADSENSE_PUBLISHER_ID", /^pub-\d+$/);
const adSlots = {
  homeBottom: configured("ADSENSE_SLOT_HOME_BOTTOM", /^\d+$/),
  postQuestions: configured("ADSENSE_SLOT_POST_QUESTIONS", /^\d+$/),
  divinations: configured("ADSENSE_SLOT_DIVINATIONS", /^\d+$/),
  resultMiddle: configured("ADSENSE_SLOT_RESULT_MIDDLE", /^\d+$/),
  compatibilityBottom: configured("ADSENSE_SLOT_COMPATIBILITY_BOTTOM", /^\d+$/)
};

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
})[character]);
const jsonLd = value => JSON.stringify(value).replace(/</g, "\\u003c");
const canonical = path => `${siteUrl}/${String(path || "").replace(/^\/+|\/+$/g, "")}${path ? "/" : ""}`;

function pageHead({ title, description, path = "", base = "./", schema }) {
  const url = canonical(path);
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0d1026">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ja_JP">
  <meta property="og:site_name" content="URASELA">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${siteUrl}/assets/generated/og-urasela.jpg">
  <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="URASELA 表と裏、2人のあなたを読む">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${siteUrl}/assets/generated/og-urasela.jpg">
  <link rel="canonical" href="${url}">
  <base href="${base}">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="assets/icon.svg" type="image/svg+xml">
  <link rel="icon" href="assets/icon-192.png" sizes="192x192" type="image/png">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png" sizes="180x180">
  <link rel="stylesheet" href="src/styles.css">
  ${schema ? `<script type="application/ld+json">${jsonLd(schema)}</script>` : ""}
  <title>${escapeHtml(title)}</title>`;
}

function brandLink() {
  return `<a class="brand" href="./" aria-label="URASELA トップへ"><span class="brand-star" aria-hidden="true">✦</span><span><b>URASELA</b><small>ウラセラ</small></span></a>`;
}

function staticFooter() {
  return `<footer class="footer legal-footer"><div>${brandLink()}<p>表のあなたと裏のあなた。<br>まだ知らない自分に出会う占い。</p></div><nav aria-label="フッターナビゲーション">
    <a href="about/">URASELAについて</a><a href="privacy/">プライバシーポリシー</a><a href="disclaimer/">免責事項</a><a href="contact/">お問い合わせ</a><a href="terms/">利用規約</a>
  </nav><small>© 2026 URASELA. 結果は自己理解を楽しむためのものです。</small></footer>`;
}

function portrait(character, className = "") {
  const index = character.id - 1;
  return `<span class="character-portrait ${className}" style="--col:${index % 4};--row:${Math.floor(index / 4)}" role="img" aria-label="${escapeHtml(character.name)}のキャラクター"><img src="assets/generated/characters-sheet.webp" alt="" width="1254" height="1254" loading="lazy" decoding="async"></span>`;
}

function appDocument({ title, description, path, base, content, schema }) {
  return `<!doctype html><html lang="ja"><head>${pageHead({ title, description, path, base, schema })}</head><body>
  <a class="skip-link" href="#main">本文へ移動</a><div id="app">${content}</div><div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script src="config.js"></script><script type="module" src="src/app.js"></script></body></html>`;
}

function characterDocument(character) {
  const title = `${character.name}｜URASELA 16タイプ性格診断`;
  const description = `${character.name}（${character.en}）の基本性格、表に出た時、裏に出た時、恋愛、仕事、強み、弱みを紹介。無料診断であなたの表キャラ×裏キャラを調べられます。`;
  const sections = [["表に出た時", character.surface], ["裏に出た時", character.inner], ["恋愛", character.love], ["仕事", character.work], ["お金", character.money], ["強み", character.strength], ["弱み", character.weakness], ["伸ばし方", character.growth]];
  const content = `<div class="site site--dark"><header class="site-header">${brandLink()}<nav class="desktop-nav"><a href="characters/">キャラ一覧</a><a href="compatibility/">相性チェック</a><a class="nav-cta" href="./">無料で診断する</a></nav></header><main id="main">
    <section class="character-detail"><a class="back-button" href="characters/">← キャラ一覧</a><div class="character-detail__hero">${portrait(character, "character-portrait--detail")}<div><small>TYPE ${String(character.id).padStart(2, "0")}</small><h1>${escapeHtml(character.name)}</h1><em>${escapeHtml(character.en)}</em><b>${escapeHtml(character.catch)}</b><div class="tag-row">${character.tags.map(tag => `<span>#${escapeHtml(tag)}</span>`).join("")}</div></div></div><div class="character-detail__core"><h2>基本性格</h2><p>${escapeHtml(character.core)}</p></div><div class="detail-grid">${sections.map(([heading, text]) => `<article><h3>${heading}</h3><p>${escapeHtml(text)}</p></article>`).join("")}<article><h3>相性</h3><p>同じタイプでも表と裏の組み合わせで相性は変わります。恋愛・友達・仕事の3つから、2人の表×裏を相性診断で確認できます。</p><a class="text-link" href="compatibility/">相性を確認する →</a></article></div><a class="cta cta--full" href="./">自分の表と裏を無料診断する →</a></section></main>${staticFooter()}</div>`;
  return appDocument({
    title, description, path: `characters/${character.slug}`, base: "../../", content,
    schema: { "@context": "https://schema.org", "@type": "WebPage", name: character.name, url: canonical(`characters/${character.slug}`), description, inLanguage: "ja", mainEntity: { "@type": "Thing", name: character.name, alternateName: character.en, description: character.core } }
  });
}

function charactersDocument() {
  const title = "URASELA 16タイプキャラクター一覧｜表キャラ・裏キャラ";
  const description = "URASELAの16タイプを一覧で紹介。各キャラクターの性格、表に出た場合、裏に出た場合、恋愛、仕事を読んで無料診断へ進めます。";
  const cards = CHARACTERS.map(character => `<a class="character-card" href="characters/${character.slug}/">${portrait(character)}<span><small>TYPE ${String(character.id).padStart(2, "0")}・${escapeHtml(character.en)}</small><h2>${escapeHtml(character.name)}</h2><b>${escapeHtml(character.catch)}</b><p>${escapeHtml(character.core)}</p><em>詳しく見る →</em></span></a>`).join("");
  const content = `<div class="site site--dark"><header class="site-header">${brandLink()}</header><main id="main"><section class="directory-hero"><p class="section-kicker">16 TYPES</p><h1>あなたの中にいる<br>16人のウラセラたち</h1><p>同じキャラでも、表に出るか裏に出るかで意味は変わります。</p></section><section class="character-directory"><div class="character-grid">${cards}</div></section></main>${staticFooter()}</div>`;
  return appDocument({
    title, description, path: "characters", base: "../", content,
    schema: { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: canonical("characters"), description, mainEntity: { "@type": "ItemList", numberOfItems: 16, itemListElement: CHARACTERS.map((character, index) => ({ "@type": "ListItem", position: index + 1, name: character.name, url: canonical(`characters/${character.slug}`) })) } }
  });
}

function compatibilityDocument() {
  const title = "無料の恋愛・友達・仕事相性診断｜URASELA";
  const description = "表キャラ×裏キャラ同士で、恋愛・友達・仕事の相性を無料診断。相性％、惹かれ合うポイント、ズレるポイント、長続きのコツが分かります。";
  const content = `<div class="site site--dark"><header class="site-header">${brandLink()}</header><main id="main"><section class="compat-hero"><p class="section-kicker">CROSS COMPATIBILITY</p><h1>2人の「表」と「裏」で<br>本当の相性を読む。</h1><p>恋愛・友達・仕事。表と裏の4つの視点から相性を診断します。</p><a class="cta" href="compatibility/">相性診断を開く →</a></section></main>${staticFooter()}</div>`;
  return appDocument({ title, description, path: "compatibility", base: "../", content, schema: { "@context": "https://schema.org", "@type": "WebApplication", name: "URASELA 相性診断", url: canonical("compatibility"), applicationCategory: "LifestyleApplication", operatingSystem: "Any", isAccessibleForFree: true, description } });
}

function legalDocument(page) {
  const title = `${page.title}｜URASELA`;
  const content = `<div class="site site--dark"><header class="site-header">${brandLink()}<nav class="desktop-nav"><a href="characters/">キャラ一覧</a><a href="compatibility/">相性チェック</a><a class="nav-cta" href="./">無料で診断する</a></nav></header><main id="main" class="legal-page"><p class="section-kicker">URASELA GUIDE</p><h1>${escapeHtml(page.title)}</h1><p class="legal-lead">${escapeHtml(page.lead)}</p><div class="legal-content">${page.sections.map(([heading, paragraphs]) => `<section><h2>${escapeHtml(heading)}</h2>${paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`).join("")}</div>${page.cta ? `<a class="cta legal-cta" href="${escapeHtml(page.cta.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.cta.label)} →</a>` : ""}<p class="legal-updated">制定・最終更新：2026年8月23日</p></main>${staticFooter()}</div>`;
  return `<!doctype html><html lang="ja"><head>${pageHead({ title, description: page.description, path: page.slug, base: "../", schema: { "@context": "https://schema.org", "@type": "WebPage", name: page.title, url: canonical(page.slug), description: page.description, inLanguage: "ja" } })}</head><body><a class="skip-link" href="#main">本文へ移動</a>${content}</body></html>`;
}

async function writeOutput(path, content) {
  const target = resolve(output, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ["index.html", "config.js", "manifest.webmanifest", "sw.js", "src", "assets"]) {
  await cp(resolve(root, entry), resolve(output, entry), { recursive: true });
}

const runtimeConfig = { siteUrl, gaMeasurementId, adsenseClientId, adsensePublisherId, adSlots };
await writeOutput("config.js", `window.URASELA_CONFIG = Object.freeze(${JSON.stringify(runtimeConfig, null, 2)});\n`);
const indexHtml = (await readFile(resolve(output, "index.html"), "utf8")).replaceAll("https://urasela.pages.dev", siteUrl);
await writeOutput("index.html", indexHtml);
await writeOutput("characters/index.html", charactersDocument());
for (const character of CHARACTERS) await writeOutput(`characters/${character.slug}/index.html`, characterDocument(character));
await writeOutput("compatibility/index.html", compatibilityDocument());
for (const page of LEGAL_PAGES) await writeOutput(`${page.slug}/index.html`, legalDocument(page));

const sitemapPaths = ["", "characters", ...CHARACTERS.map(character => `characters/${character.slug}`), "compatibility", ...LEGAL_PAGES.map(page => page.slug)];
const lastmod = new Date().toISOString().slice(0, 10);
await writeOutput("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPaths.map(path => `  <url><loc>${canonical(path)}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`);
await writeOutput("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeOutput("ads.txt", adsensePublisherId ? `google.com, ${adsensePublisherId}, DIRECT, f08c47fec0942fa0\n` : "# Ad inventory is not enabled yet.\n");
await writeOutput("_headers", `/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: SAMEORIGIN\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n\n/sitemap.xml\n  Content-Type: application/xml; charset=utf-8\n\n/robots.txt\n  Content-Type: text/plain; charset=utf-8\n\n/ads.txt\n  Content-Type: text/plain; charset=utf-8\n`);

console.log(`URASELA static build completed: dist/ (${sitemapPaths.length} indexable URLs, analytics ${gaMeasurementId ? "configured" : "disabled"}, ads ${adsenseClientId ? "configured" : "disabled"})`);
