// 仕様: docs/application/usecase.md#UC-1
import { describe, expect, it } from "vitest";
import { GetDailyTimelineUseCase } from "@application/usecases/GetDailyTimelineUseCase.js";
import { DayAssemblyService } from "@application/services/DayAssemblyService.js";
import { SocialJetLagEvaluationService } from "@application/services/SocialJetLagEvaluationService.js";
import { TimelineEnrichmentService } from "@application/services/TimelineEnrichmentService.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { createFakeTimelineRepository } from "../../helpers/createFakeTimelineRepository.js";
import { buildWorkTask } from "../../helpers/buildWorkTask.js";
import { buildValidDay } from "../../helpers/buildValidDay.js";

describe("GetDailyTimelineUseCase", () => {
  const targetDate = new Date("2026-06-21T21:00:00");

  function createUseCase(repo = createFakeTimelineRepository({ targetDate })) {
    const dayAssembly = new DayAssemblyService(repo);
    const socialJetLag = new SocialJetLagEvaluationService(repo);
    const timelineEnrichment = new TimelineEnrichmentService(dayAssembly, socialJetLag);
    return new GetDailyTimelineUseCase(timelineEnrichment);
  }

  it("7 ブロックとタスクマッピング成功時に TimelineDTO を返す", async () => {
    const workTask = buildWorkTask({ id: "task-1" });
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

    const result = await createUseCase(repo).execute({ targetDate });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.blocks).toHaveLength(7);
      const workBlock = result.value.blocks.find((b) => b.blockId === BlockId.WORK_TIME);
      expect(workBlock?.tasks).toHaveLength(1);
      expect(result.value.violations).toBeUndefined();
    }
  });

  it("リスト名不一致のタスクはスキップし INVALID_MAPPING 警告を返す", async () => {
    const workTask = buildWorkTask({ id: "bad-mapping" });
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
          listName: "FREE TIME",
        },
      ],
    });

    const result = await createUseCase(repo).execute({ targetDate });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      const workBlock = result.value.blocks.find((b) => b.blockId === BlockId.WORK_TIME);
      expect(workBlock?.tasks).toHaveLength(0);
      expect(result.value.violations).toEqual([
        expect.objectContaining({
          targetId: "bad-mapping",
          violationType: "INVALID_MAPPING",
        }),
      ]);
    }
  });

  it("Hard Ceiling 突破タスクはスキップし警告付き DTO を返す", async () => {
    const day = buildValidDay();
    const workEnd = day.getBlock(BlockId.WORK_TIME).timeRange.end;
    const repo = createFakeTimelineRepository({
      targetDate,
      tasks: [
        {
          id: "ceiling-breach",
          title: "Late Meeting",
          description: "",
          blockId: BlockId.WORK_TIME,
          accountKind: AccountKind.Work,
          startTime: new Date("2026-06-22T16:00:00"),
          endTime: new Date(workEnd.getTime() + 60 * 60 * 1000),
          listName: "WORK TIME",
        },
      ],
    });

    const result = await createUseCase(repo).execute({ targetDate });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.violations).toEqual([
        expect.objectContaining({
          targetId: "ceiling-breach",
          violationType: "HARD_CEILING_EXCEEDED",
        }),
      ]);
    }
  });
});
