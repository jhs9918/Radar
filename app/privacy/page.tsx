import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">RFP Radar</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: March 2024</p>

        <div className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-base mb-2">What We Do NOT Store</h2>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-red-500 font-medium mt-0.5">✗</span>
                <span>The full text of your RFP or uploaded documents</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 font-medium mt-0.5">✗</span>
                <span>Any personally identifiable information from your documents</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 font-medium mt-0.5">✗</span>
                <span>Analysis results on our servers</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">What We Do Store</h2>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-green-600 font-medium mt-0.5">✓</span>
                <span>Document character length (not content)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 font-medium mt-0.5">✓</span>
                <span>Timestamp of analysis request</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 font-medium mt-0.5">✓</span>
                <span>Success or failure status</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 font-medium mt-0.5">✓</span>
                <span>AI model used</span>
              </li>
            </ul>
            <p className="text-muted-foreground mt-2">
              This minimal telemetry is stored in server logs for debugging and product improvement only.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">How Your Document is Processed</h2>
            <p className="text-muted-foreground">
              Your document is processed in-memory on our server and sent to an AI provider (Anthropic or OpenAI)
              for analysis. The document text is not logged or persisted after the response is returned.
              Results are temporarily stored in your browser&apos;s sessionStorage and cleared when you close the tab.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Third-Party AI Providers</h2>
            <p className="text-muted-foreground">
              We use Anthropic Claude or OpenAI GPT for analysis. Your document text is sent to these providers
              per their respective API terms. We recommend reviewing their privacy policies if you are processing
              sensitive or confidential documents.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Cookies</h2>
            <p className="text-muted-foreground">
              We do not use tracking cookies. Standard Next.js session and routing functionality may use browser storage.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Contact</h2>
            <p className="text-muted-foreground">
              Questions about privacy? Contact us at{" "}
              <span className="font-medium text-foreground">privacy@rfp-radar.com</span>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
