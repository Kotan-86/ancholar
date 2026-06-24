// 仕様: README.md ルール⑤ 社会的時差ぼけ（ソーシャルジェットラグ）警告システム
import { BlockId } from "../value-objects/BlockId.js";
import type { ChronologicalDay } from "../entities/ChronologicalDay.js";

const WARNING_THRESHOLD_MINUTES = 60;

export type SocialJetLagResult = {
  midSleepTime: Date;
  previousMidSleepTime: Date;
  deltaMinutes: number;
  hasWarning: boolean;
};

export class SocialJetLagDiagnostic {
  static diagnose(
    day: ChronologicalDay,
    previousDay: ChronologicalDay,
  ): SocialJetLagResult {
    const midSleepTime = this.computeMidSleepTime(day);
    const previousMidSleepTime = this.computeMidSleepTime(previousDay);

    const deltaMinutes = circularTimeDeltaMinutes(
      midSleepTime,
      previousMidSleepTime,
    );

    return {
      midSleepTime,
      previousMidSleepTime,
      deltaMinutes,
      hasWarning: deltaMinutes >= WARNING_THRESHOLD_MINUTES,
    };
  }

  private static computeMidSleepTime(day: ChronologicalDay): Date {
    const sleepBlock = day.getBlock(BlockId.SLEEP_TIME);
    const bedtime = sleepBlock.timeRange.start;
    const wakeTime = sleepBlock.timeRange.end;
    const sleepDurationMs = wakeTime.getTime() - bedtime.getTime();
    return new Date(bedtime.getTime() + sleepDurationMs / 2);
  }
}

function circularTimeDeltaMinutes(a: Date, b: Date): number {
  const minutesInDay = 24 * 60;
  const aMinutes = a.getHours() * 60 + a.getMinutes();
  const bMinutes = b.getHours() * 60 + b.getMinutes();
  const diff = Math.abs(aMinutes - bMinutes);
  return Math.min(diff, minutesInDay - diff);
}
