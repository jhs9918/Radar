import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Starter",
    price: "$19",
    period: "/mo",
    description: "For solo consultants and freelancers.",
    features: [
      "10 RFP analyses/month",
      "All 4 analysis tabs",
      "Copy & Markdown export",
      "Chrome extension",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "For active proposal teams.",
    features: [
      "50 RFP analyses/month",
      "All Starter features",
      "PDF upload",
      "Priority processing",
    ],
    cta: "Get Pro",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Team",
    price: "$149",
    period: "/mo",
    description: "For agencies responding to many RFPs.",
    features: [
      "Unlimited analyses",
      "All Pro features",
      "Shared workspace (coming soon)",
      "Dedicated support",
    ],
    cta: "Contact Us",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">RFP Radar</Link>
          <Link href="/analyze">
            <Button size="sm">Try Free</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">Simple, transparent pricing</h1>
          <p className="text-muted-foreground">
            Start free during beta. No credit card required.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.highlight
                  ? "border-primary shadow-md ring-1 ring-primary/20"
                  : "bg-card"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-lg">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                {plan.badge && (
                  <Badge className="text-xs">{plan.badge}</Badge>
                )}
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/analyze">
                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          Currently in free beta. Billing will be introduced before public launch.
        </p>

        {/* Ad slot — replace with ad network script when ready */}
        <div id="ad-slot-pricing" className="mt-10" aria-hidden="true" />
      </main>
    </div>
  );
}
