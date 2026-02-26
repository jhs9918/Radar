/**
 * Server-side in-memory rate limiter + quota trackers.
 *
 * Free-tier quota  — keyed by (IP + UA-hash + month)
 * Per-code quota   — keyed by (code + month), bounded by CODE_MONTHLY_MAX
 * Rate limiter     — keyed by IP, sliding window
 *
 * Production TODO: replace Map stores with Redis for multi-instance deploys.
 * All stores reset on server restart — acceptable for MVP.
 */

import { createHash } from "crypto";
import { FREE_MONTHLY_QUOTA, CODE_MONTHLY_MAX } from "./plans";

const RATE_WINDOW_MS   = parseInt(process.env.RATE_LIMIT_WINDOW_SEC ?? "600", 10) * 1000;
const RATE_MAX         = parseInt(process.env.RATE_LIMIT_MAX        ?? "10",  10);
const BLOCK_MS         = 60 * 60 * 1000; // 1-hour block for suspicious IPs
const LIMIT_HITS_BLOCK = 3;              // block after hitting rate limit N times

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isoMonth(date: Date): string {
  const year  = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** 12-char hex fingerprint of the User-Agent string */
function hashUA(ua: string): string {
  return createHash("sha256").update(ua).digest("hex").slice(0, 12);
}

// ---------------------------------------------------------------------------
// Rate limiter  (per IP, sliding window)
// ---------------------------------------------------------------------------
interface RateLimitEntry {
  timestamps: number[];
  limit_hits: number;
  blocked_until?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now   = Date.now();
  const entry: RateLimitEntry = rateLimitStore.get(ip) ?? { timestamps: [], limit_hits: 0 };

  if (entry.blocked_until && now < entry.blocked_until) {
    return { ok: false, retryAfter: Math.ceil((entry.blocked_until - now) / 1000) };
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_WINDOW_MS);

  if (entry.timestamps.length >= RATE_MAX) {
    entry.limit_hits += 1;
    if (entry.limit_hits >= LIMIT_HITS_BLOCK) {
      entry.blocked_until = now + BLOCK_MS;
      console.warn("[rate-limiter] Suspicious IP blocked for 1h:", ip);
    }
    rateLimitStore.set(ip, entry);
    const retryAfter = entry.blocked_until
      ? Math.ceil((entry.blocked_until - now) / 1000)
      : Math.ceil(RATE_WINDOW_MS / 1000);
    return { ok: false, retryAfter };
  }

  entry.timestamps.push(now);
  rateLimitStore.set(ip, entry);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Free-tier monthly quota  (per IP + UA-hash + month)
// ---------------------------------------------------------------------------
interface QuotaEntry {
  month: string;
  count: number;
}

const quotaStore = new Map<string, QuotaEntry>();

function freeQuotaKey(ip: string, ua: string): string {
  return `free::${ip}::${hashUA(ua)}::${isoMonth(new Date())}`;
}

export function checkQuota(
  ip: string,
  ua = "unknown"
): { ok: boolean; remaining: number } {
  const entry = quotaStore.get(freeQuotaKey(ip, ua)) ?? {
    month: isoMonth(new Date()),
    count: 0,
  };
  const remaining = Math.max(0, FREE_MONTHLY_QUOTA - entry.count);
  return { ok: remaining > 0, remaining };
}

export function decrementQuota(ip: string, ua = "unknown"): number {
  const key   = freeQuotaKey(ip, ua);
  const entry = quotaStore.get(key) ?? { month: isoMonth(new Date()), count: 0 };
  entry.count += 1;
  quotaStore.set(key, entry);
  return Math.max(0, FREE_MONTHLY_QUOTA - entry.count);
}

// ---------------------------------------------------------------------------
// Per-code monthly usage cap  (paid tier, optional)
// Only enforced when CODE_MONTHLY_MAX > 0.
// ---------------------------------------------------------------------------
const codeUsageStore = new Map<string, QuotaEntry>();

function codeUsageKey(code: string): string {
  return `code::${code}::${isoMonth(new Date())}`;
}

export function checkCodeUsage(code: string): { ok: boolean; remaining: number } {
  if (CODE_MONTHLY_MAX <= 0) return { ok: true, remaining: Infinity };
  const entry = codeUsageStore.get(codeUsageKey(code)) ?? {
    month: isoMonth(new Date()),
    count: 0,
  };
  const remaining = Math.max(0, CODE_MONTHLY_MAX - entry.count);
  return { ok: remaining > 0, remaining };
}

export function decrementCodeUsage(code: string): void {
  if (CODE_MONTHLY_MAX <= 0) return;
  const key   = codeUsageKey(code);
  const entry = codeUsageStore.get(key) ?? { month: isoMonth(new Date()), count: 0 };
  entry.count += 1;
  codeUsageStore.set(key, entry);
}

// ---------------------------------------------------------------------------
// IP extraction helper
// ---------------------------------------------------------------------------
export function extractIP(req: { headers: { get(k: string): string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
