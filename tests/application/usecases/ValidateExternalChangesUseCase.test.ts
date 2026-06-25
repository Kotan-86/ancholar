// 仕様: docs/application/usecase.md#UC-3
import { describe, expect, it } from "vitest";
import { ValidateExternalChangesUseCase } from "@application/usecases/ValidateExternalChangesUseCase.js";
import { DayAssemblyService } from "@application/services/DayAssemblyService.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { FakeExternalChangeRepository } from "@frameworks-drivers/fake/FakeExternalChangeRepository.js";
import { createFakeTimelineRepository } from "../../helpers/createFakeTimelineRepository.js";
import { buildValidDay } from "../../helpers/buildValidDay.js";

describe("ValidateExternalChangesUseCase", () => {
  const targetDate = new Date("2026-06-21T21:00:00");
  const focusTimeStartedAt = new Date("2026-06-22T07:00:00");

  it("Hard Ceiling 突破の外部変更を検知して ViolationAlert を返す", async () => {
    const day = buildValidDay();
    const workEnd = day.getBlock(BlockId.WORK_TIME).timeRange.end;

    const repo = createFakeTimelineRepository({
      targetDate,
      tasks: [
        {
          id: "external-breach",
          title: "Night Edit",
          description: "",
          blockId: BlockId.WORK_TIME,
          accountKind: AccountKind.Work,
          startTime: new Date("2026-06-22T16:00:00"),
          endTime: new Date(workEnd.getTime() + 60 * 60 * 1000),
          listName: "WORK TIME",
        },
      ],
    });

    const externalChangeRepo = new FakeExternalChangeRepository({
      changes: [
        {
          id: "external-breach",
          type: "TASK",
          action: "UPDATED",
          accountKind: "Work",
          listName: "WORK TIME",
          newStart: new Date("2026-06-22T16:00:00"),
          newEnd: new Date(workEnd.getTime() + 60 * 60 * 1000),
          occurredAt: new Date("2026-06-22T02:00:00"),
        },
      ],
    });

    const useCase = new ValidateExternalChangesUseCase(
      externalChangeRepo,
      new DayAssemblyService(repo),
    );

    const result = await useCase.execute({ focusTimeStartedAt, targetDate });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value).toEqual([
        expect.objectContaining({
          targetId: "external-breach",
          violationType: "HARD_CEILING_EXCEEDED",
        }),
      ]);
    }
  });

  it("違反がなければ空配列を返す", async () => {
    const repo = createFakeTimelineRepository({ targetDate });
    const externalChangeRepo = new FakeExternalChangeRepository();
    const useCase = new ValidateExternalChangesUseCase(
      externalChangeRepo,
      new DayAssemblyService(repo),
    );

    const result = await useCase.execute({ focusTimeStartedAt, targetDate });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value).toEqual([]);
    }
  });
});
