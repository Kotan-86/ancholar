// 仕様: docs/application/usecase.md#UC-2 / Phase 0 テストヘルパー
import { Task } from "@domain/entities/Task.js";
import { BlockId } from "@domain/value-objects/BlockId.js";

type BuildWorkTaskOptions = {
  id?: string;
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  listName?: string;
};

export function buildWorkTask(options: BuildWorkTaskOptions = {}): Task {
  return Task.createWork({
    id: options.id ?? "work-task-1",
    title: options.title ?? "Work Task",
    description: options.description ?? "",
    blockId: BlockId.WORK_TIME,
    startTime: options.startTime ?? new Date("2026-06-22T09:00:00"),
    endTime: options.endTime ?? new Date("2026-06-22T10:00:00"),
    listName: options.listName ?? "WORK TIME",
  });
}
