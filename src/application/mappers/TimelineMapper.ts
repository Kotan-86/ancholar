// 仕様: docs/application/usecase.md#3-アプリケーション層の入出力データ定義（dto）
import type { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { getTimeBlockSpec } from "@domain/value-objects/TimeBlockSpec.js";
import type { ViolationAlert } from "../dto/ViolationAlert.js";
import type { BlockDTO, TaskDTO, TimelineDTO } from "../dto/TimelineDTO.js";

export class TimelineMapper {
  static toDTO(
    day: ChronologicalDay,
    socialJetLagWarning = false,
    violations?: ViolationAlert[],
  ): TimelineDTO {
    const tasksByBlock = new Map<string, TaskDTO[]>();
    for (const block of day.blocks) {
      tasksByBlock.set(block.blockId, []);
    }

    for (const task of day.tasks) {
      const taskDto: TaskDTO = {
        id: task.id,
        title: task.title,
        description: task.description,
        accountKind: task.accountKind === AccountKind.Work ? "Work" : "Private",
        startTime: task.startTime,
        endTime: task.endTime,
        shouldPlotOnGrid: task.shouldPlotOnGrid,
      };
      tasksByBlock.get(task.blockId)?.push(taskDto);
    }

    const blocks: BlockDTO[] = day.blocks.map((block) => {
      const spec = getTimeBlockSpec(block.blockId);
      return {
        blockId: block.blockId,
        startTime: block.timeRange.start,
        endTime: block.timeRange.end,
        durationMinutes: block.duration().minutes,
        isDurationFixed: spec.isDurationFixed,
        tasks: tasksByBlock.get(block.blockId) ?? [],
      };
    });

    return {
      anchorDate: day.anchor.value,
      totalDurationMinutes: day.totalDuration().minutes,
      blocks,
      socialJetLagWarning,
      ...(violations && violations.length > 0 ? { violations } : {}),
    };
  }
}
