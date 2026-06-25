// 仕様: docs/application/usecase.md#UC-4
import { SocialJetLagDiagnostic } from "@domain/services/SocialJetLagDiagnostic.js";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import { err, ok, type Result } from "@shared/Result.js";
import type { SocialJetLagAlertDTO } from "@interface/response/SocialJetLagAlertDTO.js";
import type { UseCaseError } from "@interface/errors/UseCaseError.js";
import type { TimelineRepository } from "@interface/ports/TimelineRepository.js";

function nextCalendarDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

export class SocialJetLagEvaluationService {
  constructor(private readonly timelineRepo: TimelineRepository) {}

  async evaluate(targetDate: Date): Promise<Result<SocialJetLagAlertDTO, UseCaseError>> {
    const currentDayResult = await this.buildDayFrame(targetDate);
    if (!currentDayResult.isOk) {
      return err(currentDayResult.error);
    }

    const nextDayResult = await this.buildDayFrame(nextCalendarDay(targetDate));
    if (!nextDayResult.isOk) {
      return err(nextDayResult.error);
    }

    const diagnosis = SocialJetLagDiagnostic.diagnose(
      nextDayResult.value,
      currentDayResult.value,
    );

    return ok({
      hasWarning: diagnosis.hasWarning,
      deltaMinutes: diagnosis.deltaMinutes,
      midSleepTime: diagnosis.midSleepTime,
      previousMidSleepTime: diagnosis.previousMidSleepTime,
    });
  }

  private async buildDayFrame(targetDate: Date) {
    const settingsResult = await this.timelineRepo.getLifestyleSettings(targetDate);
    if (!settingsResult.isOk) {
      return err(settingsResult.error);
    }

    const downTimeResult = await this.timelineRepo.getDownTimeStart(targetDate);
    if (!downTimeResult.isOk) {
      return err(downTimeResult.error);
    }

    return ok(TimelineCalculator.buildDay(downTimeResult.value, settingsResult.value));
  }
}
