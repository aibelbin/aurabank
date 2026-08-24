// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWaitlistStore, type WaitlistStore } from "./store";

let directory: string;
let store: WaitlistStore;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "aurabank-waitlist-"));
  store = createWaitlistStore(join(directory, "waitlist.db"));
});

afterEach(() => {
  store.close();
  rmSync(directory, { recursive: true, force: true });
});

describe("waitlist store", () => {
  it("starts empty", () => {
    expect(store.count()).toBe(0);
    expect(store.list()).toEqual([]);
  });

  it("gives the first applicant position 1", () => {
    expect(store.add({ handle: "aibel", email: "aibel@example.com" })).toEqual({
      position: 1,
      duplicate: false,
    });
  });

  it("hands out positions in application order", () => {
    store.add({ handle: "first", email: "one@example.com" });
    const second = store.add({ handle: "second", email: "two@example.com" });
    expect(second.position).toBe(2);
    expect(store.count()).toBe(2);
  });

  it("returns the original position for a repeat application without storing it twice", () => {
    const first = store.add({ handle: "aibel", email: "aibel@example.com" });
    const again = store.add({ handle: "different-handle", email: "aibel@example.com" });

    expect(again).toEqual({ position: first.position, duplicate: true });
    expect(store.count()).toBe(1);
  });

  it("records a creation timestamp", () => {
    store.add({ handle: "aibel", email: "aibel@example.com" });
    const [record] = store.list();
    expect(Number.isNaN(Date.parse(record.created_at))) .toBe(false);
  });

  it("lists records ordered by position", () => {
    store.add({ handle: "one", email: "one@example.com" });
    store.add({ handle: "two", email: "two@example.com" });
    expect(store.list().map((record) => record.handle)).toEqual(["one", "two"]);
  });

  it("keeps entries across separate connections to the same file", () => {
    const path = join(directory, "persisted.db");
    const first = createWaitlistStore(path);
    first.add({ handle: "aibel", email: "aibel@example.com" });
    first.close();

    const reopened = createWaitlistStore(path);
    expect(reopened.count()).toBe(1);
    reopened.close();
  });

  it("creates missing directories on the way to the database file", () => {
    const nested = createWaitlistStore(join(directory, "deep", "nested", "waitlist.db"));
    expect(nested.count()).toBe(0);
    nested.close();
  });
});
