// 仕様: README.md §② / ルール③④
import { describe, expect, it } from "vitest";
import { Task } from "@domain/entities/Task.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { TimeRange } from "@domain/value-objects/TimeRange.js";

describe("Task", () => {
  const workRange = TimeRange.of(
    new Date("2026-06-22T09:00:00"),
    new Date("2026-06-22T17:00:00"),
  );

  it("Work + WORK_TIME: endTime 必須", () => {
    expect(() =>
      Task.createWork({
        id: "1",
        title: "Research",
        description: "",
        blockId: BlockId.WORK_TIME,
        startTime: new Date("2026-06-22T09:00:00"),
        endTime: new Date("2026-06-22T10:00:00"),
        listName: "WORK TIME",
      }),
    ).not.toThrow();
  });

  it("Work + WORK_TIME: shouldPlotOnGrid === true", () => {
    const task = Task.createWork({
      id: "1",
      title: "Research",
      description: "",
      blockId: BlockId.WORK_TIME,
      startTime: new Date("2026-06-22T09:00:00"),
      endTime: new Date("2026-06-22T10:00:00"),
      listName: "WORK TIME",
    });
    expect(task.shouldPlotOnGrid).toBe(true);
  });

  it("Private + FREE_TIME: endTime を持たない", () => {
    const task = Task.createPrivate({
      id: "2",
      title: "Bath",
      description: "",
      blockId: BlockId.FREE_TIME,
      startTime: new Date("2026-06-22T20:00:00"),
      listName: "FREE TIME",
      blockTimeRange: TimeRange.of(
        new Date("2026-06-22T19:00:00"),
        new Date("2026-06-22T21:00:00"),
      ),
    });
    expect(task.endTime).toBeNull();
  });

  it("Private: shouldPlotOnGrid === false", () => {
    const task = Task.createPrivate({
      id: "2",
      title: "Bath",
      description: "",
      blockId: BlockId.FREE_TIME,
      startTime: new Date("2026-06-22T20:00:00"),
      listName: "FREE TIME",
      blockTimeRange: TimeRange.of(
        new Date("2026-06-22T19:00:00"),
        new Date("2026-06-22T21:00:00"),
      ),
    });
    expect(task.shouldPlotOnGrid).toBe(false);
  });

  it("Private: startTime が Block 有効枠外なら拒否", () => {
    expect(() =>
      Task.createPrivate({
        id: "2",
        title: "Bath",
        description: "",
        blockId: BlockId.FREE_TIME,
        startTime: new Date("2026-06-22T21:30:00"),
        listName: "FREE TIME",
        blockTimeRange: TimeRange.of(
          new Date("2026-06-22T19:00:00"),
          new Date("2026-06-22T21:00:00"),
        ),
      }),
    ).toThrow("Private task startTime must be within block time range");
  });

  it("Work: タスク endTime が WORK_TIME 終了を超えると拒否", () => {
    const task = Task.createWork({
      id: "1",
      title: "Research",
      description: "",
      blockId: BlockId.WORK_TIME,
      startTime: new Date("2026-06-22T09:00:00"),
      endTime: new Date("2026-06-22T16:00:00"),
      listName: "WORK TIME",
    });
    expect(() => task.validateWithinWorkTimeBoundary(workRange)).not.toThrow();

    const overTask = Task.createWork({
      id: "2",
      title: "Overflow",
      description: "",
      blockId: BlockId.WORK_TIME,
      startTime: new Date("2026-06-22T16:00:00"),
      endTime: new Date("2026-06-22T18:00:00"),
      listName: "WORK TIME",
    });
    expect(() => overTask.validateWithinWorkTimeBoundary(workRange)).toThrow(
      "Work task exceeds WORK_TIME Hard Ceiling",
    );
  });

  it("blockId と listName の一致（ルール③）", () => {
    expect(() =>
      Task.createWork({
        id: "1",
        title: "Research",
        description: "",
        blockId: BlockId.WORK_TIME,
        startTime: new Date("2026-06-22T09:00:00"),
        endTime: new Date("2026-06-22T10:00:00"),
        listName: "FREE TIME",
      }),
    ).toThrow("List name FREE TIME does not match blockId WORK_TIME");
  });
});
