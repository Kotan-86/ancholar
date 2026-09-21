// 仕様: docs/spec/presentation-uc1.md#2-3-4-配色と文字色の対応表 (AC-10 / AC-11 / AC-18④)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  TASK_SURFACE_CLASS_NAME,
  TIMELINE_ERROR_CLASS_NAME,
  blockSurfaceClassName,
} from "@presentation/styles/timelineTheme.js";

const tokens = (s: string): string[] => s.split(/\s+/).filter(Boolean);

describe("blockSurfaceClassName (AC-10 / AC-11)", () => {
  it.each([
    ["DOWN_TIME", "bg-indigo-300", "text-slate-900"],
    ["SLEEP_TIME", "bg-purple-700", "text-white"],
    ["WALK_TIME", "bg-amber-800", "text-white"],
    ["FOCUS_TIME", "bg-red-800", "text-white"],
    ["GRADATION_TIME", "bg-emerald-700", "text-white"],
    ["FREE_TIME", "bg-blue-700", "text-white"],
  ])("%s は %s と %s", (blockId, bg, text) => {
    const t = tokens(blockSurfaceClassName(blockId));
    expect(t).toContain(bg);
    expect(t).toContain(text);
  });

  it("DOWN_TIME だけが暗色文字。他は text-white で text-slate-900 を持たない (Q-14)", () => {
    expect(tokens(blockSurfaceClassName("DOWN_TIME"))).not.toContain("text-white");
    for (const id of ["SLEEP_TIME", "WALK_TIME", "FOCUS_TIME", "GRADATION_TIME", "FREE_TIME"]) {
      expect(tokens(blockSurfaceClassName(id))).not.toContain("text-slate-900");
    }
  });

  it("6ブロックの背景色は互いに異なり、タスク面の色とも異なる (AC-10)", () => {
    const bgs = [
      "DOWN_TIME", "SLEEP_TIME", "WALK_TIME", "FOCUS_TIME", "GRADATION_TIME", "FREE_TIME",
    ].map((id) => tokens(blockSurfaceClassName(id)).find((t) => t.startsWith("bg-")));
    expect(new Set(bgs).size).toBe(6);
    expect(bgs).not.toContain("bg-[#6e72c3]");
  });

  it("対応表にない blockId は既定色 bg-slate-600 + text-white", () => {
    const t = tokens(blockSurfaceClassName("UNKNOWN_BLOCK"));
    expect(t).toContain("bg-slate-600");
    expect(t).toContain("text-white");
  });

  it("同じ blockId は常に同じ結果 (日付やデータに依存しない)", () => {
    expect(blockSurfaceClassName("FREE_TIME")).toBe(blockSurfaceClassName("FREE_TIME"));
  });
});

describe("TASK_SURFACE_CLASS_NAME (AC-10 / AC-11)", () => {
  it("bg-[#6e72c3] と明色文字", () => {
    const t = tokens(TASK_SURFACE_CLASS_NAME);
    expect(t).toContain("bg-[#6e72c3]");
    expect(t).toContain("text-white");
  });
});

describe("TIMELINE_ERROR_CLASS_NAME (AC-18④)", () => {
  it("暗色背景 bg-red-950・明色文字 text-red-100・枠線 border-red-800", () => {
    const t = tokens(TIMELINE_ERROR_CLASS_NAME);
    expect(t).toContain("bg-red-950");
    expect(t).toContain("text-red-100");
    expect(t).toContain("border-red-800");
    expect(t).not.toContain("bg-red-50");
  });
});

describe("対応表は静的な文字列リテラルだけで書かれる (§3-3)", () => {
  const source = readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../src/frameworks-drivers/presentation/styles/timelineTheme.ts",
    ),
    "utf8",
  );

  it("テンプレートリテラルの補間・インライン style を使わない", () => {
    expect(source).not.toMatch(/\$\{/);
    expect(source).not.toMatch(/\bstyle\s*[=:]/);
  });
});
