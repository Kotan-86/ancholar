// 仕様: docs/spec/presentation-uc1.md#2-4-WORK-TIME-タイムグリッドとタスク面
import type { TaskDTO } from "@interface/response/TimelineDTO.js";

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export type TimelineTaskLayout = {
  readonly topPercent: number;
  readonly heightPercent: number;
};

export type CalculateTimelineTaskLayoutInput = {
  readonly anchorDate: Date;
  readonly totalDurationMinutes: number;
  readonly task: Pick<TaskDTO, "startTime" | "endTime">;
  readonly fallbackEndTime: Date;
};

/**
 * 1日全体を100%としたタスク面の上端と高さを算出する。
 *
 * DTO境界が壊れている場合に不正なCSS値を生成しないよう、計算不能な入力は
 * null として呼び出し側へ返す。正常な値は表示領域へクランプしない。
 */
export function calculateTimelineTaskLayout(
  input: CalculateTimelineTaskLayoutInput,
): TimelineTaskLayout | null {
  const { anchorDate, totalDurationMinutes, task, fallbackEndTime } = input;

  if (!Number.isFinite(totalDurationMinutes) || totalDurationMinutes <= 0) {
    return null;
  }

  const anchorTime = anchorDate.getTime();
  const startTime = task.startTime.getTime();
  const endTime = (task.endTime ?? fallbackEndTime).getTime();

  if (
    !Number.isFinite(anchorTime) ||
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime <= startTime
  ) {
    return null;
  }

  const totalDurationMilliseconds =
    totalDurationMinutes * MILLISECONDS_PER_MINUTE;
  const topPercent =
    ((startTime - anchorTime) / totalDurationMilliseconds) * 100;
  const heightPercent =
    ((endTime - startTime) / totalDurationMilliseconds) * 100;

  if (!Number.isFinite(topPercent) || !Number.isFinite(heightPercent)) {
    return null;
  }

  return { topPercent, heightPercent };
}
