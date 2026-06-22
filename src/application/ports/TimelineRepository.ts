// 仕様: docs/application/usecase.md#UC-2
import type { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import type { Result } from "@shared/Result.js";
import type { UseCaseError } from "../errors/AppErrors.js";

export interface TimelineRepository {
  getChronologicalDay(targetDate: Date): Promise<Result<ChronologicalDay, UseCaseError>>;
}
