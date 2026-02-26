"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClientPlan } from "@/src/lib/plans";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UnlockModal({ open, onClose, onSuccess }: Props) {
  const [proCode, setProCode]         = useState("");
  const [proLoading, setProLoading]   = useState(false);
  const [proError, setProError]       = useState<string | null>(null);

  const [betaCode, setBetaCode]       = useState("");
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaError, setBetaError]     = useState<string | null>(null);
  const [betaDone, setBetaDone]       = useState<number | null>(null); // creditsGranted

  if (!open) return null;

  // ── Pro access code flow ─────────────────────────────────────────────
  const handleProSubmit = async () => {
    if (!proCode.trim()) return;
    setProError(null);
    setProLoading(true);
    try {
      fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "unlock_opened", props: { page: "modal" } }),
      }).catch(() => {});

      const res  = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: proCode }),
      });
      const data = await res.json();
      if (!data.valid) {
        setProError("Invalid or expired access code. Check for typos and try again.");
      } else {
        const plan: ClientPlan = { plan: "subscription", access_code: proCode.trim() };
        localStorage.setItem("rfp-radar-plan", JSON.stringify(plan));
        fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "unlock_success", props: { plan: "subscription" } }),
        }).catch(() => {});
        onSuccess();
        onClose();
      }
    } catch {
      setProError("Network error. Please try again.");
    } finally {
      setProLoading(false);
    }
  };

  // ── Beta credits flow ────────────────────────────────────────────────
  const handleBetaSubmit = async () => {
    if (!betaCode.trim()) return;
    setBetaError(null);
    setBetaLoading(true);
    try {
      const res  = await fetch("/api/beta/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: betaCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBetaError(data.error ?? "Redemption failed. Please try again.");
      } else {
        // Store credits in localStorage (display only; server is authoritative)
        const plan: ClientPlan = { plan: "credits", credits: data.creditsTotal };
        localStorage.setItem("rfp-radar-plan", JSON.stringify(plan));
        localStorage.setItem("rfp-radar-credits", String(data.creditsTotal));
        setBetaDone(data.creditsGranted);
        fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "beta_redeemed", props: { creditsGranted: data.creditsGranted } }),
        }).catch(() => {});
      }
    } catch {
      setBetaError("Network error. Please try again.");
    } finally {
      setBetaLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">

        {/* ── Section 1: Pro access code ── */}
        <h2 className="text-lg font-bold mb-1">Unlock Full Results</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Enter your access code to expand all items across every tab.
        </p>
        <Input
          placeholder="Pro access code"
          value={proCode}
          onChange={(e) => setProCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleProSubmit()}
          disabled={proLoading}
          className="mb-3"
        />
        {proError && <p className="text-sm text-red-600 mb-3">{proError}</p>}
        <div className="flex gap-2 justify-end mb-5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={proLoading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleProSubmit} disabled={proLoading || !proCode.trim()}>
            {proLoading ? "Checking..." : "Unlock"}
          </Button>
        </div>

        {/* ── Divider ── */}
        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground">or</span>
          </div>
        </div>

        {/* ── Section 2: Beta credits ── */}
        <h3 className="text-sm font-semibold mb-1">Redeem Beta Credits</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Beta codes grant {50} credits — each credit unlocks one full analysis.
          Credits are not a Pro subscription.
        </p>

        {betaDone !== null ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-semibold">{betaDone} credits added!</p>
            <p className="text-xs mt-0.5">Run a new analysis to use them.</p>
          </div>
        ) : (
          <>
            <Input
              placeholder="Beta code (e.g. BETA2026A)"
              value={betaCode}
              onChange={(e) => setBetaCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBetaSubmit()}
              disabled={betaLoading}
              className="mb-3"
            />
            {betaError && <p className="text-sm text-red-600 mb-3">{betaError}</p>}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleBetaSubmit}
              disabled={betaLoading || !betaCode.trim()}
            >
              {betaLoading ? "Redeeming..." : "Redeem credits"}
            </Button>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Don&apos;t have a code?{" "}
          <a href="/pricing" className="underline">
            View pricing
          </a>
        </p>
      </div>
    </div>
  );
}
