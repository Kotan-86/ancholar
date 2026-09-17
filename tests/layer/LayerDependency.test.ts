// 仕様: README.md#依存方向 / docs/spec/presentation-uc1.md#2-6-層依存の制約
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function filesIn(layerDir: string): string[] {
  return collectSourceFiles(path.join(srcRoot, layerDir));
}

function filesInSubdir(layerDir: string, subdir: string): string[] {
  return collectSourceFiles(path.join(srcRoot, layerDir, subdir));
}

function filesInLayerExcluding(
  layerDir: string,
  excludeSubdirs: string[],
): string[] {
  const layerPath = path.join(srcRoot, layerDir);
  const entries = readdirSync(layerPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (excludeSubdirs.includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(layerPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function forbiddenImports(content: string, patterns: RegExp[]): string[] {
  return patterns.filter((pattern) => pattern.test(content)).map((p) => p.source);
}

function collectViolations(
  files: string[],
  patterns: RegExp[],
): { file: string; pattern: string }[] {
  return files
    .map((file) => ({ file, content: readFileSync(file, "utf8") }))
    .flatMap(({ file, content }) =>
      forbiddenImports(content, patterns).map((pattern) => ({
        file: path.relative(srcRoot, file),
        pattern,
      })),
    );
}

describe("LayerDependency", () => {
  it("domain は外側の層を import しない", () => {
    const patterns = [
      /@application/,
      /@interface/,
      /@frameworks-drivers/,
      /@presentation/,
      /\.\.\/application/,
      /\.\.\/interface/,
      /\.\.\/frameworks-drivers/,
    ];
    expect(collectViolations(filesIn("domain"), patterns)).toEqual([]);
  });

  it("shared は他の src 層を import しない", () => {
    const patterns = [
      /@domain/,
      /@application/,
      /@interface/,
      /@frameworks-drivers/,
      /@presentation/,
    ];
    expect(collectViolations(filesIn("shared"), patterns)).toEqual([]);
  });

  it("interface は application / frameworks-drivers を import しない", () => {
    const patterns = [/@application/, /@frameworks-drivers/, /@presentation/];
    expect(collectViolations(filesIn("interface"), patterns)).toEqual([]);
  });

  it("application は frameworks-drivers を import しない", () => {
    const patterns = [/@frameworks-drivers/, /@presentation/];
    expect(collectViolations(filesIn("application"), patterns)).toEqual([]);
  });

  it("frameworks-drivers（nextjs/composition を除く）は application を import しない", () => {
    const patterns = [/@application/];
    const violations = collectViolations(
      filesInLayerExcluding("frameworks-drivers", ["nextjs"]),
      patterns,
    );
    expect(violations).toEqual([]);
  });

  it("presentation は @interface / @domain / @shared のみ import 可能（§2-6）", () => {
    const presentationDir = path.join(srcRoot, "frameworks-drivers/presentation");
    try {
      readdirSync(presentationDir);
    } catch {
      return;
    }

    const patterns = [/@application/, /@frameworks-drivers/];
    const violations = collectViolations(
      filesInSubdir("frameworks-drivers", "presentation"),
      patterns,
    );
    expect(violations).toEqual([]);
  });

  it("nextjs/composition は @presentation を import しない", () => {
    const compositionDir = path.join(
      srcRoot,
      "frameworks-drivers/nextjs/composition",
    );
    try {
      readdirSync(compositionDir);
    } catch {
      return;
    }

    const patterns = [/@presentation/];
    const violations = collectViolations(
      filesInSubdir("frameworks-drivers/nextjs", "composition"),
      patterns,
    );
    expect(violations).toEqual([]);
  });

  it("nextjs/app は @presentation / composition / @interface のみ import 可能", () => {
    const appDir = path.join(srcRoot, "frameworks-drivers/nextjs/app");
    try {
      readdirSync(appDir);
    } catch {
      return;
    }

    const patterns = [/@application/, /@domain/, /@shared/, /@frameworks-drivers\/fake/];
    const violations = collectViolations(
      filesInSubdir("frameworks-drivers/nextjs", "app"),
      patterns,
    );
    expect(violations).toEqual([]);
  });
});
