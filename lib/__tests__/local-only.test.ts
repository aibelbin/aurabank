// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!EXTENSIONS.has(extname(path))) return [];
    // Tests may reference example URLs; runtime code may not.
    if (path.includes(".test.")) return [];
    return [path];
  });
}

const files = ROOTS.flatMap(sourceFiles).map((path) => ({
  path,
  contents: readFileSync(path, "utf8"),
}));

describe("the app makes no external requests at runtime", () => {
  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("never references a font host", () => {
    const offenders = files.filter(
      ({ contents }) =>
        contents.includes("fonts.googleapis.com") || contents.includes("fonts.gstatic.com"),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it("contains no absolute http(s) URLs in runtime code", () => {
    const offenders = files.filter(({ contents }) => /https?:\/\//.test(contents));
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it("bundles its own font files", () => {
    const fonts = readdirSync("app/fonts");
    expect(fonts).toContain("inter-tight-latin.woff2");
    expect(fonts).toContain("jetbrains-mono-latin.woff2");
  });

  it("declares a fallback stack for every self-hosted face", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toContain("fallback:");
    expect(layout.match(/fallback:/g)).toHaveLength(2);
  });
});
