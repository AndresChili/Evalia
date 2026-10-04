import { describe, expect, it } from "vitest";

import { changePasswordSchema, loginSchema, registerSchema } from "@/lib/validation/auth";

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "Password123!",
      displayName: "Ana",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "short",
      displayName: "Ana",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "Password123!",
      displayName: "Ana",
    });
    expect(result.success).toBe(false);
  });

  it("normaliza el email a minúsculas y sin espacios", () => {
    const result = registerSchema.safeParse({
      email: "  USER@Example.com  ",
      password: "Password123!",
      displayName: "Ana",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("user@example.com");
  });

  it("rejects a 1-character display name", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "Password123!",
      displayName: "A",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("rejects a new password shorter than 8 characters", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "whatever",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid current + new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPassword1",
      newPassword: "NewPassword123!",
    });
    expect(result.success).toBe(true);
  });
});
