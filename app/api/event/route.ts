import { NextRequest, NextResponse } from "next/server";

// Safe event names — only these are accepted.
const ALLOWED_EVENTS = new Set([
  "analyze_success",
  "analyze_fallback",
  "quota_blocked",
  "unlock_opened",
  "unlock_success",
  "feedback_clicked",
  "beta_redeemed",
]);

// Safe prop keys — raw content must never appear here.
const ALLOWED_PROPS = new Set([
  "plan", "page", "success", "partial", "inputCharCount", "tab", "creditsGranted",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, props } = body;

    if (!name || !ALLOWED_EVENTS.has(name)) {
      return NextResponse.json({ error: "Unknown event name." }, { status: 400 });
    }

    const safeProps: Record<string, unknown> = {};
    if (props && typeof props === "object") {
      for (const key of ALLOWED_PROPS) {
        if (props[key] !== undefined) safeProps[key] = props[key];
      }
    }

    console.log("[event]", { name, ...safeProps, timestamp: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
