import { Pool, QueryResultRow } from "pg";

export const DEFAULT_NEON_DATABASE_URL =
  "postgresql://neondb_owner:npg_TdDnFhc8mWy9@ep-steep-salad-b92j8mft-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require";

export function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL || DEFAULT_NEON_DATABASE_URL;
  return raw
    .replace("&channel_binding=require", "")
    .replace("?channel_binding=require&", "?");
}

// ─── 1. POSTGRESQL CONNECTION POOL (SINGLETON) ───
declare global {
  // eslint-disable-next-line no-var
  var __neonPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __inMemoryCache: Map<string, { value: any; expiresAt: number }> | undefined;
  // eslint-disable-next-line no-var
  var __cacheStats: { hits: number; misses: number; invalidations: number } | undefined;
  // eslint-disable-next-line no-var
  var __rateLimitMap: Map<string, { count: number; resetAt: number }> | undefined;
  // eslint-disable-next-line no-var
  var __bruteForceMap:
    | Map<string, { attempts: number; lockedUntil: number; lastAttemptAt: number }>
    | undefined;
}

export function getPool(): Pool {
  if (!globalThis.__neonPgPool) {
    globalThis.__neonPgPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  return globalThis.__neonPgPool;
}

export async function dbQuery<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool();
  const res = await pool.query<T>(text, params);
  return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
}

// ─── 2. 5-MINUTE IN-MEMORY CACHE (TTL = 300sn) ───
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

function getCacheStore() {
  if (!globalThis.__inMemoryCache) {
    globalThis.__inMemoryCache = new Map();
  }
  if (!globalThis.__cacheStats) {
    globalThis.__cacheStats = { hits: 0, misses: 0, invalidations: 0 };
  }
  return {
    store: globalThis.__inMemoryCache,
    stats: globalThis.__cacheStats,
  };
}

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_CACHE_TTL_MS
): Promise<T> {
  const { store, stats } = getCacheStore();
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) {
    stats.hits += 1;
    return cached.value as T;
  }
  stats.misses += 1;
  const fresh = await fetcher();
  store.set(key, { value: fresh, expiresAt: now + ttlMs });
  return fresh;
}

export function invalidateCache(prefix?: string): void {
  const { store, stats } = getCacheStore();
  stats.invalidations += 1;
  if (!prefix) {
    store.clear();
    return;
  }
  Array.from(store.keys()).forEach((k) => {
    if (k.startsWith(prefix)) {
      store.delete(k);
    }
  });
}

export function getCacheMetrics() {
  const { store, stats } = getCacheStore();
  const pool = getPool();
  return {
    cache_ttl_seconds: 300,
    active_cached_keys: store.size,
    cache_hits: stats.hits,
    cache_misses: stats.misses,
    cache_invalidations: stats.invalidations,
    hit_ratio_pct:
      stats.hits + stats.misses > 0
        ? Number(((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1))
        : 100.0,
    pg_pool_total_count: pool.totalCount,
    pg_pool_idle_count: pool.idleCount,
    pg_pool_waiting_count: pool.waitingCount,
    pg_pool_max_connections: 15,
  };
}

// ─── 3. SİBER GÜVENLİK KALKANI (RATE LIMIT, BRUTE-FORCE, XSS/SQLI SANITIZER) ───

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export async function logSecurityEvent(
  eventType: string,
  severity: "INFO" | "WARNING" | "CRITICAL",
  ipAddress: string,
  endpoint: string,
  details: string,
  blockedUntil?: Date | null
): Promise<void> {
  try {
    await dbQuery(
      `INSERT INTO security_logs (event_type, severity, ip_address, endpoint, details, blocked_until, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP);`,
      [
        eventType,
        severity,
        ipAddress,
        endpoint,
        details,
        blockedUntil ? blockedUntil.toISOString() : null,
      ]
    );
  } catch {
    // non-blocking
  }
}

export function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequestsPerMin: number = 180
): { allowed: boolean; remaining: number; resetInSec: number } {
  if (!globalThis.__rateLimitMap) {
    globalThis.__rateLimitMap = new Map();
  }
  const now = Date.now();
  const windowMs = 60 * 1000;
  const entry = globalThis.__rateLimitMap.get(ip);

  if (!entry || entry.resetAt <= now) {
    globalThis.__rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequestsPerMin - 1, resetInSec: 60 };
  }

  entry.count += 1;
  const resetInSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > maxRequestsPerMin) {
    if (entry.count === maxRequestsPerMin + 1) {
      logSecurityEvent(
        "RATE_LIMIT_EXCEEDED",
        "WARNING",
        ip,
        endpoint,
        `IP dakikada ${maxRequestsPerMin} istek sınırını aştı (DDoS/Bot Koruması).`
      );
    }
    return { allowed: false, remaining: 0, resetInSec };
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequestsPerMin - entry.count),
    resetInSec,
  };
}

// Admin Girişi Brute-Force Kalkanı: 5 hatalı denemede 15 dakika IP kilidi
const MAX_BRUTE_FORCE_ATTEMPTS = 5;
const BRUTE_FORCE_LOCK_MS = 15 * 60 * 1000; // 15 dakika

function getBruteForceMap() {
  if (!globalThis.__bruteForceMap) {
    globalThis.__bruteForceMap = new Map();
  }
  return globalThis.__bruteForceMap;
}

