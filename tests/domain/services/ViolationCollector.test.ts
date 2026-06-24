// 仕様: docs/application/usecase.md#UC-3 / テスト用ヘルパー
import { describe, expect, it } from "vitest";
import { ViolationCollector } from "@domain/services/ViolationCollector.js";
import { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { buildValidDay } from "../../helpers/buildValidDay.js";
import { buildWorkTask } from "../../helpers/buildWorkTask.js";
import { buildPrivateTask } from "../../helpers/buildPrivateTask.js";

describe("ViolationCollector", () => {
  it("違反のない日は空配列を返す", () => {
    const day = buildValidDay().addTask(buildWorkTask());
    expect(ViolationCollector.collectViolations(day)).toEqual([]);
  });

  it("Hard Ceiling 突破タスクを検出する", () => {
    const day = buildValidDay();
    const workEnd = day.getBlock(BlockId.WORK_TIME).timeRange.end;
    const violatingTask = buildWorkTask({
      id: "violating",
      startTime: new Date("2026-06-22T09:00:00"),
      endTime: new Date(workEnd.getTime() + 30 * 60 * 1000),
    });
    const dayWithTask = ChronologicalDay.reconstitute(day.anchor, day.blocks, [violatingTask]);

    const findings = ViolationCollector.collectViolations(dayWithTask);
    expect(findings).toContainEqual({
      targetId: "violating",
      targetTitle: violatingTask.title,
      kind: "HARD_CEILING",
    });
  });

  it("evaluateTaskPlacement は Hard Ceiling 違反を検出する", () => {
    const day = buildValidDay();
    const workEnd = day.getBlock(BlockId.WORK_TIME).timeRange.end;

    const status = ViolationCollector.evaluateTaskPlacement(day, {
      id: "bad",
      title: "Bad Task",
      listName: "WORK TIME",
      blockId: BlockId.WORK_TIME,
      accountKind: AccountKind.Work,
      startTime: new Date("2026-06-22T16:00:00"),
      endTime: new Date(workEnd.getTime() + 60 * 60 * 1000),
    });

    expect(status).toBe("HARD_CEILING");
  });

  it("リスト名不一致を INVALID_MAPPING として検出する", () => {
    const day = buildValidDay();
    const validTask = buildWorkTask({ id: "bad-mapping" });
    const taskWithBadMapping = Object.assign(
      Object.create(Object.getPrototypeOf(validTask)),
      validTask,
      { listName: "FREE TIME" },
    );
    const dayWithTask = ChronologicalDay.reconstitute(day.anchor, day.blocks, [taskWithBadMapping]);

    const findings = ViolationCollector.collectViolations(dayWithTask);
    expect(findings).toContainEqual({
      targetId: "bad-mapping",
      targetTitle: validTask.title,
      kind: "INVALID_MAPPING",
    });
  });

  it("プライベートタスクの枠外配置を INVALID_MAPPING として検出する", () => {
    const day = buildValidDay();
    const validPrivate = buildPrivateTask({ id: "out-of-block" });
    const free = day.getBlock(BlockId.FREE_TIME);
    const outOfBlock = Object.assign(
      Object.create(Object.getPrototypeOf(validPrivate)),
      validPrivate,
      { startTime: new Date(free.timeRange.end.getTime() + 60 * 60 * 1000) },
    );
    const dayWithTask = ChronologicalDay.reconstitute(day.anchor, day.blocks, [outOfBlock]);

    const findings = ViolationCollector.collectViolations(dayWithTask);
    expect(findings).toContainEqual({
      targetId: "out-of-block",
      targetTitle: validPrivate.title,
      kind: "INVALID_MAPPING",
    });
  });
});
