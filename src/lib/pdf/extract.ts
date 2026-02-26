/**
 * PDF text extraction — best-effort using pdf-parse.
 * Runs server-side only.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid issues with Next.js edge runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import("pdf-parse") as any;
    const pdfParse = mod.default ?? mod;
    const data = await pdfParse(buffer);
    const text = data.text?.trim();

    if (!text || text.length < 50) {
      throw new Error("Extracted text is too short — the PDF may be image-based or encrypted.");
    }

    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`PDF extraction failed: ${message}`);
  }
}
