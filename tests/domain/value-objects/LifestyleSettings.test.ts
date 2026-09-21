// 仕様: docs/spec/day-duration.md#受入基準 (A-10)
import { describe, expect, it } from "vitest";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";
import { getTimeBlockSpec } from "@domain/value-objects/TimeBlockSpec.js";

describe("DEFAULT_LIFESTYLE_SETTINGS", () => {
  // 仕様: docs/spec/day-duration.md#受入基準 A-10
  it("既定の生活設定は 始業 08:30 / WORK 570 分 / SLEEP 450 分 (A-10)", () => {
    expect(DEFAULT_LIFESTYLE_SETTINGS.workStartHour).toBe(8);
    expect(DEFAULT_LIFESTYLE_SETTINGS.workStartMinute).toBe(30);
    expect(DEFAULT_LIFESTYLE_SETTINGS.workDurationMinutes).toBe(570);
    expect(DEFAULT_LIFESTYLE_SETTINGS.sleepDurationMinutes).toBe(450);
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-10（同じ意味の標準値が食い違わない）
  it("SLEEP の標準が TimeBlockSpec と LifestyleSettings で食い違わない (A-10)", () => {
    expect(DEFAULT_LIFESTYLE_SETTINGS.sleepDurationMinutes).toBe(
      getTimeBlockSpec(BlockId.SLEEP_TIME).defaultDuration?.minutes,
    );
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-10（FREE の標準値はどのコードも読まないため、この検査が唯一の根拠）
  it("標準の内訳の単純合計が 1440 分になる (A-10)", () => {
    const d = (id: BlockId) => getTimeBlockSpec(id).defaultDuration!.minutes;
    const total =
      d(BlockId.DOWN_TIME) +
      d(BlockId.SLEEP_TIME) +
      d(BlockId.WALK_TIME) +
      d(BlockId.FOCUS_TIME) +
      DEFAULT_LIFESTYLE_SETTINGS.workDurationMinutes +
      d(BlockId.GRADATION_TIME) +
      d(BlockId.FREE_TIME);
    expect(total).toBe(1440);
  });
});
