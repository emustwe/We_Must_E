import { describe, expect, it } from "vitest";
import { typingResult } from "./typing";

describe("typing test results", () => {
  const target = "Please check the status of my order today.";
  it("is 100% for an exact copy", () => {
    const r = typingResult(target, target, 60);
    expect(r.accuracy).toBe(100);
    expect(r.wrongWords).toEqual([]);
    expect(r.wpm).toBe(Math.round(target.length / 5));
  });
  it("lists wrong and missing words", () => {
    const r = typingResult(target, "Please chek the status", 30);
    expect(r.wrongWords).toEqual([{ position: 2, expected: "check", typed: "chek" }]);
    expect(r.missingWords).toBe(4);
    expect(r.accuracy).toBeLessThan(100);
  });
});
