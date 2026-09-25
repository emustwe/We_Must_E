// Sets up the real interview and the practice jobs:
//  1. The real job "Online Office & Translation Administrator" (Reem Island,
//     Abu Dhabi) for the sponsor emustwe@gmail.com, with its own Test (25
//     questions, 25 min), Task (full profile, CV, 7 x 30 s videos, 25 min) and
//     Survey (25 questions, 25 min), exactly as the client wrote them.
//  2. 50 E-coins for that sponsor.
//  3. The old test jobs are removed (hidden; their applications are kept).
//  4. 320 practice jobs across the UAE with simple questions, shown under
//     their own company names (an internal sponsor account posts them).
//
//   npx tsx scripts/setup-real-interview.mts          (local stack)
//   npx tsx scripts/setup-real-interview.mts --prod   (live project)
//
// Safe to run twice: what already exists is reused, never duplicated.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const { url, key, file } = loadEnv();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const prod = process.argv.includes("--prod");
// Locally only the real job is added (the test suite needs its sample jobs);
// --all (or --prod) also does the practice jobs, live content and removals.
const everything = prod || process.argv.includes("--all");

const REAL_SPONSOR_EMAIL = prod ? "emustwe@gmail.com" : "employer@wemuste.local";
const PRACTICE_SPONSOR_EMAIL = "practice-jobs@wemuste.com";
const JOB_TITLE = "Online Office & Translation Administrator";
const MIN25 = 25 * 60;

