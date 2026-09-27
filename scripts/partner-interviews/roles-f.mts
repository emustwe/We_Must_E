import type { Role } from "./types.mjs";

export const ROLES_F: Role[] = [
  {
    title: "Restaurant Server",
    knowledge:
      "A family of 4 sits down at your table for dinner.\n\nDescribe every step you take, from greeting them to bringing the bill.",
    rush: "It is 8 pm and the restaurant is full:\n\n• table 5 is waving for the bill\n• table 2 has been waiting 10 minutes to order\n• the kitchen says food for table 7 is ready\n• a new couple is standing at the door\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this online review:\n\n“Our server forgot our drinks and we had to ask three times.”",
    explain:
      "A guest who speaks little English asks what “medium” and “well done” mean for a steak.\n\nHow would you explain it simply?",
    angry:
      "A guest says loudly that their food is too spicy and they will not pay for it. They ate half of the dish.\n\nWhat would you do?",
    breakdown:
      "The order tablet stops working in the middle of dinner service and you have 3 tables waiting to order.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before lunch opens, set all tables in your section, fill the water jugs, check the menus are clean and ask the chef what today's special is. Tell me when your section is ready.”\n\nExplain what you need to do and in what order.",
    safety:
      "A guest tells you they are allergic to shellfish and asks if the fried rice is safe. You do not know if it has shrimp paste in it.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a table's main dishes are ready in the kitchen now\n• Task B — refilling the salt and pepper shakers, due before closing\n• Task C — the manager asks you to reset table 9 for a booking in 15 minutes\n\nExplain which task you would do first and why.",
    tools:
      "Which order systems, POS machines or card payment machines have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "Two guests at the same table tell you their food arrived cold.\n\nHow would you find the cause and fix it?",
    learning:
      "The restaurant starts a new menu with 12 dishes you have never served before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Clear the dirty tables first, then set them again for the next guests. If you see any broken glass on the floor, keep guests away from it and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The guest ordered:\n\n1 x Grilled Chicken (no onion)\n2 x Fresh Orange Juice\n1 x Vegetable Soup\nTable: 12\n\nThe order you sent to the kitchen says:\n\n1 x Grilled Chicken (no onion)\n2 x Fresh Orange Juice\n1 x Chicken Soup\nTable: 21\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you forgot to add a dessert to a table's bill. They have already paid and are still sitting at the table.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“We have a group booking of 20 people at 7 pm. Join the tables in the back area, set 20 places, put water on every table and tell me by 6:30 pm if we are missing any chairs or plates.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time a guest was unhappy with their meal and what you did.",
    videoSkills:
      "What have you done as a server, and which order or payment systems have you used?",
    videoLearning:
      "If you joined us and had to learn a new menu in your first week, how would you learn it?",
  },
  {
    title: "Room Cleaner",
    knowledge:
      "A guest has checked out and the room must be ready for a new guest.\n\nDescribe every step you take, from entering the room to closing the door when it is ready.",
    rush: "You have 5 things to do at the same time:\n\n• reception says a VIP guest arrives in 30 minutes and their room is not ready\n• a guest in room 304 asks for extra towels\n• 3 check-out rooms are waiting to be cleaned\n• your cart is almost out of toilet paper\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "A guest left this note on the bed:\n\n“The room was not cleaned yesterday. Please clean it today before 2 pm.”\n\nWrite a short, polite reply note to leave for the guest.",
    explain:
      "A new guest does not understand what the “Do Not Disturb” sign and the “Please Clean My Room” sign are for.\n\nHow would you explain it simply?",
    angry:
      "A guest comes back to the room and shouts that you moved their things while cleaning. You only moved them to clean the table.\n\nWhat would you do?",
    breakdown:
      "The vacuum cleaner stops working when you still have 6 rooms to clean before check-in time.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Start with the check-out rooms on floor 3, then do the stay-over rooms. Change all the bath towels, restock the coffee and tea, and tell me the room numbers when you finish.”\n\nExplain what you need to do and in what order.",
    safety:
      "While cleaning a bathroom, you see that another worker has left a bottle of bleach and a bottle of toilet cleaner open next to each other. You want to mix them to clean faster.\n\nWhat would you do and why?",
    deadlines:
      "You have three tasks:\n\n• Task A — a room for a guest who is waiting in the lobby now\n• Task B — cleaning your cart and refilling it, due at the end of your shift\n• Task C — the supervisor asks you to check the minibar in room 210 within 1 hour\n\nExplain which task you would do first and why.",
    tools:
      "Which cleaning machines, cleaning products or room carts have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "Your supervisor checks your room and finds hair in the bathroom sink and dust under the bed.\n\nHow would you find the cause and fix it?",
    learning:
      "The hotel starts a new checklist for cleaning suite rooms, with 25 steps you have not done before.\n\nWhat would you do during your first day?",
    steps:
      "Your supervisor tells you:\n\n“Clean the rooms on your list first, then take the dirty linen to the laundry room. If you find money, a passport or a phone left in a room, do not move it and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the supervisor?",
    check:
      "The room list says:\n\nRoom 412 - Check-out - 2 beds\nRoom 415 - Stay-over - 1 bed\nRoom 418 - Check-out - 1 bed\n\nYour notes say:\n\nRoom 412 - Check-out - 2 beds\nRoom 415 - Stay-over - 1 bed\nRoom 418 - Check-out - 1 bed\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you forgot to put new soap in a room that is already marked as ready. The guest has not arrived yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“Floor 5 has a big group checking in at 3 pm. Clean rooms 501 to 510, add 2 extra pillows in each room, and tell me by 2:30 pm which rooms are ready and which are not.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time a guest was not happy with their room and what you did.",
    videoSkills:
      "What cleaning work have you done, and which machines or products do you know how to use?",
    videoLearning:
      "If you joined us and had to learn our room cleaning standards in your first week, how would you learn them?",
  },
  {
    title: "Salon Assistant",
    knowledge:
      "A stylist asks you to wash a customer's hair before a haircut.\n\nDescribe every step you take, from bringing the customer to the wash basin to taking them to the stylist's chair.",
    rush: "The salon is very busy:\n\n• a stylist needs a customer's hair washed now\n• 2 walk-in customers are waiting at the front\n• the floor near a chair is covered with cut hair\n• the phone is ringing\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a customer:\n\n“I booked for 4 pm but waited 30 minutes before anyone started my hair. This is not acceptable.”",
    explain:
      "A customer asks what the difference is between a hair treatment and a normal hair wash.\n\nHow would you explain it simply?",
    angry:
      "A customer complains that the water was too hot during the hair wash and says they will not come back.\n\nWhat would you do?",
    breakdown:
      "The hair dryer at the wash area stops working while a stylist is waiting to dry a customer's hair.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before we open, clean all the combs and brushes, fold the clean towels, fill the shampoo bottles and sweep the floor. Tell me when everything is ready.”\n\nExplain what you need to do and in what order.",
    safety:
      "A customer tells you their scalp is burning a lot while hair colour is on their head. The stylist is busy with another customer.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — the next customer arrives in 10 minutes and their chair is not clean\n• Task B — washing and drying all used towels, due before closing\n• Task C — the manager asks you to count the hair colour tubes today\n\nExplain which task you would do first and why.",
    tools:
      "Which salon tools have you used before, such as hair dryers, straighteners, wash basins or cleaning products for tools?\n\nFor each one, explain what you used it for.",
    quality:
      "A stylist tells you that customers still have shampoo in their hair after you wash it.\n\nHow would you find the cause and fix it?",
    learning:
      "The salon starts selling a new range of hair products and you need to know what each one is for.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Greet the waiting customers first, then clean the wash basins. If a customer asks for a service we do not offer, do not say yes and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The booking book says:\n\nMs. Sara - Haircut and blow dry - 11:00 - Stylist: Rana\nMs. Layla - Hair colour - 11:30 - Stylist: Nour\n\nThe screen at reception says:\n\nMs. Sara - Haircut and blow dry - 11:00 - Stylist: Nour\nMs. Layla - Hair colour - 12:30 - Stylist: Nour\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you used a comb on a customer that you had not cleaned after the last customer. Nobody noticed.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“We have a bridal group of 5 at 9 am tomorrow. Prepare 5 stations, check we have enough hair spray and pins, and tell me by 6 pm today what we need to buy.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time a salon customer was unhappy and how you helped.",
    videoSkills: "Which salon tasks can you do, and which tools or products have you used?",
    videoLearning:
      "If you joined us and had to learn our services and products in your first week, how would you learn them?",
  },
  {
    title: "Security Guard",
    knowledge:
      "You start a night shift at an office building.\n\nDescribe every step you take, from the shift handover to finishing your first patrol.",
    rush: "At the main gate, many things happen at once:\n\n• a delivery truck is waiting to enter\n• a visitor has no ID and wants to go in\n• the fire alarm panel shows a fault on floor 2\n• a tenant asks you to open a meeting room\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "A tenant sends this message to the security desk:\n\n“My car was scratched in the parking last night. Why did security not see anything?”\n\nWrite a polite reply.",
    explain:
      "A new visitor does not understand why they must leave their Emirates ID or passport copy at the desk to get a visitor card.\n\nHow would you explain it simply?",
    angry:
      "A visitor gets angry and shouts because you will not let them in without an appointment. They say they know the manager.\n\nWhat would you do?",
    breakdown:
      "The CCTV screens at the security room go black in the middle of the night shift.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“At the start of your shift, check the radio battery, read the log book, test that all doors on the ground floor are locked and start the first patrol at 10 pm. Call me after the patrol.”\n\nExplain what you need to do and in what order.",
    safety:
      "On patrol, you smell smoke coming from an electrical room in the basement. The door is closed.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a patrol of the car park, due at 11 pm\n• Task B — writing the daily report, due at the end of your shift at 7 am\n• Task C — a visitor is waiting at the gate now\n\nExplain which task you would do first and why.",
    tools:
      "Which security tools have you used before, such as radios, CCTV, access card systems, metal detectors or a patrol scanner?\n\nFor each one, explain what you used it for.",
    quality:
      "Your supervisor checks the log book and sees that some of your patrol times are missing.\n\nHow would you find the cause and fix it?",
    learning:
      "You are moved to a new building with a different layout, 3 gates and a new access card system.\n\nWhat would you do during your first day?",
    steps:
      "Your supervisor tells you:\n\n“Check the visitor list first, then give visitor cards only to people on the list. If someone tries to enter by force or you see a weapon, do not stop them yourself and call me and the police straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the supervisor?",
    check:
      "The visitor list says:\n\nName: Mr. Khan\nCompany: Blue Line Trading\nVisiting: Office 604\nTime: 2:00 pm\n\nThe visitor's details at the gate say:\n\nName: Mr. Khan\nCompany: Blue Line Trading\nVisiting: Office 406\nTime: 2:00 pm\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you forgot to write in the log book that a door was left open when you found it one hour ago. Nobody has asked about it.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“There is a building event tonight. Put barriers at the car park entrance, check all fire exits are clear, and tell me by 6 pm how many guards we have and where each one is standing.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time you had to deal with a difficult visitor and what you did.",
    videoSkills: "What security work have you done, and which tools or systems have you used?",
    videoLearning:
      "If you joined us and had to learn a new building in your first week, how would you learn it?",
  },
  {
    title: "Spa Receptionist",
    typing:
      "Dear Ms. Sara, thank you for booking with us. Your 60 minute massage is confirmed for Saturday at 3 pm. Please arrive 15 minutes early to fill in a short form and change. If you need to cancel or move your booking, please call us at least 24 hours before. Payment can be made by card or cash at the front desk. We look forward to seeing you.",
    rush: "At the spa front desk, many things happen at once:\n\n• a guest is waiting to pay\n• the phone is ringing with a new booking\n• a therapist says her next guest has not arrived\n• a walk-in guest asks what treatments are free today\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this email from a guest:\n\n“I was charged for a 90 minute massage but I only had 60 minutes. Please fix this.”",
    explain:
      "A guest asks what the difference is between a facial and a body scrub.\n\nHow would you explain it simply?",
    angry:
      "A guest arrives 30 minutes late and gets angry when you tell them the treatment must be shorter so the next guest is not late.\n\nWhat would you do?",
    breakdown:
      "The booking system stops working on a busy Friday afternoon and you cannot see who is booked next.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before we open, check today's bookings, call guests who have not confirmed, make sure each therapist knows their first guest, and count the cash in the drawer. Tell me when everything is done.”\n\nExplain what you need to do and in what order.",
    safety:
      "A person calls and says they are a guest's husband. He asks you to tell him what time his wife is booked and which treatment she is having.\n\nWhat would you say and do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a guest is waiting to pay and leave now\n• Task B — the daily sales report, due at closing\n• Task C — the manager asks you to confirm tomorrow's bookings by 5 pm\n\nExplain which task you would do first and why.",
    tools:
      "Which booking systems, POS machines, card machines or computer programs have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "At the end of the day, the money in the cash drawer is 150 AED less than the sales report.\n\nHow would you find the cause and fix it?",
    learning:
      "The spa starts using a new booking system and you have never used it before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Greet the guests who are waiting first, then answer the missed calls. If a guest asks for money back for a treatment they already had, do not give a refund and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The booking system says:\n\nGuest: Ms. Hana\nTreatment: Hot Stone Massage - 90 min\nTime: 4:00 pm\nPrice: 450 AED\n\nThe payment slip says:\n\nGuest: Ms. Hana\nTreatment: Hot Stone Massage - 90 min\nTime: 4:00 pm\nPrice: 540 AED\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you booked two guests with the same therapist at the same time tomorrow. Nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“We have a special offer this weekend. Call the 20 guests on this list, tell them about the offer, book anyone who wants it, and tell me by 4 pm how many bookings you made.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time a guest was unhappy at the front desk and how you helped.",
    videoSkills:
      "What front desk work have you done, and which booking or payment systems have you used?",
    videoLearning:
      "If you joined us and had to learn our treatments and prices in your first week, how would you learn them?",
  },
  {
    title: "Tailor",
    knowledge:
      "A customer brings a pair of trousers and wants them shorter by 4 cm.\n\nDescribe every step you take, from measuring the customer to giving back the finished trousers.",
    rush: "The shop is busy before Eid:\n\n• a customer needs a kandura shortened today for a wedding tonight\n• 3 customers are waiting to be measured\n• a customer came back because a button fell off a new shirt\n• the phone is ringing\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a customer:\n\n“You promised my dress would be ready on Monday. It is Tuesday and it is still not ready.”",
    explain:
      "A customer does not understand why you need them to try on the jacket again before you finish it.\n\nHow would you explain it simply?",
    angry:
      "A customer shouts that the sleeves are too short after you altered them. Your notes show you cut them to the size they asked for.\n\nWhat would you do?",
    breakdown:
      "Your sewing machine keeps breaking the thread while you are finishing an urgent order due in 1 hour.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Finish the 3 urgent orders first, then do the hems in the basket. Write the customer name on every bag and put ready items on the rail. Tell me when you are done.”\n\nExplain what you need to do and in what order.",
    safety:
      "You see that the iron has been left on and face down on a pile of fabric while the shop worker is talking to a customer.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a suit to be collected at 5 pm today\n• Task B — 10 school uniforms due at the end of the week\n• Task C — a customer waiting now to have a button sewn on\n\nExplain which task you would do first and why.",
    tools:
      "Which sewing machines, overlock machines, irons or other tailoring tools have you used before?\n\nFor each one, explain what you used it for.",
    quality:
      "You finish a hem and see the stitches are not straight and the fabric looks pulled.\n\nHow would you find the cause and fix it?",
    learning:
      "The shop starts taking orders for a type of dress you have never sewn before.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Take the measurements for the waiting customer first, then write them on the order card. If the customer wants a change to expensive fabric that cannot be undone, do not cut and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The order card says:\n\nCustomer: Mr. Ali\nItem: Kandura\nLength: 145 cm\nSleeve: 60 cm\nReady: Thursday\n\nYour work note says:\n\nCustomer: Mr. Ali\nItem: Kandura\nLength: 154 cm\nSleeve: 60 cm\nReady: Thursday\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize you made a small cut in a customer's shirt while removing old stitches. The customer has not collected it yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“A company ordered 15 uniforms. Check the fabric we have, count the buttons and zips, and tell me by 2 pm how many uniforms we can make with what we have now.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a customer was not happy with an alteration and what you did.",
    videoSkills: "What clothes can you sew or alter, and which machines have you used?",
    videoLearning:
      "If you joined us and had to learn a new type of garment in your first week, how would you learn it?",
  },
  {
    title: "Toilet Cleaning Staff",
    knowledge:
      "You are asked to clean a mall restroom with 6 toilets and 4 sinks.\n\nDescribe every step you take, from putting the wet floor sign out to leaving the restroom clean.",
    rush: "During your shift, many things happen at once:\n\n• a customer says a toilet is blocked and water is on the floor\n• the soap is empty in 2 sinks\n• your schedule says the next restroom is due now\n• a shop worker asks you to clean a spill outside their shop\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "A mall visitor leaves this comment on the feedback screen:\n\n“The ladies restroom on the first floor was dirty and had no toilet paper.”\n\nWrite a short, polite reply.",
    explain:
      "A new worker does not understand why you must use different coloured cloths for toilets and for sinks.\n\nHow would you explain it simply?",
    angry:
      "A visitor gets angry because you closed the restroom for 10 minutes to clean it, and they need to use it now.\n\nWhat would you do?",
    breakdown:
      "The floor scrubbing machine stops working in the middle of cleaning a large restroom on a busy evening.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Start with the ground floor restrooms, then go up. Refill soap, paper towels and toilet paper, sign the cleaning sheet on each door and tell me when you have finished all floors.”\n\nExplain what you need to do and in what order.",
    safety:
      "While cleaning, you find a used needle on the floor of a toilet cubicle.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a toilet is leaking and water is spreading onto the floor now\n• Task B — the restroom check for the second floor, due in 30 minutes\n• Task C — refilling your store room, due at the end of your shift\n\nExplain which task you would do first and why.",
    tools:
      "Which cleaning tools, machines or chemicals have you used before, such as mops, floor scrubbers or toilet cleaners?\n\nFor each one, explain what you used it for.",
    quality:
      "After you clean a restroom, the supervisor says it still smells bad.\n\nHow would you find the cause and fix it?",
    learning:
      "You are moved to a new office building with a different cleaning schedule and new cleaning products.\n\nWhat would you do during your first day?",
    steps:
      "Your supervisor tells you:\n\n“Clean the restrooms on your list first, then write the time on each sheet. If a toilet is broken or water will not stop, close that cubicle and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the supervisor?",
    check:
      "Your schedule says:\n\nGround floor - Men - 9:00\nGround floor - Ladies - 9:30\nFirst floor - Men - 10:00\n\nThe sheet on the restroom doors says:\n\nGround floor - Men - 9:00\nGround floor - Ladies - 9:30\nFirst floor - Men - 10:00\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you signed the cleaning sheet for a restroom that you have not cleaned yet. Nobody has checked.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“There is a big event in the mall this weekend. Check all restrooms on your floor, count how much soap and paper is in the store room, and tell me by 4 pm what we need to order.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time someone complained about the cleaning and what you did.",
    videoSkills:
      "What cleaning work have you done, and which tools or products do you know how to use?",
    videoLearning:
      "If you joined us and had to learn a new building and schedule in your first week, how would you learn it?",
  },
  {
    title: "Warehouse Helper",
    knowledge:
      "You get a pick list with 8 items for one customer order.\n\nDescribe every step you take, from reading the pick list to putting the packed box in the dispatch area.",
    rush: "It is the end of the night shift:\n\n• a truck is waiting for 20 boxes to be loaded\n• 5 orders are still not packed\n• a pallet of new stock is blocking the aisle\n• your supervisor asks you to help find a missing box\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "A shop that orders from the warehouse sends this message:\n\n“We received 10 boxes but ordered 12. Please tell us when the other 2 will come.”\n\nWrite a polite reply.",
    explain:
      "A new worker does not understand what the barcode label on each box is for.\n\nHow would you explain it simply?",
    angry:
      "A delivery driver gets angry and shouts because his truck has been waiting 40 minutes to be loaded.\n\nWhat would you do?",
    breakdown:
      "The handheld barcode scanner stops working while you are picking an urgent order.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Pick all the orders for the 6 am truck first, pack them, put a label on every box and stack them by area. Tell me when the pallet is ready.”\n\nExplain what you need to do and in what order.",
    safety:
      "You need to move a heavy box from a high shelf. The ladder is in another aisle and a coworker says to just climb the shelves.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — packing orders for a truck that leaves in 30 minutes\n• Task B — sweeping your aisle, due at the end of your shift\n• Task C — the supervisor asks you to count one shelf of stock today\n\nExplain which task you would do first and why.",
    tools:
      "Which warehouse tools have you used before, such as barcode scanners, pallet jacks, tape guns or label printers?\n\nFor each one, explain what you used it for.",
    quality:
      "Two customers call to say they received the wrong items in their boxes, and both were packed on your shift.\n\nHow would you find the cause and fix it?",
    learning:
      "The warehouse moves all stock to new shelf locations and starts using a new scanner system.\n\nWhat would you do during your first day?",
    steps:
      "Your supervisor tells you:\n\n“Unload the new delivery first, then check each box against the delivery note. If any box is broken or leaking, do not open it and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the supervisor?",
    check:
      "The pick list says:\n\nOrder: 50231\n3 x Phone Charger (black)\n2 x Kitchen Scale\n1 x Desk Lamp (white)\n\nThe items in your box are:\n\nOrder: 50231\n3 x Phone Charger (white)\n2 x Kitchen Scale\n1 x Desk Lamp (white)\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you put the wrong address label on a box that is already on the truck. The truck has not left yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“We have a big order for tomorrow. Pick all items on this list, pack them into 30 boxes, label each one and tell me by 10 pm if any item is out of stock.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time an order went wrong at work and how you helped fix it.",
    videoSkills: "What warehouse work have you done, and which tools or machines have you used?",
    videoLearning:
      "If you joined us and had to learn our warehouse layout in your first week, how would you learn it?",
  },
  {
    title: "Window Cleaner",
    knowledge:
      "You are asked to clean the large glass front of a shop from the outside.\n\nDescribe every step you take, from arriving at the shop to leaving the glass clean and dry.",
    rush: "You have a busy day:\n\n• an office wants their windows done before a meeting at 11 am\n• a home customer has called twice asking when you will arrive\n• a shop wants their glass door cleaned after a child left hand marks\n• your supervisor asks you to pick up a new water pole from the office\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a customer:\n\n“You cleaned my windows yesterday but there are still lines on the glass.”",
    explain:
      "A home customer asks why you use a squeegee and not a cloth to dry the glass.\n\nHow would you explain it simply?",
    angry:
      "A shop owner gets angry because water from your bucket went onto the goods near the window.\n\nWhat would you do?",
    breakdown:
      "Your water-fed pole stops spraying water halfway through cleaning an office building's ground floor windows.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“At the villa, clean the outside windows first, then the inside. Put a cloth under each window so the floor stays dry, and send me a photo when you finish.”\n\nExplain what you need to do and in what order.",
    safety:
      "You need to clean a window on the second floor. The ladder on the van is shaking and one foot is broken.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a shop that opens in 30 minutes wants the front glass clean\n• Task B — cleaning your tools and van, due at the end of the day\n• Task C — a villa booking at 2 pm\n\nExplain which task you would do first and why.",
    tools:
      "Which window cleaning tools have you used before, such as squeegees, scrapers, water poles, ladders or safety harnesses?\n\nFor each one, explain what you used it for.",
    quality:
      "After cleaning, you see white marks on the glass when the sun shines on it.\n\nHow would you find the cause and fix it?",
    learning:
      "The company starts using a new water-fed pole system that you have never used before.\n\nWhat would you do during your first day?",
    steps:
      "Your supervisor tells you:\n\n“Set up the safety cones on the pavement first, then start cleaning the shop windows. If the wind becomes very strong while you are on the ladder, come down and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the supervisor?",
    check:
      "The job sheet says:\n\nCustomer: Mr. Omar\nPlace: Villa 23, Street 8\nWork: Outside windows only\nTime: 9:00 am\n\nThe message on your phone says:\n\nCustomer: Mr. Omar\nPlace: Villa 32, Street 8\nWork: Inside and outside windows\nTime: 9:00 am\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you scratched a small part of a customer's glass door with your scraper. The customer has not noticed.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“Tomorrow we clean a 3 floor office. Check all ladders and harnesses, fill the water tank, and tell me by 5 pm today if any tool is broken or missing.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem:
      "Tell us about a time a customer was not happy with your cleaning and what you did.",
    videoSkills: "What window cleaning work have you done, and which tools have you used?",
    videoLearning:
      "If you joined us and had to learn our safety rules in your first week, how would you learn them?",
  },
  {
    title: "Shop Assistant",
    knowledge:
      "A new delivery of products arrives and must go on the shelves.\n\nDescribe every step you take, from opening the boxes to leaving the shelf neat and ready for customers.",
    rush: "The shop is busy on a weekend:\n\n• a customer asks you where to find batteries\n• the queue at the cash counter is getting long\n• a bottle of juice has broken on the floor in aisle 3\n• a delivery driver needs someone to sign for boxes\n\nExplain how you would organize and prioritize them.",
    customerMessage:
      "Write a polite reply to this message from a customer:\n\n“I came to buy the item on offer but the shelf was empty. Will you get more?”",
    explain:
      "A customer does not understand how the “buy 2, get 1 free” offer works.\n\nHow would you explain it simply?",
    angry:
      "A customer is angry because the price on the shelf is lower than the price at the cash counter.\n\nWhat would you do?",
    breakdown:
      "The price label printer stops working while you are changing prices for a sale that starts tomorrow.\n\nWhat would you do?",
    instruction:
      "Your supervisor says:\n\n“Before we open, fill the empty shelves in aisle 2, put the new offer labels on the drinks, check the dates on the milk and yogurt, and remove anything that is expired. Tell me when you finish.”\n\nExplain what you need to do and in what order.",
    safety:
      "You need to put a heavy box of bottles on a high shelf. There is a step stool nearby but you are in a hurry.\n\nWhat would you do?",
    deadlines:
      "You have three tasks:\n\n• Task A — a customer needs help to find a product now\n• Task B — putting new price labels on the sale items, due before tomorrow morning\n• Task C — the manager asks you to count the stock of rice bags today\n\nExplain which task you would do first and why.",
    tools:
      "Which shop tools have you used before, such as price guns, label printers, handheld scanners or cash machines?\n\nFor each one, explain what you used it for.",
    quality:
      "Your manager says the shelves you filled look messy and the labels do not match the products.\n\nHow would you find the cause and fix it?",
    learning:
      "The shop starts selling a new range of 30 products, and customers are asking questions about them.\n\nWhat would you do during your first day?",
    steps:
      "Your manager tells you:\n\n“Help the customers in the shop first, then fill the empty shelves. If you see someone hiding products in their bag, do not stop them yourself and call me straight away.”\n\nExplain:\n\n1. What should you do first?\n2. What should you do next?\n3. When would you call the manager?",
    check:
      "The price list says:\n\nRice 5 kg - 32.50 AED\nCooking Oil 1.5 L - 18.00 AED\nSugar 2 kg - 9.75 AED\n\nThe shelf labels say:\n\nRice 5 kg - 32.50 AED\nCooking Oil 1.5 L - 18.00 AED\nSugar 2 kg - 7.95 AED\n\nCheck whether the information matches. If something is wrong, explain what you would do.",
    mistake:
      "You realize that you put some products on the shelf with an old price label that is higher than the new price. Nobody has noticed yet.\n\nWhat would you do?",
    tasks:
      "Your supervisor says:\n\n“A new sale starts tomorrow. Put the sale labels on all items in aisles 4 and 5, build a display at the front with the sale items and tell me by 8 pm what items we do not have enough of.”\n\nExplain:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
    videoProblem: "Tell us about a time a customer was unhappy in a shop and how you helped them.",
    videoSkills: "What shop work have you done, and which tools or systems have you used?",
    videoLearning:
      "If you joined us and had to learn many new products in your first week, how would you learn them?",
  },
];
