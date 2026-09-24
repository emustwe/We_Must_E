import { describe, expect, it } from "vitest";
import { submitSchema, testAnswerSchema } from "./apply";

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
    contact: { fullName: "Sara Ahmed", phone: "050 111 2233", email: "" },
    answers: { [ids.questionId]: { options: [0] } },
    consent: true,
  };
  it("normalises the phone number to E.164", () => {
    const parsed = submitSchema.parse(base);
    expect(parsed.contact.phone).toBe("+971501112233");
  });
  it("requires consent to be ticked", () => {
    expect(submitSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(submitSchema.safeParse({ ...base, consent: undefined }).success).toBe(false);
  });
  it("rejects invalid phones and unknown fields", () => {
    expect(
      submitSchema.safeParse({ ...base, contact: { ...base.contact, phone: "12" } }).success,
    ).toBe(false);
    expect(submitSchema.safeParse({ ...base, status: "approved" }).success).toBe(false);
  });
});
