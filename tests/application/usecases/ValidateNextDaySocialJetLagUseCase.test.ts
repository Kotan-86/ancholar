// 仕様: docs/application/usecase.md#UC-4
import { describe, expect, it } from "vitest";
import { ValidateNextDaySocialJetLagUseCase } from "@application/usecases/ValidateNextDaySocialJetLagUseCase.js";
import { SocialJetLagEvaluationService } from "@application/services/SocialJetLagEvaluationService.js";
import { createFakeTimelineRepository } from "../../helpers/createFakeTimelineRepository.js";

describe("ValidateNextDaySocialJetLagUseCase", () => {
  const targetDate = new Date("2026-06-21T21:00:00");
  const nextDate = new Date("2026-06-22T21:00:00");

  it("delta >= 60 分で hasWarning: true を返す", async () => {
    const repo = createFakeTimelineRepository({ targetDate });
    repo.setScenarioForDate(nextDate, {
      downTimeStart: new Date("2026-06-22T23:00:00"),
    });
    const useCase = new ValidateNextDaySocialJetLagUseCase(
      new SocialJetLagEvaluationService(repo),
    );

    const result = await useCase.execute({ targetDate });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.deltaMinutes).toBeGreaterThanOrEqual(60);
      expect(result.value.hasWarning).toBe(true);
    }
  });

  it("delta < 60 分で hasWarning: false を返す", async () => {
    const repo = createFakeTimelineRepository({ targetDate });
    repo.setScenarioForDate(nextDate, {
      downTimeStart: nextDate,
    });
    const useCase = new ValidateNextDaySocialJetLagUseCase(
      new SocialJetLagEvaluationService(repo),
    );

    const result = await useCase.execute({ targetDate });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.deltaMinutes).toBeLessThan(60);
      expect(result.value.hasWarning).toBe(false);
    }
  });
});
