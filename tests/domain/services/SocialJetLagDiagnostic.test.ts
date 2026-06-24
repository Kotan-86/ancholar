// 仕様: README.md ルール⑤
import { describe, expect, it } from "vitest";
import { SocialJetLagDiagnostic } from "@domain/services/SocialJetLagDiagnostic.js";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";

describe("SocialJetLagDiagnostic", () => {
  const previousDay = TimelineCalculator.buildDay(
    new Date("2026-06-20T21:00:00"),
    DEFAULT_LIFESTYLE_SETTINGS,
  );
  const day = TimelineCalculator.buildDay(
    new Date("2026-06-21T21:00:00"),
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
      new Date("2026-06-21T23:00:00"),
      DEFAULT_LIFESTYLE_SETTINGS,
    );
    const result = SocialJetLagDiagnostic.diagnose(shiftedDay, previousDay);
    expect(result.deltaMinutes).toBeGreaterThanOrEqual(60);
    expect(result.hasWarning).toBe(true);
  });

  it("前日との差 < 1h なら no warning", () => {
    const result = SocialJetLagDiagnostic.diagnose(day, previousDay);
    expect(result.hasWarning).toBe(false);
    expect(result.deltaMinutes).toBeLessThan(60);
  });
});
