import { describe, expect, it } from "vitest";
import { describeAudit } from "./audit-text";

describe("plain-language audit entries", () => {
  it("names the decision on an application", () => {
    const d = describeAudit({
      action: "application.reviewed",
      target_type: "application",
      target_id: "11111111-2222-3333-4444-555555555555",
      metadata: { from: "submitted", to: "approved" },
    });
    expect(d.key).toBe("appApproved");
    expect(d.href).toBe("/admin/applications/11111111-2222-3333-4444-555555555555");
    expect(d.chip).toEqual({ kind: "change", from: "submitted", to: "approved" });
  });

  it("shows a short video id for a video view", () => {
    const d = describeAudit({
      action: "application.video_viewed",
      target_type: "application",
      target_id: "a",
      metadata: { video: "98166d74-0000-0000-0000-000000000000" },
    });
    expect(d.key).toBe("videoViewed");
    expect(d.chip).toEqual({ kind: "text", text: "98166d74" });
  });

  it("links a job approval to the jobs page and keeps unknown codes", () => {
    expect(
      describeAudit({ action: "job.approved", target_type: "job", target_id: "j", metadata: {} }),
    ).toMatchObject({ key: "jobApproved", href: "/admin/jobs?job=j" });
    expect(
      describeAudit({ action: "something.new", target_type: null, target_id: null, metadata: null })
        .key,
    ).toBe("other");
  });
});
