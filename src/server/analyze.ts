import { AnalysisResultSchema, isGoodSource, type AnalysisResult } from "../lib/llm/schemas";
import { validateWithRetry } from "../lib/llm/validate";
import { COMBINED_SYSTEM_PROMPT, buildUserPrompt } from "../lib/llm/prompts";
import { callLLM } from "../lib/llm/client";
import type { AnalyzeMeta } from "../lib/plans";

export interface AnalyzeOutput {
  result: AnalysisResult;
  meta: Omit<AnalyzeMeta, "quota_remaining">;
}

// Minimal valid result shown when free-tier LLM call can't be parsed
function buildFallbackResult(hint: string): AnalysisResult {
  return {
    summary: {
      meta: { doc_type: "Other", industry_guess: [], confidence: 0 },
      key_dates: [],
      scope: [],
      constraints: [],
      deliverables: [],
      evaluation_criteria: [],
      submission_requirements: [],
      assumptions: [],
      risk_indicators: [],
      unknowns: [hint],
    },
    questions: { questions: [] },
    outline:   { outline: [], assumptions_needed: [] },
    goNoGo:    { recommendation: "MAYBE", top_reasons: [], risk_flags: [], what_to_resolve: [hint] },
  };
}

// Collect all source/reference fields that fail isGoodSource
function collectBadSources(result: AnalysisResult): string[] {
  const bad: string[] = [];
  for (const d of result.summary.key_dates)
    if (!isGoodSource(d.source)) bad.push(`key_dates["${d.label}"].source`);
  for (const e of result.summary.evaluation_criteria)
    if (!isGoodSource(e.source)) bad.push(`evaluation_criteria["${e.criterion}"].source`);
  for (const r of result.summary.risk_indicators)
    if (!isGoodSource(r.source)) bad.push(`risk_indicators["${r.item}"].source`);
  for (const q of result.questions.questions)
    if (!isGoodSource(q.reference)) bad.push(`questions["${q.question.slice(0, 40)}"].reference`);
  for (const f of result.goNoGo.risk_flags)
    if (!isGoodSource(f.reference)) bad.push(`risk_flags["${f.flag.slice(0, 40)}"].reference`);
  return bad;
}

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = raw.search(/[{[]/);
  const end   = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
}

export async function analyzeRFP(
  text: string,
  opts?: { isPaid?: boolean }
): Promise<AnalyzeOutput> {
  const isPaid      = opts?.isPaid ?? false;
  const userMessage = buildUserPrompt(text);

  // ── FREE TIER: single call, no retries, graceful fallback ──────────────
  if (!isPaid) {
    try {
      const result = await validateWithRetry(
        AnalysisResultSchema,
        COMBINED_SYSTEM_PROMPT,
        userMessage,
        0   // maxRetries = 0
      );
      return { result, meta: { partial: false, plan: "free" } };
    } catch {
      const hint =
        "AI output could not be parsed. For best results, paste sections that include " +
        "headings like Timeline, Evaluation Criteria, and Submission Requirements.";
      return {
        result: buildFallbackResult(hint),
        meta:   { partial: true, hint, plan: "free" },
      };
    }
  }

  // ── PAID TIER: full retry + source grounding check ─────────────────────
  let result = await validateWithRetry(
    AnalysisResultSchema,
    COMBINED_SYSTEM_PROMPT,
    userMessage
  );

  const badSources = collectBadSources(result);
  if (badSources.length > 0) {
    console.error("[analyze] Bad sources, retrying targeted fix:", badSources);
    const sourceFixPrompt = `Fix ONLY the invalid source/reference fields below — keep everything else identical.

INVALID FIELDS:
${badSources.map((s) => `  - ${s}`).join("\n")}

RULES:
- Must start with "Section: <verbatim heading>" or "Quote: <≤25 verbatim words>".
- Never use "RFP Document" or vague phrases.
- If no quote/heading exists, move the item to unknowns.

Return the complete fixed JSON object.`;

    try {
      const retryRaw = await callLLM(sourceFixPrompt, COMBINED_SYSTEM_PROMPT);
      result         = AnalysisResultSchema.parse(JSON.parse(extractJSON(retryRaw)));
    } catch (err) {
      console.error("[analyze] Source fix retry failed:", err instanceof Error ? err.message : err);
      throw new Error(
        "Couldn't extract grounded citations; try pasting a larger section that includes headings."
      );
    }
  }

  return { result, meta: { partial: false, plan: "paid" } };
}
