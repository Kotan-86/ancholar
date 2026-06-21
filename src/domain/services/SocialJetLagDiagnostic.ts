// 仕様: README.md ルール⑤ 社会的時差ぼけ（ソーシャルジェットラグ）警告システム
import { BlockId } from "../value-objects/BlockId.js";
import type { ChronologicalDay } from "../entities/ChronologicalDay.js";

const WARNING_THRESHOLD_MINUTES = 60;

export type SocialJetLagResult = {
  midSleepTime: Date;
  templateMidSleepTime: Date;
  deltaMinutes: number;
  hasWarning: boolean;
};

export class SocialJetLagDiagnostic {
  static diagnose(
    day: ChronologicalDay,
    templateMidSleepTime: Date,
  ): SocialJetLagResult {
    const sleepBlock = day.getBlock(BlockId.SLEEP_TIME);
    const bedtime = sleepBlock.timeRange.start;
    const wakeTime = sleepBlock.timeRange.end;
    const sleepDurationMs = wakeTime.getTime() - bedtime.getTime();
    const midSleepTime = new Date(bedtime.getTime() + sleepDurationMs / 2);

    const deltaMinutes = Math.abs(
      (midSleepTime.getTime() - templateMidSleepTime.getTime()) / (60 * 1000),
    );

    return {
      midSleepTime,
      templateMidSleepTime,
      deltaMinutes,
      hasWarning: deltaMinutes >= WARNING_THRESHOLD_MINUTES,
    };
  }
}
