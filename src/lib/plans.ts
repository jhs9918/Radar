// ---------------------------------------------------------------------------
// Plan types & server-side config
// Server is authoritative — every request validates X-Access-Code here.
// Client localStorage is only used to pre-fill the header; never trusted alone.
// ---------------------------------------------------------------------------

export type PlanType = "free" | "credits" | "subscription";

/** Shape stored in localStorage on the client */
export interface ClientPlan {
  plan: PlanType;
  access_code?: string;
}

/** Meta appended to every API response (not part of AnalysisResult schema) */
export interface AnalyzeMeta {
  partial: boolean;
  hint?: string;
  plan: "free" | "paid";
  quota_remaining?: number;
}

// ---------------------------------------------------------------------------
// Server-side config (env vars with safe defaults)
// ---------------------------------------------------------------------------
export const FREE_MONTHLY_QUOTA = parseInt(process.env.FREE_MONTHLY_QUOTA ?? "10", 10);
export const FREE_CHAR_LIMIT    = parseInt(process.env.FREE_CHAR_LIMIT    ?? "12000", 10);

/**
 * Per-access-code monthly use cap (0 = unlimited).
 * Prevents a leaked code from being used indefinitely.
 */
export const CODE_MONTHLY_MAX   = parseInt(process.env.CODE_MONTHLY_MAX ?? "0", 10);

// ---------------------------------------------------------------------------
// Access code store
//
// Env format:  ACCESS_CODES=CODE1:2026-12-31,CODE2:never,LEGACYCODE
//   CODE1     — expires 2026-12-31 (≤ midnight UTC)
//   CODE2     — never expires
//   LEGACYCODE — bare code, treated as never-expires (backward compat)
//
// REVOKED_CODES=CODE3,CODE4   — immediate revocation regardless of expiry
// ---------------------------------------------------------------------------
interface AccessCodeEntry {
  expiresAt: Date | null; // null = never expires
}

const REVOKED_SET: ReadonlySet<string> = new Set(
  (process.env.REVOKED_CODES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function parseAccessCodes(): ReadonlyMap<string, AccessCodeEntry> {
  const map = new Map<string, AccessCodeEntry>();
  const raw = process.env.ACCESS_CODES ?? "";
  for (const token of raw.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) {
      // Bare code — never expires (legacy format)
      map.set(trimmed, { expiresAt: null });
    } else {
      const code    = trimmed.slice(0, colon).trim();
      const dateStr = trimmed.slice(colon + 1).trim().toLowerCase();
      if (!code) continue;
      const expiresAt = dateStr === "never" ? null : new Date(dateStr);
      map.set(code, { expiresAt });
    }
  }
  return map;
}

const ACCESS_CODE_MAP = parseAccessCodes();

// ---------------------------------------------------------------------------
// Exported validation
// ---------------------------------------------------------------------------
export interface CodeValidation {
  valid: boolean;
  /** ISO date string of expiry; omitted when code never expires or is invalid */
  expiresAt?: string;
  /** Only set when valid === false */
  reason?: "not_found" | "expired" | "revoked";
}

export function validateAccessCode(code: string): CodeValidation {
  const trimmed = code.trim();
  if (!trimmed) return { valid: false, reason: "not_found" };

  if (REVOKED_SET.has(trimmed)) {
    return { valid: false, reason: "revoked" };
  }

  const entry = ACCESS_CODE_MAP.get(trimmed);
  if (!entry) return { valid: false, reason: "not_found" };

  if (entry.expiresAt !== null && entry.expiresAt <= new Date()) {
    return { valid: false, reason: "expired" };
  }

  return {
    valid: true,
    ...(entry.expiresAt ? { expiresAt: entry.expiresAt.toISOString() } : {}),
  };
}

/** Convenience alias — returns true only if the code is valid and non-expired */
export function isValidAccessCode(code: string): boolean {
  return validateAccessCode(code).valid;
}
