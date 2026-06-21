// 仕様: README.md §② タスク（Allocated Task）/ ルール③④
import { DomainError } from "../DomainError.js";
import { AccountKind } from "../value-objects/AccountKind.js";
import { BlockId, blockIdFromListName } from "../value-objects/BlockId.js";
import { TimeRange } from "../value-objects/TimeRange.js";

export type TaskProps = {
  id: string;
  title: string;
  description: string;
  blockId: BlockId;
  accountKind: AccountKind;
  startTime: Date;
  endTime?: Date;
  listName: string;
};

export class Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly blockId: BlockId;
  readonly accountKind: AccountKind;
  readonly startTime: Date;
  readonly endTime: Date | null;
  readonly listName: string;

  private constructor(props: {
    id: string;
    title: string;
    description: string;
    blockId: BlockId;
    accountKind: AccountKind;
    startTime: Date;
    endTime: Date | null;
    listName: string;
  }) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.blockId = props.blockId;
    this.accountKind = props.accountKind;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.listName = props.listName;
  }

  get shouldPlotOnGrid(): boolean {
    return this.accountKind === AccountKind.Work && this.blockId === BlockId.WORK_TIME;
  }

  static createWork(props: {
    id: string;
    title: string;
    description: string;
    blockId: BlockId;
    startTime: Date;
    endTime: Date;
    listName: string;
  }): Task {
    if (props.blockId !== BlockId.WORK_TIME) {
      throw new DomainError("Work tasks must belong to WORK_TIME");
    }
    if (!props.endTime) {
      throw new DomainError("Work tasks require endTime");
    }
    validateListNameMapping(props.listName, props.blockId);

    return new Task({
      ...props,
      accountKind: AccountKind.Work,
      endTime: props.endTime,
    });
  }

  static createPrivate(props: {
    id: string;
    title: string;
    description: string;
    blockId: BlockId;
    startTime: Date;
    listName: string;
    blockTimeRange: TimeRange;
  }): Task {
    if (props.blockId === BlockId.WORK_TIME) {
      throw new DomainError("Private tasks cannot belong to WORK_TIME");
    }
    if (!props.blockTimeRange.contains(props.startTime)) {
      throw new DomainError("Private task startTime must be within block time range");
    }
    validateListNameMapping(props.listName, props.blockId);

    return new Task({
      id: props.id,
      title: props.title,
      description: props.description,
      blockId: props.blockId,
      accountKind: AccountKind.Private,
      startTime: props.startTime,
      endTime: null,
      listName: props.listName,
    });
  }

  validateWithinWorkTimeBoundary(workTimeRange: TimeRange): void {
    if (!this.endTime) {
      return;
    }
    if (this.endTime.getTime() > workTimeRange.end.getTime()) {
      throw new DomainError("Work task exceeds WORK_TIME Hard Ceiling");
    }
    if (
      !workTimeRange.contains(this.startTime) ||
      !workTimeRange.contains(this.endTime)
    ) {
      throw new DomainError("Work task must stay within WORK_TIME boundary");
    }
  }
}

function validateListNameMapping(listName: string, blockId: BlockId): void {
  const mapped = blockIdFromListName(listName);
  if (mapped !== blockId) {
    throw new DomainError(`List name ${listName} does not match blockId ${blockId}`);
  }
}

export type { TaskProps };
