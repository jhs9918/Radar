/**
 * LLM Client — supports Anthropic (Claude) and OpenAI.
 *
 * Required env vars in .env.local (never commit real keys):
 *   LLM_PROVIDER=anthropic          # or "openai"
 *   LLM_MODEL=claude-haiku-4-5      # model name for the chosen provider
 *   ANTHROPIC_API_KEY=              # required when LLM_PROVIDER=anthropic
 *   OPENAI_API_KEY=                 # required when LLM_PROVIDER=openai
 */

export function checkEnvVars(): { ok: true } | { ok: false; message: string } {
  const provider = process.env.LLM_PROVIDER ?? "anthropic";

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        ok: false,
        message:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local — see .env.example.",
      };
    }
  } else if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      return {
        ok: false,
        message:
          "OPENAI_API_KEY is not set. Add it to .env.local — see .env.example.",
      };
    }
  } else {
    return {
      ok: false,
      message: `Unknown LLM_PROVIDER "${provider}". Must be "anthropic" or "openai".`,
    };
  }

  return { ok: true };
}

export async function callLLM(
  userMessage: string,
  systemPrompt: string
): Promise<string> {
  const check = checkEnvVars();
  if (!check.ok) throw new Error(check.message);

  const provider = process.env.LLM_PROVIDER ?? "anthropic";

  if (provider === "openai") {
    return callOpenAI(userMessage, systemPrompt);
  }
  return callAnthropic(userMessage, systemPrompt);
}

async function callAnthropic(
  userMessage: string,
  systemPrompt: string
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const model = process.env.LLM_MODEL ?? "claude-haiku-4-5";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = message.content[0];
  if (block.type !== "text")
    throw new Error("Unexpected response type from Anthropic");
  return block.text;
}

async function callOpenAI(
  userMessage: string,
  systemPrompt: string
): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 8192,
    // Force JSON output so parse never fails; Zod validation handles field correctness.
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  return content;
}
