import { CHARACTERS, FAQ, FORTUNE_METHODS, PREFECTURES, QUESTIONS, TAROT } from "./data.js";
import {
  analyzeProfile, calculateCompatibility, combinedTarotReading, decodeSharedResult,
  encodeSharedResult, shuffleTarot, tarotMessage
} from "./engine.js";
import { initPrivacyControls, trackEvent, trackScreen, trackShare } from "./analytics.js";
import { adSlot, hydrateAds } from "./ads.js";

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const runtimeConfig = window.URASELA_CONFIG || {};
const siteUrl = String(runtimeConfig.siteUrl || "https://urasela.pages.dev").replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);
const defaultProfile = {
  birthdate:"", gender:"回答しない", birthplace:"東京都", city:"", country:"", birthTimeKnown:false, birthtime:""
};

const state = {
  screen:"home", profile:{...defaultProfile}, answers:Array(24).fill(null), questionIndex:0,
  analysisPercent:0, tarotDeck:[], tarotStage:0, tarotCursor:0, tarotOffers:[], tarotReveal:null,
  tarotSelections:[], result:null, selectedCharacter:null, compatibilityResult:null,
  compatibilityForm:{ mode:"love", selfSurface:1, selfInner:2, partnerSurface:5, partnerInner:8 }
};

const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const pad = value => String(value).padStart(2, "0");
const qs = selector => document.querySelector(selector);
const characterUrl = character => `characters/${character.slug}/`;

function setPageMeta({ title, description, path = "" }) {
  const url = `${siteUrl}/${String(path).replace(/^\/+|\/+$/g, "")}${path ? "/" : ""}`;
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", url);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", description);
}

function afterRender(screenName) {
  trackScreen(screenName);
  requestAnimationFrame(() => {
    hydrateAds();
    observeFortuneCards();
  });
}

function observeFortuneCards() {
  const cards = [...document.querySelectorAll("[data-fortune-method]")];
  if (!cards.length) return;
  const markReached = card => {
    if (card.dataset.fortuneTracked === "true") return;
    card.dataset.fortuneTracked = "true";
    trackEvent("fortune_reached", { method: card.dataset.fortuneMethod });
  };
  if (!("IntersectionObserver" in window)) {
    cards.forEach(markReached);
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      markReached(entry.target);
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.35 });
  cards.forEach(card => observer.observe(card));
}

function appRootUrl(path = "") {
  return new URL(path, document.baseURI);
}

