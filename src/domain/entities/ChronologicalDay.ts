// 仕様: README.md ルール① DOWN TIME起点の動的タイムライン（Time Anchor）
import { AccountKind } from "../value-objects/AccountKind.js";
import { Task } from "./Task.js";
import { ScheduledTimeBlock } from "./ScheduledTimeBlock.js";
import { BLOCK_ORDER, type BlockId } from "../value-objects/BlockId.js";
import { DayAnchor } from "../value-objects/DayAnchor.js";
import { Duration } from "../value-objects/Duration.js";

export class ChronologicalDay {
  private constructor(
    readonly anchor: DayAnchor,
    readonly blocks: readonly ScheduledTimeBlock[],
    private readonly taskList: Task[],
  ) {}

  static create(anchor: DayAnchor, blocks: ScheduledTimeBlock[]): ChronologicalDay {
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
    const index = BLOCK_ORDER.indexOf(blockId);
    return this.blocks[index]!;
  }

  addTask(task: Task): ChronologicalDay {
    return new ChronologicalDay(this.anchor, this.blocks, [...this.taskList, task]);
  }
}
