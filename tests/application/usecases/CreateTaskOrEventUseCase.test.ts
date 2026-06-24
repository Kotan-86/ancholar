// 仕様: docs/application/usecase.md#UC-5
import { describe, expect, it } from "vitest";
import { CreateTaskOrEventUseCase } from "@application/usecases/CreateTaskOrEventUseCase.js";
import { DayAssemblyService } from "@application/services/DayAssemblyService.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { createFakeGoogleGateway } from "../../helpers/createFakeGoogleGateway.js";
import { createFakeTimelineRepository } from "../../helpers/createFakeTimelineRepository.js";
import { buildValidDay } from "../../helpers/buildValidDay.js";

describe("CreateTaskOrEventUseCase", () => {
  const targetDate = new Date("2026-06-21T21:00:00");

  it("正常作成時に CreatedTaskDTO を返す", async () => {
    const repo = createFakeTimelineRepository({ targetDate });
    const gateway = createFakeGoogleGateway();
    const useCase = new CreateTaskOrEventUseCase(new DayAssemblyService(repo), gateway);

    const result = await useCase.execute({
      title: "New Work Item",
      startTime: new Date("2026-06-22T09:00:00"),
      endTime: new Date("2026-06-22T10:00:00"),
      targetBlockId: BlockId.WORK_TIME,
      accountKind: AccountKind.Work,
      targetDate,
    });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.title).toBe("New Work Item");
      expect(result.value.accountKind).toBe("Work");
      expect(result.value.id).toMatch(/^fake-event-/);
    }
    expect(gateway.createEventCalls).toHaveLength(1);
  });

  it("プライベートタスクを正常作成する", async () => {
    const day = buildValidDay();
    const freeBlock = day.getBlock(BlockId.FREE_TIME);
    const repo = createFakeTimelineRepository({ targetDate });
    const gateway = createFakeGoogleGateway();
    const useCase = new CreateTaskOrEventUseCase(new DayAssemblyService(repo), gateway);

    const result = await useCase.execute({
      title: "Private Errand",
      startTime: freeBlock.timeRange.start,
      targetBlockId: BlockId.FREE_TIME,
      accountKind: AccountKind.Private,
      targetDate,
    });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.accountKind).toBe("Private");
      expect(result.value.endTime).toBeNull();
    }
    expect(gateway.createTaskCalls).toHaveLength(1);
  });

  it("ルール違反時に HardCeilingExceeded を返す", async () => {
    const day = buildValidDay();
    const workEnd = day.getBlock(BlockId.WORK_TIME).timeRange.end;
    const repo = createFakeTimelineRepository({ targetDate });
    const gateway = createFakeGoogleGateway();
    const useCase = new CreateTaskOrEventUseCase(new DayAssemblyService(repo), gateway);

    const result = await useCase.execute({
      title: "Too Long",
      startTime: new Date("2026-06-22T16:00:00"),
      endTime: new Date(workEnd.getTime() + 60 * 60 * 1000),
      targetBlockId: BlockId.WORK_TIME,
      accountKind: AccountKind.Work,
      targetDate,
    });

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.type).toBe("HardCeilingExceeded");
    }
    expect(gateway.createEventCalls).toHaveLength(0);
  });

  it("Gateway 失敗時に ExternalApiError を返す", async () => {
    const repo = createFakeTimelineRepository({ targetDate });
    const gateway = createFakeGoogleGateway({
      failOn: {
        method: "createEvent",
        error: {
          type: "ExternalApiError",
          service: "GoogleCalendar",
          message: "API failure",
        },
      },
    });
    const useCase = new CreateTaskOrEventUseCase(new DayAssemblyService(repo), gateway);

    const result = await useCase.execute({
      title: "New Work Item",
      startTime: new Date("2026-06-22T09:00:00"),
      endTime: new Date("2026-06-22T10:00:00"),
      targetBlockId: BlockId.WORK_TIME,
      accountKind: AccountKind.Work,
      targetDate,
    });

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.type).toBe("ExternalApiError");
    }
  });
});
