// 仕様: README.md ルール④ 防衛的タイムボックスとタスクの伸縮制御
import { DomainError } from "../DomainError.js";
import { Task } from "../entities/Task.js";
import { ScheduledTimeBlock, ResizeReason } from "../entities/ScheduledTimeBlock.js";
import { ChronologicalDay } from "../entities/ChronologicalDay.js";
import { BlockId } from "../value-objects/BlockId.js";
import { Duration } from "../value-objects/Duration.js";
import { getTimeBlockSpec, isDurationBelowFloor } from "../value-objects/TimeBlockSpec.js";
import { TimeRange } from "../value-objects/TimeRange.js";

export type TaskMoveProposal = {
  task: Task;
  newStart: Date;
  newEnd: Date;
};

export class TaskPlacementValidator {
  static validateWorkTaskMove(day: ChronologicalDay, proposal: TaskMoveProposal): void {
    const workBlock = day.getBlock(BlockId.WORK_TIME);
    const proposedRange = TimeRange.of(proposal.newStart, proposal.newEnd);

    if (proposedRange.end.getTime() > workBlock.timeRange.end.getTime()) {
      throw new DomainError("Work task move exceeds WORK_TIME Hard Ceiling");
    }

    if (!workBlock.timeRange.contains(proposal.newStart)) {
      throw new DomainError("Work task move exceeds WORK_TIME Hard Ceiling");
    }

    const nextDownStart = day.getBlock(BlockId.FREE_TIME).timeRange.end.getTime();
    if (proposedRange.end.getTime() > nextDownStart) {
      throw new DomainError("Work task move would crush DOWN TIME");
    }
  }

  static validateBlockResize(
    block: ScheduledTimeBlock,
    newDuration: Duration,
    reason: typeof ResizeReason[keyof typeof ResizeReason],
  ): void {
    const spec = getTimeBlockSpec(block.blockId);
    if (isDurationBelowFloor(spec, newDuration)) {
      throw new DomainError(`${block.blockId} resize would break floor constraint`);
    }
    block.resize(newDuration, reason);
  }
}
