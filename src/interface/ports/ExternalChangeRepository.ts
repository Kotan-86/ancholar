// 仕様: docs/application/usecase.md#UC-3
import type { Result } from "@shared/Result.js";
import type { ExternalChangeDTO } from "../response/ExternalChangeDTO.js";
import type { UseCaseError } from "../errors/UseCaseError.js";

export interface ExternalChangeRepository {
  getChangesSince(since: Date, until: Date): Promise<Result<ExternalChangeDTO[], UseCaseError>>;
}
