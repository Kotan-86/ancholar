// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
import { DomainError } from "../DomainError.js";

export const BlockId = {
  DOWN_TIME: "DOWN_TIME",
  SLEEP_TIME: "SLEEP_TIME",
  WALK_TIME: "WALK_TIME",
  FOCUS_TIME: "FOCUS_TIME",
  WORK_TIME: "WORK_TIME",
  GRADATION_TIME: "GRADATION_TIME",
  FREE_TIME: "FREE_TIME",
} as const;

export type BlockId = (typeof BlockId)[keyof typeof BlockId];

export const BLOCK_ORDER: readonly BlockId[] = [
  BlockId.DOWN_TIME,
  BlockId.SLEEP_TIME,
  BlockId.WALK_TIME,
  BlockId.FOCUS_TIME,
  BlockId.WORK_TIME,
  BlockId.GRADATION_TIME,
  BlockId.FREE_TIME,
] as const;

export function blockIdFromListName(listName: string): BlockId {
  const normalized = listName.trim().replace(/\s+/g, "_").toUpperCase();
  const match = BLOCK_ORDER.find((id) => id === normalized);
  if (!match) {
    throw new DomainError(`Unknown task list name: ${listName}`);
  }
  return match;
}

export function listNameFromBlockId(blockId: BlockId): string {
  return blockId.replace(/_/g, " ");
}
