// 仕様: docs/application/usecase.md#UC-2
import type { Result } from "@shared/Result.js";
import type { UseCaseError } from "../errors/AppErrors.js";

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
}
