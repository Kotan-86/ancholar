// 仕様: docs/application/usecase.md#UC-5
import type { BlockId } from "@domain/value-objects/BlockId.js";
import type { AccountKind } from "@domain/value-objects/AccountKind.js";

export type CreateTaskOrEventInput = {
  title: string;
  startTime: Date;
  endTime?: Date;
  targetBlockId: BlockId;
  accountKind: AccountKind;
  targetDate: Date;
};
