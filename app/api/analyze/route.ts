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
  extractIP,
} from "@/src/lib/rate-limiter";
import { validateAccessCode, FREE_CHAR_LIMIT } from "@/src/lib/plans";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // ── 0. Env check ──────────────────────────────────────────────────────
  const envCheck = checkEnvVars();
  if (!envCheck.ok) {
    return NextResponse.json({ error: envCheck.message }, { status: 503 });
  }

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
  //   Client sends X-Access-Code; server validates expiry + revoke list.
  //   isPaid is NEVER derived from a client trust flag.
  const accessCode     = req.headers.get("x-access-code") ?? "";
  const codeValidation = validateAccessCode(accessCode);
  const isPaid         = codeValidation.valid;

  // ── 3a. Paid-tier: per-code monthly usage cap (optional) ──────────────
  if (isPaid) {
    const codeCheck = checkCodeUsage(accessCode);
    if (!codeCheck.ok) {
      return NextResponse.json(
        { error: "Access code monthly limit reached. Contact support for a new code." },
        { status: 429 }
      );
    }
  }

  // ── 3b. Free-tier: monthly quota by IP + UA fingerprint ───────────────
  if (!isPaid) {
    const quotaCheck = checkQuota(ip, ua);
    if (!quotaCheck.ok) {
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

    // ── 4. Free-tier character limit ─────────────────────────────────────
    if (!isPaid && rfpText.length > FREE_CHAR_LIMIT) {
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
    //   Free  → max 1 LLM call (maxRetries=0 in validateWithRetry);
    //           parse failure → graceful fallback, no second call.
    //   Paid  → up to 2 calls in validateWithRetry + optional source-fix retry.
    const { result, meta } = await analyzeRFP(rfpText, { isPaid });

    // ── 6. Decrement usage counters on success ─────────────────────────
    const quotaRemaining = isPaid
      ? (decrementCodeUsage(accessCode), undefined)
      : decrementQuota(ip, ua);

    console.log("[telemetry]", {
      doc_length:  rfpText.length,
      timestamp:   new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      plan:        isPaid ? "paid" : "free",
      partial:     meta.partial,
      success:     true,
    });

    return NextResponse.json({
      ...result,
      _rfp_meta: { ...meta, quota_remaining: quotaRemaining },
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

// Avoids importing FREE_MONTHLY_QUOTA (a module-level side-effectful parse)
// into this expression — just inline the default for the error message.
const FREE_MONTHLY_QUOTA_MSG = process.env.FREE_MONTHLY_QUOTA ?? "10";
