// 仕様: docs/application/usecase.md#UC-1 / UC-3 / UC-4 / UC-5
import type { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import type { LifestyleSettings } from "@domain/value-objects/LifestyleSettings.js";
import type { Result } from "@shared/Result.js";
import type {
  ExternalEventRecord,
  ExternalTaskRecord,
} from "../records/ExternalRecords.js";
import type { UseCaseError } from "../errors/UseCaseError.js";

export interface TimelineRepository {
  getLifestyleSettings(targetDate: Date): Promise<Result<LifestyleSettings, UseCaseError>>;
  getDownTimeStart(targetDate: Date): Promise<Result<Date, UseCaseError>>;
  getTasksForDay(targetDate: Date): Promise<Result<ExternalTaskRecord[], UseCaseError>>;
  getEventsForDay(targetDate: Date): Promise<Result<ExternalEventRecord[], UseCaseError>>;
  getChronologicalDay(targetDate: Date): Promise<Result<ChronologicalDay, UseCaseError>>;
}