function check<T>(label: string, result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
function need<T>(label: string, result: { data: T; error: { message: string } | null }) {
  const data = check(label, result);
  if (data === null || data === undefined) throw new Error(`${label}: no row returned`);
  return data as NonNullable<T>;
}

console.log(`Setting up the real interview (${file})`);

// The migration must be applied first.
check(
  "migration 20261009090000_real_interview is applied",
  await db.from("jobs").select("full_profile, display_company").limit(1),
);

// ------------------------------------------------------------------ content
type TestQ = { type: string; prompt: string; options?: string[]; time?: number };
type SurveyQ = { type: string; prompt: string; options?: string[] };

const TYPING_PARAGRAPH =
  "Dear Ms. Kim, thank you for contacting our support team on 24 September 2026. We have received your request to update your account details, and your documents have been translated from Korean into English. Please review the attached summary, confirm that all information is correct, and reply within two working days. If anything is missing, our administrator will contact you by email. Kind regards, Online Office Team.";

const REAL_TEST: TestQ[] = [
  {
    type: "typing",
    time: 120,
    options: [TYPING_PARAGRAPH],
    prompt:
      "Computer & Speed\nTyping Test\nType the following paragraph exactly as shown within the given time limit.\n\nMeasures:\nTyping speed, accuracy and attention to detail.",
  },
  {
    type: "long_text",
    prompt:
      "Information Processing\n\nYou receive 10 customer requests at the same time. Some are urgent and some are routine.\n\nExplain how you would organize and prioritize them.\n\nResponse: Written answer.",
  },
  {
    type: "long_text",
    prompt:
      "Translation & Language\n\nTranslation — English → Korean\n\nTranslate the following customer message into natural Korean.\n\n“I have been waiting for my order for three days. Could you please check the status and let me know when I can expect delivery?”",
  },
  {
    type: "long_text",
    prompt:
      "Translation — Korean → English\n\nTranslate a customer request into professional English.\n\n( 아 짜증나네, 환전을 빨리해줘야지 나도 빨리 내가 할일을 하지. 지금 당장 내꺼 계정 확인해주고 너가 해결해줘 아니면 계속 귀찮게 굴꺼야 )",
  },
  {
    type: "long_text",
    prompt:
      "Angry Customer\n\nA customer becomes aggressive and blames you for a problem caused by another department.\n\nWhat would you do?\n\nWritten response.",
  },
  {
    type: "long_text",
    prompt:
      "Problem Solving\n\nSystem Problem\n\nThe translation system suddenly stops working while you are handling an urgent request.\n\nWhat would you do?",
  },
  {
    type: "long_text",
    prompt:
      "Business Instruction\n\nQuestion:\n다음은 관리자가 직원에게 전달한 업무 지시입니다.\n\n“고객이 제출한 서류를 확인하고 누락된 자료가 있다면 고객에게 연락해서 추가 제출을 요청하세요. 모든 서류가 확인되면 담당 매니저에게 완료되었다고 보고하세요.”\n\nTask:\nExplain in English what you need to do and in what order.",
  },
  {
    type: "long_text",
    prompt:
      "Question:\nTranslate the following customer-service message into natural Korean.\n\n“We have reviewed your request and forwarded it to the relevant department. We will contact you once we receive an update.”\n\nTask:\nDo not translate word-for-word. Write it as a Korean employee would naturally communicate with a customer.",
  },
  {
    type: "long_text",
    prompt:
      "Multiple Deadlines\n\nYou have three tasks:\n\n• Task A — due in 20 minutes\n• Task B — important but due in 3 hours\n• Task C — requested by a manager\n\nExplain which task you would do first and why.",
  },
  {
    type: "long_text",
    prompt:
      "AI & Technology\n\nAI Tools\n\nWhich AI tools have you used before?\n\nFor each tool, explain what you used it for.",
  },
  {
    type: "long_text",
    prompt:
      "AI Verification\n\nAI gives you an answer that looks correct but you are not completely sure it is accurate.\n\nHow would you verify it?",
  },
  {
    type: "long_text",
    prompt:
      "Learning a New System\n\nYour company introduces a new internal software system.\n\nYou have never used it before.\n\nWhat would you do during your first day?",
  },
  {
    type: "long_text",
    prompt:
      "Question:\nYour manager gives you the following instruction in Korean:\n\n“오늘 들어온 고객 문의 중 아직 답변하지 않은 건들을 먼저 확인하고, 긴급한 문의는 담당자에게 바로 전달하세요. 나머지는 우선순위를 정해서 순서대로 처리하면 됩니다.”\n\nTask:\nExplain in English:\n\n1. What should you do first?\n2. What should you do next?\n3. How would you decide which requests are urgent?",
  },
  {
    type: "long_text",
    prompt:
      "Question:\nYou are checking customer information in an internal system.\n\nThe customer wrote:\n\n이름: 김민수\n생년월일: 1992년 4월 18일\n신청일: 2026년 9월 24일\n요청사항: 계정 정보 개인번호 변경\n\nThe internal system shows:\n\nName: Kim Min-su\nDate of Birth: April 18, 1992\nApplication Date: September 24, 2026\nRequest: Change account information for personal bank\n\nTask:\nCheck whether the information matches. If everything is correct, explain what you would do next.",
  },
  {
    type: "long_text",
    prompt:
      "Work Attitude\n\nMistake\n\nYou realize that you made a mistake in a customer’s document, but nobody has noticed yet.\n\nWhat would you do?",
  },
  {
    type: "long_text",
    prompt:
      "Deadline\n\nYou realize that you cannot finish your assigned work before the deadline.\n\nWhat would you do?",
  },
  {
    type: "long_text",
    prompt:
      "Multiple Tasks\n\nQuestion:\nYou receive the following instruction:\n\n“먼저 오늘 접수된 문의를 확인하세요. 고객에게 추가 자료가 필요한 경우 바로 요청하고, 긴급한 건은 담당자에게 전달하세요. 오후 3시까지 처리 현황을 정리해서 보고해 주세요.”\n\nTask:\nExplain in English:\n\n• What tasks are required?\n• What is the deadline?\n• Which tasks should be prioritized?\n• What information should be included in your report?",
  },
  {
    type: "long_text",
    prompt:
      "Repetitive Work\n\nSome parts of the job require repetitive administrative work.\n\nHow do you maintain accuracy and concentration?",
  },
  {
    type: "long_text",
    prompt:
      "Remote Teamwork\n\nYou are working remotely and another team member is not responding.\n\nYou need information from them to finish your task.\n\nWhat would you do?",
  },
  {
    type: "long_text",
    prompt:
      "Unexpected Change\n\nYour manager suddenly changes the procedure you have been following for several months.\n\nHow would you respond?",
  },
  {
    type: "long_text",
    prompt:
      "Self-Assessment\n\nWhat do you believe is your strongest ability for this position, and what is one skill you still need to improve?",
  },
  {
    type: "long_text",
    prompt:
      "Responsibility\nDifficult Task\nYour assigned task becomes more difficult than you initially expected.\n\nHow would you respond?",
  },
  {
    type: "long_text",
    prompt:
      "조직문화 (Workplace Culture)\n\n본인에게 맞지 않는 업무 환경이나 조직문화에서 일해야 하는 상황입니다.\n\n어떤 업무 환경이나 조직문화에서 일하는 것을 원하지 않습니까?",
  },
  {
    type: "long_text",
    prompt:
      "Motivation\nPersonal Motivation\nThink about your experience at work.\n\nWhat type of situation makes you feel most motivated to do your best work?",
  },
  {
    type: "long_text",
    prompt:
      "The Meaning of “E”\n\nOnce upon a time, we believed in one simple idea:\n“We Must E.”\n\nBut what does “E” mean to you?\n\nIt could be anything you believe — Eat, Enjoy, Explore, Educate, Encourage, Empower, Experience, Evolve, or something completely different.\n\nWhat does your “E” stand for?\n\nExplain what it means to you and why you chose it.",
  },
];

const REAL_VIDEOS = [
  "Introduction\n\n“Please introduce yourself and tell us about your previous work experience.”",
  "Why This Position?\n\n“Why are you interested in this position, and what do you believe you can contribute to our team?”",
  "Problem Solving\n\n“Tell us about a difficult problem you experienced at work and explain how you solved it.”",
  "Technology & AI\n\n“What online tools, software, or AI tools have you used before, and how did they help you work or life more efficiently?”",
  "Learning & Adaptability\n\n“If you joined our company and were asked to learn a completely new system within your first week, how would you approach learning it?”",
  "If money were no longer a concern, what would become the most important thing in your life? why",
  "Anything you would like to mention",
];

const REAL_SURVEY: SurveyQ[] = [
  {
    type: "multi_choice",
    prompt:
      "Online Service Usage\n\nWhich online services do you use most frequently in your daily life?",
    options: [
      "Banking",
      "Shopping",
      "Entertainment",
      "Education",
      "Travel",
      "Food Delivery",
      "Social Media",
      "Work-related services",
      "Other",
    ],
  },
  {
    type: "long_text",
    prompt:
      "Which online service do you currently use that you believe has the best user experience?",
  },
  {
    type: "single_choice",
    prompt: "How often do you currently use AI tools in your daily life?",
    options: ["Never", "Occasionally", "Weekly", "Daily", "Several times a day"],
  },
  {
    type: "multi_choice",
    prompt: "What do you mainly use AI for?",
    options: [
      "Translation",
      "Work",
      "Shopping",
      "Research",
      "Entertainment",
      "Education",
      "Communication",
      "Personal tasks",
      "Other",
    ],
  },
  {
    type: "single_choice",
    prompt: "Which AI service would you be most willing to pay for?",
    options: [
      "Translation",
      "Personal assistant",
      "Business assistant",
      "Education",
      "Content creation",
      "Customer service",
      "Travel",
      "Other",
    ],
  },
  {
    type: "long_text",
    prompt: "What is one thing you wish AI could do for you that it cannot do well today?",
  },
  {
    type: "multi_choice",
    prompt: "Where do you usually discover new products or services?",
    options: [
      "TikTok",
      "Instagram",
      "YouTube",
      "Google",
      "Facebook",
      "Friends",
      "Influencers",
      "Online communities",
      "Other",
    ],
  },
  {
    type: "long_text",
    prompt:
      "When you see a product recommended by an influencer, what makes you trust the recommendation?",
  },
  {
    type: "single_choice",
    prompt: "Which type of advertising are you most likely to pay attention to?",
    options: [
      "Short video",
      "Influencer recommendation",
      "Discount",
      "Free trial",
      "Product review",
      "Sponsored content",
      "Brand event",
      "Other",
    ],
  },
  {
    type: "single_choice",
    prompt: "How often have you purchased something because you saw it on social media?",
    options: ["Never", "Once or twice", "Occasionally", "Frequently", "Very frequently"],
  },
  {
    type: "single_choice",
    prompt: "What category do you spend the most money on online?",
    options: [
      "Fashion",
      "Beauty",
      "Food",
      "Travel",
      "Entertainment",
      "Technology",
      "Education",
      "Gaming",
      "Other",
    ],
  },
  {
    type: "multi_choice",
    prompt: "What usually makes you decide to purchase a product online?",
    options: [
      "Price",
      "Reviews",
      "Brand",
      "Influencer",
      "Quality",
      "Discount",
      "Convenience",
      "Recommendation from friends",
      "Other",
    ],
  },
  {
    type: "scale",
    prompt:
      "How important is a discount when deciding whether to purchase something you are interested in?",
  },
  {
    type: "long_text",
    prompt: "If a new brand wanted to attract you, what would be the best way to reach you?",
  },
  {
    type: "single_choice",
    prompt: "Which type of sponsored event would you be most interested in participating in?",
    options: [
      "Online competition",
      "Gaming tournament",
      "Shopping event",
      "Entertainment event",
      "K-pop event",
      "Sports event",
      "Travel event",
      "Educational event",
      "Other",
    ],
  },
  {
    type: "single_choice",
    prompt: "What type of reward would motivate you most to participate in an online event?",
    options: [
      "Cash",
      "Smartphone",
      "Travel voucher",
      "Shopping voucher",
      "Products",
      "Exclusive membership",
      "Tickets",
      "Other",
    ],
  },
  {
    type: "scale",
    prompt: "If a brand sponsored an online event, how likely would you be to try that brand?",
  },
  { type: "long_text", prompt: "What is one product or service you wish existed in your country?" },
  {
    type: "long_text",
    prompt: "If you could create a new online service for people like yourself, what would it do?",
  },
  {
    type: "long_text",
    prompt: "What do you think will become more important to consumers over the next three years?",
  },
  { type: "long_text", prompt: "If you could travel anywhere tomorrow, where would you go?" },
  {
    type: "long_text",
    prompt:
      "If you could have dinner with any person in the world, living or dead, who would you choose?",
  },
  {
    type: "long_text",
    prompt: "What is one brand you genuinely like, and what do you like about it?",
  },
  {
    type: "long_text",
    prompt: "If you had an extra $1,000 to spend this month, how would you spend it?",
  },
  {
    type: "long_text",
    prompt: "What is one thing you would never spend money on, no matter how popular it became?",
  },
];

// Practice jobs: simple, basic questions.
const SIMPLE_TEST: TestQ[] = [
  {
    type: "single_choice",
    prompt: "Which days can you work?",
    options: ["Weekdays", "Weekends", "Any day"],
  },
  {
    type: "single_choice",
    prompt: "Have you done this kind of work before?",
    options: ["Yes", "A little", "No, but I want to learn"],
  },
  { type: "short_text", prompt: "In one sentence, why do you want this job?" },
];
const SIMPLE_VIDEOS = ["Please introduce yourself in 30 seconds."];
const SIMPLE_SURVEY: SurveyQ[] = [
  {
    type: "single_choice",
    prompt: "When can you start?",
    options: ["Today", "This week", "This month"],
  },
  {
    type: "single_choice",
    prompt: "How did you hear about us?",
    options: ["Social media", "A friend", "Google", "Other"],
  },
];

async function ensureTest(title: string, qs: TestQ[], seconds: number | null) {
  const found = check(
    "find test",
    await db.from("tests").select("id").eq("title", title).maybeSingle(),
  );
  if (found) return found.id as string;
  const test = need(
    "create test",
    await db
      .from("tests")
      .insert({ title, time_limit_seconds: seconds, pass_score: 0, is_active: false })
      .select("id")
      .single(),
  );
  check(
    "add test questions",
    await db.from("test_questions").insert(
      qs.map((q, i) => ({
        test_id: test.id,
        type: q.type as "long_text",
        prompt: q.prompt,
        options: q.options ?? [],
        time_limit_seconds: q.time ?? null,
        position: i,
        points: 0,
      })),
    ),
  );
  console.log(`  test "${title}": ${qs.length} questions`);
  return test.id as string;
}

async function ensureVideoSet(title: string, prompts: string[], seconds: number | null) {
  const found = check(
    "find video set",
    await db.from("video_question_sets").select("id").eq("title", title).maybeSingle(),
  );
  if (found) return found.id as string;
  const set = need(
    "create video set",
    await db
      .from("video_question_sets")
      .insert({ title, is_active: false, time_limit_seconds: seconds })
      .select("id")
      .single(),
  );
  check(
    "add video questions",
    await db.from("video_questions").insert(
      prompts.map((prompt, i) => ({
        set_id: set.id,
        prompt,
        max_seconds: 30,
        position: i,
        is_active: true,
      })),
    ),
  );
  console.log(`  video set "${title}": ${prompts.length} questions x 30 s`);
  return set.id as string;
}

async function ensureSurvey(title: string, qs: SurveyQ[], seconds: number | null) {
  const found = check(
    "find survey",
    await db.from("surveys").select("id").eq("title", title).maybeSingle(),
  );
  if (found) return found.id as string;
  const survey = need(
    "create survey",
    await db
      .from("surveys")
      .insert({ title, version: 1, is_active: false, time_limit_seconds: seconds })
      .select("id")
      .single(),
  );
  check(
    "add survey questions",
    await db.from("survey_questions").insert(
      qs.map((q, i) => ({
        survey_id: survey.id,
        type: q.type as "long_text",
        prompt: q.prompt,
        options: q.options ?? [],
        required: true,
        position: i,
      })),
    ),
  );
  console.log(`  survey "${title}": ${qs.length} questions`);
  return survey.id as string;
}

const realTest = await ensureTest(`${JOB_TITLE} — Test`, REAL_TEST, MIN25);
const realSet = await ensureVideoSet(`${JOB_TITLE} — Video interview`, REAL_VIDEOS, MIN25);
const realSurvey = await ensureSurvey(`${JOB_TITLE} — Survey`, REAL_SURVEY, MIN25);
const simpleTest = await ensureTest("Practice jobs — Quick questions", SIMPLE_TEST, null);
const simpleSet = await ensureVideoSet("Practice jobs — Short introduction", SIMPLE_VIDEOS, null);
const simpleSurvey = await ensureSurvey("Practice jobs — About you", SIMPLE_SURVEY, null);

// New jobs from any sponsor get the simple questions by default.
async function makeLive(table: "tests" | "video_question_sets" | "surveys", id: string) {
  check(
    `deactivate ${table}`,
    await db.from(table).update({ is_active: false }).neq("id", id).eq("is_active", true),
  );
  check(`activate ${table}`, await db.from(table).update({ is_active: true }).eq("id", id));
}
if (everything) {
  await makeLive("tests", simpleTest);
  await makeLive("video_question_sets", simpleSet);
  await makeLive("surveys", simpleSurvey);
}

// ------------------------------------------------------------------ the real job
async function userId(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

const realSponsor = await userId(REAL_SPONSOR_EMAIL);
if (!realSponsor) throw new Error(`No account for ${REAL_SPONSOR_EMAIL}`);
const sponsorRow = need(
  "real sponsor profile",
  await db
    .from("employer_profiles")
    .select("user_id, company_name, status, ecoin_balance")
    .eq("user_id", realSponsor)
    .maybeSingle(),
);
if (sponsorRow.status !== "approved")
  throw new Error(`${REAL_SPONSOR_EMAIL} is not an approved sponsor`);

const DESCRIPTION =
  "The assessment is designed to evaluate an applicant’s practical skills, communication ability, problem-solving approach, work attitude, adaptability, and overall suitability for the position before an in-person interview.";

const existingJob = check(
  "find real job",
  await db
    .from("jobs")
    .select("id")
    .eq("employer_id", realSponsor)
    .eq("title", JOB_TITLE)
    .maybeSingle(),
);
if (existingJob) {
  check(
    "update real job",
    await db
      .from("jobs")
      .update({
        test_id: realTest,
        video_set_id: realSet,
        survey_id: realSurvey,
        full_profile: true,
        status: "published",
      })
      .eq("id", existingJob.id),
  );
  console.log(`  job "${JOB_TITLE}": already there, questions checked`);
} else {
  check(
    "create real job",
    await db.from("jobs").insert({
      employer_id: realSponsor,
      title: JOB_TITLE,
      description: DESCRIPTION,
      location_label: "Al Reem Island, Abu Dhabi",
      lat: 24.4989,
      lng: 54.4058,
      country_code: "AE",
      country_name: "United Arab Emirates",
      city: "Abu Dhabi",
      status: "published",
      test_id: realTest,
      video_set_id: realSet,
      survey_id: realSurvey,
      full_profile: true,
    }),
  );
  console.log(`  job "${JOB_TITLE}": posted for ${sponsorRow.company_name}, live on the map`);
}

// ------------------------------------------------------------------ 50 E-coins (once)
const NOTE = "Real interview: Online Office & Translation Administrator";
const granted = check(
  "find E-coin grant",
  await db
    .from("ecoin_ledger")
    .select("id")
    .eq("employer_id", realSponsor)
    .eq("note", NOTE)
    .maybeSingle(),
);
if (granted) {
  console.log("  E-coins: 50 already added");
} else {
  check(
    "add E-coins",
    await db
      .from("employer_profiles")
      .update({ ecoin_balance: sponsorRow.ecoin_balance + 50 })
      .eq("user_id", realSponsor),
  );
  check(
    "E-coin ledger",
    await db
      .from("ecoin_ledger")
      .insert({ employer_id: realSponsor, delta: 50, reason: "admin_grant", note: NOTE }),
  );
  console.log(`  E-coins: +50 (balance ${sponsorRow.ecoin_balance + 50})`);
}

// ------------------------------------------------------------------ old test jobs
if (prod) {
  const majid = check(
    "find old test sponsor",
    await db
      .from("employer_profiles")
      .select("user_id")
      .eq("company_name", "Majid's Company")
      .maybeSingle(),
  );
  if (majid) {
    const removed = check(
      "remove old test jobs",
      await db
        .from("jobs")
        .update({ status: "removed" })
        .eq("employer_id", majid.user_id)
        .neq("status", "removed")
        .select("id"),
    );
    console.log(`  old test jobs removed: ${removed?.length ?? 0}`);
  }
}
const sample = !everything
  ? []
  : check(
      "remove [SAMPLE] jobs",
      await db
        .from("jobs")
        .update({ status: "removed" })
        .like("title", "[SAMPLE]%")
        .neq("status", "removed")
        .select("id"),
    );
if (sample?.length) console.log(`  [SAMPLE] jobs removed: ${sample.length}`);

// ------------------------------------------------------------------ practice jobs
if (!everything) {
  console.log("Done (local: real job only; add --all for the practice jobs).");
  process.exit(0);
}
let practice = await userId(PRACTICE_SPONSOR_EMAIL);
if (!practice) {
  // An internal account nobody logs in to (random password, never shown).
  const { data, error } = await db.auth.admin.createUser({
    email: PRACTICE_SPONSOR_EMAIL,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    app_metadata: {
      wemuste_role: "employer",
      company_name: "Wemuste practice jobs",
      contact_person: "Wemuste",
      contact_phone: "+971500000000",
    },
  });
  if (error || !data.user) throw new Error(`practice sponsor: ${error?.message}`);
  practice = data.user.id;
}
check(
  "approve practice sponsor",
  await db
    .from("employer_profiles")
    .update({ status: "approved", must_change_password: false })
    .eq("user_id", practice),
);

const ROLES: [string, string, string][] = [
  [
    "Florist Assistant",
    "Bloom & Petal Flowers",
    "Prepare bouquets, wrap flowers and help customers in our flower shop. Morning and evening shifts.",
  ],
  [
    "Flower Delivery Driver",
    "Bloom & Petal Flowers",
    "Deliver flower orders to homes and offices on time. Valid UAE driving licence needed.",
  ],
  [
    "Cafe Bartender",
    "Brew Corner Cafe",
    "Make coffee, mocktails and fresh juices, and keep the bar clean. Friendly attitude a must.",
  ],
  [
    "Barista",
    "Brew Corner Cafe",
    "Prepare espresso drinks and serve guests at a busy neighbourhood cafe. Training provided.",
  ],
  [
    "Restaurant Server",
    "Olive Tree Restaurant",
    "Take orders, serve food and look after guests during lunch and dinner service.",
  ],
  [
    "Kitchen Helper",
    "Olive Tree Restaurant",
    "Support the chefs with food prep, dishwashing and keeping the kitchen clean.",
  ],
  [
    "Delivery Driver",
    "Swift Parcel Delivery",
    "Deliver parcels around the city with a company car. Clean driving record needed.",
  ],
  [
    "Motorbike Delivery Rider",
    "Swift Parcel Delivery",
    "Deliver food and parcels by motorbike. Bike and fuel provided; UAE bike licence required.",
  ],
  [
    "Private Driver",
    "Elite Chauffeurs",
    "Drive clients safely to meetings and events. Smart appearance and good local knowledge.",
  ],
  [
    "IT Support Technician",
    "Bytewise IT Solutions",
    "Set up laptops, fix network issues and help office staff with everyday IT problems.",
  ],
  [
    "Junior Web Developer",
    "Bytewise IT Solutions",
    "Build and update simple websites for small business clients. HTML, CSS and some JavaScript.",
  ],
  [
    "Game Tester",
    "PixelForge Gaming",
    "Play new games, find bugs and write clear reports for the development team.",
  ],
  [
    "Gaming Lounge Attendant",
    "PixelForge Gaming",
    "Welcome players, set up gaming stations and run small tournaments in our lounge.",
  ],
  [
    "Toilet Cleaning Staff",
    "SparkClean Facilities",
    "Clean and restock restrooms in malls and office buildings on a set schedule.",
  ],
  [
    "Room Cleaner",
    "Palm Stay Hotels",
    "Clean guest rooms, change bed linen and restock amenities to hotel standards.",
  ],
  [
    "Housekeeping Attendant",
    "Palm Stay Hotels",
    "Keep hotel corridors, lobbies and rooms spotless. Shift work including weekends.",
  ],
  [
    "Car Wash Attendant",
    "ShineOn Car Care",
    "Wash, dry and vacuum cars at our car wash. Outdoor work, shifts available.",
  ],
  [
    "Car Detailing Specialist",
    "ShineOn Car Care",
    "Polish, clean interiors and detail cars to a showroom finish.",
  ],
  [
    "Massage Therapist",
    "Serenity Spa",
    "Give relaxing and therapeutic massages to spa guests. Certificate required.",
  ],
  [
    "Spa Receptionist",
    "Serenity Spa",
    "Book appointments, greet guests and handle payments at the spa front desk.",
  ],
  [
    "Pest Control Technician",
    "BugAway Pest Control",
    "Inspect homes and offices and treat them for insects and bugs safely.",
  ],
  [
    "Building Inspection Assistant",
    "SafeCheck Inspections",
    "Help inspectors check buildings, take photos and write simple inspection notes.",
  ],
  [
    "Quality Inspector",
    "SafeCheck Inspections",
    "Check products and work against quality standards and record the results.",
  ],
  [
    "Window Cleaner",
    "ClearView Window Cleaning",
    "Clean windows and glass in homes, shops and offices. Safety training given.",
  ],
  [
    "Facade Cleaning Technician",
    "ClearView Window Cleaning",
    "Clean building fronts and high windows using ropes or cradles. Experience preferred.",
  ],
  [
    "Office Cleaner",
    "SparkClean Facilities",
    "Clean offices before and after working hours: desks, floors and kitchens.",
  ],
  ["Shop Assistant", "Daily Mart", "Help customers, stock shelves and keep the shop tidy."],
  [
    "Cashier",
    "Daily Mart",
    "Handle payments at the till and help customers at a busy supermarket.",
  ],
  [
    "Warehouse Helper",
    "Gulf Logistics",
    "Pick, pack and label orders in our warehouse. Physical work, day and night shifts.",
  ],
  [
    "Forklift Operator",
    "Gulf Logistics",
    "Move pallets safely around the warehouse. Forklift licence needed.",
  ],
  [
    "Security Guard",
    "Shield Security Services",
    "Guard buildings, check visitors and patrol on shift. SIRA licence preferred.",
  ],
  [
    "Clinic Receptionist",
    "City Clinic",
    "Welcome patients, book appointments and answer phone calls.",
  ],
  [
    "Laundry Attendant",
    "FreshFold Laundry",
    "Wash, iron and fold clothes for our laundry customers.",
  ],
  [
    "Event Staff",
    "Starlight Events",
    "Help set up and run events: guest check-in, floor support and pack-down.",
  ],
  [
    "Promoter",
    "Starlight Events",
    "Promote brands at malls and events and talk to customers about products.",
  ],
  [
    "Pool Cleaner",
    "BlueWave Pools",
    "Clean and check villa and building swimming pools on a weekly route.",
  ],
  [
    "AC Technician Helper",
    "CoolAir Services",
    "Assist technicians with air-conditioning service and repairs.",
  ],
  [
    "Painter",
    "ColorPro Painting",
    "Paint walls and ceilings in villas and apartments. Neat work is a must.",
  ],
  ["Gardener", "GreenLeaf Landscaping", "Water, trim and plant gardens in villas and communities."],
  ["Pet Groomer", "Happy Paws Pet Care", "Bath, trim and groom dogs and cats in our pet salon."],
  [
    "Nanny",
    "Little Stars Nanny Agency",
    "Look after children at home: play, meals and school runs.",
  ],
  [
    "Salon Assistant",
    "Glam Beauty Salon",
    "Help stylists, wash hair, and keep the salon clean and welcoming.",
  ],
  [
    "Call Center Agent",
    "Connect Call Centre",
    "Answer customer calls and chats and solve simple requests.",
  ],
  [
    "Data Entry Clerk",
    "DataDesk Services",
    "Type and check data in our systems quickly and accurately.",
  ],
  [
    "Mobile Phone Repair Technician",
    "FixIt Mobile",
    "Repair screens, batteries and charging ports on phones.",
  ],
  [
    "Bakery Assistant",
    "Golden Crust Bakery",
    "Bake bread and pastries and serve customers at the counter.",
  ],
  ["Fitness Trainer", "PowerFit Gym", "Coach gym members and run small group classes."],
  [
    "Tailor",
    "Stitch Perfect Tailoring",
    "Alter and sew clothes for customers in our tailoring shop.",
  ],
];

type Area = [string, number, number];
const EMIRATES: { city: string; count: number; areas: Area[] }[] = [
  {
    city: "Dubai",
    count: 100,
    areas: [
      ["Deira", 25.2711, 55.3075],
      ["Bur Dubai", 25.2532, 55.2978],
      ["Al Karama", 25.2446, 55.3036],
      ["Downtown Dubai", 25.1972, 55.2744],
      ["Business Bay", 25.186, 55.265],
      ["Jumeirah Lake Towers", 25.0689, 55.144],
      ["Dubai Marina", 25.08, 55.14],
      ["Al Barsha", 25.113, 55.2],
      ["Jumeirah", 25.21, 55.25],
      ["Al Quoz", 25.14, 55.23],
      ["Dubai Silicon Oasis", 25.121, 55.384],
      ["Al Nahda", 25.29, 55.37],
      ["Mirdif", 25.22, 55.42],
      ["International City", 25.165, 55.41],
      ["Motor City", 25.045, 55.24],
      ["Jebel Ali", 25.01, 55.13],
      ["Al Qusais", 25.28, 55.38],
    ],
  },
  {
    city: "Sharjah",
    count: 50,
    areas: [
      ["Al Majaz", 25.326, 55.387],
      ["Al Nahda, Sharjah", 25.301, 55.373],
      ["Muwaileh", 25.294, 55.46],
      ["Al Khan", 25.328, 55.358],
      ["Industrial Area, Sharjah", 25.3, 55.42],
      ["Al Taawun", 25.31, 55.37],
      ["University City", 25.287, 55.48],
    ],
  },
  {
    city: "Abu Dhabi",
    count: 50,
    areas: [
      ["Khalifa City", 24.42, 54.57],
      ["Mussafah", 24.35, 54.5],
      ["Al Khalidiyah", 24.47, 54.35],
      ["Al Markaziyah", 24.49, 54.36],
      ["Yas Island", 24.49, 54.6],
      ["Al Raha", 24.45, 54.61],
      ["Mohammed Bin Zayed City", 24.34, 54.55],
      ["Tourist Club Area", 24.497, 54.38],
    ],
  },
  {
    city: "Ajman",
    count: 30,
    areas: [
      ["Al Nuaimiya", 25.39, 55.47],
      ["Al Rashidiya", 25.395, 55.44],
      ["Al Jurf", 25.4, 55.52],
      ["Ajman Downtown", 25.405, 55.45],
      ["Al Rawda", 25.38, 55.5],
    ],
  },
  {
    city: "Fujairah",
    count: 20,
    areas: [
      ["Fujairah City", 25.1288, 56.3265],
      ["Al Faseel", 25.14, 56.34],
      ["Sakamkam", 25.17, 56.34],
      ["Merashid", 25.12, 56.33],
    ],
  },
  {
    city: "Umm Al Quwain",
    count: 30,
    areas: [
      ["Umm Al Quwain Old Town", 25.565, 55.555],
      ["Al Salamah", 25.51, 55.59],
      ["Al Raas", 25.54, 55.55],
      ["Al Humrah", 25.52, 55.57],
    ],
  },
  {
    city: "Ras Al Khaimah",
    count: 40,
    areas: [
      ["Al Nakheel", 25.79, 55.95],
      ["Al Hamra", 25.69, 55.78],
      ["Julphar", 25.8, 55.96],
      ["Khuzam", 25.77, 55.95],
      ["Al Dhait", 25.75, 55.98],
    ],
  },
];

const { count: existing, error: countError } = await db
  .from("jobs")
  .select("id", { count: "exact", head: true })
  .eq("employer_id", practice);
if (countError) throw new Error(`count practice jobs: ${countError.message}`);
if ((existing ?? 0) >= 320) {
  console.log(`  practice jobs: ${existing} already there`);
} else {
  // A fixed pattern (not random), so a second run would place jobs the same way.
  let n = 0;
  const rows = EMIRATES.flatMap((e) =>
    Array.from({ length: e.count }, (_, i) => {
      const [title, company, description] = ROLES[(n++ * 7) % ROLES.length];
      const [area, lat, lng] = e.areas[i % e.areas.length];
      const jitter = (k: number) => (((i * 37 + k * 11) % 13) - 6) * 0.0012;
      return {
        employer_id: practice!,
        title,
        description,
        display_company: company,
        location_label: `${area}, ${e.city}`,
        lat: lat + jitter(1),
        lng: lng + jitter(2),
        country_code: "AE",
        country_name: "United Arab Emirates",
        city: e.city,
        status: "published" as const,
        test_id: simpleTest,
        video_set_id: simpleSet,
        survey_id: simpleSurvey,
        full_profile: false,
      };
    }),
  );
  for (let i = 0; i < rows.length; i += 80) {
    check("add practice jobs", await db.from("jobs").insert(rows.slice(i, i + 80)));
  }
  console.log(
    `  practice jobs: ${rows.length} added (Dubai 100, Sharjah 50, Abu Dhabi 50, Ajman 30, Fujairah 20, Umm Al Quwain 30, Ras Al Khaimah 40)`,
  );
}

console.log("Done.");
