// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
// 仕様: docs/spec/day-duration.md#受入基準 (A-10)
import { describe, expect, it } from "vitest";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { getFloorMinutes, getTimeBlockSpec } from "@domain/value-objects/TimeBlockSpec.js";

describe("TimeBlockSpec", () => {
  it("DOWN_TIME は 90分固定", () => {
    const spec = getTimeBlockSpec(BlockId.DOWN_TIME);
    expect(spec.defaultDuration?.minutes).toBe(90);
    expect(getFloorMinutes(spec)).toBe(90);
    expect(spec.isDurationFixed).toBe(true);
  });

  it("FOCUS_TIME の floor は 10分", () => {
    expect(getFloorMinutes(getTimeBlockSpec(BlockId.FOCUS_TIME))).toBe(10);
  });

  it("FREE_TIME の floor は 30分", () => {
    expect(getFloorMinutes(getTimeBlockSpec(BlockId.FREE_TIME))).toBe(30);
  });

  it("WORK_TIME の floor は 0分", () => {
    expect(getFloorMinutes(getTimeBlockSpec(BlockId.WORK_TIME))).toBe(0);
  });

  it("SLEEP_TIME は能動のみ可変", () => {
    const spec = getTimeBlockSpec(BlockId.SLEEP_TIME);
    expect(spec.floor).toEqual({ kind: "activeOnlyVariable" });
    expect(spec.defaultDuration?.minutes).toBe(450);
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-10
  it("標準時間は DOWN 90 / SLEEP 450 / WALK 90 / FOCUS 90 / GRADATION 60 / FREE 90 分 (A-10)", () => {
    const minutes = (id: BlockId) => getTimeBlockSpec(id).defaultDuration?.minutes;
    expect(minutes(BlockId.DOWN_TIME)).toBe(90);
    expect(minutes(BlockId.SLEEP_TIME)).toBe(450);
    expect(minutes(BlockId.WALK_TIME)).toBe(90);
    expect(minutes(BlockId.FOCUS_TIME)).toBe(90);
    expect(minutes(BlockId.GRADATION_TIME)).toBe(60);
    expect(minutes(BlockId.FREE_TIME)).toBe(90);
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-10
  it("WORK_TIME は標準を持たない（defaultDuration が null） (A-10)", () => {
    expect(getTimeBlockSpec(BlockId.WORK_TIME).defaultDuration).toBeNull();
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-10（QD-12 = A）
  it("WALK_TIME の Floor は 90分で固定 (A-10, QD-12)", () => {
    const spec = getTimeBlockSpec(BlockId.WALK_TIME);
    expect(getFloorMinutes(spec)).toBe(90);
    expect(spec.isDurationFixed).toBe(true);
  });

  it("GRADATION_TIME の floor は 10分 (AC外・境界値)", () => {
    expect(getFloorMinutes(getTimeBlockSpec(BlockId.GRADATION_TIME))).toBe(10);
  });
});
