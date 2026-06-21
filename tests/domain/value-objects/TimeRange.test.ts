// 仕様: README.md ルール④ / ルール①
import { describe, expect, it } from "vitest";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { DayAnchor } from "@domain/value-objects/DayAnchor.js";
import { TimeRange } from "@domain/value-objects/TimeRange.js";

describe("TimeRange", () => {
  it("start > end は例外", () => {
    const start = new Date("2026-06-21T19:00:00");
    const end = new Date("2026-06-21T18:00:00");
    expect(() => TimeRange.of(start, end)).toThrow("TimeRange start must be before or equal to end");
  });

  it("contains で時刻包含を判定できる", () => {
    const range = TimeRange.of(
      new Date("2026-06-21T19:00:00"),
      new Date("2026-06-21T21:00:00"),
    );
    expect(range.contains(new Date("2026-06-21T20:00:00"))).toBe(true);
    expect(range.contains(new Date("2026-06-21T21:30:00"))).toBe(false);
  });
});

describe("DayAnchor", () => {
  it("同一性を比較できる", () => {
    const date = new Date("2026-06-21T21:00:00");
    expect(DayAnchor.of(date).equals(DayAnchor.of(new Date(date)))).toBe(true);
  });
});

describe("AccountKind", () => {
  it("Private / Work が定義されている", () => {
    expect(AccountKind.Private).toBe("Private");
    expect(AccountKind.Work).toBe("Work");
  });
});
