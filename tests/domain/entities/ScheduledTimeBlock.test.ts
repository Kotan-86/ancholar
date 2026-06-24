// 仕様: docs/error.md#4.1-ドメイン層（純粋な評価）
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
    expect(down.evaluateResize(Duration.fromMinutes(60), ResizeReason.Active)).toBe(
      "DURATION_FIXED",
    );
  });

  it("WALK_TIME の duration 変更を拒否", () => {
    const walk = block(BlockId.WALK_TIME, "2026-06-22T05:30:00", "2026-06-22T06:30:00");
    expect(walk.evaluateResize(Duration.fromMinutes(30), ResizeReason.Active)).toBe(
      "DURATION_FIXED",
    );
  });

  it("FOCUS_TIME を 9分に縮小すると拒否", () => {
    const focus = block(BlockId.FOCUS_TIME, "2026-06-22T06:30:00", "2026-06-22T08:00:00");
    expect(focus.evaluateResize(Duration.fromMinutes(9), ResizeReason.Active)).toBe("BELOW_FLOOR");
  });

  it("FREE_TIME を 29分に縮小すると拒否", () => {
    const free = block(BlockId.FREE_TIME, "2026-06-22T19:00:00", "2026-06-22T21:00:00");
    expect(free.evaluateResize(Duration.fromMinutes(29), ResizeReason.Active)).toBe("BELOW_FLOOR");
  });

  it("WORK_TIME を 0分にできる", () => {
    const work = block(BlockId.WORK_TIME, "2026-06-22T09:00:00", "2026-06-22T17:00:00");
    expect(work.evaluateResize(Duration.fromMinutes(0), ResizeReason.Active)).toBe("VALID");
    work.applyResize(Duration.fromMinutes(0), ResizeReason.Active);
    expect(work.duration().minutes).toBe(0);
  });
});
