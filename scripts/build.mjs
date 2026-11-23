import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CHARACTERS, FAQ, FORTUNE_METHODS } from "../src/data.js";
import { FORTUNE_YEAR } from "../src/engine.js";
import { LEGAL_PAGES } from "./content.mjs";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");

const defaultAdsensePublisherId = "pub-9548970580748049";

const required = [
  "index.html",
  "config.js",
  "sitemap.xml",
  "src/app.js",
  "src/analytics.js",
  "src/ads.js",
  "src/engine.js",
  "src/data.js",
  "src/styles.css",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/apple-touch-icon.png"
];

for (const file of required) {
  const info = await stat(resolve(root, file));

  if (!info.isFile() || info.size === 0) {
    throw new Error(`Required file is missing or empty: ${file}`);
  }
}

function configured(name, pattern) {
  const value = String(process.env[name] || "").trim();

  if (value && !pattern.test(value)) {
    throw new Error(`${name} has an invalid format`);
  }

  return value;
}

function siteOrigin() {
  const candidate = String(
    process.env.SITE_URL || "https://urasela.pages.dev"
  )
    .trim()
    .replace(/\/$/, "");

  const parsed = new URL(candidate);

  if (
    parsed.protocol !== "https:" ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "SITE_URL must be an HTTPS origin without a path, query, or hash"
    );
  }

  return candidate;
}

const siteUrl = siteOrigin();

const gaMeasurementId = configured(
  "GA_MEASUREMENT_ID",
  /^G-[A-Z0-9]+$/
);

const adsenseClientId = configured(
  "ADSENSE_CLIENT_ID",
  /^ca-pub-\d+$/
);

const adsensePublisherId =
  configured("ADSENSE_PUBLISHER_ID", /^pub-\d+$/) ||
  defaultAdsensePublisherId;

const adSlots = {
  homeBottom: configured("ADSENSE_SLOT_HOME_BOTTOM", /^\d+$/),
  postQuestions: configured("ADSENSE_SLOT_POST_QUESTIONS", /^\d+$/),
  divinations: configured("ADSENSE_SLOT_DIVINATIONS", /^\d+$/),
  resultMiddle: configured("ADSENSE_SLOT_RESULT_MIDDLE", /^\d+$/),
  compatibilityBottom: configured(
    "ADSENSE_SLOT_COMPATIBILITY_BOTTOM",
    /^\d+$/
  )
};

