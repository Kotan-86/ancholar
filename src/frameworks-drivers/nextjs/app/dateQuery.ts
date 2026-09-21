const DEFAULT_DATE_PARAM = "2026-06-21";
const DATE_PARAM_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// 仕様: docs/spec/day-duration.md §4-3 / A-11（既定の起点は Asia/Tokyo 20:30 = UTC 11:30）
const TOKYO_TARGET_HOUR_UTC = 11;
const TOKYO_TARGET_MINUTE_UTC = 30;

const tokyoDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** URL の暦日を、UC-1 が期待する当日 20:30（Asia/Tokyo）の Date に変換する。 */
export function parseTargetDate(value: string | string[] | undefined): Date {
  const dateParam = typeof value === "string" ? value : DEFAULT_DATE_PARAM;
  const match = DATE_PARAM_PATTERN.exec(dateParam);

  if (!match) {
    return createDefaultTargetDate();
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const targetDate = createTokyoTargetDate(year, monthIndex, day);

  if (
    targetDate.getUTCFullYear() !== year ||
    targetDate.getUTCMonth() !== monthIndex ||
    targetDate.getUTCDate() !== day
  ) {
    return createDefaultTargetDate();
  }

  return targetDate;
}

export function formatDateParam(date: Date): string {
  const { year, month, day } = getTokyoCalendarDate(date);
  return `${year}-${month}-${day}`;
}

export function shiftTargetDate(date: Date, days: number): Date {
  const { year, month, day } = getTokyoCalendarDate(date);
  return createTokyoTargetDate(
    Number(year),
    Number(month) - 1,
    Number(day) + days,
  );
}

function createDefaultTargetDate(): Date {
  return createTokyoTargetDate(2026, 5, 21);
}

/** Asia/Tokyo の20:30（UTC 11:30）をホストTZに依存せず生成する。 */
function createTokyoTargetDate(
  year: number,
  monthIndex: number,
  day: number,
): Date {
  const targetDate = new Date(0);
  targetDate.setUTCFullYear(year, monthIndex, day);
  targetDate.setUTCHours(TOKYO_TARGET_HOUR_UTC, TOKYO_TARGET_MINUTE_UTC, 0, 0);
  return targetDate;
}

function getTokyoCalendarDate(date: Date): {
  year: string;
  month: string;
  day: string;
} {
  const parts = tokyoDateFormatter.formatToParts(date);
  const part = (type: "year" | "month" | "day") =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
  };
}
