import { z } from "zod";

// ---------------------------------------------------------------------------
// Source field validation
// Every "source" / "reference" must start with "Section:" or "Quote:"
// and Quotes must be ≤ 25 words.
// ---------------------------------------------------------------------------
// Accept any non-empty string — source quality is checked separately via
// isGoodSource() in collectBadSources(). Hard schema rejection caused too
// many false-negative parse failures when the model used slightly different
// citation formats.
const SourceField = z.string().min(1);

export function isGoodSource(s: string): boolean {
  if (!s.startsWith("Section:") && !s.startsWith("Quote:")) return false;
  if (s.startsWith("Quote:")) {
    const words = s.slice("Quote:".length).trim().split(/\s+/).filter(Boolean);
    if (words.length > 25) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Schema 1: Executive Summary
// ---------------------------------------------------------------------------
export const ExecutiveSummarySchema = z.object({
  meta: z.object({
    doc_type: z.enum(["RFP", "RFQ", "Brief", "Other"]).catch("Other"),
    industry_guess: z.array(z.string()).max(3).catch([]), // e.g. ["Government", "Technology"]
    confidence: z.number().min(0).max(1).catch(0.5),
  }),
  key_dates: z.array(
    z.object({
      label: z.string(),
      date: z.string().nullable(),           // YYYY-MM-DD only, or null
      time: z.string().nullable().optional(), // e.g. "5:00 PM EST", if present
      source: SourceField,
    })
  ),
  scope: z.array(z.string()),
  constraints: z.array(z.string()),
  deliverables: z.array(z.string()),
  evaluation_criteria: z.array(
    z.object({
      criterion: z.string(),
      weight: z.string().nullable(),
      source: SourceField,
    })
  ),
  submission_requirements: z.array(z.string()),
  submission_requirements_detailed: z
    .array(
      z.object({
        item: z.string(),
        source: SourceField,
      })
    )
    .optional(),
  assumptions: z.array(z.string()),
  risk_indicators: z.array(
    z.object({
      item: z.string(),
      severity: z.enum(["LOW", "MED", "HIGH"]).catch("MED"),
      source: SourceField,
    })
  ),
  unknowns: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Schema 2: Clarifying Questions
// ---------------------------------------------------------------------------
export const ClarifyingQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      category: z.enum([
        "Scope",
        "Timeline",
        "Budget",
        "Legal",
        "Security",
        "Evaluation",
        "Submission",
        "Other",
      ]).catch("Other"),
      question: z.string(),
      why_it_matters: z.string(),
      reference: SourceField,
    })
  ),
});

// ---------------------------------------------------------------------------
// Schema 3: Proposal Outline
// ---------------------------------------------------------------------------
export const ProposalOutlineSchema = z.object({
  outline: z.array(
    z.object({
      section_title: z.string(),
      notes: z.array(z.string()),
      source_hint: z.string().nullable(),
    })
  ),
  assumptions_needed: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Schema 4: Go/No-Go
// ---------------------------------------------------------------------------
export const GoNoGoSchema = z.object({
  recommendation: z.enum(["GO", "MAYBE", "NO_GO"]).catch("MAYBE"),
  top_reasons: z.array(z.string()),
  risk_flags: z.array(
    z.object({
      flag: z.string(),
      severity: z.enum(["LOW", "MED", "HIGH"]).catch("MED"),
      reference: SourceField,
    })
  ),
  what_to_resolve: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Combined schema (single LLM call)
// ---------------------------------------------------------------------------
export const AnalysisResultSchema = z.object({
  summary: ExecutiveSummarySchema,
  questions: ClarifyingQuestionsSchema,
  outline: ProposalOutlineSchema,
  goNoGo: GoNoGoSchema,
});

export type ExecutiveSummary = z.infer<typeof ExecutiveSummarySchema>;
export type ClarifyingQuestions = z.infer<typeof ClarifyingQuestionsSchema>;
export type ProposalOutline = z.infer<typeof ProposalOutlineSchema>;
export type GoNoGo = z.infer<typeof GoNoGoSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
