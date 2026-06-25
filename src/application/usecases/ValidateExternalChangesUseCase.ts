// 仕様: docs/application/usecase.md#UC-3
import { ViolationCollector } from "@domain/services/ViolationCollector.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId, blockIdFromListName } from "@domain/value-objects/BlockId.js";
import { err, ok, type Result } from "@shared/Result.js";
import type { ExternalChangeDTO } from "@interface/response/ExternalChangeDTO.js";
import type { ValidateExternalChangesInput } from "@interface/request/ValidateExternalChangesInput.js";
import type { ViolationAlert } from "@interface/response/ViolationAlert.js";
import type { UseCaseError } from "@interface/errors/UseCaseError.js";
import { ViolationAlertMapper } from "@interface/mappers/ViolationAlertMapper.js";
import type { ExternalChangeRepository } from "@interface/ports/ExternalChangeRepository.js";
import { DayAssemblyService } from "../services/DayAssemblyService.js";

export class ValidateExternalChangesUseCase {
  constructor(
    private readonly externalChangeRepo: ExternalChangeRepository,
    private readonly dayAssembly: DayAssemblyService,
  ) {}

  async execute(
    input: ValidateExternalChangesInput,
  ): Promise<Result<ViolationAlert[], UseCaseError>> {
    const until = new Date();
    const changesResult = await this.externalChangeRepo.getChangesSince(
      input.focusTimeStartedAt,
      until,
    );
    if (!changesResult.isOk) {
      return err(changesResult.error);
    }

    const changes = changesResult.value;

    const dayResult = await this.dayAssembly.assembleDayLenient(input.targetDate);
    if (!dayResult.isOk) {
      return err(dayResult.error);
    }

    const { day, skippedViolations } = dayResult.value;
    const changeFindings = ValidateExternalChangesUseCase.evaluateChanges(day, changes);
    const blockFindings = ViolationCollector.collectViolations(day).filter(
      (f) => f.kind === "FLOOR_BROKEN",
    );
    const findings = ValidateExternalChangesUseCase.deduplicateFindings([
      ...skippedViolations,
      ...changeFindings,
      ...blockFindings,
    ]);

    return ok(ViolationAlertMapper.fromFindings(findings));
  }

  private static evaluateChanges(
    day: import("@domain/entities/ChronologicalDay.js").ChronologicalDay,
    changes: ExternalChangeDTO[],
  ) {
    const findings = [];

    for (const change of changes) {
      if (change.action === "DELETED") {
        continue;
      }

      const placementInput = ValidateExternalChangesUseCase.toPlacementInput(change);
      if (!placementInput) {
        continue;
      }

      const status = ViolationCollector.evaluateTaskPlacement(day, placementInput);
      const finding = ViolationCollector.toViolationFinding(placementInput, status);
      if (finding) {
        findings.push(finding);
      }
    }

    return findings;
  }

  private static toPlacementInput(change: ExternalChangeDTO) {
    if (!change.newStart) {
      return null;
    }

    const accountKind =
      change.accountKind === "Work" ? AccountKind.Work : AccountKind.Private;

    if (change.type === "EVENT") {
      if (!change.newEnd) {
        return null;
      }
      return {
        id: change.id,
        title: change.id,
        listName: "WORK TIME",
        blockId: BlockId.WORK_TIME,
        accountKind: AccountKind.Work,
        startTime: change.newStart,
        endTime: change.newEnd,
      };
    }

    if (!change.listName) {
      return null;
    }

    let blockId: BlockId;
    try {
      blockId = blockIdFromListName(change.listName);
    } catch {
      blockId = BlockId.WORK_TIME;
    }

    return {
      id: change.id,
      title: change.id,
      listName: change.listName,
      blockId,
      accountKind,
      startTime: change.newStart,
      endTime: change.newEnd ?? null,
    };
  }

  private static deduplicateFindings(
    findings: import("@domain/services/ViolationCollector.js").ViolationFinding[],
  ) {
    const seen = new Set<string>();
    return findings.filter((finding) => {
      const key = `${finding.targetId}:${finding.kind}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
