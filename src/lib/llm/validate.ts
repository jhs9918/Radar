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

/**
 * Extract human-readable field paths from a ZodError message string.
 * e.g.  ["goNoGo","risk_flags",4,"reference"]  →  "goNoGo.risk_flags[4].reference"
 */
function zodPathsFromError(err: unknown): string[] {
  if (!(err instanceof z.ZodError)) return [];
  return err.errors.map((e) => {
    const parts = e.path.map((p, i) =>
      typeof p === "number" ? `[${p}]` : (i === 0 ? p : `.${p}`)
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
    if (maxRetries === 0) throw firstError;

    console.error("[LLM] First attempt failed, retrying.", {
      error: firstError instanceof Error ? firstError.message : String(firstError),
      raw: raw.slice(0, 500),
    });
  }

  const retryRaw = await callLLM(buildFixPrompt(raw, firstError), systemPrompt);

  try {
    const parsed = JSON.parse(extractJSON(retryRaw));
    return schema.parse(parsed);
  } catch (secondError) {
    console.error("[LLM] Retry also failed.", {
      error: secondError instanceof Error ? secondError.message : String(secondError),
      raw: retryRaw.slice(0, 500),
    });
    throw new Error("AI output could not be validated after retry. Please try again.");
  }
}
