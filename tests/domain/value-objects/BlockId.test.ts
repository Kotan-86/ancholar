// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
import { describe, expect, it } from "vitest";
import {
  BLOCK_ORDER,
  BlockId,
  blockIdFromListName,
  listNameFromBlockId,
} from "@domain/value-objects/BlockId.js";

describe("BlockId", () => {
  it("7種の BlockId が存在する", () => {
    expect(BLOCK_ORDER).toEqual([
      BlockId.DOWN_TIME,
      BlockId.SLEEP_TIME,
      BlockId.WALK_TIME,
      BlockId.FOCUS_TIME,
      BlockId.WORK_TIME,
      BlockId.GRADATION_TIME,
      BlockId.FREE_TIME,
    ]);
  });

  it("リスト名から BlockId にマッピングできる", () => {
    expect(blockIdFromListName("FREE TIME")).toBe(BlockId.FREE_TIME);
    expect(blockIdFromListName("WORK TIME")).toBe(BlockId.WORK_TIME);
  });

  it("BlockId からリスト名に変換できる", () => {
    expect(listNameFromBlockId(BlockId.FREE_TIME)).toBe("FREE TIME");
  });
});
