import { describe, expect, it } from "vitest";
import { loginSchema, resetPasswordSchema } from "./auth";

describe("loginSchema", () => {
  it("normalises email and rejects unknown keys", () => {
    expect(loginSchema.parse({ email: "  Omar@Acme.AE ", password: "x" }).email).toBe(
      "omar@acme.ae",
    );
    expect(
      loginSchema.safeParse({ email: "o@acme.ae", password: "x", role: "admin" }).success,
    ).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("enforces a 10 character minimum", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "short1!", confirmPassword: "short1!" }).success,
    ).toBe(false);
  });
  it("requires matching passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "tulip-harbor-9",
      confirmPassword: "x",
    });
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
