/**
 * Lightweight regression test runner for RFP Radar.
 * Requires the dev server to be running: npm run dev
 *
 * Usage:
 *   npx tsx scripts/regression.ts
 *
 * Or against a deployed URL:
 *   TEST_URL=https://your-app.vercel.app npx tsx scripts/regression.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

const BASE_URL = process.env.TEST_URL ?? "http://localhost:3000";
const ACCESS_CODE = process.env.TEST_ACCESS_CODE ?? ""; // optional paid-tier code

interface RiskIndicator {
  item: string;
  severity: "LOW" | "MED" | "HIGH";
  source: string;
}

interface AnalysisResult {
  summary: {
    risk_indicators: RiskIndicator[];
    key_dates: Array<{ label: string; date: string | null; time?: string | null; source: string }>;
    assumptions: string[];
    unknowns: string[];
  };
  _rfp_meta?: { partial: boolean; plan: string; quota_remaining?: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

async function analyze(rfpText: string): Promise<AnalysisResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ACCESS_CODE) headers["x-access-code"] = ACCESS_CODE;

  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text: rfpText }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`API ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

type Check = (result: AnalysisResult) => true | string;

function runChecks(result: AnalysisResult, checks: Check[]): { passed: number; failed: string[] } {
  const failed: string[] = [];
  for (const check of checks) {
    const r = check(result);
    if (r !== true) failed.push(r);
  }
  return { passed: checks.length - failed.length, failed };
}

// ── Test definitions ──────────────────────────────────────────────────────────

const TESTS: Array<{
  id: string;
  fixture: string;
  checks: Check[];
}> = [
  {
    id: "#4 — Compliance / SLA heavy RFP",
    fixture: "rfp-04-compliance-sla.txt",
    checks: [
      // Must have at least 2 risk indicators
      (r) => {
        const n = r.summary.risk_indicators.length;
        return n >= 2 || `Expected ≥ 2 risk_indicators, got ${n}`;
      },
      // At least one compliance/cert indicator
      (r) => {
        const match = r.summary.risk_indicators.some(({ item }) => {
          const l = item.toLowerCase();
          return (
            l.includes("soc") || l.includes("hipaa") || l.includes("iso") ||
            l.includes("compliance") || l.includes("certif") || l.includes("audit") ||
            l.includes("residency") || l.includes("jurisdiction") || l.includes("gdpr") ||
            l.includes("eu")
          );
        });
        return match || "Expected at least one compliance / certification risk indicator";
      },
      // At least one SLA / penalty indicator
      (r) => {
        const match = r.summary.risk_indicators.some(({ item }) => {
          const l = item.toLowerCase();
          return (
            l.includes("sla") || l.includes("uptime") ||
            l.includes("penalt") ||       // matches "penalty" and "penalties"
            l.includes("liquidated") || l.includes("damage") || l.includes("liability") ||
            l.includes("24/7") || l.includes("support oblig") ||
            l.includes("incident") || l.includes("notification") || l.includes("downtime")
          );
        });
        return match || "Expected at least one SLA / penalty risk indicator";
      },
      // All sources must start with Section: or Quote:
      (r) => {
        const bad = r.summary.risk_indicators.filter(
          (i) => !i.source.startsWith("Section:") && !i.source.startsWith("Quote:")
        );
        return bad.length === 0 || `Bad sources: ${bad.map((i) => i.source).join("; ")}`;
      },
      // Proposal Due time must be preserved exactly
      (r) => {
        const due = r.summary.key_dates.find((d) => d.label.toLowerCase().includes("proposal due") || d.label.toLowerCase().includes("due"));
        if (!due) return "No 'Proposal Due' date found";
        return (due.time === "5:00 PM EST") || `Expected time "5:00 PM EST", got "${due.time}"`;
      },
    ],
  },
  {
    id: "#7 — Incumbent bias / restrictive requirements",
    fixture: "rfp-07-incumbent-bias.txt",
    checks: [
      // Must flag incumbent bias or product lock-in
      (r) => {
        const match = r.summary.risk_indicators.some(({ item }) => {
          const l = item.toLowerCase();
          return (
            l.includes("incumbent") || l.includes("sap") || l.includes("lock") ||
            l.includes("restrictive") || l.includes("sole") || l.includes("preference") ||
            l.includes("existing system") || l.includes("current system") ||
            l.includes("s/4hana") || l.includes("ecc")
          );
        });
        return match || "Expected an incumbent-bias / product lock-in risk indicator";
      },
      // Must flag geographic restriction
      (r) => {
        const match = r.summary.risk_indicators.some(({ item }) => {
          const l = item.toLowerCase();
          return (
            l.includes("geographic") || l.includes("local") || l.includes("50 miles") ||
            l.includes("office") || l.includes("local presence") || l.includes("proximity")
          );
        });
        return match || "Expected a geographic restriction risk indicator";
      },
      // Must flag reference pool restriction
      (r) => {
        const match = r.summary.risk_indicators.some(({ item }) => {
          const l = item.toLowerCase();
          return (
            l.includes("reference") || l.includes("municipal") || l.includes("narrow") ||
            l.includes("population") || l.includes("unfair") || l.includes("restrict")
          );
        });
        return (
          match ||
          "Expected a risk indicator about restricted reference requirements"
        );
      },
      // At least one MED or HIGH severity item
      (r) => {
        const hasMedHigh = r.summary.risk_indicators.some(
          (i) => i.severity === "MED" || i.severity === "HIGH"
        );
        return hasMedHigh || "Expected at least one MED or HIGH severity risk indicator";
      },
      // Time on Proposal Due must be preserved
      (r) => {
        const due = r.summary.key_dates.find((d) => d.label.toLowerCase().includes("proposal") || d.label.toLowerCase().includes("due"));
        if (!due) return "No 'Proposal Due' date found";
        return (due.time === "4:00 PM CST") || `Expected time "4:00 PM CST", got "${due.time}"`;
      },
    ],
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nRFP Radar — Regression Test Suite`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Plan:   ${ACCESS_CODE ? "paid (access code set)" : "free"}`);
  console.log("=".repeat(60));

  let overallPass = true;

  for (const test of TESTS) {
    console.log(`\nRunning ${test.id} …`);
    const rfpText = loadFixture(test.fixture);

    let result: AnalysisResult;
    try {
      result = await analyze(rfpText);
    } catch (err) {
      console.error(`  FATAL: ${err instanceof Error ? err.message : String(err)}`);
      overallPass = false;
      continue;
    }

    const { passed, failed } = runChecks(result, test.checks);

    if (failed.length === 0) {
      console.log(`  ✓ All ${passed} checks passed`);
    } else {
      overallPass = false;
      console.log(`  ✗ ${passed}/${test.checks.length} checks passed`);
      for (const f of failed) console.log(`    FAIL: ${f}`);
    }

    // ── Print sample JSON ──────────────────────────────────────────────────
    console.log(`\n  risk_indicators (${result.summary.risk_indicators.length} items):`);
    for (const ri of result.summary.risk_indicators) {
      console.log(`    [${ri.severity}] ${ri.item}`);
      console.log(`           src: ${ri.source}`);
    }

    const dueDates = result.summary.key_dates.filter(
      (d) => d.label.toLowerCase().includes("due") || d.label.toLowerCase().includes("proposal")
    );
    if (dueDates.length) {
      console.log(`\n  key_dates (due/proposal):`);
      for (const d of dueDates) {
        console.log(`    label: ${d.label}`);
        console.log(`    date:  ${d.date}   time: ${d.time ?? "(none)"}`);
      }
    }

    if (result._rfp_meta) {
      console.log(`\n  meta: plan=${result._rfp_meta.plan}, partial=${result._rfp_meta.partial}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  if (overallPass) {
    console.log("RESULT: ALL TESTS PASSED ✓");
    process.exit(0);
  } else {
    console.log("RESULT: SOME TESTS FAILED ✗");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
