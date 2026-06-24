// 仕様: docs/application/usecase.md#UC-1
import { describe, expect, it } from "vitest";
import { ViolationCollector } from "@domain/services/ViolationCollector.js";
import { DayAssemblyService } from "@application/services/DayAssemblyService.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { createFakeTimelineRepository } from "../../helpers/createFakeTimelineRepository.js";
import { buildValidDay } from "../../helpers/buildValidDay.js";
import { buildWorkTask } from "../../helpers/buildWorkTask.js";

describe("DayAssemblyService", () => {
  const targetDate = new Date("2026-06-21T21:00:00");

  it("assembleDay は 7 ブロックの ChronologicalDay を組み立てる", async () => {
    const repo = createFakeTimelineRepository({ targetDate });
    const service = new DayAssemblyService(repo);

    const result = await service.assembleDay(targetDate);

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.blocks).toHaveLength(7);
      expect(result.value.tasks).toHaveLength(0);
    }
  });

  it("assembleDay は外部タスクを投入する", async () => {
    const workTask = buildWorkTask({ id: "ext-1" });
    const repo = createFakeTimelineRepository({
      targetDate,
      tasks: [
        {
          id: workTask.id,
          title: workTask.title,
          description: workTask.description,
          blockId: BlockId.WORK_TIME,
          accountKind: AccountKind.Work,
          startTime: workTask.startTime,
          endTime: workTask.endTime!,
          listName: workTask.listName,
        },
      ],
    });
    const service = new DayAssemblyService(repo);

    const result = await service.assembleDay(targetDate);

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.tasks).toHaveLength(1);
      expect(result.value.tasks[0]?.id).toBe("ext-1");
    }
  });

  it("evaluateTaskPlacement は Hard Ceiling 違反を検出する", () => {
    const chronologicalDay = buildValidDay();
    const workEnd = chronologicalDay.getBlock(BlockId.WORK_TIME).timeRange.end;

    const status = ViolationCollector.evaluateTaskPlacement(chronologicalDay, {
      id: "bad",
      title: "Bad Task",
      description: "",
      blockId: BlockId.WORK_TIME,
      accountKind: AccountKind.Work,
      startTime: new Date("2026-06-22T16:00:00"),
      endTime: new Date(workEnd.getTime() + 60 * 60 * 1000),
      listName: "WORK TIME",
    });

    expect(status).toBe("HARD_CEILING");
  });
});
