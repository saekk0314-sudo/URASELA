import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LEGAL_PAGES } from "../scripts/content.mjs";

const source = path => readFile(new URL(path, import.meta.url), "utf8");

test("SEOの基本メタデータと構造化データを持つ", async () => {
  const html = await source("../index.html");
  for (const marker of [
    'rel="canonical"', 'property="og:title"', 'name="twitter:card"',
    'type="application/ld+json"', 'rel="manifest"', 'rel="apple-touch-icon"'
  ]) assert.ok(html.includes(marker), marker);
  assert.match(html, /<title>URASELA（ウラセラ）/);
  assert.match(html, /5つの占術×24問/);
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => JSON.parse(match[1]));
  }
  assert.ok(!html.includes("googletagmanager.com"));
  assert.ok(!html.includes("ca-pub-000"));
});

test("固定ページは審査・実運用に必要な5種類を満たす", () => {
  assert.deepEqual(LEGAL_PAGES.map(page => page.slug), ["about", "privacy", "disclaimer", "contact", "terms"]);
  const allText = JSON.stringify(LEGAL_PAGES);
  assert.match(allText, /医療/);
  assert.match(allText, /法律/);
  assert.match(allText, /金融/);
  assert.match(allText, /Google Analytics/);
  assert.match(allText, /Cookie/);
});

test("GA4と広告は空の設定が初期値で同意後だけ読み込む", async () => {
  const [config, analytics, ads] = await Promise.all([
    source("../config.js"), source("../src/analytics.js"), source("../src/ads.js")
  ]);
  assert.match(config, /gaMeasurementId:\s*""/);
  assert.match(config, /adsenseClientId:\s*""/);
  assert.match(analytics, /getConsent\(\)/);
  assert.match(analytics, /choice\?\.analytics/);
  assert.match(ads, /getConsent\(\)\?\.ads/);
});

test("診断から共有までのファネルイベントを実装する", async () => {
  const app = await source("../src/app.js");
  for (const event of [
    "diagnosis_start", "profile_start", "questions_start", "questions_complete",
    "analysis_progress", "cross_analysis_reached", "tarot_start", "tarot_complete",
    "divinations_complete", "fortune_reached", "result_view", "compatibility_use"
  ]) assert.ok(app.includes(`\"${event}\"`), event);
  assert.match(app, /trackShare\("web_share/);
  assert.match(app, /trackShare\("x"/);
  assert.match(app, /trackShare\("line"/);
});

test("ビルドはSEOファイルとキャラ個別ページを実ファイルとして生成する", async () => {
  const build = await source("../scripts/build.mjs");
  for (const output of ["sitemap.xml", "robots.txt", "ads.txt", "_headers", "404.html", "characters/${character.slug}/index.html"]) {
    assert.ok(build.includes(output), output);
  }
  assert.match(build, /homeMarkup\(\)/);
  assert.match(build, /noindex,follow/);
});

test("リニューアル: 年運ページ・Studioページ・有料導線は設定があるときだけ表示する", async () => {
  const [build, app, config, sitemap] = await Promise.all([
    source("../scripts/build.mjs"), source("../src/app.js"), source("../config.js"), source("../sitemap.xml")
  ]);
  assert.ok(build.includes("`${FORTUNE_YEAR}/index.html`"));
  assert.ok(build.includes('"studio/index.html"'));
  for (const name of ["YEAR_REPORT_URL", "PLUS_URL", "AFFILIATE_URL", "STUDIO_CONTACT_URL"]) assert.ok(build.includes(name), name);
  assert.match(config, /yearReportUrl:\s*""/);
  assert.match(config, /plusUrl:\s*""/);
  assert.match(app, /offerUrls\.yearReport && context === "year"/);
  assert.match(app, /rel="sponsored noopener"/);
  assert.match(app, /affiliate-card__badge">PR</);
  for (const event of ["year_fortune_view", "offer_click"]) assert.ok(app.includes(`"${event}"`), event);
  assert.match(sitemap, /\/2027\//);
  assert.match(sitemap, /\/studio\//);
});

test("料金の方針: 診断は無料のまま、有料コンテンツは任意と明記する", () => {
  const about = LEGAL_PAGES.find(page => page.slug === "about");
  const text = JSON.stringify(about);
  assert.match(text, /これからも無料/);
  assert.match(text, /任意の有料コンテンツ/);
  assert.match(text, /「広告」「PR」/);
});
