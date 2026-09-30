import { describe, expect, it } from "vitest";
import { outreachEmail } from "./email";
import { firstName, parseContacts } from "./parse";

describe("pasted outreach contacts", () => {
  it("reads Name, Company, Email, Country lines (commas, semicolons or tabs)", () => {
    const { contacts, badLines } = parseContacts(
      [
        "Sara Khan, Khan Traders, Sara@KhanTraders.com, Pakistan",
        "Omar Ali;Ali Builders;hr@alibuilders.ae",
        "Priya Das\tDas & Co\tpriya@das.in\tIndia",
        "",
        '"Rahman, Karim","Karim Foods, Ltd",karim@foods.bd,Bangladesh',
      ].join("\n"),
    );
    expect(badLines).toEqual([]);
    expect(contacts).toEqual([
      { name: "Sara Khan", company: "Khan Traders", email: "sara@khantraders.com", country: "Pakistan" },
      { name: "Omar Ali", company: "Ali Builders", email: "hr@alibuilders.ae", country: undefined },
      { name: "Priya Das", company: "Das & Co", email: "priya@das.in", country: "India" },
      { name: "Rahman, Karim", company: "Karim Foods, Ltd", email: "karim@foods.bd", country: "Bangladesh" },
    ]);
  });

  it("follows a header row in any order, skips repeats and reports bad lines", () => {
    const { contacts, badLines } = parseContacts(
      [
        "Email,Company Name,Contact Name,Country",
        "a@x.com,X Ltd,Ann,UAE",
        "A@X.com,X Ltd,Ann again,UAE",
        "not-an-email,Y Ltd,Bob,UAE",
        "c@z.com,,Cat,UAE",
      ].join("\n"),
    );
    expect(contacts).toEqual([{ name: "Ann", company: "X Ltd", email: "a@x.com", country: "UAE" }]);
    expect(badLines).toEqual([4, 5]);
  });

  it("greets by first name", () => {
    expect(firstName("  Sara Khan ")).toBe("Sara");
  });
});

describe("outreach email", () => {
  const email = outreachEmail({
    site: "https://www.wemuste.com",
    token: "a".repeat(32),
    name: "Sara <b>Khan</b>",
    company: "Khan & Sons",
  });

  it("links the picture and the button to the contact's private page", () => {
    expect(email.subject).toBe("Hiring at Khan & Sons? A short video for you");
    expect(email.html).toContain(`href="https://www.wemuste.com/w/${"a".repeat(32)}"`);
    expect(email.html).toContain('src="https://www.wemuste.com/email/video.jpg"');
    expect(email.html).toContain(`https://www.wemuste.com/w/${"a".repeat(32)}/unsubscribe`);
    expect(email.text).toContain(`https://www.wemuste.com/w/${"a".repeat(32)}/unsubscribe`);
  });

  it("escapes what was typed in", () => {
    expect(email.html).toContain("Hi Sara,");
    expect(email.html).toContain("Khan &amp; Sons");
    expect(email.html).not.toContain("<b>");
  });
});
