import { describe, expect, it } from "vitest";
import { createEmployerSchema, jobSchema, jobStatusSchema } from "./jobs";

const job = {
  title: "Weekend barista",
  description: "Make coffee and serve customers.",
  locationLabel: "Dubai Marina, Dubai",
  lat: 25.08,
  lng: 55.14,
};

describe("jobSchema", () => {
  it("accepts exactly the three fields", () => {
    expect(jobSchema.parse({ ...job, title: "  Weekend barista " }).title).toBe("Weekend barista");
  });
  it("requires a picked point", () => {
    expect(jobSchema.safeParse({ ...job, lat: undefined }).success).toBe(false);
  });
  it("rejects extra fields such as status, employer or exact public pins", () => {
    for (const extra of [{ status: "hidden" }, { employer_id: "x" }, { publicLat: 1 }]) {
      expect(jobSchema.safeParse({ ...job, ...extra }).success).toBe(false);
    }
  });
  it("limits the description to 3000 characters", () => {
    expect(jobSchema.safeParse({ ...job, description: "x".repeat(3001) }).success).toBe(false);
  });
});

describe("jobStatusSchema", () => {
  it("lets employers only close a job", () => {
    const jobId = "00000000-0000-4000-8000-000000000000";
    expect(jobStatusSchema.safeParse({ jobId, status: "closed" }).success).toBe(true);
    expect(jobStatusSchema.safeParse({ jobId, status: "hidden" }).success).toBe(false);
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
