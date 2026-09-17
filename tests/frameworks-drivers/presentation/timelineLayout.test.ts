// 仕様: docs/spec/presentation-uc1.md#AC-8
import { describe, expect, it } from "vitest";
import { calculateTimelineTaskLayout } from "@presentation/utils/timelineLayout.js";

describe("calculateTimelineTaskLayout", () => {
  const anchorDate = new Date("2026-06-21T21:00:00");
  const fallbackEndTime = new Date("2026-06-22T17:00:00");

  it("anchorDate と1日の総時間から top と height の割合を算出する", () => {
    const result = calculateTimelineTaskLayout({
      anchorDate,
      totalDurationMinutes: 23 * 60,
      task: {
        startTime: new Date("2026-06-22T09:00:00"),
        endTime: new Date("2026-06-22T10:30:00"),
      },
      fallbackEndTime,
    });

    expect(result).not.toBeNull();
    expect(result?.topPercent).toBeCloseTo((12 * 60 * 100) / (23 * 60));
    expect(result?.heightPercent).toBeCloseTo((90 * 100) / (23 * 60));
  });

  it("endTime が null の場合は fallbackEndTime を終端に使う", () => {
    const result = calculateTimelineTaskLayout({
      anchorDate,
      totalDurationMinutes: 23 * 60,
      task: {
        startTime: new Date("2026-06-22T16:00:00"),
        endTime: null,
      },
      fallbackEndTime,
    });

    expect(result?.heightPercent).toBeCloseTo((60 * 100) / (23 * 60));
  });

  it("1日全体を占める期間は top 0%、height 100% を返す", () => {
    const dayEnd = new Date(anchorDate.getTime() + 23 * 60 * 60 * 1000);

    expect(
      calculateTimelineTaskLayout({
        anchorDate,
        totalDurationMinutes: 23 * 60,
        task: { startTime: anchorDate, endTime: dayEnd },
        fallbackEndTime,
      }),
    ).toEqual({ topPercent: 0, heightPercent: 100 });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "総時間が不正な値 %s の場合は null を返す",
    (totalDurationMinutes) => {
      expect(
        calculateTimelineTaskLayout({
          anchorDate,
          totalDurationMinutes,
          task: {
            startTime: new Date("2026-06-22T09:00:00"),
            endTime: new Date("2026-06-22T10:00:00"),
          },
          fallbackEndTime,
        }),
      ).toBeNull();
    },
  );

  it("日時が不正、または終端が開始以前の場合は null を返す", () => {
    expect(
      calculateTimelineTaskLayout({
        anchorDate: new Date(Number.NaN),
        totalDurationMinutes: 23 * 60,
        task: {
          startTime: new Date("2026-06-22T09:00:00"),
          endTime: new Date("2026-06-22T10:00:00"),
        },
        fallbackEndTime,
      }),
    ).toBeNull();

    expect(
      calculateTimelineTaskLayout({
        anchorDate,
        totalDurationMinutes: 23 * 60,
        task: {
          startTime: new Date("2026-06-22T10:00:00"),
          endTime: new Date("2026-06-22T10:00:00"),
        },
        fallbackEndTime,
      }),
    ).toBeNull();
  });

  it("正常値は表示領域へクランプしない", () => {
    const result = calculateTimelineTaskLayout({
      anchorDate,
      totalDurationMinutes: 60,
      task: {
        startTime: new Date("2026-06-21T20:30:00"),
        endTime: new Date("2026-06-21T22:30:00"),
      },
      fallbackEndTime,
    });

    expect(result).toEqual({ topPercent: -50, heightPercent: 200 });
  });
});
