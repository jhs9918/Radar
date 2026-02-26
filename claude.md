# CLAUDE CODE — Project Rules & Structure (RFP Radar)

You are Claude Code working in a fresh repo. Your job is to implement the **RFP Radar MVP** exactly as specified in `PROJECT.md` with tight scope.

---

## 0) Non-negotiables
- **Ship something usable fast (3–7 days).**
- **Web app is the main product.** Chrome extension is minimal helper.
- **No scope creep.** If a feature is not in `PROJECT.md` “Must Ship”, do not build it.
- **Reliability > features.** Fail safely and show clear errors.
- If something is unclear, create a TODO note and proceed with the safest assumption.

---

## 1) Tech Assumptions (choose defaults)
Pick a simple stack and stick to it:
- Web: **Next.js (App Router) + TypeScript**
- UI: minimal (Tailwind optional)
- API route for LLM calls
- Storage: none for documents; minimal telemetry optional
- Auth: **none** for MVP (or a simple shared access code env var)

LLM Provider:
- Use an environment variable `LLM_PROVIDER` and implement one provider first (OpenAI recommended).
- Keep provider layer thin so it can swap later.

---

## 2) Repository Structure (required)
Create this structure:

```
rfp-radar/
  README.md
  PROJECT.md
  claud.md
  app/
    (Next.js app)
  src/
    lib/
      llm/
        client.ts
        prompts.ts
        schemas.ts
        validate.ts
      pdf/
        extract.ts
      export/
        markdown.ts
    server/
      analyze.ts
    ui/
      components/
  extension/
    manifest.json
    src/
      background.ts
      popup.html
      popup.ts
  .env.example
```

Notes:
- Keep prompts and JSON schemas in `src/lib/llm/`.
- All model outputs must be validated against schemas.

---

## 3) LLM Output Contract (must enforce)
- The model MUST return JSON matching schemas in `PROJECT.md`.
- Validate JSON. If invalid:
  1) Retry once with a “Fix JSON to match schema” prompt (no extra content).
  2) If still invalid, show a user-friendly error and log the raw output (server-only).

Also:
- Add a disclaimer in UI: “AI output may be wrong; verify against original RFP.”

---

## 4) Prompt Design Rules
- Use **structured prompts** with:
  - Role + goal
  - Explicit JSON schema
  - “If unknown, put in unknowns”
  - Require `reference` fields with section headings or short quotes (≤ 25 words)
- Never generate “final answers”. Generate scaffolds and checklists only.

---

## 5) Privacy + Data Handling
- Do not persist the full RFP text by default.
- If telemetry is added:
  - store doc length, timestamp, success/fail, model used
  - never store raw content
- Add a simple `/privacy` page that states the above.

---

## 6) Chrome Extension (minimal scope)
- Implement ONLY:
  - Context menu: analyze selected text
  - Popup: textarea + analyze button
  - It opens the web app with prefilled content (via URL param or short-lived token endpoint)
- Do NOT implement:
  - full-page scraping
  - PDF parsing in extension
  - logins and accounts

---

## 7) Implementation Priorities
1) Web app core flow (paste → analyze → tabs → copy/export)
2) Robust JSON validation + retry
3) Basic PDF extraction (best-effort)
4) Markdown export
5) Chrome extension minimal

If time runs out, prioritize (1)–(3) and ship.

---

## 8) Definition of Done
- `npm run dev` starts web app successfully
- Can paste sample RFP and get all 4 tabs populated
- Copy buttons work
- Markdown export works
- Extension can send selected text and open results
- Clear error handling and disclaimers

---

## 9) Deliverables Checklist
- [ ] Web app pages: Landing, Analyze, Results, Pricing (optional), Privacy
- [ ] LLM schemas + validator
- [ ] 4 analyzers: summary, questions, outline, go/no-go
- [ ] Export markdown
- [ ] Extension: manifest v3 + background + popup
- [ ] `.env.example` with required keys
- [ ] README with setup instructions

---

## 10) Communication Style (when reporting progress)
- Report in bullets:
  - what changed
  - how to run it
  - known issues / TODOs
- If blocked, propose the simplest workaround (no long debates).

