import { NextRequest, NextResponse } from "next/server";
import { validateAccessCode } from "@/src/lib/plans";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body?.code === "string" ? body.code : "";

  if (!code) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 400 });
  }

  const result = validateAccessCode(code.trim());
  return NextResponse.json({
    valid:     result.valid,
    plan:      result.valid ? "paid" : null,
    expiresAt: result.expiresAt,   // ISO string or undefined
    reason:    result.reason,      // "not_found" | "expired" | "revoked" | undefined
  });
}
