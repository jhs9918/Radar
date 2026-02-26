"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface FreeListItem {
  id: string;
  title: ReactNode;
  detail: ReactNode;
}

interface Props {
  items: FreeListItem[];
  onUnlock: () => void;
  label?: string;
}

export function FreeItemList({ items, onUnlock, label = "item" }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        {items.length} {label}{items.length !== 1 ? "s" : ""} found.{" "}
        Select one to preview full details, or unlock all at once.
      </p>

      {items.map((item) => {
        const isOpen = selectedId === item.id;
        return (
          <div
            key={item.id}
            className={`rounded-lg border transition-all ${
              isOpen ? "bg-card shadow-sm" : "bg-muted/10 hover:bg-muted/30"
            }`}
          >
            <button
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
              onClick={() => setSelectedId(isOpen ? null : item.id)}
            >
              <div className="flex-1 min-w-0 text-sm">{item.title}</div>
              <span className="flex-shrink-0 text-xs text-muted-foreground select-none">
                {isOpen ? "▲ close" : "▼ preview"}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t pt-3 text-sm space-y-1.5">
                {item.detail}
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-4 p-4 rounded-lg border border-dashed bg-muted/20 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Unlock full access to expand all {label}s at once.
        </p>
        <Button size="sm" onClick={onUnlock}>
          Enter Access Code
        </Button>
      </div>
    </div>
  );
}
