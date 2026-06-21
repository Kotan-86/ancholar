// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
import { describe, expect, it } from "vitest";
import { ScheduledTimeBlock } from "@domain/entities/ScheduledTimeBlock.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { Duration } from "@domain/value-objects/Duration.js";
import { TimeRange } from "@domain/value-objects/TimeRange.js";
import { ResizeReason } from "@domain/entities/ScheduledTimeBlock.js";

function block(blockId: typeof BlockId.DOWN_TIME, start: string, end: string): ScheduledTimeBlock {
  return ScheduledTimeBlock.create(
    blockId,
    TimeRange.of(new Date(start), new Date(end)),
  );
}

describe("ScheduledTimeBlock", () => {
  it("DOWN_TIME を短縮しようとすると拒否", () => {
    const down = block(BlockId.DOWN_TIME, "2026-06-21T21:00:00", "2026-06-21T22:30:00");
    expect(() => down.resize(Duration.fromMinutes(60), ResizeReason.Active)).toThrow(
      "DOWN_TIME duration cannot be changed",
    );
  });

  it("WALK_TIME の duration 変更を拒否", () => {
    const walk = block(BlockId.WALK_TIME, "2026-06-22T05:30:00", "2026-06-22T06:30:00");
    expect(() => walk.resize(Duration.fromMinutes(30), ResizeReason.Active)).toThrow(
      "WALK_TIME duration cannot be changed",
    );
  });

  it("FOCUS_TIME を 9分に縮小すると拒否", () => {
    const focus = block(BlockId.FOCUS_TIME, "2026-06-22T06:30:00", "2026-06-22T08:00:00");
    expect(() => focus.resize(Duration.fromMinutes(9), ResizeReason.Active)).toThrow(
      "FOCUS_TIME duration is below floor",
    );
  });

  it("FREE_TIME を 29分に縮小すると拒否", () => {
    const free = block(BlockId.FREE_TIME, "2026-06-22T19:00:00", "2026-06-22T21:00:00");
    expect(() => free.resize(Duration.fromMinutes(29), ResizeReason.Active)).toThrow(
      "FREE_TIME duration is below floor",
    );
  });

  it("WORK_TIME を 0分にできる", () => {
    const work = block(BlockId.WORK_TIME, "2026-06-22T09:00:00", "2026-06-22T17:00:00");
    expect(() => work.resize(Duration.fromMinutes(0), ResizeReason.Active)).not.toThrow();
    expect(work.duration().minutes).toBe(0);
  });
});
