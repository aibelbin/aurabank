import { describe, expect, it } from "vitest";
import { waitlistInputSchema } from "./schema";

const parse = (input: unknown) => waitlistInputSchema.safeParse(input);

describe("waitlistInputSchema", () => {
  it("accepts a plausible application", () => {
    const result = parse({ handle: "aibel", email: "aibel@example.com" });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace from the handle", () => {
    const result = parse({ handle: "  aibel  ", email: "aibel@example.com" });
    expect(result.success && result.data.handle).toBe("aibel");
  });

  it("normalises the email so case-different addresses collide as duplicates", () => {
    const result = parse({ handle: "aibel", email: "  Aibel@Example.COM " });
    expect(result.success && result.data.email).toBe("aibel@example.com");
  });

  it("rejects a handle that is too short after trimming", () => {
    expect(parse({ handle: " a ", email: "a@example.com" }).success).toBe(false);
  });

  it("rejects a handle longer than 32 characters", () => {
    expect(parse({ handle: "a".repeat(33), email: "a@example.com" }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(parse({ handle: "aibel", email: "not-an-email" }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(parse({ handle: "aibel" }).success).toBe(false);
    expect(parse({}).success).toBe(false);
  });

  it("reports a readable message for a malformed email", () => {
    const result = parse({ handle: "aibel", email: "nope" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter an email address we can reach you at.");
    }
  });
});
