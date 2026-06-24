// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
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
    expect(spec.defaultDuration?.minutes).toBe(420);
  });
});
