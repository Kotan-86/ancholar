// 仕様: docs/application/usecase.md#UC-4
import { describe, expect, it } from "vitest";
import { ValidateNextDaySocialJetLagUseCase } from "@application/usecases/ValidateNextDaySocialJetLagUseCase.js";
import { SocialJetLagEvaluationService } from "@application/services/SocialJetLagEvaluationService.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { createFakeTimelineRepository } from "../../helpers/createFakeTimelineRepository.js";

describe("ValidateNextDaySocialJetLagUseCase", () => {
  // 仕様: docs/spec/day-duration.md#受入基準 F-2(標準の起点は 20:30。§10 の QD-13 により、遅延は +1時間15分)
  const targetDate = new Date("2026-06-21T20:30:00");
  const nextDate = new Date("2026-06-22T20:30:00");

  it("delta >= 60 分で hasWarning: true を返す", async () => {
    const repo = createFakeTimelineRepository({ targetDate });
    repo.setScenarioForDate(nextDate, {
      // 標準の起点 20:30 + 75 分。睡眠中央時刻のズレは 75 分(>= 60 分)
      downTimeStart: new Date("2026-06-22T21:45:00"),
    });
    const useCase = new ValidateNextDaySocialJetLagUseCase(
      new SocialJetLagEvaluationService(repo),
    );

    const result = await useCase.execute({ targetDate });

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.deltaMinutes).toBe(75);
      expect(result.value.hasWarning).toBe(true);
    }
  });

  it("警告を再現する翌日(起点 21:45)が成立する日である(FOCUS 15分、全ブロック start <= end)", async () => {
    // 起点が遅すぎて壊れた日が静かに通ることを防ぐ(QD-13 の再発防止)
    const repo = createFakeTimelineRepository({ targetDate });
    repo.setScenarioForDate(nextDate, {
      downTimeStart: new Date("2026-06-22T21:45:00"),
    });

    const dayResult = await repo.getChronologicalDay(nextDate);

    expect(dayResult.isOk).toBe(true);
    if (dayResult.isOk) {
      const blocks = dayResult.value.blocks;
      expect(blocks).toHaveLength(7);
      for (const block of blocks) {
        expect(block.timeRange.start.getTime()).toBeLessThanOrEqual(
          block.timeRange.end.getTime(),
        );
      }
      const focus = dayResult.value.getBlock(BlockId.FOCUS_TIME);
      expect(focus.duration().minutes).toBe(15);
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
