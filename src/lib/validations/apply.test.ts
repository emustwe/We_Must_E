import { describe, expect, it } from "vitest";
import { basicProfileSchema, fullProfileSchema, submitSchema, testAnswerSchema } from "./apply";

const ids = {
  jobId: "00000000-0000-4000-8000-000000000001",
  questionId: "00000000-0000-4000-8000-000000000002",
};

describe("testAnswerSchema", () => {
  it("accepts one shape per answer and nothing else", () => {
    expect(testAnswerSchema.safeParse({ ...ids, answer: { options: [1] } }).success).toBe(true);
    expect(testAnswerSchema.safeParse({ ...ids, answer: { text: "Hi" } }).success).toBe(true);
    expect(
      testAnswerSchema.safeParse({ ...ids, answer: { options: [1], text: "x" } }).success,
    ).toBe(false);
    expect(testAnswerSchema.safeParse({ ...ids, answer: { options: [] } }).success).toBe(false);
    expect(testAnswerSchema.safeParse({ ...ids, answer: { text: "x" }, score: 10 }).success).toBe(
      false,
    );
  });
});

describe("submitSchema", () => {
  const base = {
    jobId: ids.jobId,
    answers: { [ids.questionId]: { options: [0] } },
    consent: true,
  };
  it("requires consent to be ticked", () => {
    expect(submitSchema.safeParse(base).success).toBe(true);
    expect(submitSchema.safeParse({ ...base, consent: false }).success).toBe(false);
  });
  it("accepts a typed Other answer, and rejects unknown fields", () => {
    expect(
      submitSchema.safeParse({
        ...base,
        answers: { [ids.questionId]: { options: [8], other: "Podcasts" } },
      }).success,
    ).toBe(true);
    expect(submitSchema.safeParse({ ...base, status: "approved" }).success).toBe(false);
  });
});

describe("Task profile", () => {
  const full = {
    fullName: "Sara Ahmed",
    preferredName: "Sara",
    age: "29",
    gender: "female",
    country: "UAE",
    city: "Abu Dhabi",
    nationality: "Korean",
    phone: "050 111 2233",
    email: "sara@example.com",
    languages: "Korean, English",
    englishLevel: "fluent",
    otherLanguages: "None",
    previousEmployment: "Acme",
    previousPosition: "Office assistant",
    yearsExperience: "3",
    previousExperience: "Admin work",
    whyInterested: "I like translation",
    workEnvironment: "Calm",
    lookingFor: "Growth",
    adult: "yes",
  };
  it("normalises the phone and numbers", () => {
    const parsed = fullProfileSchema.parse(full);
    expect(parsed.phone).toBe("+971501112233");
    expect(parsed.age).toBe(29);
  });
  it("requires every field", () => {
    expect(fullProfileSchema.safeParse({ ...full, nationality: " " }).success).toBe(false);
    expect(fullProfileSchema.safeParse({ ...full, email: "" }).success).toBe(false);
    expect(fullProfileSchema.safeParse({ ...full, age: "12" }).success).toBe(false);
  });
  it("keeps gender and age optional, but an age must be 18 or over", () => {
    expect(fullProfileSchema.safeParse({ ...full, gender: "", age: "" }).success).toBe(true);
    expect(fullProfileSchema.safeParse({ ...full, gender: "prefer_not" }).success).toBe(true);
    expect(fullProfileSchema.safeParse({ ...full, age: "17" }).success).toBe(false);
    expect(fullProfileSchema.safeParse({ ...full, age: "18" }).success).toBe(true);
  });
  it("needs the 18+ confirmation", () => {
    const { adult: _, ...withoutAdult } = full;
    expect(fullProfileSchema.safeParse(withoutAdult).success).toBe(false);
    expect(fullProfileSchema.safeParse({ ...full, adult: "" }).success).toBe(false);
    expect(
      basicProfileSchema.safeParse({ fullName: "Sara Ahmed", phone: "050 111 2233", email: "" })
        .success,
    ).toBe(false);
    expect(
      basicProfileSchema.safeParse({
        fullName: "Sara Ahmed",
        phone: "050 111 2233",
        email: "",
        adult: "yes",
      }).success,
    ).toBe(true);
  });
});

describe("typing answer", () => {
  it("carries the typing stats, and nothing else", () => {
    const stats = { seconds: 90, backspaces: 4, keystrokes: 300 };
    expect(testAnswerSchema.safeParse({ ...ids, answer: { text: "Hello", stats } }).success).toBe(
      true,
    );
    expect(
      testAnswerSchema.safeParse({
        ...ids,
        answer: { text: "Hello", stats: { ...stats, wpm: 99 } },
      }).success,
    ).toBe(false);
  });
});
