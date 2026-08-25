// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("password hashing", () => {
  it("accepts the right password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", stored)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery stapler", stored)).resolves.toBe(false);
  });

  it("salts, so the same password stores differently every time", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
    await expect(verifyPassword("same", a)).resolves.toBe(true);
    await expect(verifyPassword("same", b)).resolves.toBe(true);
  });

  it("carries its parameters, so an older hash still verifies", async () => {
    const stored = await hashPassword("portable");
    expect(stored.startsWith("scrypt:32768:8:1:")).toBe(true);
  });

  it("rejects a malformed record rather than throwing out of a sign-in", async () => {
    for (const stored of ["", "nonsense", "scrypt:x:8:1:aaaa:bbbb", "bcrypt:1:2:3:a:b", "a:b"]) {
      await expect(verifyPassword("anything", stored)).resolves.toBe(false);
    }
  });
});
