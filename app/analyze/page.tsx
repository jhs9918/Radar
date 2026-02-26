"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/src/ui/components/FileUpload";
import { PlanBadge } from "@/src/ui/components/PlanBadge";
import { FeedbackButton } from "@/src/ui/components/FeedbackButton";
import type { ClientPlan } from "@/src/lib/plans";

// Must match FREE_CHAR_LIMIT env default on the server
const FREE_CHAR_LIMIT = 12_000;

const SAMPLE_RFP = `REQUEST FOR PROPOSAL
City of Springfield — Digital Transformation Initiative

RFP Number: SP-2024-DT-001
Issue Date: March 1, 2024
Proposal Due: April 15, 2024, 5:00 PM EST

1. INTRODUCTION
The City of Springfield seeks qualified vendors to provide a comprehensive Digital Transformation platform including a citizen portal, integrated payment gateway, and mobile application.

2. SCOPE OF WORK
The selected vendor shall:
- Design and implement a citizen self-service portal
- Integrate with existing legacy ERP system (SAP)
- Develop iOS and Android mobile apps
- Provide training for 200+ staff members
- Deliver 24/7 technical support for 3 years

3. TIMELINE
- Kickoff: May 1, 2024
- Phase 1 (Portal): July 31, 2024
- Phase 2 (Mobile): October 31, 2024
- Full Go-Live: December 1, 2024

4. BUDGET
The City has not disclosed a budget for this project. Vendors should propose a total cost with separate line items for implementation, licensing, and annual support.

5. EVALUATION CRITERIA
- Technical Approach: 30%
- Relevant Experience: 25%
- Cost: 25%
- Project Team: 20%

6. SUBMISSION REQUIREMENTS
Proposals must include:
- Executive Summary (max 2 pages)
- Technical Proposal
- Cost Proposal (separate sealed envelope)
- 3 government client references
- Proof of insurance ($2M general liability)

Submit via: Springfield Procurement Portal by April 15, 2024 at 5:00 PM EST.`;

function AnalyzePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputTab, setInputTab] = useState<"paste" | "upload">("paste");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | undefined>(undefined);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    // Read plan from localStorage
    const planRaw = localStorage.getItem("rfp-radar-plan");
    if (planRaw) {
      try {
        const plan: ClientPlan = JSON.parse(planRaw);
        if (plan.plan !== "free") {
          setIsPaid(true);
          setAccessCode(plan.access_code);
        }
      } catch {}
    }

    const sample = searchParams.get("sample");
    const token = searchParams.get("token");
    const inlineText = searchParams.get("text");

    if (sample === "1") {
      setText(SAMPLE_RFP);
    } else if (token) {
      fetch(`/api/intake?token=${encodeURIComponent(token)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.text) setText(d.text);
        })
        .catch(() =>
          setError("Could not load prefilled text. Please paste manually.")
        );
    } else if (inlineText) {
      const decoded = decodeURIComponent(inlineText).slice(0, 500);
      if (inlineText.length > 500) {
        setError(
          "Selected text was too long for URL transfer. Please paste the full text manually."
        );
      }
      setText(decoded);
    }
  }, [searchParams]);

  const handleFile = (f: File) => {
    setFile(f);
    setFileName(f.name);
    setInputTab("upload");
  };

  const charLimitWarning =
    !isPaid && inputTab === "paste" && text.length > FREE_CHAR_LIMIT;

  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);

    try {
      const extraHeaders: Record<string, string> = {};
      if (accessCode) extraHeaders["x-access-code"] = accessCode;

      let response: Response;

      if (inputTab === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file);
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: extraHeaders,
          body: formData,
        });
      } else {
        if (!text.trim() || text.trim().length < 100) {
          setError("Please paste at least 100 characters of RFP text.");
          setLoading(false);
          return;
        }
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...extraHeaders },
          body: JSON.stringify({ text }),
        });
      }

      if (!response.ok) {
        const { error: msg } = await response.json();
        throw new Error(msg ?? "Analysis failed. Please try again.");
      }

      const result = await response.json();
      // Sync credits count from server response into localStorage (display only)
      const meta = result._rfp_meta;
      if (meta?.credits_remaining !== undefined) {
        const planRaw = localStorage.getItem("rfp-radar-plan");
        if (planRaw) {
          try {
            const p: ClientPlan = JSON.parse(planRaw);
            if (p.plan === "credits") {
              p.credits = meta.credits_remaining;
              localStorage.setItem("rfp-radar-plan", JSON.stringify(p));
            }
          } catch {}
        }
      }
      sessionStorage.setItem("rfp-result", JSON.stringify(result));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">
            RFP Radar
          </Link>
          <div className="flex gap-3 items-center">
            <PlanBadge />
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-1">Analyze RFP</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Paste text or upload a PDF — get 4 tabs of analysis in seconds.
        </p>

        <Tabs value={inputTab} onValueChange={(v) => setInputTab(v as "paste" | "upload")}>
          <TabsList className="mb-4">
            <TabsTrigger value="paste">Paste Text</TabsTrigger>
            <TabsTrigger value="upload">Upload PDF</TabsTrigger>
          </TabsList>

          <TabsContent value="paste">
            <Textarea
              placeholder="Paste your RFP, RFQ, or client brief here..."
              className="min-h-[320px] font-mono text-sm resize-y"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className={`text-xs ${charLimitWarning ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                {text.length.toLocaleString()} characters
                {charLimitWarning && ` — free limit is ${FREE_CHAR_LIMIT.toLocaleString()}`}
              </p>
              {charLimitWarning && (
                <p className="text-xs text-amber-600">
                  Paste key sections only, or{" "}
                  <Link href="/pricing" className="underline">
                    enter an access code
                  </Link>{" "}
                  to analyze the full doc.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload">
            <FileUpload onFile={handleFile} disabled={loading} />
            {fileName && (
              <p className="text-sm text-green-700 mt-2 flex items-center gap-1.5">
                <span>✓</span> {fileName} ready to analyze
              </p>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center gap-4">
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={loading || (inputTab === "paste" ? !text.trim() : !file)}
            className="min-w-[160px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
                Analyzing...
              </span>
            ) : (
              "Analyze RFP"
            )}
          </Button>

          {loading && (
            <p className="text-sm text-muted-foreground">
              AI analysis in progress — usually 15–30 seconds.
            </p>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          AI output may be wrong; verify against the original RFP.
          Your document is not stored — processed in-memory only.{" "}
          <a href="/privacy#anonymize" className="underline">
            How to anonymize
          </a>
        </p>
        <div className="mt-3">
          <FeedbackButton page="analyze" />
        </div>
      </main>
    </div>
  );
}

export default function AnalyzePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <AnalyzePage />
    </Suspense>
  );
}
