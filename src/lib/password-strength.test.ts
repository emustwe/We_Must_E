import { describe, expect, it } from "vitest";
import { passwordStrength } from "./password-strength";

describe("passwordStrength", () => {
  it("scores anything under 10 characters as 0", () => {
    expect(passwordStrength("Ab1!xyz")).toBe(0);
  });
  it("caps common or patterned passwords at 1", () => {
    expect(passwordStrength("Password123!")).toBe(1);
    expect(passwordStrength("abcdefghij")).toBe(1);
    expect(passwordStrength("aaaaaaaaaaaa")).toBe(1);
  });
  it("rewards length and variety", () => {
    expect(passwordStrength("tulip-harbor-9")).toBeGreaterThanOrEqual(2);
    expect(passwordStrength("Tulip-Harbor-Vessel-92")).toBe(4);
  });
});
