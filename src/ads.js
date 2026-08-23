import { getConsent } from "./analytics.js";

const config = window.URASELA_CONFIG || {};
const CLIENT_ID = /^ca-pub-\d+$/;
const SLOT_ID = /^\d+$/;
let scriptRequested = false;

export function adSlot(placement) {
  return `<aside class="ad-slot" data-ad-placement="${placement}" hidden aria-label="広告"></aside>`;
}

function loadAdSense() {
  if (scriptRequested || !CLIENT_ID.test(String(config.adsenseClientId || ""))) return;
  scriptRequested = true;
  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.adsenseClientId)}`;
  script.dataset.uraselaAds = "true";
  document.head.append(script);
}

export function hydrateAds() {
  if (!getConsent()?.ads || !CLIENT_ID.test(String(config.adsenseClientId || ""))) return;
  loadAdSense();
  document.querySelectorAll("[data-ad-placement]").forEach(container => {
    if (container.dataset.adReady === "true") return;
    const slot = config.adSlots?.[container.dataset.adPlacement];
    if (!SLOT_ID.test(String(slot || ""))) return;
    container.hidden = false;
    container.dataset.adReady = "true";
    container.innerHTML = `<small>広告</small><ins class="adsbygoogle" style="display:block" data-ad-client="${config.adsenseClientId}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  });
}

window.addEventListener("urasela:consent", () => requestAnimationFrame(hydrateAds));
