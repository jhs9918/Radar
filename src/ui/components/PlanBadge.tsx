"use client";

import { useEffect, useState } from "react";
import type { ClientPlan } from "@/src/lib/plans";

interface Props {
  quotaRemaining?: number;
}

export function PlanBadge({ quotaRemaining }: Props) {
  const [plan, setPlan] = useState<ClientPlan | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("rfp-radar-plan");
    if (raw) {
      try {
        setPlan(JSON.parse(raw));
      } catch {}
    }
  }, []);

  if (plan?.plan === "credits" || plan?.plan === "subscription") {
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800 border border-green-300">
        Pro
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
