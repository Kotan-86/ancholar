// 仕様: docs/spec/presentation-uc1.md#2-2-ヘッダーと日付ナビゲーション / Task 5
// 仕様: docs/spec/day-duration.md#受入基準 (A-11: 既定の起点 20:30 Asia/Tokyo = UTC 11:30)
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

  it("ホストTZにかかわらず Asia/Tokyo 20:30 の絶対時刻を返す (A-11)", () => {
    process.env.TZ = "UTC";

    expect(parseTargetDate("2026-06-21").toISOString()).toBe(
      "2026-06-21T11:30:00.000Z",
    );
  });

  it("YYYY-MM-DD を当日20時30分の対象日に変換する (A-11)", () => {
    const result = parseTargetDate("2026-06-22");

    expect(formatDateParam(result)).toBe("2026-06-22");
    expect(result.getHours()).toBe(20);
    expect(result.getMinutes()).toBe(30);
  });

  it("?date 未指定(undefined)は既定日の 20:30 になる (A-11)", () => {
    expect(parseTargetDate(undefined).toISOString()).toBe(
      "2026-06-21T11:30:00.000Z",
    );
  });

  it.each([
    undefined,
    ["2026-06-22"],
    "",
    "2026-6-2",
    "2026-02-30",
    "not-a-date",
  ])("未指定または不正値 %j は既定日の 20:30 にフォールバックする (A-11)", (value) => {
    expect(formatDateParam(parseTargetDate(value))).toBe("2026-06-21");
    expect(parseTargetDate(value).toISOString()).toBe(
      "2026-06-21T11:30:00.000Z",
    );
  });

  it("前日・翌日を暦日単位で生成する", () => {
    process.env.TZ = "America/Los_Angeles";
    const targetDate = parseTargetDate("2026-07-01");

    expect(formatDateParam(shiftTargetDate(targetDate, -1))).toBe("2026-06-30");
    expect(formatDateParam(shiftTargetDate(targetDate, 1))).toBe("2026-07-02");
    expect(shiftTargetDate(targetDate, 1).toISOString()).toBe(
      "2026-07-02T11:30:00.000Z",
    );
  });

  it("月末・年末でも Asia/Tokyo の 20:30 を維持して暦日シフトする (A-11)", () => {
    const yearEnd = parseTargetDate("2026-12-31");
    const nextDay = shiftTargetDate(yearEnd, 1);

    expect(formatDateParam(nextDay)).toBe("2027-01-01");
    expect(nextDay.toISOString()).toBe("2027-01-01T11:30:00.000Z");
  });
});
