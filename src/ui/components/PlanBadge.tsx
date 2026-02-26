"use client";

import { useEffect, useState } from "react";
import type { ClientPlan } from "@/src/lib/plans";

interface Props {
  quotaRemaining?: number;
  creditsRemaining?: number;
}

export function PlanBadge({ quotaRemaining, creditsRemaining }: Props) {
  const [plan, setPlan] = useState<ClientPlan | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("rfp-radar-plan");
    if (raw) {
      try { setPlan(JSON.parse(raw)); } catch {}
    }
  }, []);

  if (plan?.plan === "subscription") {
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800 border border-green-300">
        Pro
      </span>
    );
  }

  if (plan?.plan === "credits") {
    const count = creditsRemaining ?? plan.credits;
    const label = count !== undefined ? `${count} credit${count !== 1 ? "s" : ""}` : "Credits";
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
        {label}
      </span>
    );
  }

  const leftText =
    quotaRemaining !== undefined ? ` — ${quotaRemaining} left this month` : "";

  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border">
      Free{leftText}
    </span>
  );
}
