# RFP Radar

Paste or upload any RFP and get instant AI analysis across four tabs:

| Tab | Output |
|---|---|
| **Executive Summary** | Scope, deliverables, timeline, evaluation criteria, submission checklist |
| **Clarifying Questions** | Targeted questions grouped by category, each citing the RFP section |
| **Proposal Outline** | Draft scaffold mirroring the RFP's requested response structure |
| **Go / No-Go** | GO / MAYBE / NO-GO recommendation with risk flags and a resolve checklist |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` — **never commit this file, never paste keys into chat or code**:

```
LLM_PROVIDER=anthropic        # or "openai"
LLM_MODEL=claude-haiku-4-5    # model for the chosen provider
ANTHROPIC_API_KEY=            # required when LLM_PROVIDER=anthropic
OPENAI_API_KEY=               # required when LLM_PROVIDER=openai
```

Obtain keys:
- Anthropic → https://console.anthropic.com/
- OpenAI → https://platform.openai.com/api-keys

### 3. Run the development server

```bash
npm run dev
```

Open http://localhost:3000

The app shows a friendly error message if a required API key is missing — no crash.

---

## LLM Providers

| Scenario | `LLM_PROVIDER` | `LLM_MODEL` |
|---|---|---|
| Dev / test | `anthropic` | `claude-haiku-4-5` |
| Production | `openai` | `gpt-4o-mini` |

One combined LLM call returns all four analysis sections as a single JSON object.
Zod validates the response; on failure it retries once with a fix-JSON prompt.

---

## Chrome Extension — Manual Install

1. **Update the app URL** in both source files before loading:
   - `extension/src/background.ts` → change `WEB_APP_URL`
   - `extension/src/popup.ts` → change `WEB_APP_URL`

2. Open Chrome and navigate to `chrome://extensions`

3. Enable **Developer mode** (toggle, top-right)

4. Click **Load unpacked** → select the `extension/` folder

5. Pin the extension for easy access.

**How the extension works:**
- Right-click selected text → "Analyze with RFP Radar"
- Or open the popup → paste text → click Analyze
- Text is sent via `POST /api/intake` (never in the URL) → returns a short token → opens `/analyze?token=...`
- Token is one-time-use and expires in 5 minutes

---

## Project Structure

```
app/
  api/
    analyze/route.ts      POST — run LLM analysis on RFP text or PDF
    intake/route.ts       POST/GET — short-lived token store for extension
  analyze/page.tsx        Input page (paste text or upload PDF)
  results/page.tsx        Results page (4 tabs, copy, export)
  pricing/page.tsx        Pricing tiers (static)
  privacy/page.tsx        Privacy policy

src/
  lib/
    llm/
      client.ts           callLLM() + checkEnvVars() — Anthropic & OpenAI
      prompts.ts          Combined system prompt + buildUserPrompt()
      schemas.ts          Zod schemas for all 4 outputs + AnalysisResultSchema
      validate.ts         validateWithRetry() — parse JSON, retry once on failure
    pdf/
      extract.ts          pdf-parse wrapper (best-effort, server-side only)
    export/
      markdown.ts         exportToMarkdown() — all 4 tabs → .md file
  server/
    analyze.ts            analyzeRFP() — single LLM call
  ui/components/          React components for each tab

extension/
  manifest.json           Manifest V3
  popup.html
  src/
    background.ts         Context menu → POST intake → open tab with token
    popup.ts              Popup UI → POST intake → open tab with token
```

---

## Data Stored vs Not Stored

| Data | Stored? |
|---|---|
| Full RFP text | ❌ Never — processed in-memory only |
| Analysis results | ❌ Never — returned to client, not persisted |
| API keys | ❌ Never logged. Set in `.env.local` only. |
| Extension prefill text | ⏱ In server process memory, max 5 min, one-time-use token |
| Telemetry | ✅ Server log only: doc length, timestamp, success/fail, model used |

The extension always uses `POST /api/intake` to pass text — never via URL parameters — to prevent content from appearing in browser history, server access logs, or referrer headers.

---

## Deploy to Vercel

### 1. Push to GitHub

Make sure your repository is on GitHub (public or private). The `main` branch is what Vercel deploys to production.

### 2. Create a Vercel project

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Vercel auto-detects Next.js — accept the default settings:

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build command | `npm run build` |
| Output directory | `.next` |
| Install command | `npm install` |
| Root directory | `/` (repo root) |

### 3. Set Environment Variables

In Vercel → Project → **Settings → Environment Variables**, add each variable for **Production** (and optionally **Preview**):

