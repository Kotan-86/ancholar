// 仕様: docs/application/usecase.md#UC-2
import { Task } from "@domain/entities/Task.js";
import { BlockId } from "@domain/value-objects/BlockId.js";

type WorkTaskOverrides = {
  id?: string;
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  listName?: string;
};

export function buildWorkTask(overrides: WorkTaskOverrides = {}): Task {
  return Task.createWork({
    id: "1",
    title: "Task",
    description: "",
    blockId: BlockId.WORK_TIME,
    startTime: new Date("2026-06-22T09:00:00"),
    endTime: new Date("2026-06-22T10:00:00"),
    listName: "WORK TIME",
    ...overrides,
  });
}
