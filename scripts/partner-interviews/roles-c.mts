import type { Role } from "./types.mjs";

export const ROLES_C: Role[] = [
  {
    title: "Data Entry Clerk",
    typing:
      "Customer record update for Mr. Khan, account number 40715. The phone number has changed to 050 123 4567 and the new address is Villa 12, Street 8, Al Barsha 2, Dubai. Please remove the old email address from the system. The last invoice, number INV-2291, was paid in full on 14 March for 1,250 AED. Check the spelling of the name before you save the record.",
    rush: "Many requests arrive at the same time:\n\n• the finance team needs 50 invoices entered before today's payment run\n• a colleague asks you to fix a wrong phone number in a customer record\n• your manager wants a list of new customers from last week\n• 3 emails ask when their forms will be processed\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this email from a customer:\n\n“You spelled my name wrong on my account again. This is the second time.”",
    explain:
      "A new colleague asks why you must check every record against the paper form before saving it.\n\nHow would you explain it simply?",
    angry:
      "A colleague from another team is angry because a report shows wrong numbers. They say you typed them wrong, but you entered exactly what was on the paper form.\n\nWhat would you do?",
    breakdown:
      "The system freezes while you are entering a batch of 200 records, and you are not sure which ones were saved.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Open the new batch of forms, enter them into the system, check each one against the paper copy and put any form with missing details in the red tray. Send me the total count before you leave.”\n\nExplain what you need to do and in what order.",
    safety:
      "A person calls and says they are a customer. They ask you to read out their full account details and card number over the phone. You cannot confirm who they are.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — enter 30 delivery orders, due in 1 hour\n• Task B — clean up duplicate records, due by the end of the week\n• Task C — the manager asks you to correct one wrong price in the system now\n\nExplain which task you would do first and why.",
    tools:
      "Which spreadsheet programs, databases or office systems have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "At the end of the day, you check your work and find that 5 dates you entered have the day and month switched.\n\nHow would you find the cause and fix it?",
    learning:
      "The company moves to a new data system with different screens and shortcuts.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Finish the invoices first, then scan the signed contracts. If a form has a missing ID number, do not guess it. Put it aside and email me.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you email the manager?",
    check:
      "The paper form says:\n\nName: Ahmed Rashid\nPhone: 055 482 1937\nDate: 12/05/2026\nAmount: 3,450 AED\n\nThe record you entered says:\n\nName: Ahmed Rashid\nPhone: 055 482 1397\nDate: 12/05/2026\nAmount: 3,450 AED\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that yesterday you saved 20 records into the wrong customer group, but nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“The branch sent 3 boxes of forms. Count them, enter the urgent ones first, and email me by 4 pm how many are done and how many have missing details.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time you found a mistake in data or a document and how you fixed it.",
    videoSkills: "How fast and accurately can you type, and which computer programs have you used?",
    videoLearning:
      "If you joined us and had to learn a new data system in your first week, how would you learn it?",
  },
  {
    title: "Delivery Driver",
    knowledge:
      "You have 25 parcels to deliver today with the company car.\n\nDescribe every step you take, from checking the car in the morning to handing over the last parcel.",
    rush: "Several things happen at the same time:\n\n• a customer calls to say they are only home for the next 20 minutes\n• an urgent parcel must reach an office before 12:00\n• dispatch adds 2 new pick-ups to your route\n• a customer asks you to leave their parcel with the building guard\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this customer message:\n\n“The tracking says my parcel was delivered, but I did not get it.”",
    explain:
      "A customer does not understand why they must give a code from their phone to receive their parcel.\n\nHow would you explain it simply?",
    angry:
      "A customer shouts at you because their parcel is 2 hours late. The delay happened because an accident closed the main road.\n\nWhat would you do?",
    breakdown:
      "The engine temperature warning light turns on in the afternoon heat, and you still have 10 parcels to deliver.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before you leave, check the tyres and fuel, scan every parcel into the car, plan your route on the app and put any damaged parcel aside for me. Send me a message when you start the route.”\n\nExplain what you need to do and in what order.",
    safety:
      "You are running late and your phone keeps ringing with customer calls while you are driving on a busy road.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a parcel of medical supplies must reach a clinic in 30 minutes\n• Task B — 12 normal parcels are due by 6 pm\n• Task C — dispatch asks you to bring 2 failed parcels back to the warehouse today\n\nExplain which task you would do first and why.",
    tools:
      "Which vehicles, navigation apps or parcel scanners have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "Your supervisor tells you that 3 customers this week said their parcels arrived damaged.\n\nHow would you find the cause and fix it?",
    learning:
      "You are given a new delivery area of the city that you have never driven in before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Deliver the parcels with a red sticker first, then the rest in route order. If a customer refuses a parcel, do not argue. Call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The delivery app says:\n\nCustomer: Ms. Sara Ali\nAddress: Building 14, Flat 603, Al Nahda\nParcels: 2\n\nThe label on the parcel says:\n\nCustomer: Ms. Sara Ali\nAddress: Building 41, Flat 603, Al Nahda\nParcels: 2\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you marked a parcel as “delivered” in the app, but it is still in your car. Nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“Pick up 5 returns from the mall, drop the 3 urgent parcels at the hospital, and message me by 2 pm with any parcels you could not deliver and why.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a delivery went wrong and how you handled it with the customer.",
    videoSkills:
      "Which vehicles have you driven for work, and which navigation or delivery apps have you used?",
    videoLearning:
      "If you joined us and had to learn a new delivery area in your first week, how would you learn it?",
  },
  {
    title: "Event Staff",
    knowledge:
      "Guests will arrive in 1 hour for a company dinner, and you are in charge of the check-in desk.\n\nDescribe every step you take, from setting up the desk to closing the guest list.",
    rush: "Many things happen at the same time at the entrance:\n\n• 15 guests are waiting in the check-in line\n• a guest's name is not on the list\n• a speaker has arrived and needs to go backstage\n• the organiser asks for more chairs in the main hall\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a guest after the event:\n\n“I left my jacket on a chair in the main hall. Did anyone find it?”",
    explain:
      "A guest who speaks little English asks how to find the workshop room and when lunch will be served.\n\nHow would you explain it simply?",
    angry:
      "A guest shouts at the entrance because their name is not on the list. They say they paid for a ticket.\n\nWhat would you do?",
    breakdown:
      "The tablet you use to scan guest tickets stops working 10 minutes before the doors open.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Set up the registration table, put out the name badges in A to Z order, test the ticket scanner and place the signs to the main hall. Tell me when the entrance is ready.”\n\nExplain what you need to do and in what order.",
    safety:
      "During the event, you see a power cable lying across a busy walkway, and a guest almost trips over it.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — the doors open in 15 minutes and the welcome desk is not ready\n• Task B — pack down the exhibition stands after the event ends at 10 pm\n• Task C — the organiser asks you to count the gift bags now\n\nExplain which task you would do first and why.",
    tools:
      "Which ticket scanners, check-in apps, radios or event equipment have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "After check-in, the organiser tells you that your list shows 12 fewer guests than the number of people in the hall.\n\nHow would you find the cause and fix it?",
    learning:
      "You are working at a big venue for the first time, with many halls, doors and rooms you do not know.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Help guests find their seats first, then refill the water stations. If the area near the exits gets too crowded, stop letting people in and call me on the radio.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The guest list says:\n\nName: Mr. Omar Hassan\nCompany: Blue Sky Trading\nTable: 7\nMeal: Vegetarian\n\nThe name badge and table card say:\n\nName: Mr. Omar Hassan\nCompany: Blue Sky Trading\nTable: 7\nMeal: Vegetarian\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you gave a normal guest a VIP badge by mistake, but nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“After the event, fold the chairs, pack the banners into their boxes, bring everything to loading bay 2, and tell me by 11 pm if anything is broken or missing.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time a guest or visitor was unhappy and how you helped them.",
    videoSkills:
      "What event work have you done before, and which tasks or equipment can you handle?",
    videoLearning:
      "If you joined us and had to learn a new venue and event plan before your first shift, how would you learn it?",
  },
  {
    title: "Facade Cleaning Technician",
    knowledge:
      "You must clean the windows on one side of a 20-floor building using a rope system.\n\nDescribe every step you take, from checking your equipment to finishing the last window.",
    rush: "Several things happen at the same time:\n\n• the building manager wants the entrance glass cleaned before a VIP visit at 11:00\n• a tenant complains about water dripping on their balcony\n• your team leader asks you to check the ropes for tomorrow\n• the wind is getting stronger\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from the building manager:\n\n“The windows on floor 12 still have streaks after your team cleaned them.”",
    explain:
      "A security guard asks why you cannot start work today, even though the sky is clear. The wind is too strong for rope work.\n\nHow would you explain it simply?",
    angry:
      "A tenant shouts at you from a balcony because water from your work splashed onto their furniture.\n\nWhat would you do?",
    breakdown:
      "The cradle (the platform that moves up and down the building) stops between two floors while you and a colleague are on it.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Put up the barriers and warning signs on the ground, check all harnesses and ropes, mix the cleaning solution and wait for my OK before anyone goes over the edge. Tell me when the ground area is closed.”\n\nExplain what you need to do and in what order.",
    safety:
      "Before you go down on the ropes, you notice that your harness strap is worn and a little torn. The team is ready to start and the job is already late.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — the lobby glass must be clean before a visit in 1 hour\n• Task B — floors 10 to 15 must be finished by Thursday\n• Task C — the team leader asks you to inspect and log the equipment now\n\nExplain which task you would do first and why.",
    tools:
      "Which rope access equipment, cradles, water-fed poles or pressure washers have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "After you finish a section, you see white marks on the glass when it dries in the sun.\n\nHow would you find the cause and fix it?",
    learning:
      "Your company gets a new type of cradle with different controls from the one you know.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Finish the windows on the north side first, then move to the east side. If the wind gets stronger than the safe limit, come down at once and call me.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The work order says:\n\nBuilding: Tower B\nSide: North\nFloors: 5 to 18\nDay: Tuesday\n\nThe sheet on your clipboard says:\n\nBuilding: Tower B\nSide: South\nFloors: 5 to 16\nDay: Tuesday\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you missed cleaning 3 windows on floor 9, but nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“Clean the glass on the entrance canopy, wash the dust off the ground floor walls, and send me photos of the finished work by 1 pm.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a client or building manager was unhappy with the work and how you fixed it.",
    videoSkills:
      "What facade cleaning or work at height have you done, and which equipment can you use?",
    videoLearning:
      "If you joined us and had to learn a new building or new equipment in your first week, how would you learn it?",
  },
  {
    title: "Fitness Trainer",
    knowledge:
      "A new gym member wants to start strength training but has never used weights before.\n\nDescribe every step you take in their first session, from greeting them to the end of the workout.",
    rush: "Many things happen at the same time:\n\n• your group class starts in 5 minutes\n• a member asks you to check their squat form\n• a new member is waiting at reception for a tour\n• a cable on one weight machine looks loose\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a member:\n\n“I have trained for 2 months and I don't see any results. I'm thinking of cancelling.”",
    explain:
      "A new member asks why they need to warm up before lifting weights.\n\nHow would you explain it simply?",
    angry:
      "A member gets angry because you asked them to put their weights back and wipe the bench. They say they pay for the gym, so it is not their job.\n\nWhat would you do?",
    breakdown:
      "The sound system stops working 10 minutes into your spinning class with 15 people.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before the evening classes, check the studio mats and weights, wipe down the bikes, write the class plan on the board and sign in every member on the tablet. Tell me if anything is broken.”\n\nExplain what you need to do and in what order.",
    safety:
      "During your class, a member suddenly feels dizzy, turns pale and sits down on the floor.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a personal training client arrives in 15 minutes\n• Task B — write next month's class timetable, due on Friday\n• Task C — the manager asks you to help sign up new members at reception now\n\nExplain which task you would do first and why.",
    tools:
      "Which gym machines, fitness trackers or class booking apps have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "Several members say your class was too hard, and 4 people left early.\n\nHow would you find the cause and fix it?",
    learning:
      "The gym starts a new type of group class that you have never taught before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Finish your personal training session first, then set up the studio for the 7 pm class. If a member gets hurt, stop the class, give first aid and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The booking system says:\n\nClass: Circuit Training\nTime: 6:30 pm\nRoom: Studio 2\nBooked: 12 members\n\nThe timetable on the studio door says:\n\nClass: Circuit Training\nTime: 7:30 pm\nRoom: Studio 2\nBooked: 12 members\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you wrote the wrong weight in a member's training plan (40 kg instead of 14 kg), but nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“Call the 6 members who missed their sessions this week, book them a new time, and send me a list by 5 pm of who booked and who did not answer.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time a member or client was unhappy and how you helped them.",
    videoSkills:
      "Which types of training or classes can you coach, and which gym equipment do you know well?",
    videoLearning:
      "If you joined us and had to learn a new class program in your first week, how would you learn it?",
  },
  {
    title: "Florist Assistant",
    knowledge:
      "A customer orders a bouquet of 12 red roses, wrapped in paper with a ribbon and a card.\n\nDescribe every step you take, from choosing the flowers to handing over the bouquet.",
    rush: "Many things happen at the same time in the morning:\n\n• a driver is waiting for 4 bouquets\n• a customer in the shop wants help choosing birthday flowers\n• the fresh flower delivery has just arrived and must go into water\n• the phone is ringing with a new order\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this online message:\n\n“The flowers I bought from you yesterday are already dying.”",
    explain:
      "A customer asks how to keep their flowers fresh for longer at home.\n\nHow would you explain it simply?",
    angry:
      "A customer is angry because their bouquet does not look like the photo on the website. The shop used other flowers because the roses were sold out, and nobody told the customer.\n\nWhat would you do?",
    breakdown:
      "The flower cold room stops cooling on a hot afternoon. It is full of fresh flowers for tomorrow's wedding order.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Cut the stems of the new roses, change the water in all the buckets, throw away any flowers that are wilting and write down what we need to order. Tell me when the cold room is done.”\n\nExplain what you need to do and in what order.",
    safety:
      "You are cleaning the flower buckets with bleach. A colleague tells you to mix it with another cleaning liquid so it works faster.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a bouquet for a hospital delivery, due in 30 minutes\n• Task B — 20 table arrangements for a wedding tomorrow evening\n• Task C — the manager asks you to clean the shop window now\n\nExplain which task you would do first and why.",
    tools:
      "Which florist tools (knives, stem cutters, floral foam, wrapping paper) or payment systems have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "You finish a bouquet and see that it looks flat and leans to one side.\n\nHow would you find the cause and fix it?",
    learning:
      "The shop starts selling a new range of dried flower arrangements that you have never made before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Prepare the delivery orders first, then help the customers in the shop. If you see flowers with insects or mould, take them out of the cold room and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The order form says:\n\nFlowers: 10 white lilies, 5 pink roses\nCard: Happy Anniversary, Sara\nDelivery: 4:00 pm\n\nThe bouquet you prepared has:\n\nFlowers: 10 white lilies, 5 pink roses\nCard: Happy Birthday, Sara\nDelivery: 4:00 pm\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you wrote the wrong phone number on a delivery order, but nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“The wedding flowers arrive at 10. Check them against the order, put them in water in the cold room, and tell me by 12 which flowers are missing or damaged.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a customer was unhappy with their order and how you helped them.",
    videoSkills: "What flower work have you done, and which tools or bouquet styles do you know?",
    videoLearning:
      "If you joined us and had to learn many new flower names and prices in your first week, how would you learn them?",
  },
  {
    title: "Flower Delivery Driver",
    knowledge:
      "You have 8 flower orders to deliver today to homes and offices across the city.\n\nDescribe every step you take, from loading the flowers into the car to the last delivery.",
    rush: "Several things happen at the same time:\n\n• a birthday bouquet must arrive before a party at 7 pm\n• a sympathy arrangement must reach a family home by 5 pm\n• the shop calls to add one more order to your route\n• a customer asks you to deliver 1 hour earlier\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this customer message:\n\n“The flowers were left at the security desk, not at my mother's flat. She only got them in the evening.”",
    explain:
      "The person receiving the flowers asks who sent them, but the sender asked to stay secret.\n\nHow would you explain this simply and politely?",
    angry:
      "A customer shouts at you because the flowers arrived 40 minutes late for a surprise. You were late because the shop gave you the order late.\n\nWhat would you do?",
    breakdown:
      "The car's air conditioning stops working at midday in summer, and you still have 5 bouquets in the car.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Load the big arrangements first, secure the vases so they don't fall over, check that each card matches its order and plan your route. Send me a message when you leave the shop.”\n\nExplain what you need to do and in what order.",
    safety:
      "While you are driving on a busy highway, you hear a glass vase fall over in the back of the car and water starts spilling.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a bouquet for a hospital patient, and visiting time ends in 45 minutes\n• Task B — 4 office deliveries, due before 5 pm\n• Task C — the shop asks you to come back now to pick up a new order\n\nExplain which task you would do first and why.",
    tools:
      "Which vehicles, navigation apps or delivery apps have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "The shop tells you that 2 customers said their bouquets arrived with broken stems this week.\n\nHow would you find the cause and fix it?",
    learning:
      "The shop starts delivering to a new area outside the city that you have never driven to.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Deliver the orders with a time slot first, then the rest. If nobody is home, do not leave the flowers outside in the sun. Call me and bring them back.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The order says:\n\nTo: Ms. Fatima Noor\nAddress: Villa 22, Street 5, Mirdif\nTime: 2:00 pm - 4:00 pm\nCard: Get well soon\n\nThe delivery note in your car says:\n\nTo: Ms. Fatima Noor\nAddress: Villa 22, Street 15, Mirdif\nTime: 2:00 pm - 4:00 pm\nCard: Get well soon\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you delivered two bouquets to the wrong addresses (you swapped them), but nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“Deliver the 3 office orders, pick up the empty vases from the hotel, and message me by 1 pm with a photo of each delivery.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time a delivery did not go as planned and how you handled it.",
    videoSkills:
      "Which vehicles have you driven for work, and how well do you know the areas of the city?",
    videoLearning:
      "If you joined us and had to learn new delivery areas in your first week, how would you learn them?",
  },
  {
    title: "Forklift Operator",
    knowledge:
      "You must move 10 pallets from the receiving area to the second level of the racks.\n\nDescribe every step you take, from checking the forklift to placing the last pallet.",
    rush: "Several requests come at the same time:\n\n• a truck is waiting to be unloaded at dock 3\n• the picking team needs a pallet brought down from the top rack\n• a supervisor asks you to move empty pallets out of a walkway\n• a colleague asks for help loading an outgoing order\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a client:\n\n“Our pallet arrived with 3 broken boxes. It was fine when it left our factory.”",
    explain:
      "A new warehouse worker asks why they must never walk close behind a moving forklift.\n\nHow would you explain it simply?",
    angry:
      "A truck driver is shouting because he has waited 1 hour to be unloaded. He wants you to unload him before the trucks that arrived earlier.\n\nWhat would you do?",
    breakdown:
      "You see oil leaking from the forklift, and the forks slowly go down by themselves. The loading team is waiting for you.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Do your forklift check, charge the battery if it is below half, unload the truck at dock 2 and put the pallets in zone B. Tell me when the dock is clear.”\n\nExplain what you need to do and in what order.",
    safety:
      "A colleague asks you to lift him up on the forks so he can reach a box on a high shelf. He says it will only take a minute.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — load a truck that must leave in 30 minutes\n• Task B — move stock to the new racks by the end of the shift\n• Task C — the manager asks you to move pallets that are blocking a fire exit now\n\nExplain which task you would do first and why.",
    tools:
      "Which forklifts, reach trucks, pallet jacks or warehouse scanners have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "The stock team tells you that pallets you put away often show the wrong rack location in the system.\n\nHow would you find the cause and fix it?",
    learning:
      "The warehouse gets a new electric reach truck that you have never driven before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Unload the chilled truck first, then put away the dry goods. If a pallet is broken or leaning, do not lift it. Stop and call me.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The delivery note says:\n\nProduct: Rice bags (25 kg)\nPallets: 6\nWeight per pallet: 1,000 kg\nPut away to: Rack C-14\n\nYour put-away scan says:\n\nProduct: Rice bags (25 kg)\nPallets: 5\nWeight per pallet: 1,000 kg\nPut away to: Rack C-14\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you hit a rack leg with the forklift earlier and it is now a little bent, but nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“Unload the two containers, count the pallets, move any damaged ones to the quarantine area, and tell me by 11 am how many pallets came in and how many were damaged.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time something went wrong in a warehouse and how you dealt with it.",
    videoSkills:
      "Which forklifts or warehouse machines have you driven, and what kinds of loads have you moved?",
    videoLearning:
      "If you joined us and had to learn a new warehouse layout in your first week, how would you learn it?",
  },
  {
    title: "Game Tester",
    typing:
      "Bug report 1042. Level 3, the forest map. When the player jumps on the moving bridge and presses the pause button at the same time, the game freezes and the music keeps playing. This happens 4 out of 5 times on the latest build. Steps to repeat: start level 3, walk to the bridge, jump, then press pause. Expected result: the game pauses normally. Priority: high.",
    rush: "Many requests arrive at the same time:\n\n• the lead developer needs a quick test of a fix before a release in 1 hour\n• a new build is ready with 20 test cases to run\n• a colleague asks you to help repeat a crash they found\n• the producer wants a count of open bugs\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a player on the game's support page:\n\n“The game crashes every time I open the shop menu. Fix it now!”",
    explain:
      "A new team member asks what the difference is between a “crash” bug and a “visual” bug, and which one is more urgent.\n\nHow would you explain it simply?",
    angry:
      "A developer is upset and says your bug report is wrong, because they cannot make the bug happen on their computer.\n\nWhat would you do?",
    breakdown:
      "Your test console keeps turning off in the middle of a long test, and your report is due in 2 hours.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Install the new build, run the main menu tests, then play levels 1 to 5 and log every bug with a video. Send me a short summary before the team meeting at 10.”\n\nExplain what you need to do and in what order.",
    safety:
      "A friend asks you to send them screenshots and a video of the new game before it is released. They promise not to share it.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — test a fix that must go live in 2 hours\n• Task B — write the weekly test summary, due on Thursday\n• Task C — the lead asks you to check a crash that players reported, now\n\nExplain which task you would do first and why.",
    tools:
      "Which game consoles, PCs, phones or bug tracking tools have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "The developers send back 3 of your bug reports marked “cannot reproduce” (they could not make the bug happen).\n\nHow would you find the cause and fix it?",
    learning:
      "The team gives you a type of game you have never played before, with its own rules and controls.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Test the new login screen first, then check the sound settings. If you find a bug that deletes a player's saved progress, stop testing and message me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you message the manager?",
    check:
      "Your notes say:\n\nBug ID: 2231\nDevice: Phone (test model B)\nLevel: 6\nSteps: Open map, tap Shop, tap Buy\nResult: Game crashes\n\nThe bug in the tracking system says:\n\nBug ID: 2231\nDevice: Phone (test model B)\nLevel: 8\nSteps: Open map, tap Shop, tap Buy\nResult: Game crashes\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you marked a bug as “fixed” in the system without testing it properly, and nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“Play the new update on the phone and the PC, check that the 3 old bugs are fixed, and send me a report by 5 pm with any new bugs you found.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time you found a problem that others missed and how you reported it.",
    videoSkills:
      "Which games, devices and bug tracking tools have you used, and what testing have you done?",
    videoLearning:
      "If you joined us and had to learn a new game and its test process in your first week, how would you learn it?",
  },
];
