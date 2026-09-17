// 仕様: README.md#依存方向 / docs/spec/presentation-uc1.md#2-6-層依存の制約
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src",
);

const aliases: ReadonlyArray<readonly [string, string]> = [
  ["@presentation", "frameworks-drivers/presentation"],
  ["@frameworks-drivers", "frameworks-drivers"],
  ["@application", "application"],
  ["@interface", "interface"],
  ["@domain", "domain"],
  ["@shared", "shared"],
];

type Violation = {
  readonly file: string;
  readonly dependency: string;
};

function collectSourceFiles(relativeDirectory: string): string[] {
  const directory = path.join(srcRoot, relativeDirectory);
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(path.relative(srcRoot, fullPath));
    }
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
      ? [fullPath]
      : [];
  });
}

function extractModuleSpecifiers(source: string): string[] {
  const staticImportOrExport =
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\s+from\s*)?["']([^"']+)["']/g;
  const dynamicImport = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

  return [staticImportOrExport, dynamicImport].flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]!),
  );
}

function resolveInternalDependency(
  importer: string,
  specifier: string,
): string | null {
  const alias = aliases.find(
    ([name]) => specifier === name || specifier.startsWith(`${name}/`),
  );
  if (alias) {
    const [name, target] = alias;
    return path.posix.join(target, specifier.slice(name.length));
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const absoluteTarget = path.resolve(path.dirname(importer), specifier);
  const relativeTarget = path.relative(srcRoot, absoluteTarget);
  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    return null;
  }

  return relativeTarget.split(path.sep).join(path.posix.sep);
}

function isWithin(dependency: string, allowedRoot: string): boolean {
  return (
    dependency === allowedRoot || dependency.startsWith(`${allowedRoot}/`)
  );
}

function collectViolations(
  sourceDirectory: string,
  allowedRoots: readonly string[],
): Violation[] {
  return collectSourceFiles(sourceDirectory).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return extractModuleSpecifiers(source)
      .map((specifier) => resolveInternalDependency(file, specifier))
      .filter((dependency): dependency is string => dependency !== null)
      .filter(
        (dependency) =>
          !allowedRoots.some((allowedRoot) =>
            isWithin(dependency, allowedRoot),
          ),
      )
      .map((dependency) => ({
        file: path.relative(srcRoot, file),
        dependency,
      }));
  });
}

describe("LayerDependency", () => {
  it("domain は domain 内にだけ依存する", () => {
    expect(collectViolations("domain", ["domain"])).toEqual([]);
  });

  it("shared は shared 内にだけ依存する", () => {
    expect(collectViolations("shared", ["shared"])).toEqual([]);
  });

  it("interface は interface / domain / shared にだけ依存する", () => {
    expect(
      collectViolations("interface", ["interface", "domain", "shared"]),
    ).toEqual([]);
  });

  it("application は application / domain / interface / shared にだけ依存する", () => {
    expect(
      collectViolations("application", [
        "application",
        "domain",
        "interface",
        "shared",
      ]),
    ).toEqual([]);
  });

  it("fake は fake / interface / domain / shared にだけ依存する", () => {
    expect(
      collectViolations("frameworks-drivers/fake", [
        "frameworks-drivers/fake",
        "interface",
        "domain",
        "shared",
      ]),
    ).toEqual([]);
  });

  it("presentation は presentation / interface / domain / shared にだけ依存する", () => {
    expect(
      collectViolations("frameworks-drivers/presentation", [
        "frameworks-drivers/presentation",
        "interface",
        "domain",
        "shared",
      ]),
    ).toEqual([]);
  });

  it("nextjs/composition は内側の層と fake にだけ依存する", () => {
    expect(
      collectViolations("frameworks-drivers/nextjs/composition", [
        "frameworks-drivers/nextjs/composition",
        "frameworks-drivers/fake",
        "application",
        "interface",
        "domain",
        "shared",
      ]),
    ).toEqual([]);
  });

  it("nextjs/app は presentation / composition / interface にだけ依存する", () => {
    expect(
      collectViolations("frameworks-drivers/nextjs/app", [
        "frameworks-drivers/nextjs/app",
        "frameworks-drivers/nextjs/composition",
        "frameworks-drivers/presentation",
        "interface",
      ]),
    ).toEqual([]);
  });
});
