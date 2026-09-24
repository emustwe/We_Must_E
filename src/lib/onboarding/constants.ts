export const ONBOARDING_STEPS = ["basics", "survey", "test", "video", "cv", "done"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const LANGUAGE_OPTIONS = [
  "English",
  "Arabic",
  "Hindi",
  "Urdu",
  "Tagalog",
  "Malayalam",
  "Bengali",
  "Tamil",
  "Nepali",
  "Sinhala",
  "Russian",
  "French",
  "Swahili",
  "Amharic",
] as const;

export const SKILL_SUGGESTIONS = [
  "Customer service",
  "Cashier",
  "Barista",
  "Waiter",
  "Cooking",
  "Cleaning",
  "Driving",
  "Delivery",
  "Sales",
  "Data entry",
  "Reception",
  "Childcare",
  "Elderly care",
  "Event staff",
  "Warehouse",
  "Beauty",
  "Social media",
  "Tech support",
] as const;

export const CV_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
