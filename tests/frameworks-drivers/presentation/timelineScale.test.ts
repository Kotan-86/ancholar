// 仕様: docs/spec/presentation-uc1.md#4-受入基準 (AC-9 / AC-13 / AC-16 の算出、AC-2 / AC-20 の閾値)
import { describe, expect, it } from "vitest";
import {
  PIXELS_PER_HOUR,
  calculateGridHeightPx,
  calculateHourMarks,
  resolveTextTier,
} from "@presentation/utils/timelineScale.js";

const ANCHOR_2030 = new Date("2026-06-21T20:30:00+09:00");
const ANCHOR_2035 = new Date("2026-06-21T20:35:00+09:00");

describe("calculateGridHeightPx / PIXELS_PER_HOUR (AC-13)", () => {
  it("1時間あたり48px", () => {
    expect(PIXELS_PER_HOUR).toBe(48);
  });

  it.each([
    [1380, 1104],
    [1440, 1152],
    [1500, 1200],
  ])("総時間 %s 分のグリッド高さは %s px", (total, expected) => {
    expect(calculateGridHeightPx(total)).toBe(expected);
  });

  it("端数は丸めない", () => {
    expect(calculateGridHeightPx(1441)).toBeCloseTo((1441 / 60) * 48, 10);
  });

  it.each([0, -60])("総時間 %s 以下は 0", (total) => {
    expect(calculateGridHeightPx(total)).toBe(0);
  });
});

describe("calculateHourMarks (AC-9 / AC-16 / AC-13 の算出)", () => {
  it("既定(20:30 / 1440): 21:00〜翌20:00 の24本で、上端20:30・下端の20:30 は無い (AC-9)", () => {
    const marks = calculateHourMarks({
      anchorDate: ANCHOR_2030,
      totalDurationMinutes: 1440,
    });

    expect(marks).toHaveLength(24);
    expect(marks[0]!.label).toBe("21:00");
    expect(marks[23]!.label).toBe("20:00");
    expect(marks.map((m) => m.label)).not.toContain("20:30");
    expect(marks[0]!.topPercent).toBeCloseTo((30 / 1440) * 100, 10);
    expect(marks[23]!.topPercent).toBeCloseTo((1410 / 1440) * 100, 10);
  });

  it("各ラベルの top は ((30+60i)/total)*100 と一致する。丸めない (AC-9 / AC-13)", () => {
    const marks = calculateHourMarks({
      anchorDate: ANCHOR_2030,
      totalDurationMinutes: 1440,
    });
    marks.forEach((m, i) => {
      expect(m.topPercent).toBeCloseTo(((30 + 60 * i) / 1440) * 100, 10);
    });
    // 4桁などに丸めた値ではない
    expect(marks[0]!.topPercent).not.toBe(2.0833);
  });

  it("ラベルは HH:00 形式で、23:00 の次は 00:00(24:00 ではない) (AC-9)", () => {
    const labels = calculateHourMarks({
      anchorDate: ANCHOR_2030,
      totalDurationMinutes: 1440,
    }).map((m) => m.label);

    for (const label of labels) expect(label).toMatch(/^\d{2}:00$/);
    expect(labels[labels.indexOf("23:00") + 1]).toBe("00:00");
    expect(labels).not.toContain("24:00");
  });

  it("上端が正時でない日(20:35)は、最初のラベルが 21:00 で 25/1440*100、24本 (AC-16)", () => {
    const marks = calculateHourMarks({
      anchorDate: ANCHOR_2035,
      totalDurationMinutes: 1440,
    });

    expect(marks).toHaveLength(24);
    expect(marks[0]!.label).toBe("21:00");
    expect(marks[0]!.topPercent).toBeCloseTo((25 / 1440) * 100, 10);
    expect(marks[23]!.label).toBe("20:00");
  });

  it.each([
    [1380, 23],
    [1440, 24],
    [1500, 25],
  ])("総時間 %s 分でラベルは %s 本、top は ((30+60i)/total)*100 (AC-13)", (total, count) => {
    const marks = calculateHourMarks({
      anchorDate: ANCHOR_2030,
      totalDurationMinutes: total,
    });
    expect(marks).toHaveLength(count);
    marks.forEach((m, i) => {
      expect(m.topPercent).toBeCloseTo(((30 + 60 * i) / total) * 100, 10);
    });
  });

  it("上端・下端がちょうど正時なら、上端と下端にも描く (§2-3-2)", () => {
    const marks = calculateHourMarks({
      anchorDate: new Date("2026-06-21T21:00:00+09:00"),
      totalDurationMinutes: 1440,
    });
    expect(marks).toHaveLength(25);
    expect(marks[0]!.label).toBe("21:00");
    expect(marks[0]!.topPercent).toBe(0);
    expect(marks[24]!.label).toBe("21:00");
    expect(marks[24]!.topPercent).toBe(100);
  });

  it.each([0, -60])("総時間 %s 以下は空配列", (total) => {
    expect(
      calculateHourMarks({ anchorDate: ANCHOR_2030, totalDurationMinutes: total }),
    ).toEqual([]);
  });
});

describe("resolveTextTier (AC-2 / AC-20 の閾値)", () => {
  it.each([
    [48, "twoLines"],
    [32, "twoLines"],
    [31.999, "nameOnly"],
    [24, "nameOnly"],
    [16, "nameOnly"],
    [15.999, "bandOnly"],
    [8, "bandOnly"],
  ] as const)("高さ %s px は %s", (height, tier) => {
    expect(resolveTextTier(height)).toBe(tier);
  });
});
