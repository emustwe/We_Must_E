import { describe, expect, it } from "vitest";
import { meetingRequestSchema, meetingUpdateSchema } from "./meetings";

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const employeeId = "00000000-0000-4000-8000-000000000001";

describe("meetingRequestSchema", () => {
  it("accepts 1-3 future slots", () => {
    expect(
      meetingRequestSchema.safeParse({
        employeeId,
        slots: [{ start: inHours(24), end: inHours(25) }],
      }).success,
    ).toBe(true);
  });
  it("rejects past slots, reversed slots and more than 3", () => {
    expect(
      meetingRequestSchema.safeParse({
        employeeId,
        slots: [{ start: inHours(-2), end: inHours(-1) }],
      }).success,
    ).toBe(false);
    expect(
      meetingRequestSchema.safeParse({
        employeeId,
        slots: [{ start: inHours(25), end: inHours(24) }],
      }).success,
    ).toBe(false);
    const four = Array.from({ length: 4 }, (_, i) => ({
      start: inHours(24 + i),
      end: inHours(25 + i),
    }));
    expect(meetingRequestSchema.safeParse({ employeeId, slots: four }).success).toBe(false);
  });
});

describe("meetingUpdateSchema", () => {
  it("only allows https meeting links", () => {
    const requestId = employeeId;
    expect(
      meetingUpdateSchema.safeParse({
        requestId,
        meetingLink: "https://meet.google.com/abc-defg-hij",
      }).success,
    ).toBe(true);
    expect(
      meetingUpdateSchema.safeParse({ requestId, meetingLink: "http://meet.example.com" }).success,
    ).toBe(false);
    expect(
      meetingUpdateSchema.safeParse({ requestId, meetingLink: "javascript:alert(1)" }).success,
    ).toBe(false);
  });
});
