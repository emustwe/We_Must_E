import { describe, expect, it } from "vitest";
import { passwordStrength, strengthTip } from "./password-strength";

describe("passwordStrength", () => {
  it("scores anything under 10 characters as 0", () => {
    expect(passwordStrength("Ab1!xyz")).toBe(0);
  });
  it("keeps common passwords weak", () => {
    expect(passwordStrength("Password123!")).toBe(1);
    expect(passwordStrength("qwerty-Lovely-9")).toBe(1);
  });
  it("keeps repeated and alphabet runs weak", () => {
    expect(passwordStrength("abcdefghij")).toBe(1);
    expect(passwordStrength("aaaaaaaaaaaa")).toBe(1);
  });
  it("does not punish a short run inside a good password", () => {
    // Regression: this used to show "Weak" because of "12345".
    expect(passwordStrength("Emustwe@12345")).toBeGreaterThanOrEqual(3);
  });
  it("rates browser-generated and passphrase passwords strong", () => {
    expect(passwordStrength("xY7-kP2q-aB9w-Zt4")).toBe(4);
    expect(passwordStrength("Tulip-Harbor-Vessel-92")).toBe(4);
    expect(passwordStrength("tulip-harbor-9")).toBeGreaterThanOrEqual(3);
  });
  it("suggests what to change", () => {
    expect(strengthTip("summerdays1")).toBe("mix");
    expect(strengthTip("Xy7-kP2q-aB9w-Zt4")).toBeNull();
  });
});
