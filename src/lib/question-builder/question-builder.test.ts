import { describe, expect, it } from "vitest";
import { saveQuestionBuildSchema } from "@/lib/validations/question-builder";
import { EXAMPLE_ROLE } from "./example";
import { roleSchema, TEST_FIELDS, VIDEO_FIELDS } from "./fields";
import { buildTest, buildVideos, type Role } from "./template";

describe("question builder", () => {
  it("turns a job into the WemustE pattern: 25 test questions and 7 videos", () => {
    const test = buildTest(EXAMPLE_ROLE);
    const videos = buildVideos(EXAMPLE_ROLE);
    expect(test).toHaveLength(25);
    expect(videos).toHaveLength(7);
    expect(test[0].prompt).toContain(EXAMPLE_ROLE.knowledge);
    expect(test[24].prompt).toContain("We Must E.");
    expect(videos[1]).toContain("working as a Barista");
  });

  it("gives office jobs a typing test as question 1", () => {
    const office: Role = {
      ...EXAMPLE_ROLE,
      title: "Receptionist",
      knowledge: undefined,
      typing: "Type this paragraph about the front desk.",
    };
    const [first] = buildTest(office);
    expect(first.type).toBe("typing");
    expect(first.options).toEqual([office.typing]);
  });

  it("accepts the example and needs either typing or knowledge, not both", () => {
    expect(roleSchema.safeParse(EXAMPLE_ROLE).success).toBe(true);
    expect(roleSchema.safeParse({ ...EXAMPLE_ROLE, typing: "A paragraph to type." }).success).toBe(
      false,
    );
    expect(roleSchema.safeParse({ ...EXAMPLE_ROLE, knowledge: undefined }).success).toBe(false);
    expect(roleSchema.safeParse({ ...EXAMPLE_ROLE, rush: undefined }).success).toBe(false);
  });

  it("keeps every finished question within the database limits", () => {
    const long: Role = { ...EXAMPLE_ROLE };
    for (const f of [...TEST_FIELDS, ...VIDEO_FIELDS])
      (long as Record<string, unknown>)[f.key] = "x".repeat(f.max);
    for (const q of buildTest(long)) expect(q.prompt.length).toBeLessThanOrEqual(1000);
    for (const v of buildVideos(long)) expect(v.length).toBeLessThanOrEqual(500);
  });

  it("saves exactly what the builder produced", () => {
    const input = {
      title: "Barista",
      description: "Makes coffee for guests in a busy cafe.",
      role: EXAMPLE_ROLE as unknown as Record<string, string>,
      test: buildTest(EXAMPLE_ROLE).map((q) => ({ type: "long_text", prompt: q.prompt })),
      videos: buildVideos(EXAMPLE_ROLE),
    };
    expect(saveQuestionBuildSchema.safeParse(input).success).toBe(true);
    expect(
      saveQuestionBuildSchema.safeParse({ ...input, videos: input.videos.slice(1) }).success,
    ).toBe(false);
  });
});
