// 仕様: README.md ルール⑤
import { describe, expect, it } from "vitest";
import { SocialJetLagDiagnostic } from "@domain/services/SocialJetLagDiagnostic.js";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";

describe("SocialJetLagDiagnostic", () => {
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
    const result = SocialJetLagDiagnostic.diagnose(day, expected);
    expect(result.midSleepTime.getTime()).toBe(expected.getTime());
  });

  it("テンプレートとの差 >= 1h で warning", () => {
    const sleep = day.getBlock(BlockId.SLEEP_TIME);
    const bedtime = sleep.timeRange.start;
    const wake = sleep.timeRange.end;
    const midSleep = new Date(
      bedtime.getTime() + (wake.getTime() - bedtime.getTime()) / 2,
    );
    const farTemplate = new Date(midSleep.getTime() - 2 * 60 * 60 * 1000);
    const result = SocialJetLagDiagnostic.diagnose(day, farTemplate);
    expect(result.deltaMinutes).toBeGreaterThanOrEqual(60);
    expect(result.hasWarning).toBe(true);
  });

  it("差 < 1h なら no warning", () => {
    const sleep = day.getBlock(BlockId.SLEEP_TIME);
    const bedtime = sleep.timeRange.start;
    const wake = sleep.timeRange.end;
    const midSleep = new Date(
      bedtime.getTime() + (wake.getTime() - bedtime.getTime()) / 2,
    );
    const result = SocialJetLagDiagnostic.diagnose(day, midSleep);
    expect(result.hasWarning).toBe(false);
    expect(result.deltaMinutes).toBeLessThan(60);
  });
});
