"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SummaryTab } from "@/src/ui/components/SummaryTab";
import { QuestionsTab } from "@/src/ui/components/QuestionsTab";
import { OutlineTab } from "@/src/ui/components/OutlineTab";
import { GoNoGoTab } from "@/src/ui/components/GoNoGoTab";
import { PlanBadge } from "@/src/ui/components/PlanBadge";
import { UnlockModal } from "@/src/ui/components/UnlockModal";
import type { AnalysisResult } from "@/src/lib/llm/schemas";
import type { AnalyzeMeta, ClientPlan } from "@/src/lib/plans";
import { exportToMarkdown } from "@/src/lib/export/markdown";

function tabText(result: AnalysisResult, tab: string): string {
  if (tab === "summary") return JSON.stringify(result.summary, null, 2);
  if (tab === "questions")
    return result.questions.questions
      .map((q) => `[${q.category}] ${q.question}\nWhy: ${q.why_it_matters}\nRef: ${q.reference}`)
      .join("\n\n");
  if (tab === "outline")
    return result.outline.outline
      .map((s, i) => `${i + 1}. ${s.section_title}\n${s.notes.map((n) => `  - ${n}`).join("\n")}`)
      .join("\n\n");
  if (tab === "gonogo") {
    const g = result.goNoGo;
    return (
      `Recommendation: ${g.recommendation}\n\nReasons:\n${g.top_reasons.map((r) => `- ${r}`).join("\n")}` +
      `\n\nRisk Flags:\n${g.risk_flags.map((f) => `[${f.severity}] ${f.flag}`).join("\n")}` +
      `\n\nResolve:\n${g.what_to_resolve.map((r) => `- ${r}`).join("\n")}`
    );
  }
  return "";
}

function buildSummaryMarkdown(result: AnalysisResult): string {
  const s = result.summary;
  const lines: string[] = [
    "# RFP Analysis — Executive Summary",
    "",
    `**Document type:** ${s.meta.doc_type}  `,
    `**Industry:** ${s.meta.industry_guess.join(", ") || "—"}  `,
    `**Confidence:** ${Math.round(s.meta.confidence * 100)}%`,
    "",
  ];
  if (s.key_dates.length) {
    lines.push("## Key Dates", "");
    for (const d of s.key_dates) {
      const time = d.time ? ` · ${d.time}` : "";
      lines.push(`- **${d.label}:** ${d.date}${time} _(${d.source})_`);
    }
    lines.push("");
  }
  if (s.scope.length) {
    lines.push("## Scope", "", ...s.scope.map((i) => `- ${i}`), "");
  }
  if (s.deliverables.length) {
    lines.push("## Deliverables", "", ...s.deliverables.map((i) => `- ${i}`), "");
  }
  if (s.constraints.length) {
    lines.push("## Constraints", "", ...s.constraints.map((i) => `- ${i}`), "");
  }
  lines.push(
    "",
    "_AI output may be wrong — verify against the original RFP._",
  );
  return lines.join("\n");
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [meta, setMeta] = useState<AnalyzeMeta | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [isPaid, setIsPaid] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  useEffect(() => {
    // Read plan from localStorage
    const planRaw = localStorage.getItem("rfp-radar-plan");
    if (planRaw) {
      try {
        const plan: ClientPlan = JSON.parse(planRaw);
        if (plan.plan !== "free") setIsPaid(true);
      } catch {}
    }

    // Read result from sessionStorage
    const raw = sessionStorage.getItem("rfp-result");
    if (!raw) {
      router.push("/analyze");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setMeta(parsed._rfp_meta ?? null);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _rfp_meta, ...analysisResult } = parsed;
      setResult(analysisResult as AnalysisResult);
    } catch {
      router.push("/analyze");
    }
  }, [router]);

  const handleExportMarkdown = () => {
    if (!result) return;
    let content: string;
    let filename: string;
    if (isPaid) {
      content = exportToMarkdown(result);
      filename = "rfp-analysis.md";
    } else {
      content = buildSummaryMarkdown(result);
      filename = "rfp-summary.md";
    }
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const recBadge = {
    GO: "bg-green-100 text-green-800 border-green-300",
    MAYBE: "bg-yellow-100 text-yellow-800 border-yellow-300",
    NO_GO: "bg-red-100 text-red-800 border-red-300",
  }[result.goNoGo.recommendation];

  return (
    <div className="min-h-screen bg-background">
      <UnlockModal
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        onSuccess={() => setIsPaid(true)}
      />

      {/* Nav */}
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">
            RFP Radar
          </Link>
          <div className="flex gap-3 items-center">
            <PlanBadge quotaRemaining={meta?.quota_remaining} />
            <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${recBadge}`}>
              {result.goNoGo.recommendation.replace("_", "-")}
            </span>
            <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
              {isPaid ? "Export Markdown" : "Export Summary"}
            </Button>
            <Link href="/analyze">
              <Button size="sm">New Analysis</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Analysis Results</h1>
          <p className="text-xs text-muted-foreground mt-1">
            AI output may be wrong; verify against the original RFP.
          </p>
        </div>

        {/* Partial result warning */}
        {meta?.partial && meta?.hint && (
          <div className="mb-4 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-sm">
            {meta.hint}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="questions">
              Questions
              <span className="ml-1.5 text-xs bg-muted rounded px-1.5">
                {result.questions.questions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="outline">Outline</TabsTrigger>
            <TabsTrigger value="gonogo">Go / No-Go</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <SummaryTab data={result.summary} rawText={tabText(result, "summary")} />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionsTab
              data={result.questions}
              rawText={tabText(result, "questions")}
              isPaid={isPaid}
              onUnlock={() => setUnlockOpen(true)}
            />
          </TabsContent>

          <TabsContent value="outline">
            <OutlineTab
              data={result.outline}
              rawText={tabText(result, "outline")}
              isPaid={isPaid}
              onUnlock={() => setUnlockOpen(true)}
            />
          </TabsContent>

          <TabsContent value="gonogo">
            <GoNoGoTab
              data={result.goNoGo}
              rawText={tabText(result, "gonogo")}
              isPaid={isPaid}
              onUnlock={() => setUnlockOpen(true)}
            />
          </TabsContent>
        </Tabs>

        <Separator className="my-8" />
        <p className="text-xs text-center text-muted-foreground">
          AI output may be wrong — always verify against the original RFP document.
          Your document was not stored.{" "}
          <Link href="/privacy" className="underline">
            Privacy policy
          </Link>
        </p>
      </main>
    </div>
  );
}
