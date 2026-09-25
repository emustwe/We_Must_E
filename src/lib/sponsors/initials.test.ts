import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("uses the first letters of the first two words, without company suffixes", () => {
    expect(initials("Harbour Coffee LLC")).toBe("HC");
    expect(initials("Wemuste")).toBe("WE");
    expect(initials("test company llc")).toBe("TC");
  });
});
