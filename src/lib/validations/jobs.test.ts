import { describe, expect, it } from "vitest";
import { createEmployerSchema, jobRequestSchema, jobSchema } from "./jobs";

const job = {
  title: "Weekend barista",
  description: "Make coffee and serve customers.",
  category: "hospitality",
  schedule: ["weekends", "weekends"],
  payMin: "30",
  payMax: "",
  payPeriod: "hour",
  spots: "1",
  cityEmirate: "Dubai",
  areaLabel: "Dubai Marina",
  lat: 25.08,
  lng: 55.14,
  startsOn: "",
  expiresInDays: "30",
};

describe("jobSchema", () => {
  it("treats a blank maximum as no maximum (not 0)", () => {
    const parsed = jobSchema.parse(job);
    expect(parsed.payMax).toBeUndefined();
    expect(parsed.payMin).toBe(30);
  });
  it("rejects a maximum below the minimum", () => {
    const result = jobSchema.safeParse({ ...job, payMax: "20" });
    expect(result.error?.issues[0]?.path).toEqual(["payMax"]);
  });
  it("de-duplicates schedules", () => {
    expect(jobSchema.parse(job).schedule).toEqual(["weekends"]);
  });
  it("keeps pins inside the UAE", () => {
    expect(jobSchema.safeParse({ ...job, lat: 51.5, lng: -0.12 }).success).toBe(false);
  });
  it("rejects unknown keys such as employer_id", () => {
    expect(jobSchema.safeParse({ ...job, employer_id: "x" }).success).toBe(false);
  });
});

describe("jobRequestSchema", () => {
  it("requires a UUID and caps the message", () => {
    expect(jobRequestSchema.safeParse({ jobId: "nope" }).success).toBe(false);
    expect(
      jobRequestSchema.safeParse({
        jobId: "00000000-0000-4000-8000-000000000000",
        message: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("createEmployerSchema", () => {
  it("accepts an empty website and rejects non-http URLs", () => {
    const base = {
      companyName: "Acme",
      contactPerson: "Omar Ali",
      email: "o@acme.ae",
      phone: "+971 50 123 4567",
    };
    expect(createEmployerSchema.safeParse({ ...base, website: "" }).success).toBe(true);
    expect(
      createEmployerSchema.safeParse({ ...base, website: "javascript:alert(1)" }).success,
    ).toBe(false);
  });
});
