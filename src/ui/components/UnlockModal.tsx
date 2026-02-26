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
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!data.valid) {
        setError("Invalid access code. Check for typos and try again.");
      } else {
        const plan: ClientPlan = { plan: "credits", access_code: code.trim() };
        localStorage.setItem("rfp-radar-plan", JSON.stringify(plan));
        onSuccess();
        onClose();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold mb-1">Unlock Full Results</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Enter your access code to expand all items across every tab.
        </p>
        <Input
          placeholder="Access code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={loading}
          className="mb-3"
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !code.trim()}>
            {loading ? "Checking..." : "Unlock"}
          </Button>
        </div>
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
