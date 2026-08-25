// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

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

/**
 * Tailwind's automatic source detection stops at the app, so a class that only
 * ever appears in the shared design package reaches the stylesheet solely
 * because of the `@source` line in globals.css. Get that path wrong and
 * nothing errors: the class is simply absent, and a button loses its label
 * colour on a screen nobody rebuilt that week.
 */
describe("stylesheet sources", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("points @source at the design package that actually exists", () => {
    const sources = [...css.matchAll(/@source\s+"([^"]+)"/g)].map((match) => match[1]);
    expect(sources.length).toBeGreaterThan(0);

    for (const source of sources) {
      // @source is resolved relative to the file that declares it.
      expect({ source, exists: existsSync(resolve("app", source)) }).toEqual({
        source,
        exists: true,
      });
    }
  });

  it("imports the shared tokens rather than restating them", () => {
    expect(css).toContain('@import "@aurabank/design/tokens.css"');
    expect(css).not.toMatch(/--color-(ink|paper|hairline|settle|debt)\s*:/);
  });
});
