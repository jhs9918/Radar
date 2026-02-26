"use client";

interface Props {
  plan?: string;
  page?: string;
}

export function FeedbackButton({ plan, page }: Props) {
  const url = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL;
  if (!url) return null;

  const handleClick = () => {
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "feedback_clicked", props: { plan, page } }),
    }).catch(() => {});
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
    >
      Give feedback (2 min)
    </button>
  );
}
