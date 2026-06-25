// 仕様: docs/application/usecase.md#UC-2 / UC-5
import type { AccountKind } from "@domain/value-objects/AccountKind.js";
import type { BlockId } from "@domain/value-objects/BlockId.js";
import type {
  CreatedEventRecord,
  CreatedTaskRecord,
} from "@interface/records/ExternalRecords.js";
import type { GoogleGateway } from "@interface/ports/GoogleGateway.js";
import type { UseCaseError } from "@interface/errors/UseCaseError.js";
import { err, ok, type Result } from "@shared/Result.js";

export type UpdateTaskTimeCall = {
  taskId: string;
  newStart: Date;
  newEnd: Date;
};

export type UpdateBlockTimeCall = {
  blockId: string;
  newStart: Date;
  newEnd: Date;
};

export type CreateTaskCall = {
  title: string;
  description: string;
  blockId: BlockId;
  accountKind: AccountKind;
  startTime: Date;
  endTime?: Date;
  listName: string;
};

export type CreateEventCall = {
  title: string;
  description: string;
  blockId: BlockId;
  startTime: Date;
  endTime: Date;
};

export type FakeGoogleGatewayOptions = {
  failOn?: {
    method: keyof GoogleGateway;
    error: UseCaseError;
  };
  createdTaskIdPrefix?: string;
  createdEventIdPrefix?: string;
};

export class FakeGoogleGateway implements GoogleGateway {
  readonly updateTaskTimeCalls: UpdateTaskTimeCall[] = [];
  readonly updateBlockTimeCalls: UpdateBlockTimeCall[] = [];
  readonly createTaskCalls: CreateTaskCall[] = [];
  readonly createEventCalls: CreateEventCall[] = [];

  private nextTaskId = 1;
  private nextEventId = 1;
  private readonly options: FakeGoogleGatewayOptions;

  constructor(options: FakeGoogleGatewayOptions = {}) {
    this.options = options;
  }

  setFailure(method: keyof GoogleGateway, error: UseCaseError): void {
    this.options.failOn = { method, error };
  }

  clearFailure(): void {
    delete this.options.failOn;
  }

  async updateTaskTime(
    taskId: string,
    newStart: Date,
    newEnd: Date,
  ): Promise<Result<void, UseCaseError>> {
    this.updateTaskTimeCalls.push({ taskId, newStart, newEnd });

    const failure = this.options.failOn;
    if (failure?.method === "updateTaskTime") {
      return err(failure.error);
    }

    return ok(undefined);
  }

  async updateBlockTime(
    blockId: string,
    newStart: Date,
    newEnd: Date,
  ): Promise<Result<void, UseCaseError>> {
    this.updateBlockTimeCalls.push({ blockId, newStart, newEnd });

    const failure = this.options.failOn;
    if (failure?.method === "updateBlockTime") {
      return err(failure.error);
    }

    return ok(undefined);
  }

  async createTask(props: {
    title: string;
    description: string;
    blockId: BlockId;
    accountKind: AccountKind;
    startTime: Date;
    endTime?: Date;
    listName: string;
  }): Promise<Result<CreatedTaskRecord, UseCaseError>> {
    this.createTaskCalls.push(props);

    const failure = this.options.failOn;
    if (failure?.method === "createTask") {
      return err(failure.error);
    }

    const id = `${this.options.createdTaskIdPrefix ?? "fake-task"}-${this.nextTaskId++}`;
    return ok({
      id,
      title: props.title,
      description: props.description,
      accountKind: props.accountKind,
      startTime: props.startTime,
      endTime: props.endTime ?? null,
      blockId: props.blockId,
      listName: props.listName,
    });
  }

  async createEvent(props: {
    title: string;
    description: string;
    blockId: BlockId;
    startTime: Date;
    endTime: Date;
  }): Promise<Result<CreatedEventRecord, UseCaseError>> {
    this.createEventCalls.push(props);

    const failure = this.options.failOn;
    if (failure?.method === "createEvent") {
      return err(failure.error);
    }

    const id = `${this.options.createdEventIdPrefix ?? "fake-event"}-${this.nextEventId++}`;
    return ok({
      id,
      title: props.title,
      description: props.description,
      startTime: props.startTime,
      endTime: props.endTime,
      blockId: props.blockId,
    });
  }
}
