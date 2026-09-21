// 仕様: docs/spec/presentation-uc1.md#2-3-2-時刻ラベルと横罫線 (§2-3-1 グリッド高さ / §2-3-3 文字量の3段階)
export const PIXELS_PER_HOUR = 48;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_MINUTE = 60 * 1000;
const JST_OFFSET_HOURS = 9;
const TWO_LINES_MIN_HEIGHT_PX = 32;
const NAME_ONLY_MIN_HEIGHT_PX = 16;

export type HourMark = {
  readonly label: string;
  readonly topPercent: number;
};

export type CalculateHourMarksInput = {
  readonly anchorDate: Date;
  readonly totalDurationMinutes: number;
};

export type TextTier = "twoLines" | "nameOnly" | "bandOnly";

/** 1日の総時間(分)から、グリッド全体の高さ(px)を求める。丸めない。 */
export function calculateGridHeightPx(totalDurationMinutes: number): number {
  if (!Number.isFinite(totalDurationMinutes) || totalDurationMinutes <= 0) {
    return 0;
  }
  return (totalDurationMinutes / 60) * PIXELS_PER_HOUR;
}

/**
 * 上端以上・下端以下のすべての正時(Asia/Tokyo)を、1日を100%とした位置で返す。
 * Asia/Tokyo は UTC+9(夏時間なし)で、正時は UTC の正時と一致する。
 */
export function calculateHourMarks(input: CalculateHourMarksInput): HourMark[] {
  const { anchorDate, totalDurationMinutes } = input;
  const anchorTime = anchorDate.getTime();

  if (
    !Number.isFinite(totalDurationMinutes) ||
    totalDurationMinutes <= 0 ||
    !Number.isFinite(anchorTime)
  ) {
    return [];
  }

  const endTime = anchorTime + totalDurationMinutes * MILLISECONDS_PER_MINUTE;
  const marks: HourMark[] = [];

  for (
    let time = Math.ceil(anchorTime / MILLISECONDS_PER_HOUR) * MILLISECONDS_PER_HOUR;
    time <= endTime;
    time += MILLISECONDS_PER_HOUR
  ) {
    const jstHour =
      (Math.floor(time / MILLISECONDS_PER_HOUR) + JST_OFFSET_HOURS) % 24;
    marks.push({
      label: `${String(jstHour).padStart(2, "0")}:00`,
      topPercent:
        ((time - anchorTime) / MILLISECONDS_PER_MINUTE / totalDurationMinutes) * 100,
    });
  }

  return marks;
}

/** 高さ(px)から、文字量の3段階を決める。 */
export function resolveTextTier(heightPx: number): TextTier {
  if (heightPx >= TWO_LINES_MIN_HEIGHT_PX) return "twoLines";
  if (heightPx >= NAME_ONLY_MIN_HEIGHT_PX) return "nameOnly";
  return "bandOnly";
}
