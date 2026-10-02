import type { Role } from "@/lib/question-builder/template";
import { z } from "@/lib/validations/zod";

// What the Question builder asks the AI to write for one job: the job's own
// parts of the interview pattern (template.ts adds the rest). Each limit
// keeps the finished question within what the database accepts (1000
// characters for a test question, 500 for a video question).
type Field = { key: Exclude<keyof Role, "title">; max: number; guide: string };

export const TEST_FIELDS: Field[] = [
  {
    key: "knowledge",
    max: 850,
    guide:
      "Q1 (not for office jobs): a practical task from the job; ask the candidate to describe every step.",
  },
  {
    key: "rush",
    max: 850,
    guide:
      "Q2: many requests arrive at once (a bulleted list of 4); how to organize and prioritize.",
  },
  {
    key: "customerMessage",
    max: 850,
    guide: "Q3: a customer or client message, in quotes, to answer in writing.",
  },
  {
    key: "explain",
    max: 850,
    guide: "Q4: explain something from the job simply to someone who doesn't know it.",
  },
  {
    key: "angry",
    max: 850,
    guide: "Q5: an angry or difficult customer, client or member of the public.",
  },
  {
    key: "breakdown",
    max: 850,
    guide: "Q6: a tool, machine or system stops working at a bad moment.",
  },
  {
    key: "instruction",
    max: 850,
    guide:
      "Q7: a supervisor's multi-step instruction, in quotes; explain what to do and in what order.",
  },
  { key: "safety", max: 850, guide: "Q8: a safety or hygiene situation in this job." },
  {
    key: "deadlines",
    max: 850,
    guide: "Q9: three tasks (Task A, B, C) with different deadlines; which first and why.",
  },
  {
    key: "tools",
    max: 850,
    guide: "Q10: which tools, machines or software of this job have you used, and for what.",
  },
  {
    key: "quality",
    max: 850,
    guide: "Q11: checking the quality of your own work; find the cause of a problem and fix it.",
  },
  {
    key: "learning",
    max: 850,
    guide:
      "Q12: something new to learn (tool, product, route, system); what you do on the first day.",
  },
  {
    key: "steps",
    max: 850,
    guide: "Q13: a manager's instruction in quotes, then exactly 3 numbered questions (1. 2. 3.).",
  },
  {
    key: "check",
    max: 850,
    guide:
      "Q14: two versions of the same information (e.g. an order and what was prepared) with one difference; check whether they match.",
  },
  {
    key: "mistake",
    max: 850,
    guide: "Q15: a mistake you made in this job that nobody has noticed yet.",
  },
  {
    key: "tasks",
    max: 850,
    guide:
      "Q17: a supervisor's instruction with several tasks and a report by a time, then the 4 bullets: tasks required, deadline, priorities, what to report.",
  },
];

export const VIDEO_FIELDS: Field[] = [
  {
    key: "videoProblem",
    max: 400,
    guide:
      "Video 3: ask about a real problem or unhappy customer from their past work in this job.",
  },
  {
    key: "videoSkills",
    max: 400,
    guide: "Video 4: ask which skills and tools of this job they have.",
  },
  {
    key: "videoLearning",
    max: 400,
    guide: "Video 5: ask how they would learn something new for this job in their first week.",
  },
];

export const TYPING_MAX = 600;

const text = (max: number) => z.string().trim().min(5).max(max);

// A job's generated (or hand-edited) content: office jobs get a typing
// paragraph for Q1, other jobs a practical knowledge question.
export const roleSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    typing: text(TYPING_MAX).optional(),
    ...Object.fromEntries([...TEST_FIELDS, ...VIDEO_FIELDS].map((f) => [f.key, text(f.max)])),
    knowledge: text(850).optional(),
  })
  .refine((r) => Boolean(r.typing) !== Boolean(r.knowledge), {
    message: "Q1 needs a typing paragraph (office jobs) or a knowledge question, not both.",
  });
