// 仕様: docs/error.md#4.1-ドメイン層（純粋な評価）
import { Task } from "../entities/Task.js";
import {
  ScheduledTimeBlock,
  ResizeReason,
  type BlockResizeStatus,
} from "../entities/ScheduledTimeBlock.js";
import { ChronologicalDay } from "../entities/ChronologicalDay.js";
import { BlockId } from "../value-objects/BlockId.js";
import { Duration } from "../value-objects/Duration.js";
import { TimeRange } from "../value-objects/TimeRange.js";

export type TaskMoveProposal = {
  task: Task;
  newStart: Date;
  newEnd: Date;
};

export type WorkTaskMoveStatus =
  | "VALID"
  | "EXCEEDS_HARD_CEILING"
  | "CRUSHES_DOWN_TIME";

export class TaskPlacementValidator {
  static evaluateWorkTaskMove(
    day: ChronologicalDay,
    proposal: TaskMoveProposal,
  ): WorkTaskMoveStatus {
    const workBlock = day.getBlock(BlockId.WORK_TIME);
    const proposedRange = TimeRange.of(proposal.newStart, proposal.newEnd);
    const nextDownStart = day.getBlock(BlockId.FREE_TIME).timeRange.end.getTime();

    if (proposedRange.end.getTime() > nextDownStart) {
      return "CRUSHES_DOWN_TIME";
    }

    if (proposedRange.end.getTime() > workBlock.timeRange.end.getTime()) {
      return "EXCEEDS_HARD_CEILING";
    }

    if (!workBlock.timeRange.contains(proposal.newStart)) {
      return "EXCEEDS_HARD_CEILING";
    }

    return "VALID";
  }

  static evaluateBlockResize(
    block: ScheduledTimeBlock,
    newDuration: Duration,
    reason: typeof ResizeReason[keyof typeof ResizeReason],
  ): BlockResizeStatus {
    return block.evaluateResize(newDuration, reason);
  }
}
