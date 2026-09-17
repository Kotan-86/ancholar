// 仕様: docs/spec/presentation-uc1.md#2-2-日付の指定 / Task 5
import { afterEach, describe, expect, it } from "vitest";
import {
  formatDateParam,
  parseTargetDate,
  shiftTargetDate,
} from "@frameworks-drivers/nextjs/app/dateQuery.js";

describe("dateQuery", () => {
  const originalTimezone = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTimezone;
  });

  it("ホストTZにかかわらず Asia/Tokyo 21:00 の絶対時刻を返す", () => {
    process.env.TZ = "UTC";

    expect(parseTargetDate("2026-06-21").toISOString()).toBe(
      "2026-06-21T12:00:00.000Z",
    );
  });

  it("YYYY-MM-DD を当日21時の対象日に変換する", () => {
    const result = parseTargetDate("2026-06-22");

    expect(formatDateParam(result)).toBe("2026-06-22");
    expect(result.getHours()).toBe(21);
    expect(result.getMinutes()).toBe(0);
  });

  it.each([
    undefined,
    ["2026-06-22"],
    "",
    "2026-6-2",
    "2026-02-30",
    "not-a-date",
  ])("未指定または不正値 %j は既定日にフォールバックする", (value) => {
    expect(formatDateParam(parseTargetDate(value))).toBe("2026-06-21");
  });

  it("前日・翌日を暦日単位で生成する", () => {
    process.env.TZ = "America/Los_Angeles";
    const targetDate = parseTargetDate("2026-07-01");

    expect(formatDateParam(shiftTargetDate(targetDate, -1))).toBe("2026-06-30");
    expect(formatDateParam(shiftTargetDate(targetDate, 1))).toBe("2026-07-02");
    expect(shiftTargetDate(targetDate, 1).toISOString()).toBe(
      "2026-07-02T12:00:00.000Z",
    );
  });

  it("月末・年末でも Asia/Tokyo の21時を維持して暦日シフトする", () => {
    const yearEnd = parseTargetDate("2026-12-31");
    const nextDay = shiftTargetDate(yearEnd, 1);

    expect(formatDateParam(nextDay)).toBe("2027-01-01");
    expect(nextDay.toISOString()).toBe("2027-01-01T12:00:00.000Z");
  });
});
