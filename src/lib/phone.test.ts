import { describe, expect, it } from "vitest";
import { toE164 } from "./phone";

describe("toE164", () => {
  it.each([
    ["050 123 4567", "+971501234567"],
    ["50-123-4567", "+971501234567"],
    ["+971 50 123 4567", "+971501234567"],
    ["00971501234567", "+971501234567"],
    ["+971 050 123 4567", "+971501234567"],
    ["04 123 4567", "+97141234567"],
    ["+44 7700 900123", "+447700900123"],
  ])("normalises %s", (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });

  it.each(["", "abc", "12345", "+0123456789", "050 123 45678 999"])("rejects %s", (input) => {
    expect(toE164(input)).toBeNull();
  });
});
