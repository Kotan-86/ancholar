// 仕様: docs/application/usecase.md#UC-1 / UC-3 / UC-4 / UC-5
import { Task } from "@domain/entities/Task.js";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import {
  ViolationCollector,
  type TaskPlacementStatus,
  type ViolationFinding,
} from "@domain/services/ViolationCollector.js";
import type { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { listNameFromBlockId } from "@domain/value-objects/BlockId.js";
import { err, ok, type Result } from "@shared/Result.js";
import type { ExternalEventRecord, ExternalTaskRecord } from "../dto/ExternalRecords.js";
import type { UseCaseError } from "../errors/AppErrors.js";
import type { TimelineRepository } from "../ports/TimelineRepository.js";

export type LenientAssemblyResult = {
  day: ChronologicalDay;
  skippedViolations: ViolationFinding[];
};

export class DayAssemblyService {
  constructor(private readonly timelineRepo: TimelineRepository) {}

  async assembleDay(targetDate: Date): Promise<Result<ChronologicalDay, UseCaseError>> {
    const settingsResult = await this.timelineRepo.getLifestyleSettings(targetDate);
    if (!settingsResult.isOk) {
      return err(settingsResult.error);
    }

    const downTimeResult = await this.timelineRepo.getDownTimeStart(targetDate);
    if (!downTimeResult.isOk) {
      return err(downTimeResult.error);
    }

    const tasksResult = await this.timelineRepo.getTasksForDay(targetDate);
    if (!tasksResult.isOk) {
      return err(tasksResult.error);
    }

    const eventsResult = await this.timelineRepo.getEventsForDay(targetDate);
    if (!eventsResult.isOk) {
      return err(eventsResult.error);
    }

    let day = TimelineCalculator.buildDay(downTimeResult.value, settingsResult.value);

    for (const record of tasksResult.value) {
      const status = ViolationCollector.evaluateTaskPlacement(
        day,
        DayAssemblyService.toPlacementInput(record),
      );
      if (status !== "VALID") {
        return err(DayAssemblyService.toRuleViolationError(record, status));
      }
      day = day.addTask(DayAssemblyService.toTask(day, record));
    }

    for (const event of eventsResult.value) {
      const eventAsTask = DayAssemblyService.eventToTaskRecord(event);
      const status = ViolationCollector.evaluateTaskPlacement(
        day,
        DayAssemblyService.toPlacementInput(eventAsTask),
      );
      if (status !== "VALID") {
        return err(DayAssemblyService.toRuleViolationError(eventAsTask, status));
      }
      day = day.addTask(DayAssemblyService.toTask(day, eventAsTask));
    }

    return ok(day);
  }

  /** UC-1: ルール違反タスクをスキップしつつ日を組み立てる */
  async assembleDayLenient(
    targetDate: Date,
  ): Promise<Result<LenientAssemblyResult, UseCaseError>> {
    const settingsResult = await this.timelineRepo.getLifestyleSettings(targetDate);
    if (!settingsResult.isOk) {
      return err(settingsResult.error);
    }

    const downTimeResult = await this.timelineRepo.getDownTimeStart(targetDate);
    if (!downTimeResult.isOk) {
      return err(downTimeResult.error);
    }

    const tasksResult = await this.timelineRepo.getTasksForDay(targetDate);
    if (!tasksResult.isOk) {
      return err(tasksResult.error);
    }

    const eventsResult = await this.timelineRepo.getEventsForDay(targetDate);
    if (!eventsResult.isOk) {
      return err(eventsResult.error);
    }

    let day = TimelineCalculator.buildDay(downTimeResult.value, settingsResult.value);
    const skippedViolations: ViolationFinding[] = [];

    for (const record of tasksResult.value) {
      const status = ViolationCollector.evaluateTaskPlacement(
        day,
        DayAssemblyService.toPlacementInput(record),
      );
      const finding = ViolationCollector.toViolationFinding(record, status);
      if (finding) {
        skippedViolations.push(finding);
      } else {
        day = day.addTask(DayAssemblyService.toTask(day, record));
      }
    }

    for (const event of eventsResult.value) {
      const eventAsTask = DayAssemblyService.eventToTaskRecord(event);
      const status = ViolationCollector.evaluateTaskPlacement(
        day,
        DayAssemblyService.toPlacementInput(eventAsTask),
      );
      const finding = ViolationCollector.toViolationFinding(eventAsTask, status);
      if (finding) {
        skippedViolations.push(finding);
      } else {
        day = day.addTask(DayAssemblyService.toTask(day, eventAsTask));
      }
    }

    return ok({ day, skippedViolations });
  }

  private static toPlacementInput(record: ExternalTaskRecord) {
    return {
      id: record.id,
      title: record.title,
      listName: record.listName,
      blockId: record.blockId,
      accountKind: record.accountKind,
      startTime: record.startTime,
      endTime: record.endTime,
    };
  }

  private static eventToTaskRecord(event: ExternalEventRecord): ExternalTaskRecord {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      blockId: event.blockId,
      accountKind: AccountKind.Work,
      startTime: event.startTime,
      endTime: event.endTime,
      listName: listNameFromBlockId(event.blockId),
    };
  }

  private static toTask(day: ChronologicalDay, record: ExternalTaskRecord): Task {
    if (record.accountKind === AccountKind.Private) {
      return Task.createPrivate({
        id: record.id,
        title: record.title,
        description: record.description,
        blockId: record.blockId,
        startTime: record.startTime,
        listName: record.listName,
        blockTimeRange: day.getBlock(record.blockId).timeRange,
      });
    }

    return Task.createWork({
      id: record.id,
      title: record.title,
      description: record.description,
      blockId: record.blockId,
      startTime: record.startTime,
      endTime: record.endTime!,
      listName: record.listName,
    });
  }

  private static toRuleViolationError(
    record: ExternalTaskRecord,
    status: TaskPlacementStatus,
  ): UseCaseError {
    if (status === "INVALID_MAPPING") {
      return {
        type: "InvalidTaskMapping",
        message: `リスト名 ${record.listName} がブロック ${record.blockId} と一致しません。`,
        context: { taskId: record.id },
      };
    }
    if (status === "OUT_OF_BLOCK") {
      return {
        type: "InvalidTaskMapping",
        message: `プライベートタスク ${record.title} がブロックの時間枠外です。`,
        context: { taskId: record.id },
      };
    }
    return {
      type: "HardCeilingExceeded",
      message: `タスク ${record.title} が仕事の天井を超えています。`,
      context: { taskId: record.id },
    };
  }
}
