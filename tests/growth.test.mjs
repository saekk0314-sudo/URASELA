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
  for (const output of ["sitemap.xml", "robots.txt", "ads.txt", "_headers", "characters/${character.slug}/index.html"]) {
    assert.ok(build.includes(output), output);
  }
});