function updateRoute(path, { replace = false } = {}) {
  const target = appRootUrl(path);
  if (target.href === location.href) return;
  history[replace ? "replaceState" : "pushState"]({}, "", target);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function logo() {
  return `<a class="brand" href="./" data-action="home" aria-label="URASELA トップへ">
    <span class="brand-star" aria-hidden="true">✦</span><span><b>URASELA</b><small>ウラセラ</small></span>
  </a>`;
}

function shell(content, { dark=true, hideNav=false } = {}) {
  const hasLast = Boolean(localStorage.getItem("urasela:lastResult"));
  return `<div class="site ${dark ? "site--dark" : "site--light"}">
    <header class="site-header">${logo()}
      <nav class="desktop-nav" aria-label="メインナビゲーション">
        <a href="./" data-action="home">TOP</a><a href="characters/" data-action="characters">キャラ一覧</a>
        <a href="compatibility/" data-action="compatibility">相性チェック</a><button data-action="scroll" data-target="flow">診断の流れ</button>
        <button data-action="scroll" data-target="faq">よくある質問</button>
        <button class="nav-cta" data-action="start">今すぐ無料で診断する</button>
      </nav>
    </header>
    <main id="main">${content}</main>
    ${hideNav ? "" : `<nav class="mobile-nav" aria-label="モバイルナビゲーション">
      <a href="./" data-action="home"><span>✦</span>TOP</a><a href="characters/" data-action="characters"><span>▤</span>キャラ</a>
      <button class="mobile-nav__main" data-action="start"><span>◇</span>診断</button>
      <a href="compatibility/" data-action="compatibility"><span>♡</span>相性</a><button data-action="scroll" data-target="faq"><span>?</span>FAQ</button>
    </nav>`}
    ${hasLast && state.screen === "home" ? `<button class="last-result-pill" data-action="last-result">前回の結果を見る</button>` : ""}
  </div>`;
}

function characterPortrait(character, className="") {
  const index = character.id - 1;
  const col = index % 4;
  const row = Math.floor(index / 4);
  const priority = /--result|--detail/.test(className) ? "eager" : "lazy";
  return `<span class="character-portrait ${className}" style="--col:${col};--row:${row}" role="img" aria-label="${escapeHtml(character.name)}のキャラクター">
    <img src="assets/generated/characters-sheet.webp" alt="" width="1254" height="1254" loading="${priority}" decoding="async">
  </span>`;
}

function tarotArt(card, className="") {
  const localId = card.id < 11 ? card.id : card.id - 11;
  const sheet = card.id < 11 ? "a" : "b";
  const col = localId % 6;
  const row = Math.floor(localId / 6);
  // The generated sheets do not use equal-width cells. Cropping them as a
  // regular 6 x 2 grid exposes a strip of the neighbouring card on iOS.
  // These frames follow the actual outer gold borders in each sheet.
  const frames = sheet === "a"
    ? {
        x: [15, 309, 603, 898, 1192, 1487],
        width: [275, 275, 275, 275, 275, 275],
        y: [15, 454],
        height: [418, 417]
      }
    : {
        x: [14, 344, 649, 934, 1217, 1503],
        width: [313, 288, 270, 267, 270, 258],
        y: [11, 443],
        height: [416, 427]
      };
  const cropWidth = frames.width[col];
  const cropHeight = frames.height[row];
  const spriteStyle = [
    `--sprite-width:${(1774 / cropWidth) * 100}%`,
    `--sprite-height:${(887 / cropHeight) * 100}%`,
    `--sprite-left:${-(frames.x[col] / cropWidth) * 100}%`,
    `--sprite-top:${-(frames.y[row] / cropHeight) * 100}%`
  ].join(";");
  return `<span class="tarot-art ${className} ${card.reversed ? "is-reversed" : ""}" style="${spriteStyle}" role="img" aria-label="${escapeHtml(card.name)} ${card.reversed ? "逆位置" : "正位置"}">
    <img src="assets/generated/tarot-sheet-${sheet}.webp" alt="" width="1774" height="887">
  </span>`;
}

function renderHome() {
  state.screen = "home";
  setPageMeta({
    title: "URASELA（ウラセラ）｜5つの占術×24問で表と裏を読む無料診断",
    description: "URASELA（ウラセラ）は、四柱推命・西洋占星術・数秘術・九星気学・タロットと24問の深層質問を組み合わせ、表キャラ×裏キャラを256通りから導く登録不要・完全無料の占い・性格診断・自己分析サービスです。"
  });
  const sampleA = CHARACTERS[0], sampleB = CHARACTERS[1];
  const methods = FORTUNE_METHODS.map(item => `<article class="method-card"><span>${item.icon}</span><h3>${item.name}</h3><p>${item.lead}</p></article>`).join("");
  const faq = FAQ.map(([question,answer], index) => `<details class="faq-item" ${index === 0 ? "open" : ""}><summary>${question}<span>＋</span></summary><p>${answer}</p></details>`).join("");
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
    <section class="section methods" aria-labelledby="methods-title">
      <p class="section-kicker">WHY URASELA</p><h2 id="methods-title">なぜ、あなたの表と裏がわかるの？</h2>
      <div class="method-grid">${methods}</div>
    </section>
    <section class="section flow" id="flow" aria-labelledby="flow-title">
      <p class="section-kicker">3 STEPS</p><h2 id="flow-title">ウラセラの診断フロー</h2>
      <div class="flow-grid">
        <article><small>STEP 01</small><b>24の質問に答える</b><p>お金・恋愛・成功欲・嫉妬などから、本音と価値観を深掘り。</p><span class="flow-visual">A<br>B<br>C</span></article>
        <article><small>STEP 02</small><b>5つの占術で分析</b><p>生まれ持った資質と、現在のあなたを実計算してクロス解析。</p><span class="flow-visual flow-visual--orbit">✦</span></article>
        <article><small>STEP 03</small><b>表 × 裏が判明</b><p>256通りの組み合わせから、あなただけの結果を届けます。</p><span class="flow-visual flow-visual--pair">☾ × ✦</span></article>
      </div>
    </section>
    <section class="section result-preview" aria-labelledby="preview-title">
      <p class="section-kicker">YOUR URASELA</p><h2 id="preview-title">診断結果のイメージ</h2>
      <div class="preview-grid">
        <div class="sample-pair">
          <article>${characterPortrait(sampleA)}<small>表キャラ</small><h3>${sampleA.name}</h3><p>${sampleA.catch}</p></article>
          <span class="sample-pair__x">×</span>
          <article>${characterPortrait(sampleB)}<small>裏キャラ</small><h3>${sampleB.name}</h3><p>${sampleB.catch}</p></article>
        </div>
        <article class="sample-score"><small>TYPE 01 × TYPE 02</small><p>総合運勢</p><b>87<em>%</em></b><div><span style="--value:90%">恋愛運</span><span style="--value:82%">仕事運</span><span style="--value:85%">人間関係</span></div></article>
        <article class="sample-compat"><h3>あの人との相性もチェック！</h3><p>恋愛・友達・仕事。表と裏の4つの視点から2人を分析。</p><button class="cta cta--small" data-action="compatibility">相性チェックへ →</button><span aria-hidden="true">♡</span></article>
      </div>
    </section>
    <section class="section characters-teaser" aria-labelledby="teaser-title">
      <p class="section-kicker">16 TYPES</p><h2 id="teaser-title">あなたの中にいる16人</h2>
      <div class="mini-character-row">${CHARACTERS.slice(0,8).map(character => `<a href="${characterUrl(character)}" data-action="character-detail" data-id="${character.id}">${characterPortrait(character)}<b>${character.name}</b></a>`).join("")}</div>
      <a class="text-link" href="characters/" data-action="characters">16キャラをすべて見る →</a>
    </section>
    <section class="section faq" id="faq" aria-labelledby="faq-title">
      <p class="section-kicker">FAQ</p><h2 id="faq-title">よくある質問</h2><div class="faq-list">${faq}</div>
    </section>
    <section class="final-cta"><p>あなたの中には、まだ出会っていないあなたがいる。</p><h2>表と裏、2人のあなたを読もう。</h2><button class="cta" data-action="start">今すぐ無料で診断する →</button></section>
    ${adSlot("homeBottom")}
    ${footer()}`;
  app.innerHTML = shell(content);
  window.scrollTo({top:0,behavior:"auto"});
  afterRender("home");
}

function footer() {
  return `<footer class="footer"><div>${logo()}<p>表のあなたと裏のあなた。<br>まだ知らない自分に出会う占い。</p></div><nav aria-label="フッターナビゲーション"><a href="./" data-action="home">TOP</a><a href="characters/" data-action="characters">キャラ一覧</a><a href="compatibility/" data-action="compatibility">相性チェック</a><button data-action="scroll" data-target="flow">診断の流れ</button><button data-action="scroll" data-target="faq">よくある質問</button><a href="about/">URASELAについて</a><a href="privacy/">プライバシーポリシー</a><a href="disclaimer/">免責事項</a><a href="contact/">お問い合わせ</a><a href="terms/">利用規約</a></nav><small>© 2026 URASELA. 結果は娯楽・自己理解のための参考情報です。</small></footer>`;
}

function renderProfileForm() {
  state.screen = "profile";
  setPageMeta({ title:"無料診断をはじめる｜URASELA", description:"基本情報と24問、5つの占術から表キャラと裏キャラを導くURASELAの無料診断。" });
  const profile = state.profile;
  const content = `<section class="app-screen profile-screen">
    <div class="screen-heading"><span>01 / 04</span><p>まずは、生まれ持ったあなたを教えてください</p><h1>基本情報</h1></div>
    <div class="privacy-note"><span>♢</span><p><b>診断入力は端末内だけで計算</b><br>生年月日・出生地・回答内容は外部送信しません。</p></div>
    <form id="profile-form" class="profile-form">
      <label class="field"><span>生年月日 <em>必須</em></span><span class="native-input-shell"><input required type="date" name="birthdate" min="1900-01-01" max="${today}" value="${escapeHtml(profile.birthdate)}"></span></label>
      <fieldset class="field"><legend>性別</legend><div class="choice-chips">${["男性","女性","その他","回答しない"].map(value => `<label><input type="radio" name="gender" value="${value}" ${profile.gender === value ? "checked" : ""}><span>${value}</span></label>`).join("")}</div></fieldset>
      <label class="field"><span>出生地 <em>必須</em></span><select required name="birthplace">${PREFECTURES.map(value => `<option ${profile.birthplace === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label class="field country-field ${profile.birthplace === "海外" ? "" : "is-hidden"}"><span>国・地域 <em>必須</em></span><input name="country" autocomplete="country-name" placeholder="例：韓国、USA、フランス" ${profile.birthplace === "海外" ? "required" : ""} value="${escapeHtml(profile.country)}"></label>
      <label class="field"><span>市区町村 <small>任意</small></span><input name="city" autocomplete="address-level2" placeholder="例：新宿区、水戸市" value="${escapeHtml(profile.city)}"></label>
      <fieldset class="field"><legend>出生時間</legend><div class="choice-chips choice-chips--two">
        <label><input type="radio" name="birthTimeKnown" value="yes" ${profile.birthTimeKnown ? "checked" : ""}><span>分かる</span></label>
        <label><input type="radio" name="birthTimeKnown" value="no" ${!profile.birthTimeKnown ? "checked" : ""}><span>分からない</span></label>
      </div><p class="field-help">分からなくても時柱以外は正常に計算し、最後まで診断できます。</p></fieldset>
      <label class="field time-field ${profile.birthTimeKnown ? "" : "is-hidden"}"><span>生まれた時刻</span><span class="native-input-shell"><input type="time" name="birthtime" value="${escapeHtml(profile.birthtime)}"></span></label>
      <button class="cta cta--full" type="submit">24の深層質問へ進む <span>→</span></button>
      <button class="sub-button" type="button" data-action="home">TOPへ戻る</button>
    </form>
  </section>`;
  app.innerHTML = shell(content, {hideNav:true});
  window.scrollTo({top:0,behavior:"auto"});
  afterRender("profile");
}

function renderQuestion() {
  state.screen = "questions";
  setPageMeta({ title:"24問の深層質問｜URASELA", description:"恋愛・仕事・お金・承認欲求など24問から、表と裏の性格傾向を分析します。" });
  const question = QUESTIONS[state.questionIndex];
  const progress = Math.round((state.questionIndex / QUESTIONS.length) * 100);
  const selected = state.answers[state.questionIndex];
  const content = `<section class="app-screen question-screen">
    <div class="diagnosis-progress"><div><span style="width:${progress}%"></span></div><p><b>${pad(state.questionIndex+1)}</b> / 24</p></div>
    <div class="question-card">
      <span class="question-card__number">QUESTION ${pad(question.id)}</span>
      <h1>${question.prompt}</h1>
      <p>一番近いものを、考えすぎずに選んでください。</p>
      <div class="answer-list">${question.choices.map((choice,index) => `<button class="answer ${selected === index ? "is-selected" : ""}" type="button" data-action="answer" data-index="${index}"><b>${choice.key}</b><span>${choice.text}</span><i>→</i></button>`).join("")}</div>
    </div>
    <button class="back-button" type="button" data-action="question-back">← ひとつ前へ</button>
  </section>`;
  app.innerHTML = shell(content, {hideNav:true});
  window.scrollTo({top:0,behavior:"auto"});
  afterRender("questions");
}

function animateAnalysisPercent(from, to) {
  const output = app.querySelector("[data-analysis-count]");
  if (!output) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    output.textContent = String(to);
    return;
  }
  const startedAt = performance.now();
  const duration = 900;
  const tick = now => {
    if (!output.isConnected) return;
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    output.textContent = String(Math.round(from + (to - from) * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderAnalysis(percent) {
  state.screen = "analysis";
  const previousPercent = state.analysisPercent;
  const startPercent = previousPercent < percent ? previousPercent : Math.max(0, percent - 25);
  state.analysisPercent = percent;
  const messages = {
    25:["外に見せる行動パターンを解析中", "成功欲・責任感・社交性の輪郭が見えてきました。"],
    50:["生まれ持った資質と回答を照合中", "占術で強い性質と、今の選択に表れる性質を比べています。"],
    75:["心の奥に隠れた欲求を解析中", "恋愛・不安・自由への本音から裏キャラを絞り込んでいます。"],
    100:["24問の深層解析が完了", "最後に、あなた自身の直感で過去・現在・近未来の3枚を選びます。"]
  }[percent];
  const content = `<section class="app-screen analysis-screen">
    <div class="analysis-orbit" style="--progress:${percent*3.6}deg" aria-label="解析進行 ${percent}%"><span><output data-analysis-count>${startPercent}</output><small>%</small></span><i></i><i></i><i></i></div>
    <p class="section-kicker">CROSS ANALYSIS</p><h1>${messages[0]}</h1><p>${messages[1]}</p>
    <div class="analysis-signals"><span>心理回答</span><b>×</b><span>5つの占術</span><b>=</b><span>表 × 裏</span></div>
    <button class="cta" type="button" data-action="analysis-continue">${percent === 100 ? "タロットを引く" : "解析を続ける"} →</button>
    ${percent === 100 ? adSlot("postQuestions") : ""}
  </section>`;
  app.innerHTML = shell(content, {hideNav:true});
  window.scrollTo({top:0,behavior:"auto"});
  requestAnimationFrame(() => animateAnalysisPercent(startPercent, percent));
  trackEvent("analysis_progress", { percent });
  if (percent === 75) trackEvent("cross_analysis_reached");
  afterRender("analysis");
}

function beginTarot() {
  state.tarotDeck = shuffleTarot();
  state.tarotStage = 0; state.tarotCursor = 0; state.tarotSelections = []; state.tarotReveal = null;
  setTarotOffers();
  trackEvent("tarot_start");
  renderTarot();
}

function setTarotOffers() {
  state.tarotOffers = state.tarotDeck.slice(state.tarotCursor, state.tarotCursor + 3);
}

function renderTarot() {
  state.screen = "tarot";
  const labels = ["過去", "現在", "近未来"];
  const subtitles = ["今のあなたを作った記憶", "心の中心で動いていること", "これから向かう可能性"];
  const stage = state.tarotStage;
  const reveal = state.tarotReveal;
  const content = `<section class="app-screen tarot-screen">
    <div class="diagnosis-progress tarot-progress"><div>${labels.map((label,index) => `<span class="${index <= stage ? "is-active" : ""}">${index+1}</span>`).join("<i></i>")}</div><p>STEP ${stage+1} / 3</p></div>
    <div class="screen-heading"><span>TAROT READING</span><p>${subtitles[stage]}</p><h1>${labels[stage]}のカードを選ぶ</h1></div>
    ${reveal ? `<div class="tarot-reveal">
        ${tarotArt(reveal, "tarot-art--reveal")}
        <div><small>${labels[stage]}・${reveal.reversed ? "逆位置" : "正位置"}</small><h2>${reveal.name}<em>${reveal.en}</em></h2><b>${reveal.key}</b><p>${reveal.meaning}</p><p class="tarot-caution">注意：${reveal.caution}</p></div>
        <button class="cta cta--full" type="button" data-action="tarot-next">${stage === 2 ? "3枚をクロス解析する" : `次は「${labels[stage+1]}」を選ぶ`} →</button>
      </div>` : `<div class="tarot-instruction"><p>深呼吸して、今いちばん気になる1枚をタップ</p></div>
      <div class="tarot-choice">${state.tarotOffers.map((card,index) => `<button class="tarot-back" type="button" data-action="tarot-pick" data-index="${index}" aria-label="${index+1}枚目のカードを選ぶ"><span class="tarot-back__star">◇</span><small>URASELA</small></button>`).join("")}</div>
      <p class="tarot-note">3枚は大アルカナ22枚から実際にシャッフルされています。</p>`}
  </section>`;
  app.innerHTML = shell(content, {hideNav:true});
  window.scrollTo({top:0,behavior:"auto"});
  afterRender("tarot");
}

function finishDiagnosis() {
  try {
    state.result = analyzeProfile(state.profile, state.answers.map(Number), state.tarotSelections);
    localStorage.setItem("urasela:lastResult", JSON.stringify(state.result));
    trackEvent("divinations_complete");
    renderResult();
  } catch (error) {
    showToast(error.message);
    renderProfileForm();
  }
}

function resultPair(result) {
  return `<div class="result-pair">
    <article class="result-character result-character--surface"><small>表キャラ<span>外から見えやすいあなた</span></small>${characterPortrait(result.surface, "character-portrait--result")}<p>TYPE ${pad(result.surface.id)}</p><h2>${result.surface.name}</h2><em>${result.surface.en}</em><b>${result.surface.catch}</b><div class="tag-row">${result.surface.tags.map(tag=>`<span>#${tag}</span>`).join("")}</div></article>
    <span class="result-pair__x">×</span>
    <article class="result-character result-character--inner"><small>裏キャラ<span>心の奥にいるあなた</span></small>${characterPortrait(result.inner, "character-portrait--result")}<p>TYPE ${pad(result.inner.id)}</p><h2>${result.inner.name}</h2><em>${result.inner.en}</em><b>${result.inner.catch}</b><div class="tag-row">${result.inner.tags.map(tag=>`<span>#${tag}</span>`).join("")}</div></article>
  </div>`;
}

function resultActions(result) {
  return `<div class="share-actions"><button class="cta" data-action="share">結果カードを共有 <span>↗</span></button><button data-action="download">画像を保存</button><button data-action="copy">結果をコピー</button><div><button data-action="share-x" aria-label="Xで共有">𝕏</button><button data-action="share-line" aria-label="LINEで共有">LINE</button></div></div>`;
}

function crossSection(result) {
  const c=result.cross;
  return `<section class="result-section cross-section"><div class="result-section__title"><span>♢</span><div><small>CROSS ANALYSIS</small><h2>心理 × 占術のクロス解析</h2></div></div>
    <div class="cross-grid"><article><small>一致している性質</small><b>${c.agreement.join("・") || "変化の途中"}</b><p>${c.headline}</p></article><article><small>内側に隠れやすい性質</small><b>${c.inward.join("・") || "大きな差なし"}</b><p>${c.hiddenText}</p></article><article><small>占術で強い資質</small><b>${c.fortuneHidden.join("・") || result.fortunes.shichu.strongest + "の適応力"}</b><p>まだ使い切っていない、生まれ持った伸びしろです。</p></article><article><small>経験で育てた資質</small><b>${c.selfDeveloped.join("・") || result.fortunes.astrology.dominant + "の表現"}</b><p>選択と経験によって後天的に磨かれた強みです。</p></article></div>
  </section>`;
}

function fortuneSection(result) {
  const {shichu,astrology,numerology,kyusei}=result.fortunes;
  const planets=Object.values(astrology.planets);
  const positions=["過去","現在","近未来"];
  const tarotSpread=result.tarotSelections.map((card,index)=>`<div>${tarotArt(card)}<small>${positions[index]}・${card.reversed ? "逆位置" : "正位置"}</small><b>${card.name}</b></div>`).join("");
  const tarotReadings=result.tarotSelections.map((card,index)=>`<article><span>0${index+1}</span><div><small>${positions[index]}・${card.reversed ? "逆位置" : "正位置"}</small><b>${card.name}</b><p>${tarotMessage(card,positions[index]).message}</p></div></article>`).join("");
  return `<section class="result-section fortunes-section"><div class="result-section__title"><span>✦</span><div><small>5 DIVINATIONS</small><h2>5つの占術結果</h2></div></div>
    <div class="fortune-results">
      <article class="fortune-card" data-fortune-method="shichu"><header><span>☯</span><div><small>FOUR PILLARS</small><h3>四柱推命</h3></div></header><div class="pillars">${Object.entries(shichu.pillars).map(([key,value])=>`<span><small>${{year:"年柱",month:"月柱",day:"日柱",hour:"時柱"}[key]}</small><b>${value}</b></span>`).join("")}</div><div class="element-bars">${Object.entries(shichu.elements).map(([key,value])=>`<span style="--value:${Math.min(100,value/3.4*100)}%"><b>${key}</b><i></i></span>`).join("")}</div><h4>日主 ${shichu.dayMaster}・${shichu.dayElement}の人</h4><p>${shichu.summary}</p><small class="precision">${shichu.precision}</small></article>
      <article class="fortune-card" data-fortune-method="astrology"><header><span>☾</span><div><small>ASTROLOGY</small><h3>西洋占星術</h3></div></header><div class="planet-grid">${planets.map(p=>`<span><small>${p.label}<i>${p.role}</i></small><b>${p.sign}</b><em>${p.degree}°</em></span>`).join("")}</div><h4>${astrology.dominant}のエレメントが優勢</h4><p>${astrology.summary}</p><small class="precision">${astrology.precision}</small></article>
      ${adSlot("divinations")}
      <article class="fortune-card" data-fortune-method="numerology"><header><span>37</span><div><small>NUMEROLOGY</small><h3>数秘術</h3></div></header><div class="number-grid"><span><small>運命数</small><b>${numerology.lifePath}</b></span><span><small>誕生日数</small><b>${numerology.birthday}</b></span><span><small>${numerology.targetYear} 個人年</small><b>${numerology.personalYear}</b></span></div><h4>${numerology.theme}</h4><p>${numerology.summary}</p></article>
      <article class="fortune-card" data-fortune-method="kyusei"><header><span>✦</span><div><small>NINE STAR KI</small><h3>九星気学</h3></div></header><div class="nine-star"><span><small>本命星</small><b>${kyusei.main.name}</b></span><span><small>月命星</small><b>${kyusei.monthStar.name}</b></span><span><small>${kyusei.targetYear}年運</small><b>${kyusei.flow.label}</b></span></div><p>${kyusei.summary}</p><small class="precision">${kyusei.flowSummary}</small></article>
      <article class="fortune-card fortune-card--tarot" data-fortune-method="tarot"><header><span>◇</span><div><small>TAROT</small><h3>タロット</h3></div></header><div class="result-tarot">${tarotSpread}</div><div class="result-tarot-readings">${tarotReadings}</div><h4>3枚の総合メッセージ</h4><p>${combinedTarotReading(result.tarotSelections)}</p></article>
    </div>
  </section>`;
}

function combinationSections(result) {
  const combo=result.combination;
  const items=[
    ["♡","恋愛",combo.love],["▣","仕事",combo.work],["¥","お金",combo.money],["◎","人間関係",combo.relations],
    ["＋","強み",combo.strengths.join("・")],["−","弱み",combo.weaknesses.join("・")],["!","注意点",combo.caution],["↗","今後の伸ばし方",combo.growth]
  ];
  return `<section class="result-section identity-section"><div class="result-section__title"><span>∞</span><div><small>YOUR TRUE SELF</small><h2>あなたはどんな人か</h2></div></div><h3>${combo.title}</h3><p>${combo.identity}</p><blockquote>${combo.gap}</blockquote></section>
    <section class="result-section life-section"><div class="life-grid">${items.map(([icon,title,text])=>`<article><span>${icon}</span><h3>${title}</h3><p>${text}</p></article>`).join("")}</div></section>`;
}

function renderResult() {
  state.screen="result";
  const result=state.result;
  if (!result) return renderHome();
  const shared=Boolean(result.shared);
  const code=result.combination.code;
  setPageMeta({
    title:`${result.surface.name} × ${result.inner.name}｜URASELA診断結果`,
    description:`表は「${result.surface.name}」、裏は「${result.inner.name}」。${result.combination.title}の強み・恋愛・仕事・人間関係を読み解きます。`
  });
  const tarotBlock = shared && result.tarotSelections?.length === 3 ? `<section class="result-section shared-tarot"><div class="result-section__title"><span>◇</span><div><small>TAROT</small><h2>共有された3枚</h2></div></div><div class="result-tarot">${result.tarotSelections.map((card,index)=>`<div>${tarotArt(card)}<small>${["過去","現在","近未来"][index]}</small><b>${card.name}</b><p>${card.meaning}</p></div>`).join("")}</div></section>` : "";
  const content=`<section class="result-hero"><div class="result-hero__stars"></div><p class="section-kicker">YOUR URASELA</p><h1>${shared ? "共有されたウラセラ" : "あなたのウラセラ"}</h1><div class="result-code"><span>TYPE ${code.replace("×"," × TYPE ")}</span><b>${result.combination.relation.label}</b></div>${resultPair(result)}<div class="combination-name"><small>2人の組み合わせ名</small><h2>${result.combination.title}</h2><p>${result.combination.identity}</p></div>${resultActions(result)}</section>
    <div class="result-body">${shared ? "" : crossSection(result)}${shared ? tarotBlock : fortuneSection(result)}${combinationSections(result)}${adSlot("resultMiddle")}
      <section class="result-next"><h2>2人の相性も、表と裏でわかる。</h2><p>恋愛・友達・仕事の3つから、惹かれる理由とズレる理由を解析します。</p><button class="cta" data-action="compatibility">相性チェックへ →</button></section>
      <div class="result-bottom-actions">${shared ? `<button class="cta" data-action="start">自分も無料で診断する →</button>` : `<button data-action="reset">もう一度診断する</button>`}<button data-action="characters">16キャラを見る</button></div>
    </div>${footer()}`;
  app.innerHTML=shell(content,{hideNav:false});
  window.scrollTo({top:0,behavior:"auto"});
  trackEvent(shared ? "shared_result_view" : "result_view", { surface_type:result.surface.id, inner_type:result.inner.id, combination_code:code.replace("×","x") });
  afterRender("result");
}

function renderCharacters() {
  state.screen="characters";
  setPageMeta({ title:"URASELA（ウラセラ）16タイプ一覧｜表キャラ・裏キャラ", description:"URASELA（ウラセラ）の16タイプを一覧で紹介。各キャラクターの性格、表に出た場合、裏に出た場合、恋愛、仕事を読んで無料診断へ進めます。", path:"characters" });
  const content=`<section class="directory-hero"><p class="section-kicker">16 TYPES</p><h1>あなたの中にいる<br>16人のウラセラたち</h1><p>同じキャラでも、表に出るか裏に出るかで意味は変わります。</p></section>
    <section class="character-directory"><div class="character-grid">${CHARACTERS.map(character=>`<a class="character-card" href="${characterUrl(character)}" data-action="character-detail" data-id="${character.id}">${characterPortrait(character)}<span><small>TYPE ${pad(character.id)}・${character.en}</small><h2>${character.name}</h2><b>${character.catch}</b><p>${character.core}</p><em>詳しく見る →</em></span></a>`).join("")}</div></section>${footer()}`;
  app.innerHTML=shell(content);
  window.scrollTo({top:0,behavior:"auto"});
  trackEvent("characters_view");
  afterRender("characters");
}

function renderCharacterDetail(id) {
  const character=CHARACTERS.find(item=>item.id===Number(id));
  if (!character) return;
  state.selectedCharacter=character;
  state.screen="character-detail";
  setPageMeta({ title:`${character.name}｜URASELA（ウラセラ）16タイプ診断`, description:`${character.name}（${character.en}）の基本性格、表に出た時、裏に出た時、恋愛、仕事、強み、弱みを紹介。無料診断であなたの表キャラ×裏キャラを確認できます。`, path:characterUrl(character) });
  const sections=[["表に出た時",character.surface],["裏に出た時",character.inner],["恋愛",character.love],["仕事",character.work],["お金",character.money],["強み",character.strength],["弱み",character.weakness],["伸ばし方",character.growth]];
  const content=`<section class="character-detail"><a class="back-button" href="characters/" data-action="characters">← キャラ一覧</a><div class="character-detail__hero">${characterPortrait(character,"character-portrait--detail")}<div><small>TYPE ${pad(character.id)}</small><h1>${character.name}</h1><em>${character.en}</em><b>${character.catch}</b><div class="tag-row">${character.tags.map(tag=>`<span>#${tag}</span>`).join("")}</div></div></div><div class="character-detail__core"><h2>基本性格</h2><p>${character.core}</p></div><div class="detail-grid">${sections.map(([title,text])=>`<article><h3>${title}</h3><p>${text}</p></article>`).join("")}<article><h3>相性</h3><p>同じタイプでも、表と裏の組み合わせで相性は変わります。恋愛・友達・仕事の3つから2人を解析できます。</p><a class="text-link" href="compatibility/" data-action="compatibility">相性を確認する →</a></article></div><button class="cta cta--full" data-action="start">自分の表と裏を診断する →</button></section>${footer()}`;
  app.innerHTML=shell(content);
  window.scrollTo({top:0,behavior:"auto"});
  trackEvent("character_detail_view", { character_type:character.id, character_slug:character.slug });
  afterRender("character_detail");
}

function typeOptions(selected) { return CHARACTERS.map(character=>`<option value="${character.id}" ${Number(selected)===character.id?"selected":""}>${pad(character.id)} ${character.name}</option>`).join(""); }

function renderCompatibility() {
  state.screen="compatibility";
  setPageMeta({ title:"無料の恋愛・友達・仕事相性診断｜URASELA（ウラセラ）", description:"表キャラ×裏キャラ同士で、恋愛・友達・仕事の相性を無料診断。相性％、惹かれ合うポイント、ズレるポイント、長続きのコツが分かります。", path:"compatibility" });
  if (state.result) {
    state.compatibilityForm.selfSurface=state.result.surface.id;
    state.compatibilityForm.selfInner=state.result.inner.id;
  }
  const f=state.compatibilityForm, r=state.compatibilityResult;
  const resultHtml=r?`<section class="compat-result"><p class="section-kicker">${r.modeLabel.toUpperCase()} COMPATIBILITY</p><h2>${r.headline}</h2><div class="compat-score"><span>相性総合</span><b>${r.score}<small>%</small></b></div><div class="compat-bars"><span style="--value:${r.parts.surface}%"><b>表同士</b><i></i><em>${r.parts.surface}%</em></span><span style="--value:${r.parts.inner}%"><b>裏同士</b><i></i><em>${r.parts.inner}%</em></span><span style="--value:${r.parts.cross}%"><b>表×裏</b><i></i><em>${r.parts.cross}%</em></span></div><div class="compat-copy"><article><span>♡</span><h3>惹かれ合うポイント</h3><p>${r.attraction}</p></article><article><span>△</span><h3>ズレるポイント</h3><p>${r.friction}</p></article><article><span>✦</span><h3>長続きさせるコツ</h3><p>${r.advice}</p></article></div><button class="cta cta--full" data-action="share-compat">相性結果を共有 →</button>${adSlot("compatibilityBottom")}</section>`:"";
  const content=`<section class="compat-hero"><p class="section-kicker">CROSS COMPATIBILITY</p><h1>2人の「表」と「裏」で<br>本当の相性を読む。</h1><p>好きだから合う、似ているから合う、だけでは分からない3つの関係性。</p></section><section class="compat-form-wrap"><form id="compatibility-form" class="compat-form"><fieldset><legend>見たい相性</legend><div class="choice-chips choice-chips--three">${[["love","恋愛"],["friend","友達"],["work","仕事"]].map(([value,label])=>`<label><input type="radio" name="mode" value="${value}" ${f.mode===value?"checked":""}><span>${label}</span></label>`).join("")}</div></fieldset><div class="people-select"><div><h2>あなた</h2><label>表キャラ<select name="selfSurface">${typeOptions(f.selfSurface)}</select></label><label>裏キャラ<select name="selfInner">${typeOptions(f.selfInner)}</select></label></div><span>×</span><div><h2>あの人</h2><label>表キャラ<select name="partnerSurface">${typeOptions(f.partnerSurface)}</select></label><label>裏キャラ<select name="partnerInner">${typeOptions(f.partnerInner)}</select></label></div></div><button class="cta cta--full" type="submit">2人の相性を解析する →</button><p>相手のタイプが分からない時は、キャラ一覧の印象から選んでも楽しめます。</p></form>${resultHtml}</section>${footer()}`;
  app.innerHTML=shell(content);
  window.scrollTo({top:0,behavior:"auto"});
  afterRender("compatibility");
}

function startDiagnosis() {
  state.profile={...defaultProfile}; state.answers=Array(24).fill(null); state.questionIndex=0; state.result=null;
  state.tarotSelections=[]; state.compatibilityResult=null;
  updateRoute("./");
  trackEvent("diagnosis_start", { source_screen:state.screen });
  trackEvent("profile_start");
  renderProfileForm();
}

function scrollHomeTarget(target) {
  if (state.screen!=="home") { updateRoute("./"); renderHome(); }
  requestAnimationFrame(()=>document.getElementById(target)?.scrollIntoView({behavior:"smooth",block:"start"}));
}

function sharedUrl(result=state.result) {
  const url=new URL(`${siteUrl}/`);
  url.searchParams.set("result",encodeSharedResult(result));
  return url.toString();
}

function loadImage(src) { return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;}); }
function roundedRectPath(ctx,x,y,width,height,radius){
  if(typeof ctx.roundRect==="function"){ctx.roundRect(x,y,width,height,radius);return;}
  const r=Math.min(radius,width/2,height/2);ctx.moveTo(x+r,y);ctx.lineTo(x+width-r,y);ctx.quadraticCurveTo(x+width,y,x+width,y+r);ctx.lineTo(x+width,y+height-r);ctx.quadraticCurveTo(x+width,y+height,x+width-r,y+height);ctx.lineTo(x+r,y+height);ctx.quadraticCurveTo(x,y+height,x,y+height-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
}

async function createResultCardBlob(result=state.result) {
  const canvas=document.createElement("canvas"); canvas.width=1080; canvas.height=1350;
  const ctx=canvas.getContext("2d");
  const gradient=ctx.createLinearGradient(0,0,1080,1350); gradient.addColorStop(0,"#090b24");gradient.addColorStop(.5,"#26114d");gradient.addColorStop(1,"#071b3a");ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1350);
  for(let i=0;i<90;i++){const x=(i*197)%1080,y=(i*337)%1350,r=i%11===0?3:1;ctx.fillStyle=i%7===0?"#f2d39e":"rgba(255,255,255,.65)";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="52px Georgia, serif";ctx.fillText("U R A S E L A",540,82);ctx.fillStyle="#c9c2f8";ctx.font="26px sans-serif";ctx.fillText("あなたのウラセラ",540,126);
  const sheet=await loadImage("assets/generated/characters-sheet.webp");
  const drawPortrait=(character,x)=>{const index=character.id-1,col=index%4,row=Math.floor(index/4),sw=sheet.width/4,sh=sheet.height/4;ctx.save();ctx.beginPath();roundedRectPath(ctx,x,220,430,430,30);ctx.clip();ctx.drawImage(sheet,col*sw,row*sh,sw,sh,x,220,430,430);ctx.restore();};
  drawPortrait(result.surface,85);drawPortrait(result.inner,565);
  ctx.fillStyle="#fff";ctx.font="56px Georgia,serif";ctx.fillText("×",540,470);
  ctx.fillStyle="#f2d39e";ctx.font="24px sans-serif";ctx.fillText("表キャラ",300,700);ctx.fillStyle="#b9b6ff";ctx.fillText("裏キャラ",780,700);
  ctx.fillStyle="#fff";ctx.font="bold 38px sans-serif";ctx.fillText(result.surface.name,300,752);ctx.fillText(result.inner.name,780,752);
  ctx.fillStyle="#c8c7df";ctx.font="22px sans-serif";ctx.fillText(`TYPE ${pad(result.surface.id)}`,300,790);ctx.fillText(`TYPE ${pad(result.inner.id)}`,780,790);
  ctx.strokeStyle="rgba(242,211,158,.45)";ctx.strokeRect(85,850,910,300);
  ctx.fillStyle="#f2d39e";ctx.font="25px sans-serif";ctx.fillText(`TYPE ${result.combination.code} / ${result.combination.relation.label}`,540,910);
  ctx.fillStyle="#fff";ctx.font="bold 42px sans-serif";wrapCanvasText(ctx,result.combination.title,540,980,820,54);
  ctx.fillStyle="#d8d7e8";ctx.font="25px sans-serif";wrapCanvasText(ctx,result.combination.identity,540,1070,820,39);
  ctx.fillStyle="#c9c2f8";ctx.font="24px sans-serif";ctx.fillText("#URASELA  #ウラセラ  #性格診断",540,1238);ctx.fillStyle="#fff";ctx.font="28px Georgia,serif";ctx.fillText("表だけじゃ、あなたはわからない。",540,1285);ctx.fillStyle="#9fa5d8";ctx.font="21px sans-serif";ctx.fillText(siteUrl.replace(/^https?:\/\//,""),540,1324);
  return new Promise(resolve=>canvas.toBlob(resolve,"image/png",.95));
}

function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight){const chars=[...text];let line="";for(const char of chars){const test=line+char;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);line=char;y+=lineHeight;}else line=test;}if(line)ctx.fillText(line,x,y);}

async function shareResult() {
  const result=state.result;if(!result)return;
  const url=sharedUrl(result),text=result.combination.shareCopy;
  try {
    const blob=await createResultCardBlob(result);const file=new File([blob],`URASELA-${result.combination.code.replace("×","x")}.png`,{type:"image/png"});
    if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:"私のウラセラ",text,url,files:[file]});trackShare("web_share_file",result);return;}
    if(navigator.share){await navigator.share({title:"私のウラセラ",text,url});trackShare("web_share",result);return;}
    await navigator.clipboard.writeText(`${text}\n${url}`);showToast("結果とURLをコピーしました");trackShare("clipboard",result);
  } catch(error){if(error.name!=="AbortError"){await copyResult();}}
}

async function copyResult() { const text=`${state.result.combination.shareCopy}\n${sharedUrl()}`;try{await navigator.clipboard.writeText(text);showToast("結果とURLをコピーしました");trackShare("clipboard",state.result);}catch{showToast("コピーできませんでした。共有ボタンをお試しください");} }
async function downloadCard(){const blob=await createResultCardBlob();const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`URASELA-${state.result.combination.code.replace("×","x")}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);showToast("結果カードを保存しました");trackEvent("file_download",{file_name:link.download,content_type:"urasela_result"});}

app.addEventListener("click", async event => {
  const button=event.target.closest("[data-action]");if(!button)return;
  if (button.matches("a")) event.preventDefault();
  const action=button.dataset.action;
  if(action==="home"){updateRoute("./");renderHome();}
  else if(action==="start")startDiagnosis();
  else if(action==="characters"){updateRoute("characters/");renderCharacters();}
  else if(action==="character-detail"){
    const character=CHARACTERS.find(item=>item.id===Number(button.dataset.id));
    if(character){updateRoute(characterUrl(character));renderCharacterDetail(character.id);}
  }
  else if(action==="compatibility"){updateRoute("compatibility/");renderCompatibility();}
  else if(action==="scroll")scrollHomeTarget(button.dataset.target);
  else if(action==="answer"){
    const selected=Number(button.dataset.index);state.answers[state.questionIndex]=selected;const answered=state.questionIndex+1;
    if([6,12,18].includes(answered))renderAnalysis(answered/24*100);else if(answered===24){trackEvent("questions_complete");renderAnalysis(100);}else{state.questionIndex+=1;renderQuestion();}
  }
  else if(action==="question-back"){
    if(state.questionIndex===0)renderProfileForm();else{state.questionIndex-=1;renderQuestion();}
  }
  else if(action==="analysis-continue"){
    if(state.analysisPercent===100)beginTarot();else{state.questionIndex=state.answers.filter(value=>value!==null).length;renderQuestion();}
  }
  else if(action==="tarot-pick"){
    state.tarotReveal=state.tarotOffers[Number(button.dataset.index)];
    trackEvent("tarot_card_selected", { stage:state.tarotStage+1 });
    renderTarot();
  }
  else if(action==="tarot-next"){
    const position=["過去","現在","近未来"][state.tarotStage];state.tarotSelections.push({...state.tarotReveal,position});state.tarotStage+=1;state.tarotCursor+=3;state.tarotReveal=null;
    if(state.tarotStage>=3){trackEvent("tarot_complete");finishDiagnosis();}else{setTarotOffers();renderTarot();}
  }
  else if(action==="reset")startDiagnosis();
  else if(action==="share")await shareResult();
  else if(action==="copy")await copyResult();
  else if(action==="download")await downloadCard();
  else if(action==="share-x"){
    trackShare("x",state.result);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(state.result.combination.shareCopy)}&url=${encodeURIComponent(sharedUrl())}`,"_blank","noopener,noreferrer");
  }
  else if(action==="share-line"){
    trackShare("line",state.result);
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(sharedUrl())}`,"_blank","noopener,noreferrer");
  }
  else if(action==="share-compat"){
    const r=state.compatibilityResult,url=`${siteUrl}/compatibility/`,text=`URASELAの${r.modeLabel}相性は${r.score}%｜${r.headline}\n#URASELA #ウラセラ #相性診断`;
    try{
      if(navigator.share){await navigator.share({title:"URASELA相性診断",text,url});trackEvent("share",{method:"web_share",content_type:"compatibility",mode:r.mode,score:r.score});}
      else{await navigator.clipboard.writeText(`${text}\n${url}`);showToast("相性結果とURLをコピーしました");trackEvent("share",{method:"clipboard",content_type:"compatibility",mode:r.mode,score:r.score});}
    }catch(error){if(error.name!=="AbortError")showToast("共有できませんでした。もう一度お試しください");}
  }
  else if(action==="last-result"){
    try{const saved=JSON.parse(localStorage.getItem("urasela:lastResult"));state.result=analyzeProfile(saved.profile,saved.answers.map(Number),saved.tarotSelections);localStorage.setItem("urasela:lastResult",JSON.stringify(state.result));updateRoute("./");renderResult();}catch{localStorage.removeItem("urasela:lastResult");showToast("前回の結果を読み込めませんでした");}
  }
});

app.addEventListener("change", event => {
  if(event.target.name==="birthTimeKnown"){qs(".time-field")?.classList.toggle("is-hidden",event.target.value!=="yes");}
  if(event.target.name==="birthplace"){
    const overseas=event.target.value==="海外", country=qs('[name="country"]');
    qs(".country-field")?.classList.toggle("is-hidden",!overseas);
    if(country)country.required=overseas;
  }
});

app.addEventListener("submit", event => {
  event.preventDefault();
  if(event.target.id==="profile-form"){
    const data=new FormData(event.target);const known=data.get("birthTimeKnown")==="yes";
    if(known&&!data.get("birthtime")){showToast("出生時刻を入力するか「分からない」を選んでください");return;}
    if(data.get("birthplace")==="海外"&&!String(data.get("country")||"").trim()){showToast("国・地域を入力してください");return;}
    state.profile={birthdate:String(data.get("birthdate")),gender:String(data.get("gender")||"回答しない"),birthplace:String(data.get("birthplace")),city:String(data.get("city")||"").trim(),country:String(data.get("country")||"").trim(),birthTimeKnown:known,birthtime:known?String(data.get("birthtime")):""};
    state.questionIndex=0;trackEvent("questions_start");renderQuestion();
  }
  if(event.target.id==="compatibility-form"){
    const data=new FormData(event.target);state.compatibilityForm={mode:String(data.get("mode")),selfSurface:Number(data.get("selfSurface")),selfInner:Number(data.get("selfInner")),partnerSurface:Number(data.get("partnerSurface")),partnerInner:Number(data.get("partnerInner"))};
    state.compatibilityResult=calculateCompatibility(state.compatibilityForm.selfSurface,state.compatibilityForm.selfInner,state.compatibilityForm.partnerSurface,state.compatibilityForm.partnerInner,state.compatibilityForm.mode);
    trackEvent("compatibility_use",{mode:state.compatibilityForm.mode,self_surface:state.compatibilityForm.selfSurface,self_inner:state.compatibilityForm.selfInner,partner_surface:state.compatibilityForm.partnerSurface,partner_inner:state.compatibilityForm.partnerInner,score:state.compatibilityResult.score});
    renderCompatibility();requestAnimationFrame(()=>qs(".compat-result")?.scrollIntoView({behavior:"smooth",block:"start"}));
  }
});

function renderRoute() {
  const code=new URLSearchParams(location.search).get("result");
  const shared=decodeSharedResult(code);
  if(shared){state.result=shared;renderResult();return;}
  const parts=location.pathname.split("/").filter(Boolean);
  const characterIndex=parts.lastIndexOf("characters");
  if(characterIndex>=0){
    const slug=parts[characterIndex+1];
    if(slug){
      const character=CHARACTERS.find(item=>item.slug===slug);
      if(character){renderCharacterDetail(character.id);return;}
    }
    renderCharacters();return;
  }
  if(parts.at(-1)==="compatibility"){renderCompatibility();return;}
  renderHome();
}

function boot() {
  renderRoute();
  initPrivacyControls();
  window.addEventListener("popstate",renderRoute);
  if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

boot();
