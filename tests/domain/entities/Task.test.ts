// 仕様: docs/error.md#4.1-ドメイン層（純粋な評価）
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
    expect(
      Task.evaluateCreateWork({
        id: "1",
        title: "Research",
        description: "",
        blockId: BlockId.WORK_TIME,
        startTime: new Date("2026-06-22T09:00:00"),
        endTime: new Date("2026-06-22T10:00:00"),
        listName: "WORK TIME",
      }),
    ).toBe("VALID");
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
    expect(
      Task.evaluateCreatePrivate({
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
    ).toBe("OUTSIDE_BLOCK_RANGE");
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
    expect(task.evaluateWithinWorkTimeBoundary(workRange)).toBe("VALID");

    const overTask = Task.createWork({
      id: "2",
      title: "Overflow",
      description: "",
      blockId: BlockId.WORK_TIME,
      startTime: new Date("2026-06-22T16:00:00"),
      endTime: new Date("2026-06-22T18:00:00"),
      listName: "WORK TIME",
    });
    expect(overTask.evaluateWithinWorkTimeBoundary(workRange)).toBe("EXCEEDS_HARD_CEILING");
  });

  it("blockId と listName の一致（ルール③）", () => {
    expect(
      Task.evaluateCreateWork({
        id: "1",
        title: "Research",
        description: "",
        blockId: BlockId.WORK_TIME,
        startTime: new Date("2026-06-22T09:00:00"),
        endTime: new Date("2026-06-22T10:00:00"),
        listName: "FREE TIME",
      }),
    ).toBe("INVALID_LIST_NAME_MAPPING");
  });
});
