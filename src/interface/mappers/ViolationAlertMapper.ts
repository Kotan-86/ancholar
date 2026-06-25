// 仕様: docs/application/usecase.md#UC-3
import type { ViolationFinding, ViolationKind } from "@domain/services/ViolationCollector.js";
import type { ViolationAlert } from "../response/ViolationAlert.js";

export class ViolationAlertMapper {
  static fromFindings(findings: ViolationFinding[]): ViolationAlert[] {
    return findings.map(ViolationAlertMapper.fromFinding);
  }

  static fromFinding(finding: ViolationFinding): ViolationAlert {
    return {
      targetId: finding.targetId,
      targetTitle: finding.targetTitle,
      violationType: ViolationAlertMapper.toViolationType(finding.kind),
      message: ViolationAlertMapper.messageFor(finding),
    };
  }

  private static toViolationType(
    kind: ViolationKind,
  ): ViolationAlert["violationType"] {
    switch (kind) {
      case "HARD_CEILING":
        return "HARD_CEILING_EXCEEDED";
      case "FLOOR_BROKEN":
        return "FLOOR_CONSTRAINT_BROKEN";
      case "INVALID_MAPPING":
        return "INVALID_MAPPING";
    }
  }

  private static messageFor(finding: ViolationFinding): string {
    switch (finding.kind) {
      case "HARD_CEILING":
        return `「${finding.targetTitle}」が仕事の天井（Hard Ceiling）を突破しています。`;
      case "FLOOR_BROKEN":
        return `「${finding.targetTitle}」の最小保証時間（Floor）を下回っています。`;
      case "INVALID_MAPPING":
        return `「${finding.targetTitle}」のリスト名とブロックの対応が不正です。`;
    }
  }
}
