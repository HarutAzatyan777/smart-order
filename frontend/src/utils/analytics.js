// Lightweight GA4 helper for the Smart Order frontend (SPA-friendly)
const GA_MEASUREMENT_ID = import.meta?.env?.VITE_GA_MEASUREMENT_ID || "G-0XZFHZ57HG";
const DEFAULT_RESTAURANT_ID = import.meta?.env?.VITE_GA_RESTAURANT_ID || "smart-order-prod";
const DEFAULT_LOCATION =
  import.meta?.env?.VITE_GA_LOCATION ||
  (typeof window !== "undefined" ? window.location.hostname : "production");
const DEFAULT_CURRENCY = import.meta?.env?.VITE_GA_CURRENCY || "USD";

let initialized = false;
let scriptInjected = false;

const analyticsContext = {
  restaurantId: DEFAULT_RESTAURANT_ID,
  location: DEFAULT_LOCATION,
  currency: DEFAULT_CURRENCY,
  userRole: "guest",
  tableNumber: null,
  deviceType: detectDeviceType()
};

function detectDeviceType() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(ua)) return "mobile";
  return "desktop";
}

function ensureGtag() {
  if (typeof window === "undefined") return false;
  if (!GA_MEASUREMENT_ID) return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };

  if (!scriptInjected) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    scriptInjected = true;
  }

  return true;
}

export function initAnalytics() {
  if (initialized) return;
  const ok = ensureGtag();
  if (!ok) return;

  window.gtag("js", new Date());

  // Consent Mode v2 defaults: allow analytics, block ads/personalization unless explicitly enabled later.
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
    functionality_storage: "granted",
    security_storage: "granted"
  });

  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    transport_type: "beacon",
    allow_google_signals: false,
    debug_mode: Boolean(import.meta?.env?.DEV)
  });

  syncUserProperties();
  initialized = true;
}

function syncUserProperties() {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("set", "user_properties", {
    restaurant_id: analyticsContext.restaurantId,
    location: analyticsContext.location,
    user_role: analyticsContext.userRole,
    device_type: analyticsContext.deviceType
  });
}

export function setAnalyticsContext(next = {}) {
  Object.assign(analyticsContext, Object.fromEntries(
    Object.entries(next).filter(([, value]) => value !== undefined)
  ));
  syncUserProperties();
}

function withDefaults(params = {}) {
  return {
    restaurant_id: analyticsContext.restaurantId,
    location: analyticsContext.location,
    user_role: analyticsContext.userRole,
    device_type: analyticsContext.deviceType,
    currency: analyticsContext.currency,
    table_number: analyticsContext.tableNumber || undefined,
    ...params
  };
}

export function trackPageView(params = {}) {
  if (!ensureGtag()) return;
  const payload = withDefaults({
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
    page_path: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined,
    page_title: typeof document !== "undefined" ? document.title : undefined,
    ...params
  });
  window.gtag("event", "page_view", payload);
}

export function trackEvent(eventName, params = {}) {
  if (!ensureGtag()) return;
  window.gtag("event", eventName, withDefaults(params));
}

export function trackOrderStage(stage, params = {}) {
  const normalizedStage = stage === "preparing" ? "order_preparing" : stage === "ready" ? "order_ready" : stage === "delivered" ? "order_delivered" : stage;
  trackEvent(normalizedStage, params);
}

export const analyticsIds = {
  measurementId: GA_MEASUREMENT_ID,
  restaurantId: DEFAULT_RESTAURANT_ID,
  location: DEFAULT_LOCATION
};

export function getAnalyticsContext() {
  return { ...analyticsContext };
}
