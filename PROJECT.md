# RFP Radar — MVP Build Brief (Web App + Minimal Chrome Extension)

**Goal:** Ship a standalone web app in **3–7 days** that turns an RFP / client requirements doc into:
1) Executive Summary  
2) Clarifying Questions (with citations to sections)  
3) Proposal Outline (mirrors requested response structure)  
4) Go / No-Go Checklist + Risk Flags (lightweight, not “predictive”)

**Target persona (MVP focus):** **Agencies & consultants** (marketing/IT/creative) who respond to RFPs/RFQs and need faster go/no-go + first-draft scaffolding.

---

## Product Positioning (1 sentence)

**“Not just a summary — RFP Radar gives you a Go/No-Go decision, targeted clarifying questions, and a proposal outline you can paste into your response doc.”**

---

## MVP Scope (Must Ship)

### A) Web App (Primary Product)
**Core flow:** Paste text or upload PDF → Analyze → View results in 4 tabs → Copy/Export.

**Inputs**
- Paste text (primary)
- Upload PDF (best-effort extraction)
- Optional: choose template preset (Agency / SaaS / Gov-lite) *(optional in week 1)*

**Outputs (4 tabs)**
1) **Executive Summary**
   - Scope / deliverables
   - Constraints (technical/legal/compliance mentioned)
   - Timeline & milestones
   - Evaluation criteria (and weights if present)
   - Submission requirements checklist (format, deadlines, portals, attachments)

2) **Clarifying Questions (with references)**
   - Grouped: Scope, Timeline, Budget/Pricing, Legal/Terms, Security/Compliance, Evaluation
   - Each question should include **“Reference:”** (section heading or quoted snippet ≤ 25 words)
   - Goal: reduce “generic questions” and make output defensible

3) **Proposal Outline (RFP-structured)**
   - Detect requested response structure (headings like “Approach”, “Methodology”, “Team”, “Pricing”, “Case studies”)
   - Output a clean outline + bullet starters
   - Explicit disclaimer: “Draft scaffold — requires your specifics.”

4) **Go/No-Go + Risk Flags**
   - Checklist with reasons, not a black-box prediction
   - Risk flags:
     - Unclear scope / missing budget
     - Unrealistic timeline
     - Incumbent bias signals (if present)
     - Unusual payment terms
     - Heavy compliance requirements
   - Output format:
     - “Recommendation: Go / Maybe / No-Go”
     - “Top 5 reasons”
     - “Questions to resolve before Go”

**Export**
- Copy-to-clipboard for each tab
- Export Markdown
- (Optional) Export DOCX/PDF in week 2

**Data handling**
- Default: do **not** store full documents (process in-memory)
- Store minimal telemetry: doc length, timestamp, plan tier, success/fail
- Add a clear “Privacy” page: what is stored vs not stored

---

### B) Minimal Chrome Extension (Secondary, but MVP-friendly)
**Goal:** “Highlight text → Send to RFP Radar → Opens web app with prefilled content.”

**Features**
- Context menu: “Analyze selected text with RFP Radar”
- Popup: textarea + “Analyze” button
- Sends text to web app via URL param (or short-lived token) and opens new tab
- No login required for beta (optional simple key)

**Non-goals (Week 1)**
- No full-page scraping
- No PDF parsing inside extension
- No deep portal integrations

---

## What NOT To Build (Hard Scope Cuts)
- No content library / answer reuse (Loopio-style)
- No team collaboration, assignments, permissions
- No CRM integrations
- No heavy compliance modules (FedRAMP/FAR/CAS) beyond “flagging mentions”
- No “final answers” that pretend certainty — always “draft scaffold”
- No complex PDF table extraction perfection (best-effort only)

---

## UX / Screens (IA)
1) **Landing**: value proposition + “Try with sample RFP” + pricing
2) **Analyze**: paste/upload + preset + analyze button
3) **Results**: tabs (Summary / Questions / Outline / Go-NoGo) + copy/export
4) **Pricing**: Starter/Pro/Team (simple)
5) **Privacy**: simple, explicit

---

## Prompting Contract (JSON Output)
All LLM calls must return **JSON** matching schemas below. App validates JSON; if invalid, retry once with “Fix JSON” prompt.

### Schema 1: Executive Summary
```json
{
  "meta": { "doc_type": "RFP|RFQ|Brief|Other", "industry_guess": "string|null", "confidence": 0.0 },
  "key_dates": [{ "label": "string", "date": "YYYY-MM-DD|null", "source": "string" }],
  "scope": ["string"],
  "constraints": ["string"],
  "deliverables": ["string"],
  "evaluation_criteria": [{ "criterion": "string", "weight": "string|null", "source": "string" }],
  "submission_requirements": ["string"],
  "unknowns": ["string"]
}
```

### Schema 2: Clarifying Questions
```json
{
  "questions": [
    {
      "category": "Scope|Timeline|Budget|Legal|Security|Evaluation|Submission|Other",
      "question": "string",
      "why_it_matters": "string",
      "reference": "string"
    }
  ]
}
```

### Schema 3: Proposal Outline
```json
{
  "outline": [
    {
      "section_title": "string",
      "notes": ["string"],
      "source_hint": "string|null"
    }
  ],
  "assumptions_needed": ["string"]
}
```

### Schema 4: Go/No-Go
```json
{
  "recommendation": "GO|MAYBE|NO_GO",
  "top_reasons": ["string"],
  "risk_flags": [{ "flag": "string", "severity": "LOW|MED|HIGH", "reference": "string" }],
  "what_to_resolve": ["string"]
}
```

---

## MVP Pricing (Initial Suggestion)
- **Starter:** $19–$29/mo (10–20 docs/month)
- **Pro:** $49–$79/mo (50+ docs/month, presets, better exports)
- **Team:** $99–$199/mo (shared workspace *later*, higher limits)

**Week-1 billing:** optional — can start with “free beta + waitlist for paid” or LemonSqueezy/Stripe simple checkout.

---

## Engineering Notes
- Reliability > features. Fail safely.
- Always show a **disclaimer**: “AI output may be wrong; verify against the original RFP.”
- When unsure, output must include `"unknowns"` and/or risk flags.
- Limit quoted references to short snippets (≤ 25 words).

---

## Dev Checklist (7 days)
**Day 1**
- Repo + project scaffolding
- UI skeleton: Analyze + Results tabs
- Implement JSON schemas + renderer

**Day 2**
- Implement LLM calls for Summary + Questions
- Add sample RFP + “Try demo” flow

**Day 3**
- Add Outline + Go/No-Go generation
- Add robust retry-on-invalid-JSON

**Day 4**
- Export markdown
- Add privacy page + telemetry minimal

**Day 5**
- Chrome extension: selected text → open app prefilled
- Basic rate limiting / usage caps

**Day 6**
- Beta onboarding (manual): 10 users
- Fix top UX issues, prompt tuning

**Day 7**
- Launch landing page
- Ship extension (submit if ready; otherwise manual install)
- Collect metrics: analyses/day, time-to-output, user rating per tab

---

## Success Metrics (Week 1)
- 10 beta users onboarded
- ≥ 60% say “questions list is useful”
- ≥ 40% say “go/no-go saved me time”
- ≥ 20% conversion intent (willingness to pay, even if not charged yet)

