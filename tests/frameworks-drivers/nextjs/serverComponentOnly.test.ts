// 仕様: docs/spec/presentation-uc1.md#4-受入基準 (AC-7② / §2-7 Server Component のみ)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../src");

// node_modules と .next に当たらないよう、3つのディレクトリに限定する (feasibility-v4 G-2 / O-20)
const TARGET_DIRECTORIES = [
  "frameworks-drivers/nextjs/app",
  "frameworks-drivers/nextjs/composition",
  "frameworks-drivers/presentation",
];

function collect(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe("Server Component のみ (AC-7②)", () => {
  it.each(TARGET_DIRECTORIES)("%s の .ts / .tsx に \"use client\" が0件", (relative) => {
    const files = collect(path.join(srcRoot, relative));

    expect(files.length, "走査対象のファイルが1つ以上ある").toBeGreaterThan(0);
    const offenders = files.filter((f) =>
      /^\s*["']use client["']/m.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("TimelineError など新設コンポーネントも走査に含まれる(presentation/components)", () => {
    const files = collect(path.join(srcRoot, "frameworks-drivers/presentation/components"));
    expect(files.some((f) => f.endsWith("DailyTimeline.tsx"))).toBe(true);
  });
});
