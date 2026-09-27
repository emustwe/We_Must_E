// The partner roles in Pakistan, India and Bangladesh: which interview each
// uses (`role`, from scripts/partner-interviews/), the job type, the text on
// the map, and how common the role is in each country (`weight`, roughly the
// share of that country's jobs). Factory roles go mostly to the industrial
// cities. Based on job-market research (September 2026): delivery, call
// centres and sales lead everywhere; garments in Bangladesh; textiles in
// Faisalabad and Karachi; quick-commerce warehouses in India.
type Weight = Partial<Record<"PK" | "IN" | "BD", number>>;

export type PartnerRole = {
  title: string;
  // The interview's role title, when it differs from the job title.
  role?: string;
  type: "full_time" | "part_time" | "short_term";
  weight: Weight;
  factory?: true;
  description: string | Partial<Record<"PK" | "IN" | "BD", string>>;
};

export const CATALOG: PartnerRole[] = [
  {
    title: "Delivery Rider",
    role: "Motorbike Delivery Rider",
    type: "full_time",
    weight: { PK: 8, IN: 10, BD: 8 },
    description:
      "Deliver food and parcels by motorbike around the city. Own bike and a valid licence needed; fuel allowance given.",
  },
  {
    title: "Call Center Agent",
    type: "full_time",
    weight: { PK: 8, IN: 6, BD: 4 },
    description: {
      PK: "Answer customer calls and chats in English and Urdu. Day and night shifts, training provided.",
      IN: "Answer customer calls and chats in English and Hindi. Day and night shifts, training provided.",
      BD: "Answer customer calls and chats in Bangla and English. Day and night shifts, training provided.",
    },
  },
  {
    title: "Telecaller",
    type: "full_time",
    weight: { PK: 4, IN: 6, BD: 3 },
    description: "Call customers from a list, explain our offers and book orders or appointments.",
  },
  {
    title: "Sales Executive",
    type: "full_time",
    weight: { PK: 6, IN: 7, BD: 6 },
    description:
      "Visit shops and businesses, show our products, take orders and follow up with customers in your area.",
  },
  {
    title: "Data Entry Clerk",
    type: "full_time",
    weight: { PK: 4, IN: 4, BD: 4 },
    description: "Type and check data in our systems quickly and accurately.",
  },
  {
    title: "Receptionist",
    type: "full_time",
    weight: { PK: 3, IN: 3, BD: 3 },
    description:
      "Welcome visitors, answer calls, manage the front desk and keep the visitor log at an office.",
  },
  {
    title: "Office Assistant",
    type: "full_time",
    weight: { PK: 4, IN: 3, BD: 5 },
    description:
      "Help the office team with filing, photocopies, errands, tea and keeping the office tidy.",
  },
  {
    title: "Security Guard",
    type: "full_time",
    weight: { PK: 5, IN: 5, BD: 5 },
    description:
      "Guard buildings, check visitors and patrol on shift. Security training is a plus.",
  },
  {
    title: "Driver",
    type: "full_time",
    weight: { PK: 4, IN: 4, BD: 4 },
    description:
      "Drive the company car for staff and deliveries around the city. Valid driving licence needed.",
  },
  {
    title: "Cook",
    type: "full_time",
    weight: { PK: 4, IN: 4, BD: 3 },
    description:
      "Cook daily meals for a busy restaurant kitchen: curries, rice, bread and grilled dishes.",
  },
  {
    title: "Kitchen Helper",
    type: "full_time",
    weight: { PK: 3, IN: 3, BD: 3 },
    description: "Support the chefs with food prep, dishwashing and keeping the kitchen clean.",
  },
  {
    title: "Restaurant Server",
    type: "full_time",
    weight: { PK: 3, IN: 3, BD: 3 },
    description: "Take orders, serve food and look after guests during lunch and dinner service.",
  },
  {
    title: "Cashier",
    type: "full_time",
    weight: { PK: 3, IN: 3, BD: 3 },
    description: "Handle payments at the till and help customers at a busy supermarket.",
  },
  {
    title: "Shop Assistant",
    type: "full_time",
    weight: { PK: 4, IN: 5, BD: 4 },
    description:
      "Help customers find products, keep shelves tidy and restock items in a retail shop.",
  },
  {
    title: "Warehouse Helper",
    type: "full_time",
    weight: { PK: 3, IN: 6, BD: 3 },
    description: {
      PK: "Pick, pack and label orders in our warehouse. Physical work, day and night shifts.",
      IN: "Pick, pack and label orders for fast home delivery at our dark store. Day and night shifts.",
      BD: "Pick, pack and label orders in our warehouse. Physical work, day and night shifts.",
    },
  },
  {
    title: "Store Keeper",
    type: "full_time",
    weight: { PK: 2, IN: 2, BD: 2 },
    description: "Receive, count and record stock in the store room, and issue items to staff.",
  },
  {
    title: "Electrician",
    type: "full_time",
    weight: { PK: 3, IN: 3, BD: 3 },
    description: "Install and repair wiring, switches, lights and fans in homes and shops.",
  },
  {
    title: "Plumber",
    type: "full_time",
    weight: { PK: 2, IN: 2, BD: 1 },
    description:
      "Fix leaks, install taps, pipes, water tanks and bathroom fittings in homes and buildings.",
  },
  {
    title: "AC Technician Helper",
    type: "full_time",
    weight: { PK: 3, IN: 2, BD: 1 },
    description: "Assist technicians with air-conditioning service and repairs.",
  },
  {
    title: "Mobile Phone Repair Technician",
    type: "full_time",
    weight: { PK: 3, IN: 2, BD: 3 },
    description: "Repair screens, batteries and charging ports on phones.",
  },
  {
    title: "CCTV Technician",
    type: "full_time",
    weight: { PK: 3, IN: 1, BD: 1 },
    description:
      "Install, set up and repair CCTV cameras and recorders for homes, shops and offices.",
  },
  {
    title: "Graphic Designer",
    type: "full_time",
    weight: { PK: 2, IN: 2, BD: 3 },
    description: "Design social media posts, flyers and banners for small business clients.",
  },
  {
    title: "Junior Web Developer",
    type: "full_time",
    weight: { PK: 3, IN: 3, BD: 2 },
    description:
      "Build and update simple websites for small business clients. HTML, CSS and some JavaScript.",
  },
  {
    title: "Digital Marketing Assistant",
    type: "full_time",
    weight: { PK: 2, IN: 2, BD: 3 },
    description:
      "Post on social media, answer messages and comments, and help run simple online ads for our clients.",
  },
  {
    title: "Content Writer",
    type: "part_time",
    weight: { PK: 1, IN: 2 },
    description:
      "Write clear blog posts, product descriptions and social media captions in English.",
  },
  {
    title: "Accounts Assistant",
    type: "full_time",
    weight: { PK: 2, IN: 3, BD: 2 },
    description:
      "Enter invoices and payments, match bank statements and keep the accounts files in order.",
  },
  {
    title: "Home Tutor",
    type: "part_time",
    weight: { PK: 3, IN: 2, BD: 3 },
    description:
      "Teach school students at their homes: homework help, maths, science and English. Evening hours.",
  },
  {
    title: "Beautician",
    type: "full_time",
    weight: { PK: 2, IN: 3, BD: 2 },
    description: "Do facials, threading, waxing, makeup and basic hair care for salon customers.",
  },
  {
    title: "Tailor",
    type: "full_time",
    weight: { PK: 2, IN: 1, BD: 2 },
    description: "Alter and sew clothes for customers in our tailoring shop.",
  },
  {
    title: "Housekeeping Attendant",
    type: "full_time",
    weight: { PK: 1, IN: 2, BD: 1 },
    description: "Keep hotel corridors, lobbies and rooms spotless. Shift work including weekends.",
  },
  {
    title: "Textile Machine Operator",
    type: "full_time",
    factory: true,
    weight: { PK: 5, IN: 1, BD: 2 },
    description:
      "Run spinning, weaving or knitting machines in a textile mill and keep production on target. Shift work.",
  },
  {
    title: "Sewing Machine Operator",
    type: "full_time",
    factory: true,
    weight: { PK: 3, IN: 1, BD: 12 },
    description:
      "Stitch garments on industrial sewing machines to the line's quality and output targets.",
  },
  {
    title: "Garment Quality Inspector",
    type: "full_time",
    factory: true,
    weight: { PK: 1, BD: 5 },
    description:
      "Check stitched garments for defects, measure sizes and record the results for the production line.",
  },
];
