type AnalyticsValue = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    umami?: {
      track: (event?: string | object, properties?: AnalyticsProperties) => void;
    };
  }
}

const ATTRIBUTION_KEY = "usamabhanbhro-attribution";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export function captureAttribution(search: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(search);
  const attribution = Object.fromEntries(UTM_KEYS.filter((key) => params.has(key)).map((key) => [key, params.get(key)]));
  if (Object.keys(attribution).length) {
    try {
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ ...attribution, capturedAt: new Date().toISOString() }));
    } catch {
      // Attribution is optional and must never block the storefront.
    }
  }
}

export function readAttribution(): AnalyticsProperties {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || "null") as Record<string, AnalyticsValue> | null;
    return value ?? {};
  } catch {
    return {};
  }
}

export function trackEvent(name: string, properties: AnalyticsProperties = {}) {
  if (typeof window === "undefined" || !window.umami?.track) return;
  try {
    window.umami.track(name, { ...readAttribution(), ...properties });
  } catch {
    // Analytics must never interfere with customer actions.
  }
}
