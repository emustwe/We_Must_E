import { describe, expect, it } from "vitest";
import { daysSince, displayTitle, isNewJob, isSample, shortLabel } from "./display";

describe("job display", () => {
  it("shows sample jobs with a badge, not [SAMPLE] in the title", () => {
    expect(isSample("[SAMPLE] Weekend barista")).toBe(true);
    expect(isSample("Weekend barista")).toBe(false);
    expect(displayTitle("[SAMPLE] Weekend barista")).toBe("Weekend barista");
  });

  it("keeps pin labels short, cutting at a word", () => {
    expect(shortLabel("[SAMPLE] Weekend barista")).toBe("Weekend barista");
    expect(shortLabel("Office cleaner (mornings)")).toBe("Office cleaner…");
    expect(shortLabel("Supercalifragilisticexpialidocious")).toBe("Supercalifragilist…");
  });

  it("marks jobs from the last 24 hours as new", () => {
    const now = Date.parse("2026-09-25T12:00:00Z");
    expect(isNewJob("2026-09-25T01:00:00Z", now)).toBe(true);
    expect(isNewJob("2026-09-24T11:00:00Z", now)).toBe(false);
    expect(daysSince("2026-09-23T12:00:00Z", now)).toBe(2);
  });
});
