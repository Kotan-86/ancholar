// 仕様: README.md ルール①②
import { describe, expect, it } from "vitest";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";

describe("TimelineCalculator", () => {
  it("LifestyleSettings から ChronologicalDay を組み立てる", () => {
    const day = TimelineCalculator.buildDay(
      new Date("2026-06-21T21:00:00"),
      DEFAULT_LIFESTYLE_SETTINGS,
    );
    expect(day.blocks).toHaveLength(7);
  });

  it("WALK 終了〜WORK 開始の隙間で FOCUS が伸縮する", () => {
    const day = TimelineCalculator.buildDay(
      new Date("2026-06-21T21:00:00"),
      { ...DEFAULT_LIFESTYLE_SETTINGS, workStartHour: 10, workStartMinute: 0 },
    );
    const walk = day.getBlock(BlockId.WALK_TIME);
    const focus = day.getBlock(BlockId.FOCUS_TIME);
    const work = day.getBlock(BlockId.WORK_TIME);
    expect(focus.timeRange.start.getTime()).toBe(walk.timeRange.end.getTime());
    expect(focus.timeRange.end.getTime()).toBe(work.timeRange.start.getTime());
    expect(focus.duration().minutes).toBeGreaterThanOrEqual(10);
  });

  it("FOCUS < 10分になりそうなら DayAnchor を前倒しする", () => {
    const day = TimelineCalculator.buildDay(
      new Date("2026-06-21T21:00:00"),
      { ...DEFAULT_LIFESTYLE_SETTINGS, workStartHour: 6, workStartMinute: 35 },
    );
    const focus = day.getBlock(BlockId.FOCUS_TIME);
    expect(focus.duration().minutes).toBeGreaterThanOrEqual(10);
  });

  it("週次ビュー起点が土曜日", () => {
    const monday = new Date("2026-06-22T12:00:00");
    const weekStart = TimelineCalculator.getWeekStart(monday);
    expect(weekStart.getDay()).toBe(6);
    expect(weekStart.getDate()).toBe(20);
  });
});
