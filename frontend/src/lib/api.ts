// Render bağımlılığı kaldırıldı; tüm API çağrıları doğrudan Vercel Next.js Route Handlers + Neon PostgreSQL üzerinden çalışır.
export const API_BASE_URL = "";

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errText = errJson.detail || JSON.stringify(errJson);
    } catch {
      errText = await res.text();
    }
    throw new Error(`API Hatası (${endpoint}): ${errText}`);
  }

  return res.json() as Promise<T>;
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("admin_token", token);
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("admin_token");
}

export async function adminFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getAdminToken();
  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (res.status === 401) {
    clearAdminToken();
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errText = errJson.detail || JSON.stringify(errJson);
    } catch {
      errText = await res.text();
    }
    throw new Error(errText);
  }

  return res.json() as Promise<T>;
}

export function formatCurrencyTL(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "-";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatNumberTR(
  val: number | null | undefined,
  decimals = 2
): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "-";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function getTelemetrySessionId(): string {
  if (typeof window === "undefined") return "ssr-session";
  let sid = sessionStorage.getItem("fg_telemetry_session_id");
  if (!sid) {
    sid =
      "sess-" +
      Math.random().toString(36).substring(2, 9) +
      "-" +
      Date.now().toString(36);
    sessionStorage.setItem("fg_telemetry_session_id", sid);
  }
  return sid;
}

export interface TelemetryEventPayload {
  event_type:
    | "PAGE_VIEW"
    | "TIME_ON_PAGE"
    | "EVIDENCE_INSPECT"
    | "TRANSPARENCY_QUERY"
    | "ANALYTICS_QUERY"
    | "FUND_COMPARE"
    | "BASKET_SIMULATE"
    | "BULLETIN_OPEN"
    | "BULLETIN_SOURCE_CLICK"
    | "CONTACT_SUBMIT"
    | "REAL_RETURN_OPEN"
    | "REAL_RETURN_SIMULATE"
    | "REAL_RETURN_BENCHMARK_SELECT"
    | "GLOSSARY_TERM_READ"
    | "GLOSSARY_SEARCH"
    | "ACADEMIC_PDF_REPORT_DOWNLOAD"
    | "SPK_RISK_TEST_COMPLETE"
    | string;
  module_name: string;
  page_path?: string | null;
  fund_code?: string | null;
  paired_fund_code?: string | null;
  date_range_label?: string | null;
  bulletin_id?: number | null;
  duration_seconds?: number;
  basket_weight_pct?: number | null;
  metadata?: Record<string, any> | null;
}

export function trackTelemetryEvent(payload: TelemetryEventPayload): void {
  if (typeof window === "undefined") return;
  const session_id = getTelemetrySessionId();
  const body = JSON.stringify({
    session_id,
    event_type: payload.event_type,
    module_name: payload.module_name,
    fund_code: payload.fund_code || null,
    paired_fund_code: payload.paired_fund_code || null,
    date_range_label: payload.date_range_label || null,
    bulletin_id: payload.bulletin_id ?? null,
    duration_seconds: payload.duration_seconds ?? 0,
    basket_weight_pct: payload.basket_weight_pct ?? null,
    metadata: payload.metadata || null,
    page_path: payload.page_path || window.location.pathname,
    screen_width: window.screen?.width || window.innerWidth || null,
    screen_height: window.screen?.height || window.innerHeight || null,
  });

  fetch(`${API_BASE_URL}/api/telemetry/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

