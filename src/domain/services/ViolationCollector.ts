// 仕様: docs/application/usecase.md#UC-3
import { AccountKind } from "../value-objects/AccountKind.js";
import { tryBlockIdFromListName, type BlockId } from "../value-objects/BlockId.js";
import { getTimeBlockSpec, isDurationBelowFloor } from "../value-objects/TimeBlockSpec.js";
import { ChronologicalDay } from "../entities/ChronologicalDay.js";
import { Task } from "../entities/Task.js";
import { TaskPlacementValidator } from "./TaskPlacementValidator.js";

export type ViolationKind = "HARD_CEILING" | "FLOOR_BROKEN" | "INVALID_MAPPING";

export type ViolationFinding = {
  targetId: string;
  targetTitle: string;
  kind: ViolationKind;
};

export type TaskPlacementInput = {
  id: string;
  title: string;
  listName: string;
  blockId: BlockId;
  accountKind: AccountKind;
  startTime: Date;
  endTime?: Date | null;
};

export type TaskPlacementStatus = "VALID" | "INVALID_MAPPING" | "HARD_CEILING" | "OUT_OF_BLOCK";

export class ViolationCollector {
  static collectViolations(day: ChronologicalDay): ViolationFinding[] {
    const findings: ViolationFinding[] = [];

    for (const task of day.tasks) {
      const status = ViolationCollector.evaluateTaskPlacement(day, {
        id: task.id,
        title: task.title,
        listName: task.listName,
        blockId: task.blockId,
        accountKind: task.accountKind,
        startTime: task.startTime,
        endTime: task.endTime,
      });
      const finding = ViolationCollector.toViolationFinding(
        { id: task.id, title: task.title },
        status,
      );
      if (finding) {
        findings.push(finding);
      }
    }

    for (const block of day.blocks) {
      const spec = getTimeBlockSpec(block.blockId);
      if (isDurationBelowFloor(spec, block.duration())) {
        findings.push({
          targetId: block.blockId,
          targetTitle: block.blockId,
          kind: "FLOOR_BROKEN",
        });
      }
    }

    return findings;
  }

  static evaluateTaskPlacement(
    day: ChronologicalDay,
    input: TaskPlacementInput,
  ): TaskPlacementStatus {
    const mappedBlockId = tryBlockIdFromListName(input.listName);
    if (mappedBlockId === "UNKNOWN_LIST_NAME" || mappedBlockId !== input.blockId) {
      return "INVALID_MAPPING";
    }

    if (input.accountKind === AccountKind.Private) {
      const block = day.getBlock(input.blockId);
      if (!block.timeRange.contains(input.startTime)) {
        return "OUT_OF_BLOCK";
      }
      return "VALID";
    }

    if (!input.endTime) {
      return "INVALID_MAPPING";
    }

    const provisional = Task.createWork({
      id: input.id,
      title: input.title,
      description: "",
      blockId: input.blockId,
      startTime: input.startTime,
      endTime: input.endTime,
      listName: input.listName,
    });

    const status = TaskPlacementValidator.evaluateWorkTaskMove(day, {
      task: provisional,
      newStart: input.startTime,
      newEnd: input.endTime,
    });

    if (status === "EXCEEDS_HARD_CEILING" || status === "CRUSHES_DOWN_TIME") {
      return "HARD_CEILING";
    }

    return "VALID";
  }

  static toViolationFinding(
    target: { id: string; title: string },
    status: TaskPlacementStatus,
  ): ViolationFinding | null {
    if (status === "VALID") {
      return null;
    }
    if (status === "INVALID_MAPPING" || status === "OUT_OF_BLOCK") {
      return {
        targetId: target.id,
        targetTitle: target.title,
        kind: "INVALID_MAPPING",
      };
    }
    return {
      targetId: target.id,
      targetTitle: target.title,
      kind: "HARD_CEILING",
    };
  }
}
