import { describe, expect, it } from "vitest";
import { cityFromContext, COUNTRIES, countryName, isCountryCode, normaliseCity } from "./countries";

const ctx = (pairs: [string, string][]) => pairs.map(([id, text]) => ({ id: `${id}.1`, text }));

describe("countries", () => {
  it("lists every country with English names", () => {
    expect(COUNTRIES.length).toBeGreaterThan(240);
    expect(countryName("AE")).toBe("United Arab Emirates");
    expect(isCountryCode("ae")).toBe(true);
    expect(isCountryCode("XX")).toBe(false);
  });
});

describe("cityFromContext (real MapTiler results)", () => {
  it.each([
    [
      "Dubai",
      ctx([
        ["place", "Sadaf 7"],
        ["region", "Dubai Emirate"],
        ["country", "United Arab Emirates"],
      ]),
    ],
    [
      "Abu Dhabi",
      ctx([
        ["place", "Al Manhal"],
        ["municipality", "Al Manhal"],
        ["county", "Abu Dhabi"],
        ["region", "Abu Dhabi Emirate"],
      ]),
    ],
    [
      "Sharjah",
      ctx([
        ["place", "Al Qasimia"],
        ["municipality", "Sharjah"],
        ["region", "Sharjah Emirate"],
      ]),
    ],
    [
      "Paris",
      ctx([
        ["place", "Le Marais"],
        ["municipality", "Paris"],
        ["county", "Paris"],
        ["region", "Ile-de-France"],
      ]),
    ],
    [
      "Mumbai",
      ctx([
        ["place", "Hallow Pul"],
        ["municipality", "Mumbai Zone 5"],
        ["region", "Maharashtra"],
      ]),
    ],
    [
      "Riyadh",
      ctx([
        ["place", "Riyadh"],
        ["county", "Riyadh governorate"],
        ["region", "Riyadh Region"],
      ]),
    ],
    [
      "Sydney",
      ctx([
        ["municipality", "Sydney"],
        ["county", "Council of the City of Sydney"],
        ["region", "New South Wales"],
      ]),
    ],
    [
      "Cairo",
      ctx([
        ["place", "Qasr Al Doubara"],
        ["region", "Cairo"],
      ]),
    ],
  ])("finds %s", (city, context) => {
    expect(cityFromContext(context)).toBe(city);
  });

  it("normalises typed city names", () => {
    expect(normaliseCity("  dubai  ")).toBe("Dubai");
    expect(normaliseCity("abu   dhabi emirate")).toBe("Abu Dhabi");
  });
});
