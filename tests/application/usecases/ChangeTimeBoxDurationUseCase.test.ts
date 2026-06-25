// 仕様: docs/application/usecase.md#UC-2 / docs/error.md#4.2
import { describe, expect, it, vi } from "vitest";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { ChangeTimeBoxDurationUseCase } from "@application/usecases/ChangeTimeBoxDurationUseCase.js";
import type { GoogleGateway } from "@interface/ports/GoogleGateway.js";
import type { TimelineRepository } from "@interface/ports/TimelineRepository.js";
import { err, ok } from "@shared/Result.js";
import { buildValidDay } from "../../helpers/buildValidDay.js";
import { buildWorkTask } from "../../helpers/buildWorkTask.js";

function createMocks() {
  const timelineRepo: TimelineRepository = {
    getLifestyleSettings: vi.fn(),
    getDownTimeStart: vi.fn(),
    getTasksForDay: vi.fn(),
    getEventsForDay: vi.fn(),
    getChronologicalDay: vi.fn(),
  };
  const googleGateway: GoogleGateway = {
    updateTaskTime: vi.fn(),
    updateBlockTime: vi.fn(),
    createTask: vi.fn(),
    createEvent: vi.fn(),
  };
  return { timelineRepo, googleGateway };
}

describe("ChangeTimeBoxDurationUseCase", () => {
  const targetDate = new Date("2026-06-21T21:00:00");

  it("手順2: Repository が日付未存在なら NotFound を返す", async () => {
    const { timelineRepo, googleGateway } = createMocks();
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(
      err({
        type: "NotFound",
        resourceName: "ChronologicalDay",
        message: "ChronologicalDay not found",
      }),
    );

    const useCase = new ChangeTimeBoxDurationUseCase(timelineRepo, googleGateway);
    const result = await useCase.execute({
      targetId: "task-1",
      type: "TASK",
      newStart: new Date("2026-06-22T09:00:00"),
      newEnd: new Date("2026-06-22T10:00:00"),
      targetDate,
    });

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error).toEqual({
        type: "NotFound",
        resourceName: "ChronologicalDay",
        message: "ChronologicalDay not found",
      });
    }
    expect(googleGateway.updateTaskTime).not.toHaveBeenCalled();
    expect(googleGateway.updateBlockTime).not.toHaveBeenCalled();
  });

  it("手順3: 仕事用タスクが Hard Ceiling 突破なら HardCeilingExceeded を返す", async () => {
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
  });

  it("手順3: DOWN TIME 圧迫なら HardCeilingExceeded を返す", async () => {
    const day = buildValidDay();
    const freeEnd = day.getBlock(BlockId.FREE_TIME).timeRange.end;
    const task = buildWorkTask({ id: "task-1" });
    const dayWithTask = day.addTask(task);

    const { timelineRepo, googleGateway } = createMocks();
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(ok(dayWithTask));

    const useCase = new ChangeTimeBoxDurationUseCase(timelineRepo, googleGateway);
    const result = await useCase.execute({
      targetId: "task-1",
      type: "TASK",
      newStart: new Date("2026-06-22T16:00:00"),
      newEnd: new Date(freeEnd.getTime() + 30 * 60 * 1000),
      targetDate,
    });

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.type).toBe("HardCeilingExceeded");
      expect(result.error.message).toContain("DOWN TIME");
    }
    expect(googleGateway.updateTaskTime).not.toHaveBeenCalled();
  });

  it("手順4: タイムブロック Floor 割れなら FloorConstraintBroken を返す", async () => {
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

  it("手順4: 受動的短縮禁止なら FloorConstraintBroken を返す", async () => {
    const day = buildValidDay();
    const sleep = day.getBlock(BlockId.SLEEP_TIME);
    const newEnd = new Date(sleep.timeRange.end.getTime() - 30 * 60 * 1000);

    const { timelineRepo, googleGateway } = createMocks();
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(ok(day));

    const useCase = new ChangeTimeBoxDurationUseCase(timelineRepo, googleGateway);
    const result = await useCase.execute({
      targetId: BlockId.SLEEP_TIME,
      type: "BLOCK",
      newStart: sleep.timeRange.start,
      newEnd,
      targetDate,
    });

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.type).toBe("FloorConstraintBroken");
    }
    expect(googleGateway.updateBlockTime).not.toHaveBeenCalled();
  });

  it("手順5: Gateway が ExternalApiError を返すならそのまま伝播する", async () => {
    const day = buildValidDay();
    const task = buildWorkTask({ id: "task-1" });
    const dayWithTask = day.addTask(task);

    const { timelineRepo, googleGateway } = createMocks();
    vi.mocked(timelineRepo.getChronologicalDay).mockResolvedValue(ok(dayWithTask));
    vi.mocked(googleGateway.updateTaskTime).mockResolvedValue(
      err({
        type: "ExternalApiError",
        service: "GoogleTasks",
        message: "API failure",
      }),
    );

    const useCase = new ChangeTimeBoxDurationUseCase(timelineRepo, googleGateway);
    const result = await useCase.execute({
      targetId: "task-1",
      type: "TASK",
      newStart: new Date("2026-06-22T09:30:00"),
      newEnd: new Date("2026-06-22T10:30:00"),
      targetDate,
    });

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error).toEqual({
        type: "ExternalApiError",
        service: "GoogleTasks",
        message: "API failure",
      });
    }
  });

  it("手順5-6: 全ステップ成功なら ok(TimelineDTO) を返す", async () => {
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
      expect(result.value).toMatchObject({
        socialJetLagWarning: false,
      });
      expect(result.value.anchorDate).toBeInstanceOf(Date);
      expect(result.value.totalDurationMinutes).toBeGreaterThanOrEqual(23 * 60);
      expect(result.value.totalDurationMinutes).toBeLessThanOrEqual(25 * 60);
      expect(result.value.blocks).toHaveLength(7);
      expect(result.value.blocks[0]).toMatchObject({
        blockId: expect.any(String),
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        durationMinutes: expect.any(Number),
        isDurationFixed: expect.any(Boolean),
        tasks: expect.any(Array),
      });
      const workBlock = result.value.blocks.find((b) => b.blockId === BlockId.WORK_TIME);
      const taskDto = workBlock?.tasks.find((t) => t.id === "task-1");
      expect(taskDto?.startTime).toEqual(new Date("2026-06-22T09:30:00"));
      expect(taskDto?.endTime).toEqual(new Date("2026-06-22T10:30:00"));
    }
    expect(googleGateway.updateTaskTime).toHaveBeenCalledOnce();
  });
});
