// 仕様: docs/application/usecase.md#UC-1
import { ViolationCollector } from "@domain/services/ViolationCollector.js";
import type { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { err, ok, type Result } from "@shared/Result.js";
import type { ViolationAlert } from "@interface/response/ViolationAlert.js";
import type { UseCaseError } from "@interface/errors/UseCaseError.js";
import { ViolationAlertMapper } from "@interface/mappers/ViolationAlertMapper.js";
import { DayAssemblyService } from "./DayAssemblyService.js";
import { SocialJetLagEvaluationService } from "./SocialJetLagEvaluationService.js";

export type EnrichedTimeline = {
  day: ChronologicalDay;
  socialJetLagWarning: boolean;
  violations?: ViolationAlert[];
};

export class TimelineEnrichmentService {
  constructor(
    private readonly dayAssembly: DayAssemblyService,
    private readonly socialJetLag: SocialJetLagEvaluationService,
  ) {}

  async enrich(targetDate: Date): Promise<Result<EnrichedTimeline, UseCaseError>> {
    const assemblyResult = await this.dayAssembly.assembleDayLenient(targetDate);
    if (!assemblyResult.isOk) {
      return err(assemblyResult.error);
    }

    const { day, skippedViolations } = assemblyResult.value;
    const collectedViolations = ViolationCollector.collectViolations(day);
    const violations = ViolationAlertMapper.fromFindings([
      ...skippedViolations,
      ...collectedViolations,
    ]);

    const jetLagResult = await this.socialJetLag.evaluate(targetDate);
    if (!jetLagResult.isOk) {
      return err(jetLagResult.error);
    }

    return ok({
      day,
      socialJetLagWarning: jetLagResult.value.hasWarning,
      violations: violations.length > 0 ? violations : undefined,
    });
  }
}
