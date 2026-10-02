// The WemustE interview pattern for one job: a 25-question Test (Exam) and a
// 7-question Video interview (Execute); the Survey (Engage) is the same for
// every job. Questions 16 and 18-25 and videos 1, 6 and 7 are the same for
// every job; the rest come from the job's own `Role` content. Used by the
// admin Question builder and by the partner-job scripts.

// One job's interview content. Each field is the question body in plain
// text; the section headings are added by buildTest/buildVideos.
export type Role = {
  // Exactly as the job title on the map.
  title: string;
  // Office roles: a ~60-word paragraph about the role for the typing test
  // (question 1). Other roles answer `knowledge` instead.
  typing?: string;
  // Q1 (non-office): a practical "describe every step" task from the job.
  knowledge?: string;
  // Q2: many requests at once; organize and prioritize.
  rush: string;
  // Q3: a customer or client message to answer in writing.
  customerMessage: string;
  // Q4: explain something from the job simply to someone who doesn't know it.
  explain: string;
  // Q5: an angry or difficult customer, client or member of the public.
  angry: string;
  // Q6: a tool, machine or system stops working at a bad moment.
  breakdown: string;
  // Q7: a supervisor's multi-step instruction, in quotes; explain the order.
  instruction: string;
  // Q8: a safety or hygiene situation in this job.
  safety: string;
  // Q9: three tasks with different deadlines (A, B, C); which first and why.
  deadlines: string;
  // Q10: which tools, machines or software have you used, and for what.
  tools: string;
  // Q11: checking the quality of your own work; find the cause and fix it.
  quality: string;
  // Q12: something new to learn (tool, product, route, system); first day.
  learning: string;
  // Q13: a manager's instruction, in quotes, then 3 numbered questions.
  steps: string;
  // Q14: two versions of the same information to compare.
  check: string;
  // Q15: a mistake you made that nobody noticed yet.
  mistake: string;
  // Q17: an instruction with several tasks and a report by a time.
  tasks: string;
  // Video 3: a problem or unhappy customer from the job.
  videoProblem: string;
  // Video 4: skills and tools for this job.
  videoSkills: string;
  // Video 5: learning something new in the first week.
  videoLearning: string;
};

export type TestQ = { type: string; prompt: string; options?: string[]; time?: number };

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
      "The Meaning of “E”\n\nOnce upon a time, we believed in one simple idea:\n“We Must E.”\n\nBut what does “E” mean to you?\n\nIt could be anything you believe — Eat, Enjoy, Explore, Educate, Encourage, Empower, Experience, Evolve, or something completely different.\n\nWhat does your “E” stand for?\n\nExplain what it means to you and why you chose it.",
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
