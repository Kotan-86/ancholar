// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
import { describe, expect, it } from "vitest";
import { Duration } from "@domain/value-objects/Duration.js";

describe("Duration", () => {
  it("負数は例外", () => {
    expect(() => Duration.fromMinutes(-1)).toThrow("Duration must be non-negative");
  });

  it("加算できる", () => {
    const a = Duration.fromMinutes(10);
    const b = Duration.fromMinutes(20);
    expect(a.add(b).minutes).toBe(30);
  });

  it("比較できる", () => {
    const focusFloor = Duration.fromMinutes(10);
    const freeFloor = Duration.fromMinutes(30);
    expect(focusFloor.isLessThan(freeFloor)).toBe(true);
  });
});
