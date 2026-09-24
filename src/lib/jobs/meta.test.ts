import { describe, expect, it } from "vitest";
import { formatPayAmount, formatPinAmount } from "./meta";

describe("pay formatting", () => {
  it("formats ranges and single amounts", () => {
    expect(formatPayAmount(28, 35, "AED")).toBe("AED 28–35");
    expect(formatPayAmount(25, null, "AED")).toBe("AED 25");
    expect(formatPayAmount(4500, 4500, "AED")).toBe("AED 4,500");
  });
  it("shortens pin labels", () => {
    expect(formatPinAmount(28)).toBe("28");
    expect(formatPinAmount(4500)).toBe("4.5k");
  });
});
