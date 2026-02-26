import type { ProposalOutline } from "@/src/lib/llm/schemas";
import { CopyButton } from "./CopyButton";
import { FreeItemList, type FreeListItem } from "./FreeItemList";

interface Props {
  data: ProposalOutline;
  rawText: string;
  isPaid: boolean;
  onUnlock: () => void;
}

export function OutlineTab({ data, rawText, isPaid, onUnlock }: Props) {
  if (!isPaid) {
    const items: FreeListItem[] = data.outline.map((section, i) => ({
      id: String(i),
      title: (
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs flex-shrink-0">{i + 1}.</span>
          <span className="font-medium">{section.section_title}</span>
        </span>
      ),
      detail: (
        <>
          {section.source_hint && (
            <p className="text-xs text-muted-foreground italic mb-2">
              From RFP: {section.source_hint}
            </p>
          )}
          <ul className="space-y-1">
            {section.notes.map((note, j) => (
              <li key={j} className="flex gap-2 text-sm">
                <span className="text-muted-foreground text-xs mt-0.5 flex-shrink-0">→</span>
                <span className="text-muted-foreground">{note}</span>
              </li>
            ))}
          </ul>
        </>
      ),
    }));

    return (
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border rounded px-3 py-2 mb-3">
          <span>Free preview: pick 1 item to expand. Unlock to view all details + export.</span>
          <span
            title="We limit free detailed results to cover AI compute costs."
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted border cursor-help flex-shrink-0 font-medium"
          >
            ?
          </span>
        </div>
        <div className="mb-3">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
            Draft scaffold — requires your specifics.
          </p>
        </div>
        <FreeItemList items={items} onUnlock={onUnlock} label="section" />
        {data.assumptions_needed.length > 0 && (
          <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">
              Assumptions Needed
            </h3>
            <ul className="space-y-1">
              {data.assumptions_needed.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-700">
                  <span className="mt-0.5">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Paid: full view
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
          Draft scaffold — requires your specifics.
        </p>
        <CopyButton text={rawText} label="Copy All" />
      </div>

      <div className="space-y-4">
        {data.outline.map((section, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {section.section_title}
              </h3>
            </div>
            {section.source_hint && (
              <p className="text-xs text-muted-foreground italic mb-2">
                From RFP: {section.source_hint}
              </p>
            )}
            <ul className="space-y-1">
              {section.notes.map((note, j) => (
                <li key={j} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5 text-xs">→</span>
                  <span className="text-muted-foreground">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {data.assumptions_needed.length > 0 && (
        <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Assumptions Needed from Your Team
          </h3>
          <ul className="space-y-1">
            {data.assumptions_needed.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-700">
                <span className="mt-0.5">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
