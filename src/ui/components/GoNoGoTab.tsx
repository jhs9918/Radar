import type { GoNoGo } from "@/src/lib/llm/schemas";
import { CopyButton } from "./CopyButton";
import { FreeItemList, type FreeListItem } from "./FreeItemList";

const SEVERITY_COLORS = {
  LOW: "bg-green-100 text-green-800 border-green-200",
  MED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-red-100 text-red-800 border-red-200",
};

const REC_CONFIG = {
  GO: {
    label: "GO",
    bg: "bg-green-50 border-green-300",
    text: "text-green-800",
    icon: "✅",
  },
  MAYBE: {
    label: "MAYBE",
    bg: "bg-yellow-50 border-yellow-300",
    text: "text-yellow-800",
    icon: "⚠️",
  },
  NO_GO: {
    label: "NO-GO",
    bg: "bg-red-50 border-red-300",
    text: "text-red-800",
    icon: "❌",
  },
};

interface Props {
  data: GoNoGo;
  rawText: string;
  isPaid: boolean;
  onUnlock: () => void;
}

export function GoNoGoTab({ data, rawText, isPaid, onUnlock }: Props) {
  const config = REC_CONFIG[data.recommendation];

  return (
    <div>
      {/* Recommendation + top reasons — always fully visible */}
      <div className="flex items-center justify-between mb-6">
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 ${config.bg}`}>
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Recommendation
            </p>
            <p className={`text-2xl font-bold ${config.text}`}>{config.label}</p>
          </div>
        </div>
        {isPaid && <CopyButton text={rawText} label="Copy All" />}
      </div>

      {data.top_reasons.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Top Reasons
          </h3>
          <ol className="space-y-2">
            {data.top_reasons.map((reason, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Risk flags — free tier uses select-1 preview */}
      {data.risk_flags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Risk Flags
          </h3>

          {!isPaid ? (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border rounded px-3 py-2 mb-3">
                <span>Free preview: pick 1 item to expand. Unlock to view all details + export.</span>
                <span
                  title="We limit free detailed results to cover AI compute costs."
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted border cursor-help flex-shrink-0 font-medium"
                >
                  ?
                </span>
              </div>
              <FreeItemList
              items={data.risk_flags.map((flag, i): FreeListItem => ({
                id: String(i),
                title: (
                  <span className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded border ${
                        SEVERITY_COLORS[flag.severity]
                      }`}
                    >
                      {flag.severity}
                    </span>
                    <span className="font-medium">{flag.flag}</span>
                  </span>
                ),
                detail: (
                  <p className="text-xs text-muted-foreground italic">
                    Reference: {flag.reference}
                  </p>
                ),
              }))}
              onUnlock={onUnlock}
              label="risk flag"
            />
            </>
          ) : (
            <div className="space-y-2">
              {data.risk_flags.map((flag, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-md border text-sm ${
                    SEVERITY_COLORS[flag.severity]
                  }`}
                >
                  <span
                    className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded border ${
                      SEVERITY_COLORS[flag.severity]
                    }`}
                  >
                    {flag.severity}
                  </span>
                  <div>
                    <p className="font-medium">{flag.flag}</p>
                    <p className="text-xs mt-0.5 opacity-80 italic">
                      Reference: {flag.reference}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* What to resolve — always visible */}
      {data.what_to_resolve.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Resolve Before Committing to Bid
          </h3>
          <ul className="space-y-2">
            {data.what_to_resolve.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm p-2 rounded border bg-muted/30">
                <span className="text-muted-foreground mt-0.5">□</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
