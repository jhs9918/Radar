import type { ExecutiveSummary } from "@/src/lib/llm/schemas";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./CopyButton";

const SEVERITY_COLORS = {
  LOW:  "bg-green-100 text-green-800 border-green-200",
  MED:  "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-red-100 text-red-800 border-red-200",
};

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-muted-foreground mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  data: ExecutiveSummary;
  rawText: string;
}

export function SummaryTab({ data, rawText }: Props) {
  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 items-center flex-wrap">
          <Badge variant="secondary">{data.meta.doc_type}</Badge>
          {data.meta.industry_guess.map((g) => (
            <Badge key={g} variant="outline">{g}</Badge>
          ))}
          <span className="text-xs text-muted-foreground">
            confidence {Math.round(data.meta.confidence * 100)}%
          </span>
        </div>
        <CopyButton text={rawText} label="Copy All" />
      </div>

      {/* Sources badge */}
      <div className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border rounded-full px-3 py-1">
        <span>🔗</span>
        <span>Sources are Section headings or short quotes from the RFP</span>
      </div>

      {/* Key Dates */}
      {data.key_dates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Key Dates
          </h3>
          <div className="grid gap-2">
            {data.key_dates.map((d, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
                <div className="flex-1">
                  <span className="font-medium text-sm">{d.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 italic">{d.source}</p>
                </div>
                <span className="text-sm font-mono bg-background border rounded px-2 py-0.5 whitespace-nowrap">
                  {d.date ?? "TBD"}{d.time ? ` · ${d.time}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Section title="Scope" items={data.scope} />
      <Section title="Deliverables" items={data.deliverables} />
      <Section title="Constraints" items={data.constraints} />

      {/* Evaluation Criteria */}
      {data.evaluation_criteria.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Evaluation Criteria
          </h3>
          <div className="space-y-2">
            {data.evaluation_criteria.map((e, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground mt-0.5">•</span>
                <div>
                  <span className="font-medium">{e.criterion}</span>
                  {e.weight && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5">
                      {e.weight}
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 italic">{e.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Section title="Submission Requirements" items={data.submission_requirements} />

      {/* Risk Indicators */}
      {data.risk_indicators.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Risk Indicators
          </h3>
          <div className="space-y-2">
            {data.risk_indicators.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-md border text-sm ${SEVERITY_COLORS[r.severity]}`}
              >
                <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[r.severity]}`}>
                  {r.severity}
                </span>
                <div>
                  <p className="font-medium">{r.item}</p>
                  <p className="text-xs mt-0.5 opacity-75 italic">{r.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assumptions */}
      {data.assumptions.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
          <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-2">
            Working Assumptions
          </h3>
          <ul className="space-y-1.5">
            {data.assumptions.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-blue-700">
                <span className="mt-0.5">→</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unknowns */}
      {data.unknowns.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2">
            Unknowns / Unclear
          </h3>
          <ul className="space-y-1.5">
            {data.unknowns.map((u, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-700">
                <span className="mt-0.5">⚠</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
