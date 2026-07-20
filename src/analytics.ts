const measurementId = "G-Z0T6M1LBKB";
const publicGalleryPaths = new Set(["/", "/upload"]);

export type OutcomeEvent =
  | "gallery_download"
  | "meme_submission"
  | "gugo_registration_click";

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

function normalizedPathname() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function hasPrivacyOptOut() {
  const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
  const privacyWindow = window as Window & { doNotTrack?: string };
  return privacyNavigator.globalPrivacyControl === true
    || navigator.doNotTrack === "1"
    || privacyWindow.doNotTrack === "1";
}

function canMeasure() {
  return publicGalleryPaths.has(normalizedPathname()) && !hasPrivacyOptOut();
}

export function initializeAnalytics() {
  if (!canMeasure() || window.gtag) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: 0,
    cookie_update: false
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(script);
}

export function trackOutcome(event: OutcomeEvent) {
  if (!canMeasure()) return;
  window.gtag?.("event", event);
}
