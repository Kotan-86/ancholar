// 仕様: docs/application/usecase.md#UC-2 / docs/error.md#4.2
import { ResizeReason } from "@domain/entities/ScheduledTimeBlock.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { Duration } from "@domain/value-objects/Duration.js";
import { TaskPlacementValidator } from "@domain/services/TaskPlacementValidator.js";
import { err, ok, type Result } from "@shared/Result.js";
import type { ChangeTimeBoxDurationInput } from "../dto/ChangeTimeBoxDurationInput.js";
import type { TimelineDTO } from "../dto/TimelineDTO.js";
import type { UseCaseError } from "../errors/AppErrors.js";
import { TimelineMapper } from "../mappers/TimelineMapper.js";
import type { GoogleGateway } from "../ports/GoogleGateway.js";
import type { TimelineRepository } from "../ports/TimelineRepository.js";

export class ChangeTimeBoxDurationUseCase {
  constructor(
    private readonly timelineRepo: TimelineRepository,
    private readonly googleGateway: GoogleGateway,
  ) {}

  async execute(
    input: ChangeTimeBoxDurationInput,
  ): Promise<Result<TimelineDTO, UseCaseError>> {
    const dayResult = await this.timelineRepo.getChronologicalDay(input.targetDate);
    if (!dayResult.isOk) {
      return err(dayResult.error);
    }
    const day = dayResult.value;

    if (input.type === "TASK") {
      const task = day.tasks.find((t) => t.id === input.targetId);
      if (!task) {
        return err({
          type: "NotFound",
          resourceName: "Task",
          message: `Task ${input.targetId} not found`,
        });
      }

      const status = TaskPlacementValidator.evaluateWorkTaskMove(day, {
        task,
        newStart: input.newStart,
        newEnd: input.newEnd,
      });

      if (status === "EXCEEDS_HARD_CEILING") {
        return err({
          type: "HardCeilingExceeded",
          message: "仕事用タスクがWORK TIMEの天井を超えています。前夜の防衛を優先してください。",
          context: { taskId: input.targetId },
        });
      }
      if (status === "CRUSHES_DOWN_TIME") {
        return err({
          type: "HardCeilingExceeded",
          message: "DOWN TIMEを圧迫する操作は禁止されています。",
          context: { taskId: input.targetId },
        });
      }

      const updateResult = await this.googleGateway.updateTaskTime(
        input.targetId,
        input.newStart,
        input.newEnd,
      );
      if (!updateResult.isOk) {
        return err(updateResult.error);
      }

      return ok(TimelineMapper.toDTO(day));
    }

    const blockId = input.targetId as BlockId;
    const block = day.getBlock(blockId);
    const newDuration = Duration.fromMinutes(
      (input.newEnd.getTime() - input.newStart.getTime()) / (60 * 1000),
    );
    const currentDuration = block.duration().minutes;
    const reason =
      newDuration.minutes < currentDuration ? ResizeReason.Passive : ResizeReason.Active;

    const status = TaskPlacementValidator.evaluateBlockResize(block, newDuration, reason);

    if (status === "BELOW_FLOOR") {
      return err({
        type: "FloorConstraintBroken",
        message: `${blockId} の最小保証時間を下回っています。`,
        context: { blockId },
      });
    }
    if (status === "PASSIVE_NOT_ALLOWED" || status === "DURATION_FIXED") {
      return err({
        type: "FloorConstraintBroken",
        message: `${blockId} の受動的短縮は禁止されています。`,
        context: { blockId },
      });
    }

    block.applyResize(newDuration, reason);

    const updateResult = await this.googleGateway.updateBlockTime(
      input.targetId,
      input.newStart,
      input.newEnd,
    );
    if (!updateResult.isOk) {
      return err(updateResult.error);
    }

    return ok(TimelineMapper.toDTO(day));
  }
}
