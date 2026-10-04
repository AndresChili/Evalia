import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies the correct plaintext against its hash", async () => {
    const hash = await hashPassword("Password123!");
    await expect(verifyPassword("Password123!", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect plaintext", async () => {
    const hash = await hashPassword("Password123!");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("never stores the plaintext as the hash", async () => {
    const hash = await hashPassword("Password123!");
    expect(hash).not.toBe("Password123!");
    expect(hash.startsWith("$2")).toBe(true); // formato bcrypt
  });

  it("produces different hashes for the same password (salt distinto)", async () => {
    const [hashA, hashB] = await Promise.all([
      hashPassword("Password123!"),
      hashPassword("Password123!"),
    ]);
    expect(hashA).not.toBe(hashB);
  });
});
