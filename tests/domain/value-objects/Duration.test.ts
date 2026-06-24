// 仕様: docs/error.md#4.1-ドメイン層（純粋な評価）
import { describe, expect, it } from "vitest";
import { Duration } from "@domain/value-objects/Duration.js";

describe("Duration", () => {
  it("負数は NEGATIVE ステータス", () => {
    expect(Duration.tryFromMinutes(-1)).toBe("NEGATIVE");
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
