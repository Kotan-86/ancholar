// 仕様: docs/application/usecase.md#UC-2 / docs/error.md#4.2
import { describe, expect, it, vi } from "vitest";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { ChangeTimeBoxDurationUseCase } from "@application/usecases/ChangeTimeBoxDurationUseCase.js";
import type { GoogleGateway } from "@application/ports/GoogleGateway.js";
import type { TimelineRepository } from "@application/ports/TimelineRepository.js";
import { err, ok } from "@shared/Result.js";
import { buildValidDay } from "../../helpers/buildValidDay.js";
import { buildWorkTask } from "../../helpers/buildWorkTask.js";

function createMocks() {
  const timelineRepo: TimelineRepository = {
    getChronologicalDay: vi.fn(),
  };
  const googleGateway: GoogleGateway = {
    updateTaskTime: vi.fn(),
    updateBlockTime: vi.fn(),
  };
  return { timelineRepo, googleGateway };
}

describe("ChangeTimeBoxDuration integration", () => {
  const targetDate = new Date("2026-06-21T21:00:00");

  it("手順3-6 正常系（タスク変更）: 実ドメイン評価 VALID → ok(TimelineDTO)", async () => {
    const day = buildValidDay();
    const task = buildWorkTask({ id: "task-1" });
    const dayWithTask = day.addTask(task);

    const { timelineRepo, googleGateway } = createMocks();
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(ok(dayWithTask));
    vi.mocked(googleGateway.updateTaskTime).mockResolvedValue(ok(undefined));

    const useCase = new ChangeTimeBoxDurationUseCase(timelineRepo, googleGateway);
    const result = await useCase.execute({
      targetId: "task-1",
      type: "TASK",
      newStart: new Date("2026-06-22T09:30:00"),
      newEnd: new Date("2026-06-22T10:30:00"),
      targetDate,
    });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.blocks).toHaveLength(7);
      expect(result.value.blocks.find((b) => b.blockId === BlockId.WORK_TIME)?.tasks).toHaveLength(1);
    }
    expect(googleGateway.updateTaskTime).toHaveBeenCalledOnce();
  });

  it("手順4-6 正常系（ブロック変更）: evaluateBlockResize VALID → applyResize → ok(DTO)", async () => {
    const day = buildValidDay();
    const work = day.getBlock(BlockId.WORK_TIME);
    const newEnd = new Date(work.timeRange.end.getTime() - 60 * 60 * 1000);

    const { timelineRepo, googleGateway } = createMocks();
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(ok(day));
    vi.mocked(googleGateway.updateBlockTime).mockResolvedValue(ok(undefined));

    const useCase = new ChangeTimeBoxDurationUseCase(timelineRepo, googleGateway);
    const result = await useCase.execute({
      targetId: BlockId.WORK_TIME,
      type: "BLOCK",
      newStart: work.timeRange.start,
      newEnd,
      targetDate,
    });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      const workDto = result.value.blocks.find((b) => b.blockId === BlockId.WORK_TIME);
      expect(workDto?.durationMinutes).toBe(7 * 60);
    }
    expect(googleGateway.updateBlockTime).toHaveBeenCalledOnce();
  });

  it("手順3 例外（Hard Ceiling）: EXCEEDS_HARD_CEILING → HardCeilingExceeded、Gateway 未呼び出し", async () => {
    const day = buildValidDay();
    const workEnd = day.getBlock(BlockId.WORK_TIME).timeRange.end;
    const task = buildWorkTask({ id: "task-1" });
    const dayWithTask = day.addTask(task);

    const { timelineRepo, googleGateway } = createMocks();
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(ok(dayWithTask));

    const useCase = new ChangeTimeBoxDurationUseCase(timelineRepo, googleGateway);
    const result = await useCase.execute({
      targetId: "task-1",
      type: "TASK",
      newStart: new Date("2026-06-22T16:00:00"),
      newEnd: new Date(workEnd.getTime() + 60 * 60 * 1000),
      targetDate,
    });

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.type).toBe("HardCeilingExceeded");
      expect(result.error.message).toContain("仕事");
    }
    expect(googleGateway.updateTaskTime).not.toHaveBeenCalled();
    expect(googleGateway.updateBlockTime).not.toHaveBeenCalled();
  });

  it("手順4 例外（Floor 割れ）: BELOW_FLOOR → FloorConstraintBroken、Gateway 未呼び出し", async () => {
    const day = buildValidDay();
    const freeBlock = day.getBlock(BlockId.FREE_TIME);
    const newDurationMinutes = 20;
    const newEnd = new Date(
      freeBlock.timeRange.start.getTime() + newDurationMinutes * 60 * 1000,
    );

    const { timelineRepo, googleGateway } = createMocks();
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(ok(day));

    const useCase = new ChangeTimeBoxDurationUseCase(timelineRepo, googleGateway);
    const result = await useCase.execute({
      targetId: BlockId.FREE_TIME,
      type: "BLOCK",
      newStart: freeBlock.timeRange.start,
      newEnd,
      targetDate,
    });

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.type).toBe("FloorConstraintBroken");
    }
    expect(googleGateway.updateBlockTime).not.toHaveBeenCalled();
  });

  it("依存エラー伝播: Repository / Gateway の err がそのまま返る", async () => {
    const { timelineRepo, googleGateway } = createMocks();
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(
      err({
        type: "NotFound",
        resourceName: "ChronologicalDay",
        message: "ChronologicalDay not found",
      }),
    );

    const useCase = new ChangeTimeBoxDurationUseCase(timelineRepo, googleGateway);
    const repoResult = await useCase.execute({
      targetId: "task-1",
      type: "TASK",
      newStart: new Date("2026-06-22T09:00:00"),
      newEnd: new Date("2026-06-22T10:00:00"),
      targetDate,
    });

    expect(repoResult.isOk).toBe(false);
    if (!repoResult.isOk) {
      expect(repoResult.error.type).toBe("NotFound");
    }

    const day = buildValidDay();
    const task = buildWorkTask({ id: "task-1" });
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(ok(day.addTask(task)));
    vi.mocked(googleGateway.updateTaskTime).mockResolvedValue(
      err({
        type: "ExternalApiError",
        service: "GoogleTasks",
        message: "Network error",
      }),
    );

    const gatewayResult = await useCase.execute({
      targetId: "task-1",
      type: "TASK",
      newStart: new Date("2026-06-22T09:30:00"),
      newEnd: new Date("2026-06-22T10:30:00"),
      targetDate,
    });

    expect(gatewayResult.isOk).toBe(false);
    if (!gatewayResult.isOk) {
      expect(gatewayResult.error.type).toBe("ExternalApiError");
    }
  });
});
