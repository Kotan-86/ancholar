// 仕様: README.md ルール① DOWN TIME起点の動的タイムライン（Time Anchor）
import { AccountKind } from "../value-objects/AccountKind.js";
import { Task } from "./Task.js";
import { ResizeReason, ScheduledTimeBlock } from "./ScheduledTimeBlock.js";
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

  /** 永続化層や違反検知テストから既知のタスク群で日を再構成する */
  static reconstitute(
    anchor: DayAnchor,
    blocks: readonly ScheduledTimeBlock[],
    tasks: Task[],
  ): ChronologicalDay {
    return new ChronologicalDay(anchor, [...blocks], tasks);
  }

  /** UC-2: 検証済み前提でブロックの duration を不変更新する */
  withUpdatedBlock(
    blockId: BlockId,
    newDuration: Duration,
    reason: ResizeReason,
  ): ChronologicalDay {
    const blockIndex = BLOCK_ORDER.indexOf(blockId);
    const block = this.blocks[blockIndex]!;
    const updatedBlock = block.withResizedDuration(newDuration, reason);
    const newBlocks = [...this.blocks];
    newBlocks[blockIndex] = updatedBlock;
    return new ChronologicalDay(this.anchor, newBlocks, [...this.taskList]);
  }

  /** UC-2: Gateway 更新成功後にタスクの時間を反映する */
  withUpdatedTask(taskId: string, newStart: Date, newEnd: Date): ChronologicalDay {
    const index = this.taskList.findIndex((t) => t.id === taskId);
    if (index === -1) {
      return this;
    }

    const task = this.taskList[index]!;
    const updated =
      task.accountKind === AccountKind.Work
        ? Task.createWork({
            id: task.id,
            title: task.title,
            description: task.description,
            blockId: task.blockId,
            startTime: newStart,
            endTime: newEnd,
            listName: task.listName,
          })
        : Task.createPrivate({
            id: task.id,
            title: task.title,
            description: task.description,
            blockId: task.blockId,
            startTime: newStart,
            listName: task.listName,
            blockTimeRange: this.getBlock(task.blockId).timeRange,
          });

    const newTaskList = [...this.taskList];
    newTaskList[index] = updated;
    return new ChronologicalDay(this.anchor, this.blocks, newTaskList);
  }
}
