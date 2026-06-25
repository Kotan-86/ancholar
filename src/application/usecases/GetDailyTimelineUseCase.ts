// 仕様: docs/application/usecase.md#UC-1
import { err, ok, type Result } from "@shared/Result.js";
import type { GetDailyTimelineInput } from "@interface/request/GetDailyTimelineInput.js";
import type { TimelineDTO } from "@interface/response/TimelineDTO.js";
import type { UseCaseError } from "@interface/errors/UseCaseError.js";
import { TimelineMapper } from "@interface/mappers/TimelineMapper.js";
import { TimelineEnrichmentService } from "../services/TimelineEnrichmentService.js";

export class GetDailyTimelineUseCase {
  constructor(private readonly timelineEnrichment: TimelineEnrichmentService) {}

  async execute(
    input: GetDailyTimelineInput,
  ): Promise<Result<TimelineDTO, UseCaseError>> {
    const enrichedResult = await this.timelineEnrichment.enrich(input.targetDate);
    if (!enrichedResult.isOk) {
      return err(enrichedResult.error);
    }

    const { day, socialJetLagWarning, violations } = enrichedResult.value;
    return ok(TimelineMapper.toDTO(day, socialJetLagWarning, violations));
  }
}
