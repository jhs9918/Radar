import { createHash } from "crypto";
import { z } from "zod";
import { callLLM } from "./client";

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const start = raw.search(/[{[]/);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);

  return raw.trim();
}

/** SHA-256 prefix — identifies the response without storing content. */
function shortHash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

/**
 * Safe parse-failure logger.
 * Always logs: error message, response length, content hash.
 * Only logs a raw snippet when LOG_LLM_RAW=true (local dev only).
 * Never logs API keys or full document content.
 */
function logParseError(label: string, raw: string, err: unknown): void {
  const entry: Record<string, unknown> = {
    error: err instanceof Error ? err.message : String(err),
    raw_length: raw.length,
    raw_hash: shortHash(raw),
  };
  if (process.env.LOG_LLM_RAW === "true") {
    entry.raw_snippet = raw.slice(0, 200);
  }
  console.error(label, entry);
}

/**
 * Extract human-readable field paths from a ZodError.
 * e.g.  ["goNoGo","risk_flags",4,"reference"]  →  "goNoGo.risk_flags[4].reference"
 */
function zodPathsFromError(err: unknown): string[] {
  if (!(err instanceof z.ZodError)) return [];
  return err.issues.map((e) => {
    const parts = e.path.map((p, i) =>
      typeof p === "number" ? `[${p}]` : (i === 0 ? String(p) : `.${String(p)}`)
    );
    return parts.join("") + ` — ${e.message}`;
  });
}

function buildFixPrompt(raw: string, zodErr?: unknown): string {
  const paths = zodPathsFromError(zodErr);
  const pathBlock =
    paths.length > 0
      ? `\nSPECIFIC FIELDS THAT FAILED VALIDATION (fix ONLY these):\n${paths.map((p) => `  • ${p}`).join("\n")}\n`
      : "";

  return `Your previous response failed schema validation. Fix ONLY the listed fields; keep everything else identical.
${pathBlock}
ORIGINAL RESPONSE:
${raw}

RULES:
1. Return ONLY valid JSON. No markdown fences, no extra text.
2. Every "source" and "reference" field MUST start with:
   - "Quote: <verbatim RFP text ≤ 25 words>"  ← preferred
   - "Section: <exact verbatim heading>"
   NEVER use "RFP Document", "The document", bare section numbers, or any other format.
3. If a Quote exceeds 25 words, trim to the most specific ≤ 25-word phrase.
4. industry_guess must be an array of strings, not a single string.
5. summary.assumptions and summary.risk_indicators must be present (can be []).`;
}

export async function validateWithRetry<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userMessage: string,
  maxRetries = 1
): Promise<T> {
  const raw = await callLLM(userMessage, systemPrompt);

  let firstError: unknown;
  try {
    const parsed = JSON.parse(extractJSON(raw));
    return schema.parse(parsed);
  } catch (err) {
    firstError = err;
    if (maxRetries === 0) {
      logParseError("[LLM] Parse failed (free tier, no retry).", raw, firstError);
      throw firstError;
    }
    logParseError("[LLM] First attempt failed, retrying.", raw, firstError);
  }

  const retryRaw = await callLLM(buildFixPrompt(raw, firstError), systemPrompt);

  try {
    const parsed = JSON.parse(extractJSON(retryRaw));
    return schema.parse(parsed);
  } catch (secondError) {
    logParseError("[LLM] Retry also failed.", retryRaw, secondError);
    throw new Error("AI output could not be validated after retry. Please try again.");
  }
}
