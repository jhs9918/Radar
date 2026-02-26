import { NextRequest, NextResponse } from "next/server";
import { analyzeRFP } from "@/src/server/analyze";
import { extractTextFromPDF } from "@/src/lib/pdf/extract";
import { checkEnvVars } from "@/src/lib/llm/client";
import {
  checkRateLimit,
  checkQuota,
  decrementQuota,
  checkCodeUsage,
  decrementCodeUsage,
  getCredits,
  decrementCredits,
  extractIP,
} from "@/src/lib/rate-limiter";
import { validateAccessCode, FREE_CHAR_LIMIT } from "@/src/lib/plans";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  console.log("[analyze] POST received");

  // ── 0. Env check ──────────────────────────────────────────────────────
  const envCheck = checkEnvVars();
  if (!envCheck.ok) {
    console.error("[analyze] env check failed:", envCheck.message);
    return NextResponse.json({ error: envCheck.message }, { status: 503 });
  }
  console.log("[analyze] env ok, provider:", process.env.LLM_PROVIDER ?? "anthropic", "model:", process.env.LLM_MODEL ?? "(default)");

  const ip = extractIP(req);
  const ua = req.headers.get("user-agent") ?? "unknown";

  // ── 1. Rate limit (all users, by IP) ─────────────────────────────────
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.ok) {
    return NextResponse.json(
      { error: `Too many requests. Please wait ${rateCheck.retryAfter} seconds.` },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
    );
  }

  // ── 2. Server-authoritative plan detection ────────────────────────────
  //   Priority: Pro access code > credits > free
  //   isPaid: valid Pro code     → full retry, no char limit, no monthly quota
  //   isCredits: server credits  → full retry, no char limit, no monthly quota, costs 1 credit
  //   Neither                    → free tier rules apply
  const accessCode     = req.headers.get("x-access-code") ?? "";
  const codeValidation = validateAccessCode(accessCode);
  const isPaid         = codeValidation.valid;

  const creditsBalance = !isPaid ? getCredits(ip, ua) : 0;
  const isCredits      = !isPaid && creditsBalance > 0;
  const effectivelyPaid = isPaid || isCredits;

  // ── 3a. Pro code: per-code monthly usage cap ──────────────────────────
  if (isPaid) {
    const codeCheck = checkCodeUsage(accessCode);
    if (!codeCheck.ok) {
      return NextResponse.json(
        { error: "Access code monthly limit reached. Contact support for a new code." },
        { status: 429 }
      );
    }
  }

  // ── 3b. Free/credits: monthly quota by IP + UA fingerprint ───────────
  if (!effectivelyPaid) {
    const quotaCheck = checkQuota(ip, ua);
    if (!quotaCheck.ok) {
      console.log("[event]", { name: "quota_blocked", plan: "free", timestamp: new Date().toISOString() });
      return NextResponse.json(
        {
          error: `Free tier monthly limit reached (${FREE_MONTHLY_QUOTA_MSG} analyses/month). Enter an access code to continue.`,
          quota_remaining: 0,
        },
        { status: 429 }
      );
    }
  }

  const startTime = Date.now();

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let rfpText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const text = formData.get("text") as string | null;
      if (file) {
        rfpText = await extractTextFromPDF(Buffer.from(await file.arrayBuffer()));
      } else if (text) {
        rfpText = text;
      } else {
        return NextResponse.json({ error: "No text or file provided." }, { status: 400 });
      }
    } else {
      const body = await req.json();
      rfpText = body?.text ?? "";
    }

    if (!rfpText || rfpText.trim().length < 100) {
      return NextResponse.json(
        { error: "Document text is too short. Please provide a valid RFP." },
        { status: 400 }
      );
    }

    // ── 4. Character limit (free only — credits and pro have no limit) ────
    if (!effectivelyPaid && rfpText.length > FREE_CHAR_LIMIT) {
      return NextResponse.json(
        {
          error:
            `Document exceeds the free tier limit (${FREE_CHAR_LIMIT.toLocaleString()} characters). ` +
            `Paste the key sections only (Scope, Timeline, Evaluation, Submission), ` +
            `or enter an access code to analyze the full document.`,
          quota_remaining: checkQuota(ip, ua).remaining,
        },
        { status: 413 }
      );
    }

    // ── 5. Run analysis ───────────────────────────────────────────────────
    const { result, meta } = await analyzeRFP(rfpText, { isPaid: effectivelyPaid });

    // ── 6. Decrement usage counters on success ────────────────────────────
    let quotaRemaining: number | undefined;
    let creditsRemaining: number | undefined;

    if (isPaid) {
      decrementCodeUsage(accessCode);
    } else if (isCredits) {
      const next = decrementCredits(ip, ua);
      creditsRemaining = next < 0 ? 0 : next;
    } else {
      quotaRemaining = decrementQuota(ip, ua);
    }

    const plan = isPaid ? "paid" : isCredits ? "credits" : "free";

    console.log("[telemetry]", {
      doc_length:  rfpText.length,
      timestamp:   new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      plan,
      partial:     meta.partial,
      success:     true,
    });
    console.log("[event]", {
      name: meta.partial ? "analyze_fallback" : "analyze_success",
      plan,
      partial: meta.partial,
      inputCharCount: rfpText.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      ...result,
      _rfp_meta: { ...meta, plan, quota_remaining: quotaRemaining, credits_remaining: creditsRemaining },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    console.error("[analyze] error:", message);
    console.log("[telemetry]", {
      timestamp:   new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      success:     false,
      error:       message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const FREE_MONTHLY_QUOTA_MSG = process.env.FREE_MONTHLY_QUOTA ?? "10";
