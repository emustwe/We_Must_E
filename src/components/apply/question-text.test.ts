import { describe, expect, it } from "vitest";
import { parseQuestion } from "./question-text";

describe("question layout", () => {
  it("splits topic, question, quote and task", () => {
    const q = parseQuestion(
      "Translation & Language\n\nTranslation — English → Korean\n\nTranslate the following customer message into natural Korean.\n\n“I have been waiting.”",
    );
    expect(q.topic).toEqual(["Translation & Language", "Translation — English → Korean"]);
    expect(q.blocks).toMatchObject([
      { kind: "text", text: "Translate the following customer message into natural Korean." },
      { kind: "quote", text: "“I have been waiting.”" },
    ]);
  });
  it("keeps lists, labels and drops the 'written answer' note", () => {
    const q = parseQuestion(
      "Multiple Deadlines\n\nYou have three tasks:\n\n• Task A\n• Task B\n\nExplain why.\n\nResponse: Written answer.",
    );
    expect(q.blocks).toMatchObject([
      { kind: "text", text: "You have three tasks:" },
      { kind: "list", items: ["Task A", "Task B"], ordered: false },
      { kind: "text", text: "Explain why." },
    ]);
    const t = parseQuestion("Question:\nTranslate this.\n\nTask:\nDo it well.");
    expect(t.blocks[0]).toEqual({ kind: "label", text: "Question" });
  });
  it("treats a single short line as the question", () => {
    expect(parseQuestion("Anything you would like to mention")).toEqual({
      topic: [],
      blocks: [{ kind: "text", text: "Anything you would like to mention" }],
    });
  });
});