export function checkAdminBruteForce(ip: string): {
  locked: boolean;
  remainingAttempts: number;
  lockedRemainingSec: number;
} {
  const map = getBruteForceMap();
  const entry = map.get(ip);
  const now = Date.now();

  if (!entry) {
    return {
      locked: false,
      remainingAttempts: MAX_BRUTE_FORCE_ATTEMPTS,
      lockedRemainingSec: 0,
    };
  }

  if (entry.lockedUntil > now) {
    return {
      locked: true,
      remainingAttempts: 0,
      lockedRemainingSec: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  // Kilit süresi dolmuşsa sıfırla
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    map.delete(ip);
    return {
      locked: false,
      remainingAttempts: MAX_BRUTE_FORCE_ATTEMPTS,
      lockedRemainingSec: 0,
    };
  }

  return {
    locked: false,
    remainingAttempts: Math.max(0, MAX_BRUTE_FORCE_ATTEMPTS - entry.attempts),
    lockedRemainingSec: 0,
  };
}

export async function recordAdminLoginFailure(
  ip: string
): Promise<{ locked: boolean; attempts: number; lockedRemainingSec: number }> {
  const map = getBruteForceMap();
  const now = Date.now();
  const current = map.get(ip) || { attempts: 0, lockedUntil: 0, lastAttemptAt: now };
  current.attempts += 1;
  current.lastAttemptAt = now;

  if (current.attempts >= MAX_BRUTE_FORCE_ATTEMPTS) {
    current.lockedUntil = now + BRUTE_FORCE_LOCK_MS;
    map.set(ip, current);
    const unlockDate = new Date(current.lockedUntil);
    await logSecurityEvent(
      "ADMIN_BRUTE_FORCE_LOCK",
      "CRITICAL",
      ip,
      "/api/admin/login",
      `Ardışık ${current.attempts} hatalı şifre denemesi tespit edildi. IP 15 dakika süreyle kilitlendi.`,
      unlockDate
    );
    return {
      locked: true,
      attempts: current.attempts,
      lockedRemainingSec: 15 * 60,
    };
  }

  map.set(ip, current);
  await logSecurityEvent(
    "ADMIN_LOGIN_FAILED",
    "WARNING",
    ip,
    "/api/admin/login",
    `Hatalı yönetici şifresi denemesi (${current.attempts}/${MAX_BRUTE_FORCE_ATTEMPTS}).`
  );
  return {
    locked: false,
    attempts: current.attempts,
    lockedRemainingSec: 0,
  };
}

export async function recordAdminLoginSuccess(ip: string): Promise<void> {
  const map = getBruteForceMap();
  map.delete(ip);
  await logSecurityEvent(
    "ADMIN_LOGIN_SUCCESS",
    "INFO",
    ip,
    "/api/admin/login",
    "Yönetici oturumu başarıyla doğrulandı."
  );
}

export function unblockIpAddress(ip: string): void {
  const bfMap = getBruteForceMap();
  bfMap.delete(ip);
  if (globalThis.__rateLimitMap) {
    globalThis.__rateLimitMap.delete(ip);
  }
}

export function getActiveBruteForceLocks() {
  const map = getBruteForceMap();
  const now = Date.now();
  const locks: Array<{
    ip: string;
    attempts: number;
    locked_until: string | null;
    remaining_sec: number;
  }> = [];

  Array.from(map.entries()).forEach(([ip, val]) => {
    if (val.lockedUntil > now || val.attempts > 0) {
      locks.push({
        ip,
        attempts: val.attempts,
        locked_until: val.lockedUntil > now ? new Date(val.lockedUntil).toISOString() : null,
        remaining_sec: val.lockedUntil > now ? Math.ceil((val.lockedUntil - now) / 1000) : 0,
      });
    }
  });
  return locks;
}

// XSS & SQL Injection Input Sanitizer
const SUSPICIOUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /on(error|load|click|mouseover|focus)\s*=/gi,
  /(\bUNION\s+ALL\s+SELECT\b|\bUNION\s+SELECT\b|\bDROP\s+TABLE\b|--\s*$)/gi,
];

export function sanitizeString(
  input: string,
  ip?: string,
  endpoint?: string
): string {
  if (typeof input !== "string") return "";
  let cleaned = input;
  let detected = false;

  for (const regex of SUSPICIOUS_PATTERNS) {
    if (regex.test(cleaned)) {
      detected = true;
      cleaned = cleaned.replace(regex, "");
    }
  }

  cleaned = cleaned
    .replace(/<script/gi, "&lt;script")
    .replace(/<\/script>/gi, "&lt;/script&gt;")
    .replace(/javascript:/gi, "");

  if (detected && ip && endpoint) {
    logSecurityEvent(
      "XSS_OR_SQLI_ATTEMPT_BLOCKED",
      "CRITICAL",
      ip,
      endpoint,
      "Girdi içerisinde zararlı XSS/SQLi deseni tespit edildi ve temizlendi."
    );
  }

  return cleaned.trim();
}

export function sanitizePayload<T = any>(
  payload: T,
  ip?: string,
  endpoint?: string
): T {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload === "string") {
    return sanitizeString(payload, ip, endpoint) as unknown as T;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item, ip, endpoint)) as unknown as T;
  }
  if (typeof payload === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(payload as Record<string, any>)) {
      // Base64 PDF verisini bozma
      if (k === "file_data") {
        out[k] = v;
      } else {
        out[k] = sanitizePayload(v, ip, endpoint);
      }
    }
    return out as T;
  }
  return payload;
}
