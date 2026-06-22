// 仕様: docs/error.md#4.1-ドメイン層（純粋な評価）
import { describe, expect, it } from "vitest";
import { ScheduledTimeBlock, ResizeReason } from "@domain/entities/ScheduledTimeBlock.js";
import { TaskPlacementValidator } from "@domain/services/TaskPlacementValidator.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { Duration } from "@domain/value-objects/Duration.js";
import { TimeRange } from "@domain/value-objects/TimeRange.js";
import { buildValidDay } from "../../helpers/buildValidDay.js";
import { buildWorkTask } from "../../helpers/buildWorkTask.js";

describe("TaskPlacementValidator", () => {
  const day = buildValidDay();

  it("Work タスクの後ろ移動で WORK_TIME 終了超過は拒否", () => {
    const workEnd = day.getBlock(BlockId.WORK_TIME).timeRange.end;
    const task = buildWorkTask();

    const status = TaskPlacementValidator.evaluateWorkTaskMove(day, {
      task,
      newStart: new Date("2026-06-22T16:00:00"),
      newEnd: new Date(workEnd.getTime() + 60 * 60 * 1000),
    });

    expect(status).toBe("EXCEEDS_HARD_CEILING");
  });

  it("Floor 割れ操作は拒否", () => {
    const free = day.getBlock(BlockId.FREE_TIME);
    const status = TaskPlacementValidator.evaluateBlockResize(
      free,
      Duration.fromMinutes(20),
      ResizeReason.Active,
    );
    expect(status).toBe("BELOW_FLOOR");
  });

  it("FREE_TIME の Floor 割れ resize は ScheduledTimeBlock でも拒否", () => {
    const free = ScheduledTimeBlock.create(
      BlockId.FREE_TIME,
      TimeRange.of(new Date("2026-06-22T19:00:00"), new Date("2026-06-22T21:00:00")),
    );
    expect(free.evaluateResize(Duration.fromMinutes(20), ResizeReason.Active)).toBe("BELOW_FLOOR");
  });
});
