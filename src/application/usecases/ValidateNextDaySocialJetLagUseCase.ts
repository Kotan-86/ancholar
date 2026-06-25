// 仕様: docs/application/usecase.md#UC-4
import { err, ok, type Result } from "@shared/Result.js";
import type { SocialJetLagAlertDTO } from "@interface/response/SocialJetLagAlertDTO.js";
import type { ValidateNextDaySocialJetLagInput } from "@interface/request/ValidateNextDaySocialJetLagInput.js";
import type { UseCaseError } from "@interface/errors/UseCaseError.js";
import { SocialJetLagEvaluationService } from "../services/SocialJetLagEvaluationService.js";

export class ValidateNextDaySocialJetLagUseCase {
  constructor(private readonly socialJetLag: SocialJetLagEvaluationService) {}

  async execute(
    input: ValidateNextDaySocialJetLagInput,
  ): Promise<Result<SocialJetLagAlertDTO, UseCaseError>> {
    return this.socialJetLag.evaluate(input.targetDate);
  }
}
