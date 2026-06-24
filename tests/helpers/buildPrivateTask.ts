// 仕様: docs/application/usecase.md#UC-5 / Phase 0 テストヘルパー
import { Task } from "@domain/entities/Task.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { buildValidDay } from "./buildValidDay.js";

type BuildPrivateTaskOptions = {
  id?: string;
  title?: string;
  description?: string;
  blockId?: typeof BlockId.FREE_TIME | typeof BlockId.GRADATION_TIME | typeof BlockId.FOCUS_TIME;
  startTime?: Date;
  listName?: string;
};

export function buildPrivateTask(options: BuildPrivateTaskOptions = {}): Task {
  const blockId = options.blockId ?? BlockId.FREE_TIME;
  const day = buildValidDay();
  const block = day.getBlock(blockId);

  return Task.createPrivate({
    id: options.id ?? "private-task-1",
    title: options.title ?? "Private Task",
    description: options.description ?? "",
    blockId,
    startTime: options.startTime ?? block.timeRange.start,
    listName: options.listName ?? blockId.replace(/_/g, " "),
    blockTimeRange: block.timeRange,
  });
}
