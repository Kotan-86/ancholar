// 仕様: README.md ルール④
import { describe, expect, it } from "vitest";
import { Task } from "@domain/entities/Task.js";
import { TaskPlacementValidator } from "@domain/services/TaskPlacementValidator.js";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { Duration } from "@domain/value-objects/Duration.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";
import { ScheduledTimeBlock, ResizeReason } from "@domain/entities/ScheduledTimeBlock.js";
import { TimeRange } from "@domain/value-objects/TimeRange.js";

describe("TaskPlacementValidator", () => {
  const day = TimelineCalculator.buildDay(
    new Date("2026-06-21T21:00:00"),
    DEFAULT_LIFESTYLE_SETTINGS,
  );

  it("Work タスクの後ろ移動で WORK_TIME 終了超過は拒否", () => {
    const workEnd = day.getBlock(BlockId.WORK_TIME).timeRange.end;
    const task = Task.createWork({
      id: "1",
      title: "Task",
      description: "",
      blockId: BlockId.WORK_TIME,
      startTime: new Date("2026-06-22T09:00:00"),
      endTime: new Date("2026-06-22T10:00:00"),
      listName: "WORK TIME",
    });

    expect(() =>
      TaskPlacementValidator.validateWorkTaskMove(day, {
        task,
        newStart: new Date("2026-06-22T16:00:00"),
        newEnd: new Date(workEnd.getTime() + 60 * 60 * 1000),
      }),
    ).toThrow("Work task move exceeds WORK_TIME Hard Ceiling");
  });

  it("Floor 割れ操作は拒否", () => {
    const free = day.getBlock(BlockId.FREE_TIME);
    expect(() =>
      TaskPlacementValidator.validateBlockResize(
        free,
        Duration.fromMinutes(20),
        ResizeReason.Active,
      ),
    ).toThrow("FREE_TIME resize would break floor constraint");
  });

  it("FREE_TIME の Floor 割れ resize は ScheduledTimeBlock でも拒否", () => {
    const free = ScheduledTimeBlock.create(
      BlockId.FREE_TIME,
      TimeRange.of(new Date("2026-06-22T19:00:00"), new Date("2026-06-22T21:00:00")),
    );
    expect(() => free.resize(Duration.fromMinutes(20), ResizeReason.Active)).toThrow(
      "FREE_TIME duration is below floor",
    );
  });
});
