import { describe, expect, it } from "vitest";

import { generateToken, hashToken } from "@/lib/token";

describe("password reset tokens", () => {
  it("generates unpredictable, non-repeating tokens", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateToken()));
    expect(tokens.size).toBe(20);
  });

  it("hashes the same token deterministically (lookup by hash must work)", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produces different hashes for different tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(hashToken(a)).not.toBe(hashToken(b));
  });

  it("never stores the raw token as its own hash", () => {
    const token = generateToken();
    expect(hashToken(token)).not.toBe(token);
  });
});
