// 仕様: docs/application/usecase.md#UC-1
import { err, ok, type Result } from "@shared/Result.js";
import type { GetDailyTimelineInput } from "../dto/GetDailyTimelineInput.js";
import type { TimelineDTO } from "../dto/TimelineDTO.js";
import type { UseCaseError } from "../errors/AppErrors.js";
import { TimelineMapper } from "../mappers/TimelineMapper.js";
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
