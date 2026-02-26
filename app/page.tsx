import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">RFP Radar</span>
          <div className="flex gap-4 items-center">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/analyze">
              <Button size="sm">Try Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-4">Beta — Free to try</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5 leading-tight">
          Not just a summary.{" "}
          <span className="text-primary">Instant RFP intelligence.</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Paste or upload any RFP and get a Go/No-Go decision, targeted clarifying questions,
          and a proposal outline you can paste directly into your response doc — in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/analyze?sample=1">
            <Button size="lg" className="w-full sm:w-auto">
              Try with Sample RFP
            </Button>
          </Link>
          <Link href="/analyze">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Paste Your Own RFP
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: "📋",
              title: "Executive Summary",
              desc: "Scope, deliverables, timeline, constraints, and submission requirements — extracted automatically.",
            },
            {
              icon: "❓",
              title: "Clarifying Questions",
              desc: "Targeted questions grouped by category, each with a reference back to the RFP section.",
            },
            {
              icon: "📝",
              title: "Proposal Outline",
              desc: "A draft scaffold that mirrors the response structure requested in the RFP.",
            },
            {
              icon: "🎯",
              title: "Go / No-Go",
              desc: "A checklist-based recommendation with risk flags and what to resolve before bidding.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl border bg-card hover:border-primary/40 transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Target audience */}
      <section className="border-t bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground text-sm uppercase tracking-wide font-medium mb-4">
            Built for
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Marketing Agencies", "IT Consultants", "Creative Studios", "Gov Contractors", "Freelancers"].map(
              (t) => (
                <Badge key={t} variant="outline" className="text-sm px-3 py-1">
                  {t}
                </Badge>
              )
            )}
          </div>
        </div>
      </section>

      {/* Ad slot — replace with ad network script when ready */}
      <div id="ad-slot-landing" className="max-w-5xl mx-auto px-4 pb-6" aria-hidden="true" />

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2026 RFP Radar</span>
          <div className="flex gap-4">
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
