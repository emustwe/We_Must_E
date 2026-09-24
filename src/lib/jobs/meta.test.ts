import { describe, expect, it } from "vitest";
import { distanceKm, isInside, parseBounds } from "./meta";

describe("job area", () => {
  const uae = parseBounds("22.5,51.0,26.5,56.6");
  it("parses south,west,north,east", () => {
    expect(uae).toEqual({ south: 22.5, west: 51, north: 26.5, east: 56.6 });
  });
  it("accepts UAE points and rejects others", () => {
    expect(isInside(uae, 25.08, 55.14)).toBe(true); // Dubai Marina
    expect(isInside(uae, 51.5, -0.12)).toBe(false); // London
  });
});

describe("distanceKm", () => {
  it("measures Dubai Marina to Downtown at roughly 15 km", () => {
    const km = distanceKm([25.0805, 55.1403], [25.1972, 55.2744]);
    expect(km).toBeGreaterThan(17);
    expect(km).toBeLessThan(20);
  });
});