| Variable | Required | Value / Notes |
|---|---|---|
| `LLM_PROVIDER` | Yes | `anthropic` or `openai` |
| `ANTHROPIC_API_KEY` | When `LLM_PROVIDER=anthropic` | From [console.anthropic.com](https://console.anthropic.com/) |
| `OPENAI_API_KEY` | When `LLM_PROVIDER=openai` | From [platform.openai.com](https://platform.openai.com/api-keys) |
| `LLM_MODEL` | Recommended | e.g. `claude-haiku-4-5` or `gpt-4o-mini` |
| `FREE_MONTHLY_QUOTA` | Optional | Analyses/IP/month. Default: `10` |
| `FREE_CHAR_LIMIT` | Optional | Max chars for free users. Default: `12000` |
| `RATE_LIMIT_WINDOW_SEC` | Optional | Sliding window in seconds. Default: `600` |
| `RATE_LIMIT_MAX` | Optional | Max requests per window per IP. Default: `10` |
| `ACCESS_CODES` | Optional | Format: `CODE1:2026-12-31,CODE2:never` |
| `REVOKED_CODES` | Optional | Comma-separated codes to revoke immediately |
| `CODE_MONTHLY_MAX` | Optional | Per-code monthly cap. Default: `0` (unlimited) |

> **Security:** Never put real API keys in `.env.example`, commit messages, or PR descriptions. Vercel encrypts env vars at rest and does not expose them in build logs.

**Tip for Preview environments:** Use a lower-cost model (e.g. `claude-haiku-4-5`) for preview deployments to limit API spend during testing.

### 4. Node version

The project targets Node 22. Vercel reads `.nvmrc` automatically — no manual configuration required.

### 5. Deploy

Click **Deploy**. Vercel runs `npm run build` and publishes to `<project>.vercel.app`.

**Environment validation:** If a required API key is missing, `/api/analyze` returns a `503` with a plain English message — no stack trace, no key values. The rest of the site (landing, pricing, privacy) continues to load.

### 6. Preview URLs

Every branch push and pull request gets its own preview URL. Use these to test changes before merging to `main`. Preview deployments share the same env vars unless overridden in Vercel's **Preview** environment scope.

### 7. Connect a custom domain (optional)

Vercel → Project → **Domains** → add your domain → follow the DNS instructions (CNAME or A record). Vercel provisions an HTTPS certificate automatically.

---

## Post-Deploy Smoke Test Checklist

Run through these after every production deploy:

**Core pages**
- [ ] `/` loads — hero, features, and "Analyze" CTA all visible
- [ ] `/pricing` loads — tier cards display without errors
- [ ] `/privacy` loads — AI disclaimer paragraph is present

**Analysis flow**
- [ ] `/analyze` loads — paste textarea and PDF upload input visible
- [ ] Paste a short RFP snippet (>100 chars), click Analyze → results page loads
- [ ] All 4 tabs populate: Executive Summary, Clarifying Questions, Outline, Go/No-Go
- [ ] Each tab has a working **Copy** button (click → paste into a text editor)

**Free-tier limits**
- [ ] Submit text longer than `FREE_CHAR_LIMIT` (default 12 000 chars) → 413 response with a message instructing to trim or enter an access code
- [ ] Exhaust the free quota (`FREE_MONTHLY_QUOTA` calls from one IP) → 429 response with a friendly "monthly limit reached" message and no stack trace

**Paid tier**
- [ ] On `/results`, verify free view shows Summary tab only (or limited preview)
- [ ] Enter a valid `ACCESS_CODE` in the unlock modal → all 4 tabs unlock
- [ ] **Export Markdown** button downloads a `.md` file with all 4 sections
- [ ] Enter an expired or revoked code → modal shows a clear rejection reason

**Extension (if applicable)**
- [ ] Load extension in Chrome (Developer mode → Load unpacked → `extension/`)
- [ ] Select text on any page → right-click → **Analyze with RFP Radar** → `/analyze` opens with text pre-filled
- [ ] Re-use the same token URL → text should be gone (one-time-use)

**Error handling**
- [ ] Temporarily set `ANTHROPIC_API_KEY=bad_value` in Vercel → trigger analysis → confirm `503` JSON response with a user-friendly error and no API key value or stack trace visible

---

## Monitoring & Error Tracking

The app writes structured telemetry via `console.log("[telemetry]", {...})`. Vercel captures all `console` output in **Project → Logs** (filterable by deployment and time).

Telemetry fields logged (no secrets, no RFP content):

| Field | Description |
|---|---|
| `doc_length` | Character count of submitted text |
| `timestamp` | ISO 8601 UTC |
| `duration_ms` | End-to-end analysis time |
| `plan` | `free` or `paid` |
| `partial` | Whether result used fallback parsing |
| `success` | `true` / `false` |

**TODO — Sentry integration (when ready):**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Add `SENTRY_DSN` to Vercel env vars. Key events to capture:
- 500 errors from `/api/analyze`
- JSON validation failures (LLM schema mismatch)
- LLM provider auth / rate-limit errors

---

## Known TODOs

- [ ] Extension icons (`extension/icons/icon16.png`, `icon48.png`, `icon128.png`) — required before publishing to Chrome Web Store
- [ ] Extension TypeScript build step (`tsc` → `.js` output) for production
- [ ] DOCX/PDF export (week 2 scope per project.md)
- [ ] Persistent usage tracking / billing integration (LemonSqueezy / Stripe)
- [ ] Replace in-memory intake/prefill/rate-limit store with Redis for multi-instance deploys
- [ ] Sentry integration (see Monitoring section above)
