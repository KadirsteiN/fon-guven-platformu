export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
