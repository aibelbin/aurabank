// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createBankStore } from "@/lib/db/store";
import { SESSION_TTL_DAYS, newSessionToken, sessionExpiry } from "../tokens";

function storeWithMember() {
  const store = createBankStore(":memory:");
  const accountId = store.accounts.insert({
    handle: "arjun",
    email: "arjun@example.test",
    passwordHash: "x",
  });
  return { store, accountId };
}

describe("sessions", () => {
  it("resolves a live token to its account", () => {
    const { store, accountId } = storeWithMember();
    const token = newSessionToken();
    store.sessions.insert({ token, accountId, expiresAt: sessionExpiry() });

    expect(store.sessions.accountFor(token)).toMatchObject({ id: accountId, handle: "arjun" });
    store.close();
  });

  it("does not honour an expired session", () => {
    const { store, accountId } = storeWithMember();
    const token = newSessionToken();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    store.sessions.insert({ token, accountId, expiresAt: yesterday.toISOString() });

    expect(store.sessions.accountFor(token)).toBeUndefined();
    store.close();
  });

  it("expires exactly at the boundary, not a moment after", () => {
    const { store, accountId } = storeWithMember();
    const token = newSessionToken();
    const now = new Date("2026-08-25T12:00:00.000Z");
    const expiresAt = sessionExpiry(now);
    store.sessions.insert({ token, accountId, expiresAt });

    expect(store.sessions.accountFor(token, new Date(expiresAt))).toBeUndefined();
    expect(store.sessions.accountFor(token, new Date(Date.parse(expiresAt) - 1))).toBeDefined();
    store.close();
  });

  it("issues a token that lasts thirty days", () => {
    const now = new Date("2026-08-25T12:00:00.000Z");
    expect(sessionExpiry(now)).toBe("2026-09-24T12:00:00.000Z");
    expect(SESSION_TTL_DAYS).toBe(30);
  });

  it("stops honouring a token once it is destroyed", () => {
    const { store, accountId } = storeWithMember();
    const token = newSessionToken();
    store.sessions.insert({ token, accountId, expiresAt: sessionExpiry() });
    store.sessions.destroy(token);

    expect(store.sessions.accountFor(token)).toBeUndefined();
    store.close();
  });

  it("issues unguessable, distinct tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, newSessionToken));
    expect(tokens.size).toBe(50);
    expect([...tokens][0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
