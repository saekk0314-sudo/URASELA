const CONSENT_KEY = "urasela:consent:v1";
const EVENT_NAME = /^[a-z][a-z0-9_]{0,39}$/;
const GA_ID = /^G-[A-Z0-9]+$/;
const ADSENSE_CLIENT = /^ca-pub-\d+$/;

const config = window.URASELA_CONFIG || {};
let analyticsReady = false;
let currentScreen = "home";
let lastSentScreen = "";

function configuredServices() {
  return {
    analytics: GA_ID.test(String(config.gaMeasurementId || "")),
    ads: ADSENSE_CLIENT.test(String(config.adsenseClientId || ""))
  };
}

export function getConsent() {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_KEY));
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function saveConsent(choice) {
  const value = { ...choice, updatedAt: new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  applyConsent(value);
  document.querySelector(".consent-banner")?.remove();
}

function loadGoogleAnalytics() {
  if (analyticsReady || !configuredServices().analytics) return;
  analyticsReady = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", config.gaMeasurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_flags: "SameSite=Lax;Secure"
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaMeasurementId)}`;
  script.dataset.uraselaAnalytics = "true";
  document.head.append(script);
}

function applyConsent(choice) {
  const services = configuredServices();
  if (choice?.analytics && services.analytics) loadGoogleAnalytics();
  window.dispatchEvent(new CustomEvent("urasela:consent", { detail: choice || {} }));
  if (choice?.analytics && services.analytics) trackScreen(currentScreen);
}

function consentBanner() {
  const services = configuredServices();
  if (!services.analytics && !services.ads) return "";
  return `<section class="consent-banner" role="dialog" aria-labelledby="consent-title" aria-describedby="consent-copy">
    <div><p class="section-kicker">PRIVACY CHOICE</p><h2 id="consent-title">利用状況の計測について</h2>
    <p id="consent-copy">URASELAの改善と、将来の広告配信のためCookie等を利用します。生年月日・出生地・回答内容は送信しません。</p>
    <a href="privacy/">詳しく見る</a></div>
    <div class="consent-actions"><button type="button" data-consent="essential">必要なものだけ</button><button class="cta" type="button" data-consent="accept">同意する</button></div>
  </section>`;
}

export function initPrivacyControls() {
  const existing = getConsent();
  if (existing) {
    applyConsent(existing);
    return;
  }
  const markup = consentBanner();
  if (!markup) return;
  document.body.insertAdjacentHTML("beforeend", markup);
  document.querySelector(".consent-banner")?.addEventListener("click", event => {
    const button = event.target.closest("[data-consent]");
    if (!button) return;
    const accept = button.dataset.consent === "accept";
    const services = configuredServices();
    saveConsent({ analytics: accept && services.analytics, ads: accept && services.ads });
  });
}

function cleanParameters(parameters) {
  return Object.fromEntries(Object.entries(parameters || {}).flatMap(([key, value]) => {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key) || value == null) return [];
    if (typeof value === "number" || typeof value === "boolean") return [[key, value]];
    return [[key, String(value).slice(0, 100)]];
  }));
}

export function trackEvent(name, parameters = {}) {
  const consent = getConsent();
  if (!consent?.analytics || !configuredServices().analytics || !EVENT_NAME.test(name)) return;
  loadGoogleAnalytics();
  window.gtag("event", name, cleanParameters(parameters));
}

export function trackScreen(screenName) {
  currentScreen = screenName;
  const consent = getConsent();
  if (!consent?.analytics || !configuredServices().analytics || lastSentScreen === screenName) return;
  lastSentScreen = screenName;
  trackEvent("urasela_screen_view", { screen_name: screenName });
}

export function trackShare(method, result) {
  trackEvent("share", {
    method,
    content_type: "urasela_result",
    item_id: result?.combination?.code || "unknown",
    surface_type: result?.surface?.id || 0,
    inner_type: result?.inner?.id || 0
  });
}
