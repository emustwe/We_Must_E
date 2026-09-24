import { describe, expect, it } from "vitest";
import { matchesPrefix, safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("allows same-origin paths", () => {
    expect(safeNextPath("/employee")).toBe("/employee");
  });
  it("rejects external and protocol-relative targets", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "",
    ]) {
      expect(safeNextPath(bad, "/")).toBe("/");
    }
  });
});

describe("matchesPrefix", () => {
  it("matches the prefix and its children only", () => {
    expect(matchesPrefix("/admin", ["/admin"])).toBe(true);
    expect(matchesPrefix("/admin/grants", ["/admin"])).toBe(true);
    expect(matchesPrefix("/administrator", ["/admin"])).toBe(false);
  });
});
