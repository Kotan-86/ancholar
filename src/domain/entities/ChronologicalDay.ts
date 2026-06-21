// 仕様: README.md ルール① DOWN TIME起点の動的タイムライン（Time Anchor）
import { DomainError } from "../DomainError.js";
import { AccountKind } from "../value-objects/AccountKind.js";
import { Task } from "./Task.js";
import { ScheduledTimeBlock } from "./ScheduledTimeBlock.js";
import { BLOCK_ORDER, type BlockId } from "../value-objects/BlockId.js";
import { DayAnchor } from "../value-objects/DayAnchor.js";
import { Duration } from "../value-objects/Duration.js";

const MIN_DAY_MINUTES = 23 * 60;
const MAX_DAY_MINUTES = 25 * 60;

export class ChronologicalDay {
  private constructor(
    readonly anchor: DayAnchor,
    readonly blocks: readonly ScheduledTimeBlock[],
    private readonly taskList: Task[],
  ) {}

  static create(anchor: DayAnchor, blocks: ScheduledTimeBlock[]): ChronologicalDay {
    if (blocks.length !== BLOCK_ORDER.length) {
      throw new DomainError("ChronologicalDay must contain exactly 7 blocks");
    }

    for (let i = 0; i < BLOCK_ORDER.length; i++) {
      const expectedId = BLOCK_ORDER[i];
      const block = blocks[i];
      if (!block || block.blockId !== expectedId) {
        throw new DomainError(`Block at index ${i} must be ${expectedId}`);
      }
    }

    for (let i = 0; i < blocks.length - 1; i++) {
      const current = blocks[i];
      const next = blocks[i + 1];
      if (!current || !next) {
        continue;
      }
      if (current.timeRange.end.getTime() !== next.timeRange.start.getTime()) {
        throw new DomainError("Blocks must be contiguous");
      }
    }

    const totalMinutes = blocks.reduce(
      (sum, block) => sum + block.duration().minutes,
      0,
    );
    if (totalMinutes < MIN_DAY_MINUTES || totalMinutes > MAX_DAY_MINUTES) {
      throw new DomainError(
        `ChronologicalDay total duration must be between 23h and 25h, got ${totalMinutes} minutes`,
      );
    }

    return new ChronologicalDay(anchor, blocks, []);
  }

  get tasks(): readonly Task[] {
    return this.taskList;
  }

  totalDuration(): Duration {
    const minutes = this.blocks.reduce(
      (sum, block) => sum + block.duration().minutes,
      0,
    );
    return Duration.fromMinutes(minutes);
  }

  getBlock(blockId: BlockId): ScheduledTimeBlock {
    const block = this.blocks.find((b) => b.blockId === blockId);
    if (!block) {
      throw new DomainError(`Block ${blockId} not found`);
    }
    return block;
  }

  addTask(task: Task): ChronologicalDay {
    const block = this.getBlock(task.blockId);
    if (task.accountKind === AccountKind.Private) {
      Task.createPrivate({
        id: task.id,
        title: task.title,
        description: task.description,
        blockId: task.blockId,
        startTime: task.startTime,
        listName: task.listName,
        blockTimeRange: block.timeRange,
      });
    } else {
      task.validateWithinWorkTimeBoundary(block.timeRange);
    }

    return new ChronologicalDay(this.anchor, this.blocks, [...this.taskList, task]);
  }
}
