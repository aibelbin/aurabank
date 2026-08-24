// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

/**
 * The design package is shared by every app, so it must depend on none of them.
 * The moment it imports app code, a change to how aura settles can break the
 * landing page's build — the coupling a monorepo is supposed to avoid.
 *
 * This is the rule stated as a test rather than as a convention, because a
 * convention only lives in whoever remembers it.
 */
function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return [".ts", ".tsx"].includes(extname(path)) ? [path] : [];
  });
}

const files = sourceFiles("src").map((path) => ({ path, contents: readFileSync(path, "utf8") }));

const importsOf = (contents: string) =>
  [...contents.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);

describe("design package boundaries", () => {
  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it("never imports an app", () => {
    const offenders = files.filter(({ contents }) =>
      importsOf(contents).some(
        (specifier) => specifier.startsWith("@aurabank/") && specifier !== "@aurabank/design",
      ),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it("never reaches outside the package with a relative path", () => {
    const offenders = files.filter(({ contents }) =>
      importsOf(contents).some((specifier) => specifier.includes("../../")),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it("uses no app path alias", () => {
    const offenders = files.filter(({ contents }) =>
      importsOf(contents).some((specifier) => specifier.startsWith("@/")),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it("imports no database, server, or domain code", () => {
    const forbidden = ["node:sqlite", "next/headers", "zod", "waitlist", "story"];
    const offenders = files.filter(({ contents }) =>
      importsOf(contents).some((specifier) =>
        forbidden.some((term) => specifier.includes(term)),
      ),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });
});
