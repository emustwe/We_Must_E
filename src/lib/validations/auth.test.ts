import { describe, expect, it } from "vitest";
import { employeeSignupSchema, resetPasswordSchema } from "./auth";

const employee = {
  fullName: "Maria Santos",
  email: "  Maria@Example.COM ",
  password: "tulip-harbor-9",
  acceptTerms: true,
  acceptDataSharing: true,
};

describe("employeeSignupSchema", () => {
  it("normalises email", () => {
    expect(employeeSignupSchema.parse(employee).email).toBe("maria@example.com");
  });
  it("requires both consents to be actively ticked", () => {
    const result = employeeSignupSchema.safeParse({ ...employee, acceptDataSharing: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("validation.acceptDataSharing");
  });
  it("rejects unknown keys such as a role", () => {
    expect(employeeSignupSchema.safeParse({ ...employee, role: "admin" }).success).toBe(false);
  });
  it("enforces a 10 character minimum password", () => {
    expect(employeeSignupSchema.safeParse({ ...employee, password: "short1!" }).success).toBe(
      false,
    );
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "tulip-harbor-9",
      confirmPassword: "x",
    });
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
