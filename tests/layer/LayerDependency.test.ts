// 仕様: README.md#依存方向
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");

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

function filesIn(layerDir: string): string[] {
  return collectTsFiles(path.join(srcRoot, layerDir));
}

function forbiddenImports(content: string, patterns: RegExp[]): string[] {
  return patterns.filter((pattern) => pattern.test(content)).map((p) => p.source);
}

describe("LayerDependency", () => {
  it("domain は外側の層を import しない", () => {
    const patterns = [
      /@application/,
      /@interface/,
      /@frameworks-drivers/,
      /\.\.\/application/,
      /\.\.\/interface/,
      /\.\.\/frameworks-drivers/,
    ];
    const violations = filesIn("domain")
      .map((file) => ({ file, content: readFileSync(file, "utf8") }))
      .flatMap(({ file, content }) =>
        forbiddenImports(content, patterns).map((pattern) => ({
          file: path.relative(srcRoot, file),
          pattern,
        })),
      );

    expect(violations).toEqual([]);
  });

  it("shared は他の src 層を import しない", () => {
    const patterns = [/@domain/, /@application/, /@interface/, /@frameworks-drivers/];
    const violations = filesIn("shared")
      .map((file) => ({ file, content: readFileSync(file, "utf8") }))
      .flatMap(({ file, content }) =>
        forbiddenImports(content, patterns).map((pattern) => ({
          file: path.relative(srcRoot, file),
          pattern,
        })),
      );

    expect(violations).toEqual([]);
  });

  it("interface は application / frameworks-drivers を import しない", () => {
    const patterns = [/@application/, /@frameworks-drivers/];
    const violations = filesIn("interface")
      .map((file) => ({ file, content: readFileSync(file, "utf8") }))
      .flatMap(({ file, content }) =>
        forbiddenImports(content, patterns).map((pattern) => ({
          file: path.relative(srcRoot, file),
          pattern,
        })),
      );

    expect(violations).toEqual([]);
  });

  it("application は frameworks-drivers を import しない", () => {
    const patterns = [/@frameworks-drivers/];
    const violations = filesIn("application")
      .map((file) => ({ file, content: readFileSync(file, "utf8") }))
      .flatMap(({ file, content }) =>
        forbiddenImports(content, patterns).map((pattern) => ({
          file: path.relative(srcRoot, file),
          pattern,
        })),
      );

    expect(violations).toEqual([]);
  });

  it("frameworks-drivers は application を import しない", () => {
    const patterns = [/@application/];
    const violations = filesIn("frameworks-drivers")
      .map((file) => ({ file, content: readFileSync(file, "utf8") }))
      .flatMap(({ file, content }) =>
        forbiddenImports(content, patterns).map((pattern) => ({
          file: path.relative(srcRoot, file),
          pattern,
        })),
      );

    expect(violations).toEqual([]);
  });
});
