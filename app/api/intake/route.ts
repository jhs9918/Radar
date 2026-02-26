/**
 * POST /api/intake        — store text, get back a short token (5-min TTL, one-time use)
 * GET  /api/intake?token= — redeem token, get text back
 *
 * Used by the Chrome extension to avoid passing large content in URLs.
 * Text is held in server process memory only — never written to disk or logs.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

interface Entry {
  text: string;
  expiresAt: number;
}

// In-memory store. Resets on server restart — acceptable for MVP.
const store = new Map<string, Entry>();

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TEXT_BYTES = 100_000; // ~100 KB hard cap

function evictExpired() {
  const now = Date.now();
  for (const [key, val] of store) {
    if (val.expiresAt < now) store.delete(key);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: unknown = body?.text;

    if (typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json({ error: "text must be a non-empty string." }, { status: 400 });
    }

    const trimmed = text.slice(0, MAX_TEXT_BYTES);

    evictExpired();

    const token = crypto.randomBytes(20).toString("hex");
    store.set(token, { text: trimmed, expiresAt: Date.now() + TTL_MS });

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Failed to store text." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Missing or invalid token." }, { status: 400 });
  }

  const entry = store.get(token);

  if (!entry || entry.expiresAt < Date.now()) {
    store.delete(token);
    return NextResponse.json({ error: "Token expired or not found." }, { status: 404 });
  }

  store.delete(token); // one-time use
  return NextResponse.json({ text: entry.text });
}
