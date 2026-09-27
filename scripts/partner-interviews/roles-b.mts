import type { Role } from "./types.mjs";

export const ROLES_B: Role[] = [
  {
    title: "AC Technician Helper",
    knowledge:
      "The technician asks you to help clean the indoor unit of a split AC in a villa bedroom.\n\nDescribe every step you take, from arriving in the room to handing the room back to the customer.",
    rush: "It is a hot July afternoon and many requests come at once:\n\n• the technician needs the ladder and the gauges from the van\n• the villa owner asks why the AC is dripping water\n• the office calls to say the next customer is waiting\n• the customer asks you to move the furniture back\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a customer:\n\n“Your team came yesterday, but my AC is still not cold. I am very unhappy.”",
    explain:
      "A tenant asks why they should clean the AC filter every month.\n\nHow would you explain it simply?",
    angry:
      "A customer shouts that your team left dust and dirty water on their new carpet after the service.\n\nWhat would you do?",
    breakdown:
      "The coil-cleaning pump stops working halfway through a job, and there are 3 more AC units to clean in the same villa.\n\nWhat would you do?",
    instruction:
      "The technician says:\n\n“Switch off the AC at the isolator, cover the bed and floor with plastic, bring the coil cleaner and the drain pump from the van, and tell me when the area is ready.”\n\nExplain what you need to do and in what order.",
    safety:
      "The technician asks you to go up on the roof to help with an outdoor unit. The ladder is not tied, it is 45°C, and the power to the unit is still on.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — load the van for the next job, which starts in 30 minutes\n• Task B — clean and organize the tools, due by the end of the day\n• Task C — the technician asks you to hold the ladder for him now\n\nExplain which task you would do first and why.",
    tools:
      "Which tools have you used before, for example ladders, drills, a pressure washer, a vacuum pump or gauges?\n\nFor each one, explain what you used it for.",
    quality:
      "After you clean an indoor unit, water starts dripping from it down the wall.\n\nHow would you find the cause and fix it?",
    learning:
      "The company starts servicing a new type of AC (a ducted system) that you have never seen before.\n\nWhat would you do during your first day?",
    steps:
      "The technician tells you:\n\n“Take out the old filters and wash them outside, then clean the drain tray. If you see burnt wires or smell burning, do not touch anything and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the technician?",
    check:
      "The job sheet says:\n\nCustomer: Mr. Khan\nVilla 14, Street 7\nService: 3 x split AC cleaning\nTime: 9:00 am\n\nThe message on your phone says:\n\nCustomer: Mr. Khan\nVilla 41, Street 7\nService: 3 x split AC cleaning\nTime: 9:00 am\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you forgot to put back one screw on the AC cover at the last house, but nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "The technician says:\n\n“Check the van stock against the list, clean the tools, put the new filters on the top shelf, and tell me by 5 pm which parts are missing.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a customer was unhappy with a repair or service and what you did.",
    videoSkills: "Which tools can you use, and what AC or maintenance work have you done before?",
    videoLearning:
      "If you joined us and had to learn a new type of AC system in your first week, how would you learn it?",
  },
  {
    title: "Bakery Assistant",
    knowledge:
      "The morning shift starts at 5 am. You must bake 40 croissants from frozen dough.\n\nDescribe every step you take, from taking the dough out of the freezer to putting the croissants in the display.",
    rush: "At 8 am many things happen at once:\n\n• a tray of bread in the oven is almost ready\n• 5 customers are waiting at the counter\n• a customer is here to collect a birthday cake\n• the delivery driver needs the hotel order packed\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a customer:\n\n“I need a cake for Friday. Can you write my son's name on it and make it without eggs?”",
    explain:
      "A customer asks what the difference is between sourdough bread and normal white bread.\n\nHow would you explain it simply?",
    angry:
      "A customer is angry because the wrong name is written on the cake they ordered, and the party starts in one hour.\n\nWhat would you do?",
    breakdown:
      "The main oven stops heating at 6 am, and the hotel bread order must be ready by 7:30.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before opening, turn on the ovens, take the dough out of the proofer, check the dates on the cream and butter, and fill the bread shelves. Tell me when everything is ready.”\n\nExplain what you need to do and in what order.",
    safety:
      "You notice that a tray of cream cakes was left outside the fridge all night. Your colleague wants to put them in the display.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — box and label a cake order that the customer collects in 30 minutes\n• Task B — clean the mixer and baking trays, due at the end of the shift\n• Task C — the manager asks you to bring flour bags from the store now\n\nExplain which task you would do first and why.",
    tools:
      "Which ovens, mixers, dough sheeters, scales or cash registers have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "A tray of bread rolls comes out of the oven flat and hard.\n\nHow would you find the cause and fix it?",
    learning:
      "The bakery adds 5 new Arabic sweets to the menu, and you have never made them before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Take the bread out of the oven first, then serve the customers at the counter. If a customer asks about allergies and you are not sure, check the ingredient list or call me.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The cake order form says:\n\nName on cake: Happy Birthday Sara\nFlavour: Chocolate\nSize: 1 kg\nPick-up: Saturday, 4 pm\n\nThe label you wrote on the box says:\n\nName on cake: Happy Birthday Sara\nFlavour: Vanilla\nSize: 1 kg\nPick-up: Saturday, 5 pm\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you used salt instead of sugar in a batch of muffins, and they are already in the display. Nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“The flour delivery is here. Check it against the invoice, put the butter and cream in the cold room first, store the flour bags off the floor, and tell me by 11 am what was missing.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time a customer was unhappy with an order and what you did.",
    videoSkills: "Which breads, pastries or cakes can you make, and which machines have you used?",
    videoLearning:
      "If you joined us and had to learn new recipes in your first week, how would you learn them?",
  },
  {
    title: "Building Inspection Assistant",
    knowledge:
      "The inspector asks you to record a cracked wall in a building's car park.\n\nDescribe every step you take, from arriving at the site to sending your photos and notes to the inspector.",
    rush: "You arrive at a building and many requests come at once:\n\n• the inspector needs the measuring tape and the camera\n• the building manager wants to know how long the visit will take\n• the office asks for yesterday's photos\n• a tenant wants to show you a water leak in their flat\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a building manager:\n\n“Your inspection visit was booked for 10 am. Nobody came. Please explain.”",
    explain:
      "A building owner asks why the report says “fire door does not close fully” is a problem.\n\nHow would you explain it simply?",
    angry:
      "A building manager is angry and says your report is wrong, because the fire alarm was working last week.\n\nWhat would you do?",
    breakdown:
      "Your camera battery dies halfway through an inspection, and you still have 3 floors to photograph.\n\nWhat would you do?",
    instruction:
      "The inspector says:\n\n“Start on the roof and photograph the water tanks and AC units. Then check every fire exit on the way down. Write the floor number on every note, and send me everything by 4 pm.”\n\nExplain what you need to do and in what order.",
    safety:
      "During an inspection, you see an open electrical panel with wires showing and water on the floor next to it. The inspector is on another floor.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — send the photos from this morning's site, due by 12 noon\n• Task B — type up the notes from yesterday, due by the end of the week\n• Task C — the inspector asks you to hold the ladder while he checks a ceiling now\n\nExplain which task you would do first and why.",
    tools:
      "Which tools have you used before, for example a camera, a measuring tape, a laser measure, a moisture meter or apps on a tablet?\n\nFor each one, explain what you used it for.",
    quality:
      "The inspector says many of your photos are blurry and he cannot see the cracks in them.\n\nHow would you find the cause and fix it?",
    learning:
      "The company starts using a new tablet app for inspection notes, and you have never used it.\n\nWhat would you do during your first day?",
    steps:
      "The inspector tells you:\n\n“Check the fire extinguishers on each floor first, then take photos of the stairs. If any fire exit is locked or blocked, tell the building manager and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the inspector?",
    check:
      "Your notes say:\n\nBuilding: Tower B\nFloor 6 — fire extinguisher expired\nFloor 7 — emergency light not working\nFloor 9 — crack in stair wall\n\nThe report the office typed says:\n\nBuilding: Tower B\nFloor 6 — fire extinguisher expired\nFloor 7 — emergency light not working\nFloor 9 — crack in stair wall\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you wrote the wrong floor number on a photo you already sent to the inspector. Nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "The inspector says:\n\n“Go to the villa in Street 12. Take photos of every room, check all the taps and drains for leaks, and send me a short report by 3 pm.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time someone disagreed with your work and how you handled it.",
    videoSkills:
      "Which tools, apps or cameras can you use, and what site or building work have you done before?",
    videoLearning:
      "If you joined us and had to learn our inspection checklist in your first week, how would you learn it?",
  },
  {
    title: "Cafe Bartender",
    knowledge:
      "A guest orders a fresh mint lemonade and a mango smoothie.\n\nDescribe every step you take, from washing your hands to serving the drinks.",
    rush: "On a Friday evening, many orders arrive at once:\n\n• a table of 6 ordered mocktails\n• a delivery rider is waiting for 4 fresh juices\n• a guest at the bar wants a recommendation\n• a waiter says the ice bin is almost empty\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this online review:\n\n“The mocktail was too sweet and the juice did not taste fresh.”",
    explain:
      "A guest asks what a mocktail is and whether it has alcohol in it.\n\nHow would you explain it simply?",
    angry:
      "A guest complains loudly that their juice has too much ice and demands a free drink.\n\nWhat would you do?",
    breakdown:
      "The blender breaks on a busy evening, and there are 5 smoothie orders waiting.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before opening, cut the lemons and limes, fill the ice bin, check the dates on the fruit and syrups, and write any missing stock on the order sheet. Tell me when you are ready.”\n\nExplain what you need to do and in what order.",
    safety:
      "During a busy service, you drop a glass and it breaks right next to the open ice bin.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — 15 drinks for a birthday table, due in 15 minutes\n• Task B — deep cleaning the juicer, due at closing\n• Task C — the manager asks you to count the fruit stock now\n\nExplain which task you would do first and why.",
    tools:
      "Which juicers, blenders, coffee machines or payment systems have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "A regular guest says their strawberry mocktail tastes different today and is too watery.\n\nHow would you find the cause and fix it?",
    learning:
      "The cafe adds a new summer menu of 8 mocktails you have never made before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Make the drinks for the waiting tables first, then refill the ice and cut more fruit. If any fruit looks or smells bad, throw it away and tell me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you tell the manager?",
    check:
      "The waiter's order says:\n\nTable 5\n2 x Mint Lemonade (no sugar)\n1 x Mango Smoothie (large)\n1 x Fresh Orange Juice (no ice)\n\nThe drinks you prepared are:\n\nTable 5\n2 x Mint Lemonade (no sugar)\n1 x Mango Smoothie (small)\n1 x Fresh Orange Juice (no ice)\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you used a syrup that expired last week in several drinks today. Nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“The fruit delivery is at the back door. Check it against the invoice, put the berries and soft fruit in the fridge first, and tell me by 2 pm what was missing or damaged.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a guest was unhappy with a drink and how you turned it around.",
    videoSkills:
      "Which mocktails, juices or coffee drinks can you make, and which machines have you used?",
    videoLearning:
      "If you joined us and had to learn a new drinks menu in your first week, how would you learn it?",
  },
  {
    title: "Call Center Agent",
    typing:
      "Customer called at 10:15 am about order number 48213. She said the parcel was marked as delivered yesterday, but she did not receive it. I checked the address and the phone number with her. Both are correct. I opened a ticket for the delivery team and told her they will call her within 24 hours. She asked for an email update, so I added her email to the ticket.",
    rush: "Your queue is full and many things happen at once:\n\n• a caller has been on hold for 4 minutes\n• 3 new chats are waiting\n• a customer emails that their card was charged twice\n• your team leader asks you to join a short meeting\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this chat message:\n\n“I have called 3 times about my refund and nobody helps me. Where is my money?”",
    explain:
      "A caller does not understand what a “reference number” is or why they need to keep it.\n\nHow would you explain it simply?",
    angry:
      "A caller shouts and uses rude words because their internet has not worked for 2 days.\n\nWhat would you do?",
    breakdown:
      "The customer system freezes while you are on a call, and you cannot see the customer's account.\n\nWhat would you do?",
    instruction:
      "Your team leader says:\n\n“At the start of your shift, log in to the phone system, read the new updates on the notice board, set your status to Ready, and send me a message when you are online.”\n\nExplain what you need to do and in what order.",
    safety:
      "A caller says he is calling for his friend, Mr. Khan. He asks you to read out Mr. Khan's address and card details.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — call back a customer you promised to call within 30 minutes\n• Task B — finish today's call notes, due by the end of your shift\n• Task C — your team leader asks you to answer the waiting chats now\n\nExplain which task you would do first and why.",
    tools:
      "Which phone systems, chat tools, customer systems (CRM) or computer programs have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "Your team leader says 3 of your tickets this week had missing notes, so other agents could not help those customers.\n\nHow would you find the cause and fix it?",
    learning:
      "The company launches a new product, and you must answer questions about it from tomorrow.\n\nWhat would you do during your first day?",
    steps:
      "Your team leader tells you:\n\n“Answer the calls in the queue first, then reply to the emails. If a customer asks for a manager or talks about a legal complaint, transfer the call to me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you transfer a call to the team leader?",
    check:
      "The customer said on the phone:\n\nName: Ahmed Ali\nOrder number: 30574\nPhone: 050 123 4567\nProblem: wrong size delivered\n\nThe ticket you typed says:\n\nName: Ahmed Ali\nOrder number: 30547\nPhone: 050 123 4567\nProblem: wrong colour delivered\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you gave a customer the wrong refund date on a call this morning. Nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your team leader says:\n\n“Call back the 5 customers on this list, update each ticket, and send me a short report by 4 pm with which problems are solved and which are still open.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a customer was upset on the phone or in a chat and how you helped them.",
    videoSkills: "Which phone, chat or computer systems have you used, and how fast can you type?",
    videoLearning:
      "If you joined us and had to learn a new product in your first week, how would you learn it?",
  },
  {
    title: "Car Detailing Specialist",
    knowledge:
      "A customer brings a dark SUV with swirl marks on the paint and a dirty interior. They want a full detail.\n\nDescribe every step you take, from receiving the car to handing back the keys.",
    rush: "It is a busy Saturday:\n\n• a customer is waiting in the lounge for their car\n• 2 cars must be ready by 1 pm\n• a new customer calls to ask about prices\n• your colleague needs help moving a car into the bay\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a customer:\n\n“I picked up my car yesterday and there are still water marks on the windows. I paid a lot for this.”",
    explain:
      "A customer asks what the difference is between polishing and waxing a car.\n\nHow would you explain it simply?",
    angry:
      "A customer says you scratched their car during polishing. The scratch was there before the job, but you did not take a photo.\n\nWhat would you do?",
    breakdown:
      "The polishing machine stops working halfway through a job, and the customer is coming back in 2 hours.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before the car comes in, clean the bay, prepare clean microfibre towels, mix the interior cleaner as written on the bottle, and walk around the car with the customer to note any damage. Tell me when you are ready.”\n\nExplain what you need to do and in what order.",
    safety:
      "You must clean the wheels with a strong acid wheel cleaner inside a closed bay. There are no gloves or goggles left in the store.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — the final wipe-down of a car that the customer collects in 45 minutes\n• Task B — washing the polishing pads and towels, due at the end of the day\n• Task C — the manager asks you to check a new car with its customer now\n\nExplain which task you would do first and why.",
    tools:
      "Which tools have you used before, for example a polishing machine, a steam cleaner, a carpet extractor or a pressure washer?\n\nFor each one, explain what you used it for.",
    quality:
      "After you polish a black car, you see small circle marks on the bonnet in the sunlight.\n\nHow would you find the cause and fix it?",
    learning:
      "The shop starts offering ceramic coating, and you have never applied it before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Finish the interior of the white car first, then start washing the black car. If you find any damage that is not written on the check sheet, stop and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The job card says:\n\nCar: white sedan, plate 52817\nService: full interior + exterior polish\nExtra: leather seat conditioning\nReady by: 4 pm\n\nThe list on the workshop board says:\n\nCar: white sedan, plate 52817\nService: full interior + exterior polish\nExtra: none\nReady by: 4 pm\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you used the wrong cleaner on a leather seat and it left a light mark. The customer has not noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“The new stock is here. Check the polishes and towels against the invoice, store the chemicals on the low shelf away from the sun, and tell me by 5 pm what was missing.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a customer was unhappy with a car you cleaned and what you did.",
    videoSkills: "Which detailing jobs can you do, and which machines and products have you used?",
    videoLearning:
      "If you joined us and had to learn a new coating or product in your first week, how would you learn it?",
  },
  {
    title: "Car Wash Attendant",
    knowledge:
      "A customer asks for an outside wash and an inside vacuum for their car.\n\nDescribe every step you take, from the car arriving to handing back the keys.",
    rush: "It is Friday afternoon and many things happen at once:\n\n• 6 cars are in the queue\n• a customer says you missed a dirty spot on his car\n• the vacuum machine is full\n• your supervisor asks you to help at the drying area\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a customer:\n\n“I think I left my sunglasses in my car at your car wash yesterday. Did you find them?”",
    explain:
      "A customer asks why it is better not to wash a car in strong sun at noon.\n\nHow would you explain it simply?",
    angry:
      "A customer is angry because the wait is 40 minutes, and he says he arrived before the car in front of him.\n\nWhat would you do?",
    breakdown:
      "The pressure washer stops working, and there are 5 cars waiting.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before we open, fill the soap tanks, check the hoses for leaks, put out clean towels and empty the vacuum bins. Tell me when it is done.”\n\nExplain what you need to do and in what order.",
    safety:
      "It is 44°C in the afternoon. Your colleague has been washing cars outside for 3 hours. He looks dizzy and confused.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a booked car must be washed and ready in 20 minutes\n• Task B — cleaning the wash area and drains, due at the end of the shift\n• Task C — your supervisor asks you to move a finished car out of the bay now\n\nExplain which task you would do first and why.",
    tools:
      "Which machines have you used before, for example a pressure washer, a foam sprayer, a vacuum cleaner or a tyre shine sprayer?\n\nFor each one, explain what you used it for.",
    quality:
      "After drying a car, you see white water spots on the windows and the paint.\n\nHow would you find the cause and fix it?",
    learning:
      "The car wash starts a new service: waterless car washing at customers' homes. You have never done it.\n\nWhat would you do during your first day?",
    steps:
      "Your supervisor tells you:\n\n“Wash the cars in the queue first, then refill the soap tanks. If a car has an open window or valuable things on the seats, tell the customer and call me before you start.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the supervisor?",
    check:
      "The ticket says:\n\nPlate: 38912\nCar: grey pickup\nService: outside wash + inside vacuum\nPaid: AED 45\n\nThe board at the washing area says:\n\nPlate: 38912\nCar: grey pickup\nService: outside wash + inside vacuum\nPaid: AED 45\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you forgot to vacuum the boot of a car that already left. The customer has not called.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“Clean all 3 wash bays, check the drains for mud, count the clean towels, and tell me by 6 pm if any drain is blocked or if we need more towels.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a customer was unhappy with a car wash and how you fixed it.",
    videoSkills:
      "Which car wash machines and tools can you use, and how do you make a car look clean?",
    videoLearning:
      "If you joined us and had to learn a new wash service in your first week, how would you learn it?",
  },
  {
    title: "Cashier",
    knowledge:
      "A customer comes to your till with a full trolley. They want to pay part by card and part in cash.\n\nDescribe every step you take, from greeting the customer to giving the receipt.",
    rush: "Your till is very busy:\n\n• there are 8 people in your queue\n• an item has no barcode and no price\n• a customer with many bags asks for help packing\n• your supervisor calls you to take new coins for your till\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message on the supermarket's page:\n\n“I was charged for 2 bottles of oil, but I only bought 1. Can you help?”",
    explain:
      "A customer does not understand why the shelf discount did not show at the till. The offer is only for loyalty card members.\n\nHow would you explain it simply?",
    angry:
      "A customer shouts because their card was declined three times, and the people in the queue are watching.\n\nWhat would you do?",
    breakdown:
      "The POS system freezes in the middle of a sale, and your queue is long.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before you open your till, count your cash float, check the card machine has paper, clean the belt and put the bags under the counter. Tell me when you are ready.”\n\nExplain what you need to do and in what order.",
    safety:
      "A jar of sauce breaks on the floor next to your till. There is glass on the floor, and a customer with a small child is walking towards it.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — chilled items that customers left at the till must go back to the fridge within 15 minutes\n• Task B — counting your till, due at the end of your shift\n• Task C — your supervisor asks you to open your till now because the queues are long\n\nExplain which task you would do first and why.",
    tools:
      "Which cash registers, POS systems, card machines or barcode scanners have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "At the end of your shift, your till is AED 50 short.\n\nHow would you find the cause and fix it?",
    learning:
      "The supermarket opens a new self-checkout area, and you must help customers use it.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Serve the customers in your queue first, then clean your till area. If a customer pays with a note that looks fake, do not argue, and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The shelf labels say:\n\nBasmati Rice 5 kg — AED 32.50\nFresh Milk 2 L — AED 9.75\nEggs 30 pcs — AED 18.00\n\nThe till screen shows:\n\nBasmati Rice 5 kg — AED 35.20\nFresh Milk 2 L — AED 9.75\nEggs 30 pcs — AED 18.00\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you gave a customer AED 10 too much change, and they already left. Nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“At the end of your shift, count your till, fill in the cash sheet, put the returned items back on the shelves, and tell me by 10 pm if your till is over or short.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a customer was unhappy at the till and how you helped them.",
    videoSkills:
      "Which tills, card machines or POS systems have you used, and how do you avoid cash mistakes?",
    videoLearning:
      "If you joined us and had to learn a new till system in your first week, how would you learn it?",
  },
  {
    title: "Clinic Receptionist",
    typing:
      "Patient called at 9:40 am to change her appointment with Dr. Hassan from Monday to Wednesday. The only free time on Wednesday is 11:30 am, and she accepted it. I updated the booking system and sent her a text message to confirm. She asked if she needs to bring her insurance card. I told her yes, and asked her to arrive 10 minutes early to fill in the form.",
    rush: "At 9 am many things happen at once:\n\n• 3 patients are waiting at the desk to check in\n• the phone is ringing\n• a doctor asks you to print a file for the next patient\n• a delivery man needs a signature\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a patient:\n\n“I waited 45 minutes after my appointment time yesterday. Why was the doctor so late?”",
    explain:
      "A new patient does not understand why you need a copy of their insurance card and ID before the visit.\n\nHow would you explain it simply?",
    angry:
      "A patient is angry because the insurance company did not approve their visit, and they refuse to pay.\n\nWhat would you do?",
    breakdown:
      "The booking system stops working at 8 am, and the waiting room is filling up.\n\nWhat would you do?",
    instruction:
      "Your manager says:\n\n“Before the clinic opens, switch on the computers and the phone line, check today's appointments, print the list for each doctor and call the patients who have not confirmed. Tell me when it is done.”\n\nExplain what you need to do and in what order.",
    safety:
      "A person at the desk says she works with one of your patients. She asks what time his appointment is and which doctor he is seeing.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — send an insurance approval request for a patient whose appointment is in 30 minutes\n• Task B — file yesterday's paper forms, due by the end of the week\n• Task C — a patient is at the desk and wants to check in now\n\nExplain which task you would do first and why.",
    tools:
      "Which booking systems, phone systems, computer programs or office machines (printer, scanner) have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "Your manager says 2 patients were booked at the same time with the same doctor this week.\n\nHow would you find the cause and fix it?",
    learning:
      "The clinic starts using a new booking system next week.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Check in the patients at the desk first, then call back the missed calls. If a patient says they have chest pain or cannot breathe, tell the nurse straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you tell the nurse?",
    check:
      "The booking system says:\n\nPatient: Ms. Sara Ahmed\nDoctor: Dr. Hassan\nDate: Wednesday, 14 October\nTime: 4:15 pm\n\nThe reminder message you wrote says:\n\nPatient: Ms. Sara Ahmed\nDoctor: Dr. Hassan\nDate: Thursday, 14 October\nTime: 4:50 pm\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you sent an appointment reminder to the wrong patient's phone number this morning. Nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your manager says:\n\n“Call all the patients booked for tomorrow to confirm, update the booking system, and tell me by 3 pm who cancelled and which times are now free.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a patient or customer was upset at the desk and how you helped them.",
    videoSkills: "Which booking systems, phone systems or computer programs have you used at work?",
    videoLearning:
      "If you joined us and had to learn a new booking system in your first week, how would you learn it?",
  },
];
