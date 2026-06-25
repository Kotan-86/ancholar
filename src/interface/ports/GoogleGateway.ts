// 仕様: docs/application/usecase.md#UC-2 / UC-5
import type { Result } from "@shared/Result.js";
import type { AccountKind } from "@domain/value-objects/AccountKind.js";
import type { BlockId } from "@domain/value-objects/BlockId.js";
import type { CreatedEventRecord, CreatedTaskRecord } from "../records/ExternalRecords.js";
import type { UseCaseError } from "../errors/UseCaseError.js";

export interface GoogleGateway {
  updateTaskTime(
    taskId: string,
    newStart: Date,
    newEnd: Date,
  ): Promise<Result<void, UseCaseError>>;
  updateBlockTime(
    blockId: string,
    newStart: Date,
    newEnd: Date,
  ): Promise<Result<void, UseCaseError>>;
  createTask(props: {
    title: string;
    description: string;
    blockId: BlockId;
    accountKind: AccountKind;
    startTime: Date;
    endTime?: Date;
    listName: string;
  }): Promise<Result<CreatedTaskRecord, UseCaseError>>;
  createEvent(props: {
    title: string;
    description: string;
    blockId: BlockId;
    startTime: Date;
    endTime: Date;
  }): Promise<Result<CreatedEventRecord, UseCaseError>>;
}
