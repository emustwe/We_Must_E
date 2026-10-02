import type { Role } from "@/lib/question-builder/template";

// A finished job (the partner Barista) shown to the AI as the example to follow.
export const EXAMPLE_ROLE: Role = {
  title: "Barista",
  knowledge:
    "A guest orders a flat white with oat milk.\n\nDescribe every step you take, from grinding the coffee to handing over the cup.",
  rush: "10 orders arrive at the same time:\n\n• a delivery rider is waiting for 3 drinks\n• a regular customer wants their usual\n• a table of 4 ordered cakes and coffees\n• 2 people are asking about dairy-free options\n\nExplain how you would organize and prioritize them.",
  customerMessage:
    "Write a polite reply to this online review:\n\n“My latte was cold and I waited 15 minutes.”",
  explain:
    "A tourist who speaks little English asks what the difference is between a cappuccino and a latte.\n\nHow would you explain it simply?",
  angry:
    "A guest shouts that you made the wrong drink, but the order slip shows it is exactly what they asked for.\n\nWhat would you do?",
  breakdown:
    "The espresso machine stops heating during the morning rush and there are 8 people in the queue.\n\nWhat would you do?",
  instruction:
    "Your supervisor says:\n\n“Before opening, check the milk dates, calibrate the grinder, fill the pastry display and write any missing stock on the order sheet. Tell me when everything is ready.”\n\nExplain what you need to do and in what order.",
  safety:
    "A guest with a nut allergy asks whether a pastry is safe for them. You are not sure of the ingredients.\n\nWhat would you say and do?",
  deadlines:
    "You have three tasks:\n\n• Task A — a catering order of 20 coffees, due in 20 minutes\n• Task B — cleaning the espresso machine, due at closing\n• Task C — the manager asks you to count the stock now\n\nExplain which task you would do first and why.",
  tools:
    "Which coffee machines, grinders or payment systems have you used before?\n\nFor each one, explain what you used it for.",
  quality:
    "A shot of espresso comes out too fast and tastes sour.\n\nHow would you find the cause and fix it?",
  learning:
    "The cafe introduces a new seasonal menu with 6 drinks you have never made before.\n\nWhat would you do during your first day?",
  steps:
    "Your manager tells you:\n\n“Serve the waiting customers first, then restock cups and lids. If the milk fridge feels warm, stop using that milk and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
  check:
    "The online order says:\n\n2 x Iced Latte (oat milk, no sugar)\n1 x Cappuccino (large)\nPick-up: 10:30\n\nThe cup labels you prepared say:\n\n2 x Iced Latte (whole milk, no sugar)\n1 x Cappuccino (large)\nPick-up: 10:30\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
  mistake:
    "You realize that you charged a customer twice for the same coffee, but nobody has noticed yet.\n\nWhat would you do?",
  tasks:
    "Your supervisor says:\n\n“A delivery is arriving at the back door. Check it against the invoice, put the cold items away first, and tell me by 3 pm what was missing.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
  videoProblem: "Tell us about a time a customer was unhappy and how you turned it around.",
  videoSkills: "Which coffee drinks can you make, and which machines or tools have you used?",
  videoLearning:
    "If you joined us and had to learn a new drinks menu in your first week, how would you learn it?",
};
