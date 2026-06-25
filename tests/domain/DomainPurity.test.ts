// 仕様: docs/error.md#1-エラーハンドリングの基本方針
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const domainRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/domain",
);

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("DomainPurity", () => {
  const domainFiles = collectTsFiles(domainRoot);

  it("src/domain/ に throw / try / catch が存在しない", () => {
    const forbidden = /\b(throw|try|catch)\b/;
    const violations = domainFiles
      .map((file) => ({ file, content: readFileSync(file, "utf8") }))
      .filter(({ content }) => forbidden.test(content))
      .map(({ file }) => path.relative(domainRoot, file));

    expect(violations).toEqual([]);
  });

  it("src/domain/ が Result や外側の層を import していない", () => {
    const forbiddenImport = /from\s+['"](?:@shared|\.\.\/shared|@application|\.\.\/application|@interface|\.\.\/interface|@frameworks-drivers|\.\.\/frameworks-drivers)/;
    const violations = domainFiles
      .map((file) => ({ file, content: readFileSync(file, "utf8") }))
      .filter(({ content }) => forbiddenImport.test(content))
      .map(({ file }) => path.relative(domainRoot, file));

    expect(violations).toEqual([]);
  });
});