// 有料コンテンツ・月額会員・アフィリエイト・法人窓口（未設定ならサイトに何も表示しない）
const httpsUrlPattern = /^https:\/\/[^\s"'<>]+$/;
const monetization = {
  yearReportUrl: configured("YEAR_REPORT_URL", httpsUrlPattern),
  plusUrl: configured("PLUS_URL", httpsUrlPattern),
  affiliate: {
    url: configured("AFFILIATE_URL", httpsUrlPattern),
    title: configured("AFFILIATE_TITLE", /^[^<>"]{1,80}$/),
    text: configured("AFFILIATE_TEXT", /^[^<>"]{1,160}$/)
  }
};
const studioContactUrl = configured(
  "STUDIO_CONTACT_URL",
  /^(https:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+)$/
);

const escapeHtml = value =>
  String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);

const jsonLd = value =>
  JSON.stringify(value).replace(/</g, "\\u003c");

const canonical = path => {
  const cleanedPath = String(path || "")
    .replace(/^\/+|\/+$/g, "");

  return cleanedPath
    ? `${siteUrl}/${cleanedPath}/`
    : `${siteUrl}/`;
};

function pageHead({
  title,
  description,
  path = "",
  base = "./",
  schema,
  robots = "index,follow,max-image-preview:large",
  includeCanonical = true
}) {
  const url = canonical(path);

  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0d1026">
  <meta name="application-name" content="URASELA">
  <meta name="apple-mobile-web-app-title" content="URASELA">
  <meta name="robots" content="${robots}">
  <meta name="description" content="${escapeHtml(description)}">

  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ja_JP">
  <meta property="og:site_name" content="URASELA">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${siteUrl}/assets/generated/og-urasela.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="URASELA 表と裏、2人のあなたを読む">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${siteUrl}/assets/generated/og-urasela.jpg">

  ${includeCanonical ? `<link rel="canonical" href="${url}">` : ""}
  <base href="${base}">

  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="assets/icon.svg" type="image/svg+xml">
  <link rel="icon" href="assets/icon-192.png" sizes="192x192" type="image/png">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png" sizes="180x180">
  <link rel="stylesheet" href="src/styles.css">

  ${
    schema
      ? `<script type="application/ld+json">${jsonLd(schema)}</script>`
      : ""
  }

  <title>${escapeHtml(title)}</title>`;
}

function brandLink() {
  return `<a class="brand" href="./" aria-label="URASELA トップへ">
    <span class="brand-star" aria-hidden="true">✦</span>
    <span>
      <b>URASELA</b>
      <small>ウラセラ</small>
    </span>
  </a>`;
}

function staticFooter() {
  return `<footer class="footer legal-footer">
    <div>
      ${brandLink()}
      <p>
        表のあなたと裏のあなた。<br>
        まだ知らない自分に出会う占い。
      </p>
    </div>

    <nav aria-label="フッターナビゲーション">
      <a href="${FORTUNE_YEAR}/">${FORTUNE_YEAR}年の運勢</a>
      <a href="studio/">法人・クリエイターの方へ</a>
      <a href="about/">URASELAについて</a>
      <a href="privacy/">プライバシーポリシー</a>
      <a href="disclaimer/">免責事項</a>
      <a href="contact/">お問い合わせ</a>
      <a href="terms/">利用規約</a>
    </nav>

    <small>
      © 2026 URASELA. 結果は自己理解を楽しむためのものです。
    </small>
  </footer>`;
}

function portrait(character, className = "") {
  const index = character.id - 1;

  return `<span
    class="character-portrait ${className}"
    style="--col:${index % 4};--row:${Math.floor(index / 4)}"
    role="img"
    aria-label="${escapeHtml(character.name)}のキャラクター"
  >
    <img
      src="assets/generated/characters-sheet.webp"
      alt=""
      width="1254"
      height="1254"
      loading="lazy"
      decoding="async"
    >
  </span>`;
}

function homeFooter() {
  return `<footer class="footer">
    <div>
      ${brandLink()}
      <p>表のあなたと裏のあなた。<br>まだ知らない自分に出会う占い。</p>
    </div>
    <nav aria-label="フッターナビゲーション">
      <a href="./">TOP</a>
      <a href="characters/">キャラ一覧</a>
      <a href="compatibility/">相性チェック</a>
      <a href="${FORTUNE_YEAR}/">${FORTUNE_YEAR}年の運勢</a>
      <a href="#flow">診断の流れ</a>
      <a href="#faq">よくある質問</a>
      <a href="studio/">法人・クリエイターの方へ</a>
      <a href="about/">URASELAについて</a>
      <a href="privacy/">プライバシーポリシー</a>
      <a href="disclaimer/">免責事項</a>
      <a href="contact/">お問い合わせ</a>
      <a href="terms/">利用規約</a>
    </nav>
    <small>© 2026 URASELA. 結果は娯楽・自己理解のための参考情報です。</small>
  </footer>`;
}

function homeMarkup() {
  const sampleA = CHARACTERS[0];
  const sampleB = CHARACTERS[1];
  const methods = FORTUNE_METHODS.map(item => `
    <article class="method-card">
      <span>${escapeHtml(item.icon)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.lead)}</p>
    </article>`).join("");
  const faq = FAQ.map(([question, answer], index) => `
    <details class="faq-item" ${index === 0 ? "open" : ""}>
      <summary>${escapeHtml(question)}<span>＋</span></summary>
      <p>${escapeHtml(answer)}</p>
    </details>`).join("");

  const content = `<section class="hero" aria-labelledby="hero-title">
      <img class="hero__art" src="assets/generated/hero-urasela.webp" alt="紫の月を背負う表キャラと青い月を背負う裏キャラ" width="2048" height="1152" fetchpriority="high" decoding="async">
      <div class="hero__shade"></div>
      <div class="hero__content">
        <p class="eyebrow">表だけじゃ、あなたはわからない。</p>
        <h1 id="hero-title">あなたは、まだ<br><strong>自分の「裏」</strong>を<br>知らない。</h1>
        <p class="hero__lead">5つの占術 × 24の深層質問から<br>表キャラと裏キャラを導き出す</p>
        <p class="formula"><b>16</b> TYPE <span>×</span> <b>16</b> TYPE<br><em>= 256 PATTERNS</em></p>
        <button class="cta cta--hero" data-action="start">無料でウラセラする <span>→</span></button>
        <small>登録不要・完全無料・約3分で完了</small>
      </div>
      <div class="hero__label hero__label--surface"><b>表キャラ</b><span>外に見せるあなた</span></div>
      <div class="hero__label hero__label--inner"><b>裏キャラ</b><span>心の奥にいるあなた</span></div>
    </section>
    <section class="season-banner" aria-labelledby="season-title">
      <div class="season-banner__body">
        <p class="section-kicker">NEW ・ ${FORTUNE_YEAR} FORTUNE</p>
        <h2 id="season-title">${FORTUNE_YEAR}年の「表と裏の運勢」</h2>
        <p>生年月日だけで、あなたの${FORTUNE_YEAR}年のテーマと勝負の月がわかる。診断済みなら、表キャラ×裏キャラも重ねて読みます。</p>
      </div>
      <a class="cta" href="${FORTUNE_YEAR}/">${FORTUNE_YEAR}年の運勢を見る <span>→</span></a>
    </section>
    <section class="section methods" aria-labelledby="methods-title">
      <p class="section-kicker">WHY URASELA</p>
      <h2 id="methods-title">なぜ、あなたの表と裏がわかるの？</h2>
      <div class="method-grid">${methods}</div>
    </section>
    <section class="section flow" id="flow" aria-labelledby="flow-title">
      <p class="section-kicker">3 STEPS</p>
      <h2 id="flow-title">ウラセラの診断フロー</h2>
      <div class="flow-grid">
        <article><small>STEP 01</small><b>24の質問に答える</b><p>お金・恋愛・成功欲・嫉妬などから、本音と価値観を深掘り。</p><span class="flow-visual">A<br>B<br>C</span></article>
        <article><small>STEP 02</small><b>5つの占術で分析</b><p>生まれ持った資質と、現在のあなたを実計算してクロス解析。</p><span class="flow-visual flow-visual--orbit">✦</span></article>
        <article><small>STEP 03</small><b>表 × 裏が判明</b><p>256通りの組み合わせから、あなただけの結果を届けます。</p><span class="flow-visual flow-visual--pair">☾ × ✦</span></article>
      </div>
    </section>
    <section class="section result-preview" aria-labelledby="preview-title">
      <p class="section-kicker">YOUR URASELA</p>
      <h2 id="preview-title">診断結果のイメージ</h2>
      <div class="preview-grid">
        <div class="sample-pair">
          <article>${portrait(sampleA)}<small>表キャラ</small><h3>${escapeHtml(sampleA.name)}</h3><p>${escapeHtml(sampleA.catch)}</p></article>
          <span class="sample-pair__x">×</span>
          <article>${portrait(sampleB)}<small>裏キャラ</small><h3>${escapeHtml(sampleB.name)}</h3><p>${escapeHtml(sampleB.catch)}</p></article>
        </div>
        <article class="sample-score"><small>TYPE 01 × TYPE 02</small><p>総合運勢</p><b>87<em>%</em></b><div><span style="--value:90%">恋愛運</span><span style="--value:82%">仕事運</span><span style="--value:85%">人間関係</span></div></article>
        <article class="sample-compat"><h3>あの人との相性もチェック！</h3><p>恋愛・友達・仕事。表と裏の4つの視点から2人を分析。</p><a class="cta cta--small" href="compatibility/">相性チェックへ →</a><span aria-hidden="true">♡</span></article>
      </div>
    </section>
    <section class="section characters-teaser" aria-labelledby="teaser-title">
      <p class="section-kicker">16 TYPES</p>
      <h2 id="teaser-title">あなたの中にいる16人</h2>
      <div class="mini-character-row">${CHARACTERS.slice(0, 8).map(character => `
        <a href="characters/${character.slug}/">
          ${portrait(character)}
          <b>${escapeHtml(character.name)}</b>
        </a>`).join("")}</div>
      <a class="text-link" href="characters/">16キャラをすべて見る →</a>
    </section>
    <section class="section faq" id="faq" aria-labelledby="faq-title">
      <p class="section-kicker">FAQ</p>
      <h2 id="faq-title">よくある質問</h2>
      <div class="faq-list">${faq}</div>
    </section>
    <section class="final-cta">
      <p>あなたの中には、まだ出会っていないあなたがいる。</p>
      <h2>表と裏、2人のあなたを読もう。</h2>
      <button class="cta" data-action="start">今すぐ無料で診断する →</button>
    </section>
    ${homeFooter()}`;

  return `<div class="site site--dark">
    <header class="site-header">
      ${brandLink()}
      <nav class="desktop-nav" aria-label="メインナビゲーション">
        <a href="./">TOP</a>
        <a href="characters/">キャラ一覧</a>
        <a href="compatibility/">相性チェック</a>
        <a class="nav-season" href="${FORTUNE_YEAR}/">${FORTUNE_YEAR}年運勢<i>NEW</i></a>
        <a href="#faq">よくある質問</a>
        <button class="nav-cta" data-action="start">今すぐ無料で診断する</button>
      </nav>
    </header>
    <main id="main">${content}</main>
    <nav class="mobile-nav" aria-label="モバイルナビゲーション">
      <a href="./"><span>✦</span>TOP</a>
      <a href="characters/"><span>▤</span>キャラ</a>
      <button class="mobile-nav__main" data-action="start"><span>◇</span>診断</button>
      <a href="compatibility/"><span>♡</span>相性</a>
      <a href="${FORTUNE_YEAR}/"><span>✷</span>${FORTUNE_YEAR}</a>
    </nav>
  </div>`;
}

function notFoundDocument() {
  const title = "ページが見つかりません｜URASELA（ウラセラ）";
  const description = "お探しのページは移動または削除された可能性があります。URASELAのトップページ、16タイプ一覧、相性診断をご利用ください。";
  const content = `<div class="site site--dark">
    <header class="site-header">${brandLink()}</header>
    <main id="main" class="legal-page">
      <p class="section-kicker">404 NOT FOUND</p>
      <h1>ページが見つかりません</h1>
      <p class="legal-lead">URLをご確認いただくか、トップページからお進みください。</p>
      <div class="legal-content"><section><h2>こちらから探せます</h2><p><a class="text-link" href="./">URASELAトップへ →</a></p><p><a class="text-link" href="characters/">16タイプ一覧へ →</a></p><p><a class="text-link" href="compatibility/">相性診断へ →</a></p></section></div>
    </main>
    ${staticFooter()}
  </div>`;

  return `<!doctype html>
<html lang="ja">
<head>
${pageHead({
  title,
  description,
  base: `${siteUrl}/`,
  robots: "noindex,follow",
  includeCanonical: false
})}
</head>
<body>
  <a class="skip-link" href="#main">本文へ移動</a>
  ${content}
</body>
</html>`;
}

function appDocument({
  title,
  description,
  path,
  base,
  content,
  schema
}) {
  return `<!doctype html>
<html lang="ja">
<head>
${pageHead({
  title,
  description,
  path,
  base,
  schema
})}
</head>
<body>
  <a class="skip-link" href="#main">本文へ移動</a>
  <div id="app">${content}</div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>

  <script src="config.js"></script>
  <script type="module" src="src/app.js"></script>
</body>
</html>`;
}

function characterDocument(character) {
  const title =
    `${character.name}｜URASELA（ウラセラ）16タイプ診断`;

  const description =
    `${character.name}（${character.en}）の基本性格、` +
    `表に出た時、裏に出た時、恋愛、仕事、強み、弱みを紹介。` +
    `無料のURASELAで、あなたの表キャラ×裏キャラを確認できます。`;

  const sections = [
    ["表に出た時", character.surface],
    ["裏に出た時", character.inner],
    ["恋愛", character.love],
    ["仕事", character.work],
    ["お金", character.money],
    ["強み", character.strength],
    ["弱み", character.weakness],
    ["伸ばし方", character.growth]
  ];

  const content = `
  <div class="site site--dark">

    <header class="site-header">
      ${brandLink()}

      <nav class="desktop-nav">
        <a href="characters/">キャラ一覧</a>
        <a href="compatibility/">相性チェック</a>
        <a class="nav-cta" href="./">無料で診断する</a>
      </nav>
    </header>

    <main id="main">

      <section class="character-detail">

        <a class="back-button" href="characters/">
          ← キャラ一覧
        </a>

        <div class="character-detail__hero">

          ${portrait(character, "character-portrait--detail")}

          <div>
            <small>
              TYPE ${String(character.id).padStart(2, "0")}
            </small>

            <h1>${escapeHtml(character.name)}</h1>

            <em>${escapeHtml(character.en)}</em>

            <b>${escapeHtml(character.catch)}</b>

            <div class="tag-row">
              ${character.tags
                .map(tag => `<span>#${escapeHtml(tag)}</span>`)
                .join("")}
            </div>
          </div>

        </div>

        <div class="character-detail__core">
          <h2>基本性格</h2>
          <p>${escapeHtml(character.core)}</p>
        </div>

        <div class="detail-grid">

          ${sections
            .map(
              ([heading, text]) => `
              <article>
                <h3>${heading}</h3>
                <p>${escapeHtml(text)}</p>
              </article>
            `
            )
            .join("")}

          <article>
            <h3>相性</h3>

            <p>
              同じタイプでも表と裏の組み合わせで相性は変わります。
              恋愛・友達・仕事の3つから、
              2人の表×裏を相性診断で確認できます。
            </p>

            <a class="text-link" href="compatibility/">
              相性を確認する →
            </a>
          </article>

        </div>

        <a class="cta cta--full" href="./">
          自分の表と裏を無料診断する →
        </a>

      </section>

    </main>

    ${staticFooter()}

  </div>`;

  return appDocument({
    title,
    description,
    path: `characters/${character.slug}`,
    base: "../../",
    content,

    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",

      name: character.name,

      url: canonical(
        `characters/${character.slug}`
      ),

      description,

      inLanguage: "ja",

      mainEntity: {
        "@type": "Thing",
        name: character.name,
        alternateName: character.en,
        description: character.core
      }
    }
  });
}

function charactersDocument() {
  const title =
    "URASELA（ウラセラ）16タイプ一覧｜表キャラ・裏キャラ";

  const description =
    "URASELA（ウラセラ）の16タイプを一覧で紹介。" +
    "各キャラクターの性格、表に出た場合、裏に出た場合、恋愛、仕事を読んで無料診断へ進めます。";

  const cards = CHARACTERS.map(character => `
    <a
      class="character-card"
      href="characters/${character.slug}/"
    >
      ${portrait(character)}

      <span>

        <small>
          TYPE ${String(character.id).padStart(2, "0")}
          ・
          ${escapeHtml(character.en)}
        </small>

        <h2>${escapeHtml(character.name)}</h2>

        <b>${escapeHtml(character.catch)}</b>

        <p>${escapeHtml(character.core)}</p>

        <em>詳しく見る →</em>

      </span>
    </a>
  `).join("");

  const content = `
  <div class="site site--dark">

    <header class="site-header">
      ${brandLink()}
    </header>

    <main id="main">

      <section class="directory-hero">

        <p class="section-kicker">
          16 TYPES
        </p>

        <h1>
          あなたの中にいる<br>
          16人のウラセラたち
        </h1>

        <p>
          同じキャラでも、
          表に出るか裏に出るかで意味は変わります。
        </p>

      </section>

      <section class="character-directory">
        <div class="character-grid">
          ${cards}
        </div>
      </section>

    </main>

    ${staticFooter()}

  </div>`;

  return appDocument({
    title,
    description,
    path: "characters",
    base: "../",
    content,

    schema: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",

      name: title,

      url: canonical("characters"),

      description,

      mainEntity: {
        "@type": "ItemList",

        numberOfItems: 16,

        itemListElement: CHARACTERS.map(
          (character, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: character.name,

            url: canonical(
              `characters/${character.slug}`
            )
          })
        )
      }
    }
  });
}

function compatibilityDocument() {
  const title =
    "無料の恋愛・友達・仕事相性診断｜URASELA（ウラセラ）";

  const description =
    "表キャラ×裏キャラ同士で、恋愛・友達・仕事の相性を無料診断。" +
    "相性％、惹かれ合うポイント、ズレるポイント、長続きのコツが分かります。";

  const content = `
  <div class="site site--dark">

    <header class="site-header">
      ${brandLink()}
    </header>

    <main id="main">

      <section class="compat-hero">

        <p class="section-kicker">
          CROSS COMPATIBILITY
        </p>

        <h1>
          2人の「表」と「裏」で<br>
          本当の相性を読む。
        </h1>

        <p>
          恋愛・友達・仕事。
          表と裏の4つの視点から相性を診断します。
        </p>

        <a class="cta" href="compatibility/">
          相性診断を開く →
        </a>

      </section>

    </main>

    ${staticFooter()}

  </div>`;

  return appDocument({
    title,
    description,
    path: "compatibility",
    base: "../",
    content,

    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",

      name: "URASELA 相性診断",

      url: canonical("compatibility"),

      applicationCategory:
        "LifestyleApplication",

      operatingSystem: "Any",

      isAccessibleForFree: true,

      description
    }
  });
}

function legalDocument(page) {
  const title =
    `${page.title}｜URASELA`;

  const content = `
  <div class="site site--dark">

    <header class="site-header">

      ${brandLink()}

      <nav class="desktop-nav">

        <a href="characters/">
          キャラ一覧
        </a>

        <a href="compatibility/">
          相性チェック
        </a>

        <a class="nav-cta" href="./">
          無料で診断する
        </a>

      </nav>

    </header>

    <main
      id="main"
      class="legal-page"
    >

      <p class="section-kicker">
        URASELA GUIDE
      </p>

      <h1>
        ${escapeHtml(page.title)}
      </h1>

      <p class="legal-lead">
        ${escapeHtml(page.lead)}
      </p>

      <div class="legal-content">

        ${page.sections
          .map(
            ([heading, paragraphs]) => `
            <section>

              <h2>
                ${escapeHtml(heading)}
              </h2>

              ${paragraphs
                .map(
                  paragraph =>
                    `<p>${escapeHtml(paragraph)}</p>`
                )
                .join("")}

            </section>
          `
          )
          .join("")}

      </div>

      ${
        page.cta
          ? `
        <a
          class="cta legal-cta"
          href="${escapeHtml(page.cta.href)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(page.cta.label)} →
        </a>
      `
          : ""
      }

      <p class="legal-updated">
        制定・最終更新：${escapeHtml(page.updated || "2026年8月23日")}
      </p>

    </main>

    ${staticFooter()}

  </div>`;

  return `<!doctype html>
<html lang="ja">
<head>
${pageHead({
  title,
  description: page.description,
  path: page.slug,
  base: "../",

  schema: {
    "@context": "https://schema.org",
    "@type": "WebPage",

    name: page.title,

    url: canonical(page.slug),

    description: page.description,

    inLanguage: "ja"
  }
})}
</head>

<body>

<a
  class="skip-link"
  href="#main"
>
  本文へ移動
</a>

${content}

</body>
</html>`;
}

function yearDocument() {
  const title = `${FORTUNE_YEAR}年の運勢｜表と裏で読む無料占い｜URASELA（ウラセラ）`;
  const description =
    `生年月日を入れるだけで、${FORTUNE_YEAR}年の表のテーマ・裏のテーマ・月ごとのリズム・勝負の月がわかる無料占い。` +
    "数秘術と九星気学で読み、診断済みなら表キャラ×裏キャラも掛け合わせます。";
  const content = `
  <div class="site site--dark">
    <header class="site-header">${brandLink()}</header>
    <main id="main">
      <section class="year-hero">
        <p class="section-kicker">${FORTUNE_YEAR} FORTUNE</p>
        <h1>${FORTUNE_YEAR}年の<br><strong>表と裏</strong>の運勢</h1>
        <p class="year-hero__lead">九紫火星が中心にめぐる${FORTUNE_YEAR}年。あなたの表のテーマ、裏のテーマ、そして勝負の月を読みます。</p>
        <a class="cta" href="${FORTUNE_YEAR}/">${FORTUNE_YEAR}年の運勢を見る →</a>
      </section>
    </main>
    ${staticFooter()}
  </div>`;
  return appDocument({
    title,
    description,
    path: String(FORTUNE_YEAR),
    base: "../",
    content,
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `URASELA ${FORTUNE_YEAR}年の表と裏の運勢`,
      url: canonical(String(FORTUNE_YEAR)),
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      description
    }
  });
}

const STUDIO_PLANS = [
  ["モニター（先着3件）", "30,000円", "ライト相当。完成した診断を制作事例として紹介させていただくことが条件です", "7日"],
  ["ライト", "50,000円", "8タイプ・質問10問前後・テンプレートデザイン・結果のシェア画像", "7日"],
  ["スタンダード", "150,000円", "16タイプ・オリジナルの質問とキャラクター設計・オリジナルデザイン・シェア画像・計測設定", "14日"],
  ["プレミアム", "300,000円〜", "占術ロジック・世界観設計・キャンペーン設計・LINE登録への導線・相性診断", "21日"],
  ["保守運用", "月20,000円", "設置先の管理・月次の数字レポート・軽微な文言修正・季節の更新", "毎月"]
];

function studioDocument() {
  const title = "診断コンテンツ制作 URASELA Studio｜法人・クリエイターの方へ";
  const description =
    "URASELAの診断エンジンで、お店・ブランド・活動専用のオリジナル診断コンテンツを制作します。" +
    "16タイプ診断・結果のシェア画像・計測まで。料金はライト5万円から、最短7日で公開。";
  const contactHref = studioContactUrl || "contact/";
  const contactAttrs = studioContactUrl.startsWith("https://") ? ' target="_blank" rel="noopener"' : "";
  const content = `
  <div class="site site--dark">
    <header class="site-header">
      ${brandLink()}
      <nav class="desktop-nav">
        <a href="characters/">キャラ一覧</a>
        <a href="${FORTUNE_YEAR}/">${FORTUNE_YEAR}年の運勢</a>
        <a class="nav-cta" href="${escapeHtml(contactHref)}"${contactAttrs}>制作を相談する</a>
      </nav>
    </header>
    <main id="main" class="studio-page">
      <section class="studio-hero">
        <p class="section-kicker">URASELA STUDIO</p>
        <h1>シェアしたくなる診断を、<br><strong>最短7日で。</strong></h1>
        <p class="studio-lead">5つの占術と24問で256通りを出す自己分析アプリ「URASELA」を自社で開発・運営しています。その仕組みで、あなたのお店・ブランド・活動専用の診断コンテンツを作ります。</p>
        <a class="cta" href="${escapeHtml(contactHref)}"${contactAttrs}>制作を相談する →</a>
      </section>
      <section class="studio-section">
        <h2>こんな方へ</h2>
        <div class="studio-grid">
          <article><h3>占い師・カウンセラー</h3><p>無料診断から、LINE登録や鑑定の予約へ自然につなげたい。</p></article>
          <article><h3>サロン・店舗</h3><p>「あなたに合うメニュー」がわかる診断で、来店前の迷いをなくしたい。</p></article>
          <article><h3>VTuber・配信者</h3><p>ファンと盛り上がれる「推しとの相性診断」を企画したい。</p></article>
          <article><h3>企業の採用・販促</h3><p>社風との相性や商品タイプの診断で、話題と接点をつくりたい。</p></article>
        </div>
      </section>
      <section class="studio-section">
        <h2>料金</h2>
        <div class="studio-plans">
          ${STUDIO_PLANS.map(([name, price, body, term]) => `
          <article class="studio-plan">
            <h3>${escapeHtml(name)}</h3>
            <b>${escapeHtml(price)}</b>
            <p>${escapeHtml(body)}</p>
            <small>納期・期間 ${escapeHtml(term)}</small>
          </article>`).join("")}
        </div>
        <p class="studio-note">価格は税込・総額です。イラストはお客様のご支給、または人のイラストレーターへの外注（実費）で対応します。</p>
      </section>
      <section class="studio-section">
        <h2>進め方</h2>
        <ol class="studio-steps">
          <li><b>ヒアリング</b><span>目的・対象・公開日をシートでうかがいます（10分ほど）。</span></li>
          <li><b>企画のご提案</b><span>タイプの設計・質問の切り口・結果の見せ方をご提案します。</span></li>
          <li><b>制作</b><span>質問・結果文・デザイン・シェア画像・計測を制作します。</span></li>
          <li><b>確認・修正</b><span>プランに応じた回数まで修正します。</span></li>
          <li><b>公開・納品</b><span>お客様のサイトへの設置、または設置代行で公開します。</span></li>
        </ol>
      </section>
      <section class="studio-section studio-honest">
        <h2>あらかじめお伝えしていること</h2>
        <ul>
          <li>企画・文章・プログラムの制作にAIを活用しています。そのぶん価格を抑え、納期を短くしています。</li>
          <li>拡散数・登録数・売上などの成果は保証できません。</li>
          <li>実在の人物・他社のキャラクターを使った診断、医療・投資など専門的な判断をうたう診断はお受けできません。</li>
        </ul>
      </section>
      <section class="final-cta">
        <p>あなたの診断を、話題の入口に。</p>
        <h2>まずは気軽にご相談ください。</h2>
        <a class="cta" href="${escapeHtml(contactHref)}"${contactAttrs}>制作を相談する →</a>
      </section>
    </main>
    ${staticFooter()}
  </div>`;
  return `<!doctype html>
<html lang="ja">
<head>
${pageHead({
  title,
  description,
  path: "studio",
  base: "../",
  schema: {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "URASELA Studio 診断コンテンツ制作",
    serviceType: "診断コンテンツ制作",
    provider: { "@type": "Organization", name: "URASELA", url: canonical("") },
    areaServed: "JP",
    url: canonical("studio"),
    description
  }
})}
</head>
<body>
<a class="skip-link" href="#main">本文へ移動</a>
${content}
</body>
</html>`;
}

async function writeOutput(path, content) {
  const target = resolve(output, path);

  await mkdir(
    dirname(target),
    { recursive: true }
  );

  await writeFile(
    target,
    content,
    "utf8"
  );
}

/* ==========================================================
   BUILD START
========================================================== */

await rm(
  output,
  {
    recursive: true,
    force: true
  }
);

await mkdir(
  output,
  {
    recursive: true
  }
);

/* ==========================================================
   COPY STATIC FILES
========================================================== */

for (const entry of [
  "index.html",
  "config.js",
  "sitemap.xml",
  "manifest.webmanifest",
  "sw.js",
  "src",
  "assets"
]) {
  await cp(
    resolve(root, entry),
    resolve(output, entry),
    {
      recursive: true
    }
  );
}

/* ==========================================================
   RUNTIME CONFIG
========================================================== */

const runtimeConfig = {
  siteUrl,
  gaMeasurementId,
  adsenseClientId,
  adsensePublisherId,
  adSlots,
  monetization
};

await writeOutput(
  "config.js",

  `window.URASELA_CONFIG = Object.freeze(${JSON.stringify(
    runtimeConfig,
    null,
    2
  )});\n`
);

/* ==========================================================
   HOME
========================================================== */

const indexTemplate = (
  await readFile(
    resolve(output, "index.html"),
    "utf8"
  )
).replaceAll(
  "https://urasela.pages.dev",
  siteUrl
);

const emptyAppRoot =
  '<div id="app" aria-live="polite"></div>';

if (!indexTemplate.includes(emptyAppRoot)) {
  throw new Error(
    "index.html app root was not found for home prerendering"
  );
}

const indexHtml = indexTemplate.replace(
  emptyAppRoot,
  `<div id="app" aria-live="polite">${homeMarkup()}</div>`
);

await writeOutput(
  "index.html",
  indexHtml
);

await writeOutput(
  "404.html",
  notFoundDocument()
);

/* ==========================================================
   CHARACTERS
========================================================== */

await writeOutput(
  "characters/index.html",
  charactersDocument()
);

for (const character of CHARACTERS) {
  await writeOutput(
    `characters/${character.slug}/index.html`,
    characterDocument(character)
  );
}

/* ==========================================================
   COMPATIBILITY
========================================================== */

await writeOutput(
  "compatibility/index.html",
  compatibilityDocument()
);

/* ==========================================================
   YEAR FORTUNE / STUDIO
========================================================== */

await writeOutput(
  `${FORTUNE_YEAR}/index.html`,
  yearDocument()
);

await writeOutput(
  "studio/index.html",
  studioDocument()
);

/* ==========================================================
   LEGAL / INFORMATION PAGES
========================================================== */

for (const page of LEGAL_PAGES) {
  await writeOutput(
    `${page.slug}/index.html`,
    legalDocument(page)
  );
}

/* ==========================================================
   ROBOTS
========================================================== */

const robotsTxt = [
  "User-agent: *",
  "Allow: /",
  "",
  `Sitemap: ${siteUrl}/sitemap.xml`,
  ""
].join("\n");

await writeOutput(
  "robots.txt",
  robotsTxt
);

/* ==========================================================
   ADS.TXT
========================================================== */

await writeOutput(
  "ads.txt",

  adsensePublisherId
    ? `google.com, ${adsensePublisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# Ad inventory is not enabled yet.\n"
);

/* ==========================================================
   CLOUDFLARE HEADERS
========================================================== */

const headersFile = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()

/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  Cache-Control: no-cache, no-store, must-revalidate

/robots.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: no-cache

/ads.txt
  Content-Type: text/plain; charset=utf-8
`;

await writeOutput(
  "_headers",
  headersFile
);

/* ==========================================================
   BUILD COMPLETE
========================================================== */

console.log(
  `URASELA static build completed: dist/ (` +
  `analytics ${gaMeasurementId ? "configured" : "disabled"}, ` +
  `ads ${adsenseClientId ? "configured" : "disabled"})`
);
