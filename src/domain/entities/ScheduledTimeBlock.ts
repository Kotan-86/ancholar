// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
import { type BlockId } from "../value-objects/BlockId.js";
import { Duration } from "../value-objects/Duration.js";
import { getTimeBlockSpec, isDurationBelowFloor } from "../value-objects/TimeBlockSpec.js";
import { TimeRange } from "../value-objects/TimeRange.js";

export const ResizeReason = {
  Active: "active",
  Passive: "passive",
} as const;

export type ResizeReason = (typeof ResizeReason)[keyof typeof ResizeReason];

export type BlockResizeStatus =
  | "VALID"
  | "DURATION_FIXED"
  | "BELOW_FLOOR"
  | "PASSIVE_NOT_ALLOWED";

export class ScheduledTimeBlock {
  private constructor(
    readonly blockId: BlockId,
    private range: TimeRange,
  ) {}

  static create(blockId: BlockId, range: TimeRange): ScheduledTimeBlock {
    return new ScheduledTimeBlock(blockId, range);
  }

  get timeRange(): TimeRange {
    return this.range;
  }

  duration(): Duration {
    return Duration.fromMinutes(this.range.durationMinutes());
  }

  evaluateResize(newDuration: Duration, reason: ResizeReason): BlockResizeStatus {
    const spec = getTimeBlockSpec(this.blockId);

    if (spec.isDurationFixed) {
      return "DURATION_FIXED";
    }

    if (spec.floor.kind === "activeOnlyVariable" && reason === ResizeReason.Passive) {
      return "PASSIVE_NOT_ALLOWED";
    }

    if (isDurationBelowFloor(spec, newDuration)) {
      return "BELOW_FLOOR";
    }

    return "VALID";
  }

  applyResize(newDuration: Duration, _reason: ResizeReason): void {
    const newEnd = new Date(this.range.start.getTime() + newDuration.minutes * 60 * 1000);
    this.range = this.range.withEnd(newEnd);
  }

  /** UC-2: 検証済み前提で不変更新した新インスタンスを返す */
  withResizedDuration(newDuration: Duration, _reason: ResizeReason): ScheduledTimeBlock {
    const newEnd = new Date(this.range.start.getTime() + newDuration.minutes * 60 * 1000);
    return new ScheduledTimeBlock(this.blockId, this.range.withEnd(newEnd));
  }

  shiftEndTo(newEnd: Date): void {
    const newDuration = Duration.fromMinutes(
      (newEnd.getTime() - this.range.start.getTime()) / (60 * 1000),
    );
    this.applyResize(newDuration, ResizeReason.Active);
  }
}
