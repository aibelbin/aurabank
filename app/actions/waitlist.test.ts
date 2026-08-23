// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HONEYPOT_FIELD } from "@/lib/waitlist/state";

/** Swapped per test so each case gets its own rate-limit bucket. */
let callerIp = "198.51.100.1";

vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-forwarded-for", callerIp]]),
}));

const directory = mkdtempSync(join(tmpdir(), "aurabank-action-"));

let applyForAccount: typeof import("./waitlist").applyForAccount;
let store: import("@/lib/waitlist/store").WaitlistStore;

beforeAll(async () => {
  // The store resolves its path at import time, so point it at a temp file first.
  process.env.WAITLIST_DB_PATH = join(directory, "waitlist.db");
  applyForAccount = (await import("./waitlist")).applyForAccount;
  store = (await import("@/lib/waitlist/store")).getWaitlistStore();
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

function application(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("applyForAccount", () => {
  it("records a valid application and returns its queue position", async () => {
    callerIp = "198.51.100.10";
    const result = await applyForAccount(
      { status: "idle" },
      application({ handle: "aibel", email: "aibel@example.com" }),
    );

    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.position).toBeGreaterThan(0);
  });

  it("returns the original position for a repeat application, revealing nothing", async () => {
    callerIp = "198.51.100.11";
    const first = await applyForAccount(
      { status: "idle" },
      application({ handle: "repeat", email: "repeat@example.com" }),
    );
    const second = await applyForAccount(
      { status: "idle" },
      application({ handle: "repeat", email: "REPEAT@example.com" }),
    );

    expect(second).toEqual(first);
  });

  it("rejects a malformed email with a readable message and keeps the input", async () => {
    callerIp = "198.51.100.12";
    const result = await applyForAccount(
      { status: "idle" },
      application({ handle: "aibel", email: "nope" }),
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toContain("email address");
      expect(result.values).toEqual({ handle: "aibel", email: "nope" });
    }
  });

  it("does not spend rate-limit quota on validation failures", async () => {
    callerIp = "198.51.100.13";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await applyForAccount({ status: "idle" }, application({ handle: "x", email: "bad" }));
    }

    const result = await applyForAccount(
      { status: "idle" },
      application({ handle: "patient", email: "patient@example.com" }),
    );
    expect(result.status).toBe("success");
  });

  it("throttles an address after five accepted applications", async () => {
    callerIp = "198.51.100.14";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await applyForAccount(
        { status: "idle" },
        application({ handle: `bot${attempt}`, email: `bot${attempt}@example.com` }),
      );
    }

    const result = await applyForAccount(
      { status: "idle" },
      application({ handle: "bot5", email: "bot5@example.com" }),
    );

    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toContain("Too many applications");
  });

  it("reports success but stores nothing when the honeypot is filled", async () => {
    callerIp = "198.51.100.15";
    const before = store.count();

    const result = await applyForAccount(
      { status: "idle" },
      application({
        handle: "crawler",
        email: "crawler@example.com",
        [HONEYPOT_FIELD]: "http://spam.example",
      }),
    );

    expect(result.status).toBe("success");
    expect(store.count()).toBe(before);
  });

  it("rejects an empty submission", async () => {
    callerIp = "198.51.100.16";
    const result = await applyForAccount({ status: "idle" }, application({}));
    expect(result.status).toBe("error");
  });
});
