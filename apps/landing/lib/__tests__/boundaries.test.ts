// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

/**
 * The landing page may depend on the shared design system and on nothing else
 * in the monorepo. It must never reach into another app: no shared database
 * client, no shared domain types, no relative path climbing out of the app.
 */
function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (["node_modules", ".next"].includes(entry)) return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return [".ts", ".tsx"].includes(extname(path)) ? [path] : [];
  });
}

const files = ["app", "components", "lib"]
  .flatMap(sourceFiles)
  .map((path) => ({ path, contents: readFileSync(path, "utf8") }));

const importsOf = (contents: string) =>
  [...contents.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);

describe("landing app boundaries", () => {
  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("depends on no workspace package except the design system", () => {
    const offenders = files.filter(({ contents }) =>
      importsOf(contents).some(
        (specifier) => specifier.startsWith("@aurabank/") && specifier !== "@aurabank/design",
      ),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it("never reaches another workspace by relative path", () => {
    const offenders = files.filter(({ contents }) =>
      importsOf(contents).some((specifier) => specifier.includes("../../../")),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });
});
