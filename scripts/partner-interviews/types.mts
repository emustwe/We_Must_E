// One partner role's interview content. The generator (build.mts) turns it
// into the same pattern as the real job: a 25-question Test, 7 videos and the
// shared 25-question Survey. Each field is the question body in plain text;
// the section headings are added by the generator.
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
