import "server-only";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";
import { roleSchema, TEST_FIELDS, TYPING_MAX, VIDEO_FIELDS } from "@/lib/question-builder/fields";
import { EXAMPLE_ROLE } from "@/lib/question-builder/example";
import type { Role } from "@/lib/question-builder/template";

// The admin Question builder asks Claude (Anthropic API) to write one job's
// own interview content; the fixed questions come from the template. Only
// the job title and description are sent (no personal data).

export const questionAiConfigured = () => Boolean(serverEnv.ANTHROPIC_API_KEY);

const FIELDS = [...TEST_FIELDS, ...VIDEO_FIELDS];

const SYSTEM = `You write job interview content for WemustE, a hiring platform in Pakistan, India, Bangladesh and the UAE.
Every job uses the same interview pattern. You only write the parts that are specific to the job; the rest of the questions are fixed.

Rules:
- Write for this exact job, with realistic situations, places, tools, products and numbers from that work.
- Simple, clear English that a candidate with basic English understands. Short sentences.
- Each field is one question body. End each question with what the candidate must do ("What would you do?", "Explain ...", "Write ...").
- Put spoken words (customer, supervisor, manager) in curly quotes “like this”. Use "\\n\\n" between parts and "• " for bullet lists.
- Office or computer jobs (data entry, receptionist, admin, accounts, call center, ...): write "typing", a paragraph of about 60 words about the job for a typing test, and leave out "knowledge". All other jobs: write "knowledge" and leave out "typing".
- No names of real companies, no discrimination (age, gender, religion, nationality), nothing illegal or unsafe.
- Stay within each field's length limit.`;

function tool() {
  const properties: Record<string, { type: "string"; description: string; maxLength?: number }> = {
    title: { type: "string", description: "The job title, as it should appear on the job." },
    typing: {
      type: "string",
      description: `Office jobs only: a ~60-word paragraph about the job for the typing test (max ${TYPING_MAX} characters).`,
      maxLength: TYPING_MAX,
    },
  };
  for (const f of FIELDS) {
    properties[f.key] = {
      type: "string",
      description: `${f.guide} Max ${f.max} characters.`,
      maxLength: f.max,
    };
  }
  return {
    name: "save_interview",
    description: "Save the job's interview content.",
    input_schema: {
      type: "object",
      properties,
      required: ["title", ...FIELDS.filter((f) => f.key !== "knowledge").map((f) => f.key)],
    },
  };
}

export type GenerateResult = { ok: true; role: Role } | { ok: false; error: "aiOff" | "aiFailed" };

export async function generateRole(title: string, description: string): Promise<GenerateResult> {
  if (!serverEnv.ANTHROPIC_API_KEY) return { ok: false, error: "aiOff" };
  const example = JSON.stringify(EXAMPLE_ROLE, null, 1);
  const user = `Here is a finished example for a Barista:\n\n${example}\n\nNow write the content for this job.\n\nJob title: ${title}\n\nJob description:\n${description}`;
  try {
    const res = await fetch(`${serverEnv.ANTHROPIC_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": serverEnv.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: serverEnv.ANTHROPIC_MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        tools: [tool()],
        tool_choice: { type: "tool", name: "save_interview" },
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      logError("question-ai", { name: "AnthropicError", status: res.status });
      return { ok: false, error: "aiFailed" };
    }
    const body = (await res.json()) as { content?: { type: string; input?: unknown }[] };
    const input = body.content?.find((c) => c.type === "tool_use")?.input as
      Record<string, unknown> | undefined;
    // Office jobs get the typing paragraph; then the knowledge question is dropped.
    if (input && input.typing && input.knowledge) delete input.knowledge;
    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) {
      logError("question-ai-shape", { name: "BadShape", issues: parsed.error.issues.length });
      return { ok: false, error: "aiFailed" };
    }
    return { ok: true, role: parsed.data as Role };
  } catch (error) {
    logError("question-ai", error);
    return { ok: false, error: "aiFailed" };
  }
}
