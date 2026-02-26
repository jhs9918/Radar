import type { ClarifyingQuestions } from "@/src/lib/llm/schemas";
import { CopyButton } from "./CopyButton";
import { FreeItemList, type FreeListItem } from "./FreeItemList";

const CATEGORY_COLORS: Record<string, string> = {
  Scope: "bg-blue-100 text-blue-800",
  Timeline: "bg-purple-100 text-purple-800",
  Budget: "bg-green-100 text-green-800",
  Legal: "bg-red-100 text-red-800",
  Security: "bg-orange-100 text-orange-800",
  Evaluation: "bg-yellow-100 text-yellow-800",
  Submission: "bg-pink-100 text-pink-800",
  Other: "bg-gray-100 text-gray-800",
};

interface Props {
  data: ClarifyingQuestions;
  rawText: string;
  isPaid: boolean;
  onUnlock: () => void;
}

export function QuestionsTab({ data, rawText, isPaid, onUnlock }: Props) {
  if (!isPaid) {
    const items: FreeListItem[] = data.questions.map((q, i) => ({
      id: String(i),
      title: (
        <span className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded ${
              CATEGORY_COLORS[q.category] ?? CATEGORY_COLORS.Other
            }`}
          >
            {q.category}
          </span>
          <span className="font-medium truncate">{q.question}</span>
        </span>
      ),
      detail: (
        <>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Why it matters:</span>{" "}
            {q.why_it_matters}
          </p>
          <p className="text-muted-foreground italic mt-1">
            Reference: {q.reference}
          </p>
        </>
      ),
    }));

    return (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          {data.questions.length} questions found
        </p>
        <FreeItemList items={items} onUnlock={onUnlock} label="question" />
      </div>
    );
  }

  // Paid: full view grouped by category
  const categories = [...new Set(data.questions.map((q) => q.category))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {data.questions.length} questions across {categories.length} categories
        </p>
        <CopyButton text={rawText} label="Copy All" />
      </div>

      <div className="space-y-8">
        {categories.map((cat) => {
          const qs = data.questions.filter((q) => q.category === cat);
          return (
            <div key={cat}>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other
                  }`}
                >
                  {cat}
                </span>
                <span className="text-muted-foreground font-normal">
                  {qs.length} question{qs.length !== 1 ? "s" : ""}
                </span>
              </h3>
              <div className="space-y-3">
                {qs.map((q, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <p className="font-medium text-sm mb-2">{q.question}</p>
                    <p className="text-xs text-muted-foreground mb-1">
                      <span className="font-medium">Why it matters:</span>{" "}
                      {q.why_it_matters}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Reference: {q.reference}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
