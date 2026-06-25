// 仕様: docs/application/usecase.md#UC-3
import type { ExternalChangeDTO } from "@interface/response/ExternalChangeDTO.js";
import type { ExternalChangeRepository } from "@interface/ports/ExternalChangeRepository.js";
import type { UseCaseError } from "@interface/errors/UseCaseError.js";
import { err, ok, type Result } from "@shared/Result.js";

export type FakeExternalChange = ExternalChangeDTO & {
  occurredAt: Date;
};

export type FakeExternalChangeRepositoryOptions = {
  changes?: FakeExternalChange[];
  error?: UseCaseError;
};

export class FakeExternalChangeRepository implements ExternalChangeRepository {
  private changes: FakeExternalChange[];
  private error?: UseCaseError;

  constructor(options: FakeExternalChangeRepositoryOptions = {}) {
    this.changes = options.changes ?? [];
    this.error = options.error;
  }

  setChanges(changes: FakeExternalChange[]): void {
    this.changes = changes;
  }

  addChange(change: FakeExternalChange): void {
    this.changes.push(change);
  }

  setError(error: UseCaseError | undefined): void {
    this.error = error;
  }

  async getChangesSince(
    since: Date,
    until: Date,
  ): Promise<Result<ExternalChangeDTO[], UseCaseError>> {
    if (this.error) {
      return err(this.error);
    }

    const filtered = this.changes
      .filter(
        (change) =>
          change.occurredAt.getTime() >= since.getTime() &&
          change.occurredAt.getTime() <= until.getTime(),
      )
      .map(({ occurredAt: _occurredAt, ...dto }) => dto);

    return ok(filtered);
  }
}
