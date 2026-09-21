// 仕様: README.md ルール①②
// 仕様: docs/spec/day-duration.md#受入基準
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

  const at = (s: string) => new Date(`2026-${s}`);
  const ANCHOR = at("06-21T20:30:00");

  // 仕様: docs/spec/day-duration.md#受入基準 A-2（表 §4-2 からのリテラル）
  it.each([
    [BlockId.DOWN_TIME, "06-21T20:30:00", "06-21T22:00:00", 90],
    [BlockId.SLEEP_TIME, "06-21T22:00:00", "06-22T05:30:00", 450],
    [BlockId.WALK_TIME, "06-22T05:30:00", "06-22T07:00:00", 90],
    [BlockId.FOCUS_TIME, "06-22T07:00:00", "06-22T08:30:00", 90],
    [BlockId.WORK_TIME, "06-22T08:30:00", "06-22T18:00:00", 570],
    [BlockId.GRADATION_TIME, "06-22T18:00:00", "06-22T19:00:00", 60],
    [BlockId.FREE_TIME, "06-22T19:00:00", "06-22T20:30:00", 90],
  ])("標準シナリオ: %s の開始・終了・長さが表と一致する (A-2)", (id, start, end, minutes) => {
    const day = TimelineCalculator.buildDay(ANCHOR, DEFAULT_LIFESTYLE_SETTINGS);
    const block = day.getBlock(id);
    expect(block.timeRange.start.getTime()).toBe(at(start).getTime());
    expect(block.timeRange.end.getTime()).toBe(at(end).getTime());
    expect(block.duration().minutes).toBe(minutes);
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-2
  it("標準シナリオ: 7ブロックの順序が保たれ隣接ブロックが連続する (A-2)", () => {
    const day = TimelineCalculator.buildDay(ANCHOR, DEFAULT_LIFESTYLE_SETTINGS);
    expect(day.blocks.map((b) => b.blockId)).toEqual([
      BlockId.DOWN_TIME,
      BlockId.SLEEP_TIME,
      BlockId.WALK_TIME,
      BlockId.FOCUS_TIME,
      BlockId.WORK_TIME,
      BlockId.GRADATION_TIME,
      BlockId.FREE_TIME,
    ]);
    for (let i = 0; i < day.blocks.length - 1; i++) {
      expect(day.blocks[i]!.timeRange.end.getTime()).toBe(
        day.blocks[i + 1]!.timeRange.start.getTime(),
      );
    }
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-3
  it("標準シナリオ: 1日の終端が起点の翌日の同時刻（翌 20:30）になる (A-3)", () => {
    const day = TimelineCalculator.buildDay(ANCHOR, DEFAULT_LIFESTYLE_SETTINGS);
    const end = day.blocks[day.blocks.length - 1]!.timeRange.end;
    expect(end.getTime()).toBe(at("06-22T20:30:00").getTime());
    expect(end.getTime() - ANCHOR.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-5
  it("始業 09:00 の日は総時間 1440 のまま FOCUS/WORK/GRADATION/FREE が押し出される (A-5)", () => {
    const day = TimelineCalculator.buildDay(ANCHOR, {
      ...DEFAULT_LIFESTYLE_SETTINGS,
      workStartHour: 9,
      workStartMinute: 0,
    });
    const expected: [BlockId, string, string, number][] = [
      [BlockId.FOCUS_TIME, "06-22T07:00:00", "06-22T09:00:00", 120],
      [BlockId.WORK_TIME, "06-22T09:00:00", "06-22T18:30:00", 570],
      [BlockId.GRADATION_TIME, "06-22T18:30:00", "06-22T19:30:00", 60],
      [BlockId.FREE_TIME, "06-22T19:30:00", "06-22T20:30:00", 60],
    ];
    for (const [id, start, end, minutes] of expected) {
      const block = day.getBlock(id);
      expect(block.timeRange.start.getTime()).toBe(at(start).getTime());
      expect(block.timeRange.end.getTime()).toBe(at(end).getTime());
      expect(block.duration().minutes).toBe(minutes);
    }
    expect(day.totalDuration().minutes).toBe(1440);
    expect(day.getBlock(BlockId.FREE_TIME).duration().minutes).toBeGreaterThanOrEqual(30);
  });

  // 仕様: docs/spec/day-duration.md#受入基準 （AC外・ルール②の既存検査。始業 10:00 → 09:00）
  it("WALK 終了〜WORK 開始の隙間で FOCUS が伸縮する", () => {
    const day = TimelineCalculator.buildDay(ANCHOR, {
      ...DEFAULT_LIFESTYLE_SETTINGS,
      workStartHour: 9,
      workStartMinute: 0,
    });
    const walk = day.getBlock(BlockId.WALK_TIME);
    const focus = day.getBlock(BlockId.FOCUS_TIME);
    const work = day.getBlock(BlockId.WORK_TIME);
    expect(focus.timeRange.start.getTime()).toBe(walk.timeRange.end.getTime());
    expect(focus.timeRange.end.getTime()).toBe(work.timeRange.start.getTime());
    expect(focus.duration().minutes).toBeGreaterThanOrEqual(10);
    expect(focus.duration().minutes).toBe(120);
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-7
  it("FOCUS < 10分になる設定では起点を前倒しし、FOCUS 10分・総時間 1440・DOWN 90・WALK 90 を保つ (A-7)", () => {
    const day = TimelineCalculator.buildDay(ANCHOR, {
      ...DEFAULT_LIFESTYLE_SETTINGS,
      workStartHour: 7,
      workStartMinute: 5,
    });
    expect(day.anchor.value.getTime()).toBe(at("06-21T20:25:00").getTime());
    const focus = day.getBlock(BlockId.FOCUS_TIME);
    expect(focus.timeRange.start.getTime()).toBe(at("06-22T06:55:00").getTime());
    expect(focus.timeRange.end.getTime()).toBe(at("06-22T07:05:00").getTime());
    expect(focus.duration().minutes).toBe(10);
    expect(day.totalDuration().minutes).toBe(1440);
    expect(day.getBlock(BlockId.DOWN_TIME).duration().minutes).toBe(90);
    expect(day.getBlock(BlockId.WALK_TIME).duration().minutes).toBe(90);
  });

  // 仕様: docs/spec/day-duration.md#受入基準 （AC外・境界値）
  it("境界: 始業 07:10 では前倒しが起きず FOCUS ちょうど 10 分", () => {
    const day = TimelineCalculator.buildDay(ANCHOR, {
      ...DEFAULT_LIFESTYLE_SETTINGS,
      workStartHour: 7,
      workStartMinute: 10,
    });
    expect(day.anchor.value.getTime()).toBe(ANCHOR.getTime());
    expect(day.getBlock(BlockId.FOCUS_TIME).duration().minutes).toBe(10);
  });

  // 仕様: docs/spec/day-duration.md#受入基準 （AC外・境界値。A-5 の対象上限）
  it("境界: 始業 09:30 で FREE が Floor ちょうどの 30分になり総時間 1440", () => {
    const day = TimelineCalculator.buildDay(ANCHOR, {
      ...DEFAULT_LIFESTYLE_SETTINGS,
      workStartHour: 9,
      workStartMinute: 30,
    });
    expect(day.getBlock(BlockId.FREE_TIME).duration().minutes).toBe(30);
    expect(day.totalDuration().minutes).toBe(1440);
  });

  it("週次ビュー起点が土曜日", () => {
    const monday = new Date("2026-06-22T12:00:00");
    const weekStart = TimelineCalculator.getWeekStart(monday);
    expect(weekStart.getDay()).toBe(6);
    expect(weekStart.getDate()).toBe(20);
  });
});
