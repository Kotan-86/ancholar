// 仕様: README.md ルール① DOWN TIME起点の動的タイムライン（Time Anchor）
import { describe, expect, it } from "vitest";
import { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { Task } from "@domain/entities/Task.js";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";

describe("ChronologicalDay", () => {
  it("anchor = DOWN TIME 開始", () => {
    const anchor = new Date("2026-06-21T21:00:00");
    const day = TimelineCalculator.buildDay(anchor, DEFAULT_LIFESTYLE_SETTINGS);
    expect(day.anchor.equals(day.anchor)).toBe(true);
    expect(day.getBlock(BlockId.DOWN_TIME).timeRange.start.getTime()).toBe(anchor.getTime());
  });

  it("7ブロックが依存順序で連結", () => {
    const day = TimelineCalculator.buildDay(
      new Date("2026-06-21T21:00:00"),
      DEFAULT_LIFESTYLE_SETTINGS,
    );
    expect(day.blocks.map((b) => b.blockId)).toEqual([
      BlockId.DOWN_TIME,
      BlockId.SLEEP_TIME,
      BlockId.WALK_TIME,
      BlockId.FOCUS_TIME,
      BlockId.WORK_TIME,
      BlockId.GRADATION_TIME,
      BlockId.FREE_TIME,
    ]);
  });

  it("総 duration が 23h〜25h", () => {
    const day = TimelineCalculator.buildDay(
      new Date("2026-06-21T21:00:00"),
      DEFAULT_LIFESTYLE_SETTINGS,
    );
    const total = day.totalDuration().minutes;
    expect(total).toBeGreaterThanOrEqual(23 * 60);
    expect(total).toBeLessThanOrEqual(25 * 60);
  });

  it("隣接ブロックの end === next start", () => {
    const day = TimelineCalculator.buildDay(
      new Date("2026-06-21T21:00:00"),
      DEFAULT_LIFESTYLE_SETTINGS,
    );
    for (let i = 0; i < day.blocks.length - 1; i++) {
      const current = day.blocks[i]!;
      const next = day.blocks[i + 1]!;
      expect(current.timeRange.end.getTime()).toBe(next.timeRange.start.getTime());
    }
  });

  it("Task は所属 blockId のブロックにのみ追加可能", () => {
    const day = TimelineCalculator.buildDay(
      new Date("2026-06-21T21:00:00"),
      DEFAULT_LIFESTYLE_SETTINGS,
    );
    const task = Task.createPrivate({
      id: "1",
      title: "Bath",
      description: "",
      blockId: BlockId.FREE_TIME,
      startTime: day.getBlock(BlockId.FREE_TIME).timeRange.start,
      listName: "FREE TIME",
      blockTimeRange: day.getBlock(BlockId.FREE_TIME).timeRange,
    });
    const withTask = day.addTask(task);
    expect(withTask.tasks).toHaveLength(1);
  });
});
