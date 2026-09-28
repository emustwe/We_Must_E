// Turns a partner role into the same pattern as the real job: a Test of 25
// questions and a Video interview of 7 questions (the Survey is the real
// job's, shared by every role). Questions 16 and 18-25 and videos 1, 6 and 7
// are the same for every role; the rest come from the role.
import { ROLES_A } from "./roles-a.mjs";
import { ROLES_B } from "./roles-b.mjs";
import { ROLES_C } from "./roles-c.mjs";
import { ROLES_D } from "./roles-d.mjs";
import { ROLES_E } from "./roles-e.mjs";
import { ROLES_F } from "./roles-f.mjs";
import { ROLES_G } from "./roles-g.mjs";
import { ROLES_H } from "./roles-h.mjs";
import { ROLES_I } from "./roles-i.mjs";
import type { Role } from "./types.mjs";

export type { Role };
export type TestQ = { type: string; prompt: string; options?: string[]; time?: number };

export const ROLES: Role[] = [
  ...ROLES_A,
  ...ROLES_B,
  ...ROLES_C,
  ...ROLES_D,
  ...ROLES_E,
  ...ROLES_F,
  ...ROLES_G,
  ...ROLES_H,
  ...ROLES_I,
]
  .slice()
  .sort((a, b) => a.title.localeCompare(b.title));

const long = (prompt: string): TestQ => ({ type: "long_text", prompt });

export function buildTest(role: Role): TestQ[] {
  const first: TestQ = role.typing
    ? {
        type: "typing",
        time: 120,
        options: [role.typing],
        prompt:
          "Computer & Speed\nTyping Test\nType the following paragraph exactly as shown within the given time limit.\n\nMeasures:\nTyping speed, accuracy and attention to detail.",
      }
    : long(`Role Knowledge\n\n${role.knowledge}`);
  return [
    first,
    long(`Information Processing\n\n${role.rush}`),
    long(`Communication\n\nCustomer Message\n\n${role.customerMessage}`),
    long(`Explaining Simply\n\n${role.explain}`),
    long(`Angry Customer\n\n${role.angry}`),
    long(`Problem Solving\n\n${role.breakdown}`),
    long(`Supervisor Instruction\n\n${role.instruction}`),
    long(`Safety\n\n${role.safety}`),
    long(`Multiple Deadlines\n\n${role.deadlines}`),
    long(`Tools & Experience\n\n${role.tools}`),
    long(`Checking Quality\n\n${role.quality}`),
    long(`Learning Something New\n\n${role.learning}`),
    long(`Instruction in Steps\n\n${role.steps}`),
    long(`Checking Information\n\n${role.check}`),
    long(`Work Attitude\n\nMistake\n\n${role.mistake}`),
    long(
      "Deadline\n\nYou realize that you cannot finish your assigned work before the deadline.\n\nWhat would you do?",
    ),
    long(`Multiple Tasks\n\n${role.tasks}`),
    long(
      "Repetitive Work\n\nSome parts of the job are repetitive.\n\nHow do you maintain accuracy and concentration?",
    ),
    long(
      "Teamwork\n\nA team member on your shift is not responding or not doing their part.\n\nYou need them to finish your task.\n\nWhat would you do?",
    ),
    long(
      "Unexpected Change\n\nYour manager suddenly changes the procedure you have been following for several months.\n\nHow would you respond?",
    ),
    long(
      "Self-Assessment\n\nWhat do you believe is your strongest ability for this position, and what is one skill you still need to improve?",
    ),
    long(
      "Responsibility\nDifficult Task\nYour assigned task becomes more difficult than you initially expected.\n\nHow would you respond?",
    ),
    long(
      "Workplace Culture\n\nSometimes we have to work in a work environment or workplace culture that does not suit us.\n\nWhat kind of work environment or workplace culture would you not want to work in?",
    ),
    long(
      "Motivation\nPersonal Motivation\nThink about your experience at work.\n\nWhat type of situation makes you feel most motivated to do your best work?",
    ),
    long(
      "The Meaning of “E”\n\nOur name, Muste, comes from one simple idea:\n“Must E.”\n\nBut what does “E” mean to you?\n\nIt could be anything you believe — Eat, Enjoy, Explore, Educate, Encourage, Empower, Experience, Evolve, or something completely different.\n\nWhat does your “E” stand for?\n\nExplain what it means to you and why you chose it.",
    ),
  ];
}

export function buildVideos(role: Role): string[] {
  // "as a Barista", "as an Office Cleaner", "as Event Staff".
  const as = /Staff$/.test(role.title)
    ? role.title
    : `${/^[AEIOU]/.test(role.title) ? "an" : "a"} ${role.title}`;
  return [
    "Introduction\n\n“Please introduce yourself and tell us about your previous work experience.”",
    `Why This Position?\n\n“Why are you interested in working as ${as}, and what do you believe you can contribute to our team?”`,
    `Problem Solving\n\n“${role.videoProblem}”`,
    `Skills & Tools\n\n“${role.videoSkills}”`,
    `Learning & Adaptability\n\n“${role.videoLearning}”`,
    "If money were no longer a concern, what would become the most important thing in your life? why",
    "Anything you would like to mention",
  ];
}
