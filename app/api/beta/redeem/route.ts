import { NextRequest, NextResponse } from "next/server";
import {
  extractIP,
  addCredits,
  checkBetaRedemptionCap,
  incrementBetaRedemption,
} from "@/src/lib/rate-limiter";
import { BETA_CODES_SET, BETA_CREDITS_AMOUNT } from "@/src/lib/plans";

export async function POST(req: NextRequest) {
  let code: string;
  try {
    const body = await req.json();
    code = (body?.code ?? "").trim().toUpperCase();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  if (!BETA_CODES_SET.has(code)) {
    return NextResponse.json({ error: "Invalid beta code." }, { status: 400 });
  }

  const cap = checkBetaRedemptionCap(code);
  if (!cap.ok) {
    return NextResponse.json(
      { error: "This beta code has reached its monthly redemption limit." },
      { status: 429 }
    );
  }

  const ip = extractIP(req);
  const ua = req.headers.get("user-agent") ?? "unknown";
  const newTotal = addCredits(ip, ua, BETA_CREDITS_AMOUNT);
  incrementBetaRedemption(code);

  console.log("[beta] credits granted", {
    amount: BETA_CREDITS_AMOUNT,
    total: newTotal,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, creditsGranted: BETA_CREDITS_AMOUNT, creditsTotal: newTotal });
}
