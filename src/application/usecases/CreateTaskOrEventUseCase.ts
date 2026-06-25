// 仕様: docs/application/usecase.md#UC-5
import { ViolationCollector } from "@domain/services/ViolationCollector.js";
import { Task } from "@domain/entities/Task.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId, listNameFromBlockId } from "@domain/value-objects/BlockId.js";
import { err, ok, type Result } from "@shared/Result.js";
import type { CreateTaskOrEventInput } from "@interface/request/CreateTaskOrEventInput.js";
import type { CreatedTaskDTO } from "@interface/response/CreatedTaskDTO.js";
import type { UseCaseError } from "@interface/errors/UseCaseError.js";
import type { GoogleGateway } from "@interface/ports/GoogleGateway.js";
import { DayAssemblyService } from "../services/DayAssemblyService.js";

export class CreateTaskOrEventUseCase {
  constructor(
    private readonly dayAssembly: DayAssemblyService,
    private readonly googleGateway: GoogleGateway,
  ) {}

  async execute(
    input: CreateTaskOrEventInput,
  ): Promise<Result<CreatedTaskDTO, UseCaseError>> {
    const dayResult = await this.dayAssembly.assembleDay(input.targetDate);
    if (!dayResult.isOk) {
      return err(dayResult.error);
    }

    const listName = listNameFromBlockId(input.targetBlockId);

    try {
      if (input.accountKind === AccountKind.Private) {
        return await this.createPrivateTask(input, dayResult.value, listName);
      }
      return await this.createWorkTaskOrEvent(input, dayResult.value, listName);
    } catch (error) {
      return err(CreateTaskOrEventUseCase.toRuleViolationError(error));
    }
  }

  private async createPrivateTask(
    input: CreateTaskOrEventInput,
    day: import("@domain/entities/ChronologicalDay.js").ChronologicalDay,
    listName: string,
  ): Promise<Result<CreatedTaskDTO, UseCaseError>> {
    const block = day.getBlock(input.targetBlockId);
    const status = ViolationCollector.evaluateTaskPlacement(day, {
      id: "provisional",
      title: input.title,
      listName,
      blockId: input.targetBlockId,
      accountKind: AccountKind.Private,
      startTime: input.startTime,
    });

    if (status !== "VALID") {
      return err(CreateTaskOrEventUseCase.placementStatusToError(status, input.title));
    }

    Task.createPrivate({
      id: "provisional",
      title: input.title,
      description: "",
      blockId: input.targetBlockId,
      startTime: input.startTime,
      listName,
      blockTimeRange: block.timeRange,
    });

    const createResult = await this.googleGateway.createTask({
      title: input.title,
      description: "",
      blockId: input.targetBlockId,
      accountKind: AccountKind.Private,
      startTime: input.startTime,
      listName,
    });
    if (!createResult.isOk) {
      return err(createResult.error);
    }

    return ok(CreateTaskOrEventUseCase.toCreatedTaskDTO(createResult.value));
  }

  private async createWorkTaskOrEvent(
    input: CreateTaskOrEventInput,
    day: import("@domain/entities/ChronologicalDay.js").ChronologicalDay,
    listName: string,
  ): Promise<Result<CreatedTaskDTO, UseCaseError>> {
    if (!input.endTime) {
      return err({
        type: "InvalidTaskMapping",
        message: "仕事用タスクには endTime が必要です。",
      });
    }

    if (input.targetBlockId !== BlockId.WORK_TIME) {
      return err({
        type: "InvalidTaskMapping",
        message: "仕事用タスクは WORK_TIME ブロックにのみ配置できます。",
      });
    }

    const status = ViolationCollector.evaluateTaskPlacement(day, {
      id: "provisional",
      title: input.title,
      listName,
      blockId: input.targetBlockId,
      accountKind: AccountKind.Work,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    if (status !== "VALID") {
      return err(CreateTaskOrEventUseCase.placementStatusToError(status, input.title));
    }

    Task.createWork({
      id: "provisional",
      title: input.title,
      description: "",
      blockId: input.targetBlockId,
      startTime: input.startTime,
      endTime: input.endTime,
      listName,
    });

    const createResult = await this.googleGateway.createEvent({
      title: input.title,
      description: "",
      blockId: input.targetBlockId,
      startTime: input.startTime,
      endTime: input.endTime,
    });
    if (!createResult.isOk) {
      return err(createResult.error);
    }

    return ok({
      id: createResult.value.id,
      title: createResult.value.title,
      description: createResult.value.description,
      accountKind: "Work",
      startTime: createResult.value.startTime,
      endTime: createResult.value.endTime,
      blockId: createResult.value.blockId,
      listName,
    });
  }

  private static placementStatusToError(
    status: import("@domain/services/ViolationCollector.js").TaskPlacementStatus,
    title: string,
  ): UseCaseError {
    if (status === "HARD_CEILING") {
      return {
        type: "HardCeilingExceeded",
        message: "仕事用タスクがWORK TIMEの天井を超えています。前夜の防衛を優先してください。",
      };
    }
    return {
      type: "InvalidTaskMapping",
      message: `タスク ${title} の配置がルールに違反しています。`,
    };
  }

  private static toCreatedTaskDTO(record: {
    id: string;
    title: string;
    description: string;
    accountKind: AccountKind;
    startTime: Date;
    endTime: Date | null;
    blockId: BlockId;
    listName: string;
  }): CreatedTaskDTO {
    return {
      id: record.id,
      title: record.title,
      description: record.description,
      accountKind: record.accountKind === AccountKind.Work ? "Work" : "Private",
      startTime: record.startTime,
      endTime: record.endTime,
      blockId: record.blockId,
      listName: record.listName,
    };
  }

  private static toRuleViolationError(error: unknown): UseCaseError {
    const message = error instanceof Error ? error.message : "ルール違反が発生しました。";
    return {
      type: "InvalidTaskMapping",
      message,
    };
  }
}
