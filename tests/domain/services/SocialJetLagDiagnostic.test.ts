// 仕様: README.md ルール⑤
// 仕様: docs/spec/day-duration.md#制約・関連機能
import { describe, expect, it } from "vitest";
import { SocialJetLagDiagnostic } from "@domain/services/SocialJetLagDiagnostic.js";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";

describe("SocialJetLagDiagnostic", () => {
  const previousDay = TimelineCalculator.buildDay(
    new Date("2026-06-20T20:30:00"),
    DEFAULT_LIFESTYLE_SETTINGS,
  );
  const day = TimelineCalculator.buildDay(
    new Date("2026-06-21T20:30:00"),
    DEFAULT_LIFESTYLE_SETTINGS,
  );

  it("MidSleepTime = Bedtime + SleepDuration/2", () => {
    const sleep = day.getBlock(BlockId.SLEEP_TIME);
    const bedtime = sleep.timeRange.start;
    const wake = sleep.timeRange.end;
    const expected = new Date(
      bedtime.getTime() + (wake.getTime() - bedtime.getTime()) / 2,
    );
    const result = SocialJetLagDiagnostic.diagnose(day, previousDay);
    expect(result.midSleepTime.getTime()).toBe(expected.getTime());
  });

  it("前日との差 >= 1h で warning", () => {
    const shiftedDay = TimelineCalculator.buildDay(
      new Date("2026-06-21T21:45:00"),
      DEFAULT_LIFESTYLE_SETTINGS,
    );
    const result = SocialJetLagDiagnostic.diagnose(shiftedDay, previousDay);
    expect(result.deltaMinutes).toBe(75);
    expect(result.deltaMinutes).toBeGreaterThanOrEqual(60);
    expect(result.hasWarning).toBe(true);
  });

  // 仕様: docs/spec/day-duration.md#制約・関連機能（F-2 の再発防止）
  it("ずらした日（起点 21:45）が成立する日である（FOCUS >= 10、全ブロック start <= end）", () => {
    const shiftedDay = TimelineCalculator.buildDay(
      new Date("2026-06-21T21:45:00"),
      DEFAULT_LIFESTYLE_SETTINGS,
    );
    const walk = shiftedDay.getBlock(BlockId.WALK_TIME);
    expect(walk.timeRange.end).toEqual(new Date("2026-06-22T08:15:00"));
    expect(shiftedDay.getBlock(BlockId.FOCUS_TIME).duration().minutes).toBe(15);
    for (const b of shiftedDay.blocks) {
      expect(b.timeRange.start.getTime()).toBeLessThanOrEqual(b.timeRange.end.getTime());
    }
  });

  it("前日との差 < 1h なら no warning", () => {
    const result = SocialJetLagDiagnostic.diagnose(day, previousDay);
    expect(result.hasWarning).toBe(false);
    expect(result.deltaMinutes).toBeLessThan(60);
  });
});
