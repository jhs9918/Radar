import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// In-memory short-lived token store (5-min TTL)
// Note: resets on server restart — acceptable for MVP
const tokenStore = new Map<string, { text: string; expiresAt: number }>();

const TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup expired tokens periodically
function cleanup() {
  const now = Date.now();
  for (const [key, val] of tokenStore) {
    if (val.expiresAt < now) tokenStore.delete(key);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json({ error: "Invalid text." }, { status: 400 });
    }

    cleanup();

    const token = crypto.randomBytes(16).toString("hex");
    tokenStore.set(token, { text: text.slice(0, 50000), expiresAt: Date.now() + TTL_MS });

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Failed to create prefill token." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const entry = tokenStore.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    tokenStore.delete(token ?? "");
    return NextResponse.json({ error: "Token expired or not found." }, { status: 404 });
  }

  tokenStore.delete(token); // one-time use
  return NextResponse.json({ text: entry.text });
}
