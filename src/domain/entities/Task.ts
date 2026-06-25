// 仕様: README.md §② タスク（Allocated Task）/ ルール③④
import { AccountKind } from "../value-objects/AccountKind.js";
import {
  BlockId,
  tryBlockIdFromListName,
  type BlockId as BlockIdType,
} from "../value-objects/BlockId.js";
import { TimeRange } from "../value-objects/TimeRange.js";

export type TaskProps = {
  id: string;
  title: string;
  description: string;
  blockId: BlockIdType;
  accountKind: AccountKind;
  startTime: Date;
  endTime: Date | null;
  listName: string;
};

export type CreateWorkStatus =
  | "VALID"
  | "WRONG_BLOCK"
  | "MISSING_END_TIME"
  | "INVALID_LIST_NAME_MAPPING";

export type CreatePrivateStatus =
  | "VALID"
  | "WRONG_BLOCK"
  | "OUTSIDE_BLOCK_RANGE"
  | "INVALID_LIST_NAME_MAPPING";

export type WorkTimeBoundaryStatus = "VALID" | "EXCEEDS_HARD_CEILING";

export class Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly blockId: BlockIdType;
  readonly accountKind: AccountKind;
  readonly startTime: Date;
  readonly endTime: Date | null;
  readonly listName: string;

  private constructor(props: {
    id: string;
    title: string;
    description: string;
    blockId: BlockIdType;
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

  static evaluateCreateWork(props: {
    id: string;
    title: string;
    description: string;
    blockId: BlockIdType;
    startTime: Date;
    endTime?: Date;
    listName: string;
  }): CreateWorkStatus {
    if (props.blockId !== BlockId.WORK_TIME) {
      return "WRONG_BLOCK";
    }
    if (!props.endTime) {
      return "MISSING_END_TIME";
    }
    return evaluateListNameMapping(props.listName, props.blockId);
  }

  static createWork(props: {
    id: string;
    title: string;
    description: string;
    blockId: BlockIdType;
    startTime: Date;
    endTime: Date;
    listName: string;
  }): Task {
    return new Task({
      ...props,
      accountKind: AccountKind.Work,
      endTime: props.endTime,
    });
  }

  static evaluateCreatePrivate(props: {
    id: string;
    title: string;
    description: string;
    blockId: BlockIdType;
    startTime: Date;
    listName: string;
    blockTimeRange: TimeRange;
  }): CreatePrivateStatus {
    if (props.blockId === BlockId.WORK_TIME) {
      return "WRONG_BLOCK";
    }
    if (!props.blockTimeRange.contains(props.startTime)) {
      return "OUTSIDE_BLOCK_RANGE";
    }
    return evaluateListNameMapping(props.listName, props.blockId);
  }

  static createPrivate(props: {
    id: string;
    title: string;
    description: string;
    blockId: BlockIdType;
    startTime: Date;
    listName: string;
    blockTimeRange: TimeRange;
  }): Task {
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

  evaluateWithinWorkTimeBoundary(workTimeRange: TimeRange): WorkTimeBoundaryStatus {
    if (!this.endTime) {
      return "VALID";
    }
    if (this.endTime.getTime() > workTimeRange.end.getTime()) {
      return "EXCEEDS_HARD_CEILING";
    }
    if (
      !workTimeRange.contains(this.startTime) ||
      !workTimeRange.contains(this.endTime)
    ) {
      return "EXCEEDS_HARD_CEILING";
    }
    return "VALID";
  }
}

function evaluateListNameMapping(
  listName: string,
  blockId: BlockIdType,
): "VALID" | "INVALID_LIST_NAME_MAPPING" {
  const mapped = tryBlockIdFromListName(listName);
  if (mapped === "UNKNOWN_LIST_NAME" || mapped !== blockId) {
    return "INVALID_LIST_NAME_MAPPING";
  }
  return "VALID";
}
