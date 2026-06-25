// 仕様: docs/application/usecase.md#UC-1 / UC-5
import type { AccountKind } from "@domain/value-objects/AccountKind.js";
import type { BlockId } from "@domain/value-objects/BlockId.js";

export type ExternalTaskRecord = {
  id: string;
  title: string;
  description: string;
  blockId: BlockId;
  accountKind: AccountKind;
  startTime: Date;
  endTime?: Date;
  listName: string;
};

export type ExternalEventRecord = {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  blockId: BlockId;
};

export type CreatedTaskRecord = {
  id: string;
  title: string;
  description: string;
  accountKind: AccountKind;
  startTime: Date;
  endTime: Date | null;
  blockId: BlockId;
  listName: string;
};

export type CreatedEventRecord = {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  blockId: BlockId;
};
