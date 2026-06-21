// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
import { DomainError } from "../DomainError.js";
import { type BlockId } from "../value-objects/BlockId.js";
import { Duration } from "../value-objects/Duration.js";
import {
  getFloorMinutes,
  getTimeBlockSpec,
  isDurationBelowFloor,
} from "../value-objects/TimeBlockSpec.js";
import { TimeRange } from "../value-objects/TimeRange.js";

export const ResizeReason = {
  Active: "active",
  Passive: "passive",
} as const;

export type ResizeReason = (typeof ResizeReason)[keyof typeof ResizeReason];

export class ScheduledTimeBlock {
  private constructor(
    readonly blockId: BlockId,
    private range: TimeRange,
  ) {}

  static create(blockId: BlockId, range: TimeRange): ScheduledTimeBlock {
    const spec = getTimeBlockSpec(blockId);
    const duration = Duration.fromMinutes(range.durationMinutes());

    if (spec.isDurationFixed && spec.defaultDuration && !duration.equals(spec.defaultDuration)) {
      throw new DomainError(`${blockId} duration is fixed`);
    }

    if (isDurationBelowFloor(spec, duration)) {
      throw new DomainError(`${blockId} duration is below floor`);
    }

    return new ScheduledTimeBlock(blockId, range);
  }

  get timeRange(): TimeRange {
    return this.range;
  }

  duration(): Duration {
    return Duration.fromMinutes(this.range.durationMinutes());
  }

  resize(newDuration: Duration, reason: ResizeReason): void {
    const spec = getTimeBlockSpec(this.blockId);

    if (spec.isDurationFixed) {
      throw new DomainError(`${this.blockId} duration cannot be changed`);
    }

    if (spec.floor.kind === "activeOnlyVariable" && reason === ResizeReason.Passive) {
      throw new DomainError(`${this.blockId} passive shortening is not allowed`);
    }

    if (isDurationBelowFloor(spec, newDuration)) {
      throw new DomainError(`${this.blockId} duration is below floor of ${getFloorMinutes(spec)} minutes`);
    }

    const newEnd = new Date(this.range.start.getTime() + newDuration.minutes * 60 * 1000);
    this.range = this.range.withEnd(newEnd);
  }

  shiftEndTo(newEnd: Date): void {
    const newDuration = Duration.fromMinutes(
      (newEnd.getTime() - this.range.start.getTime()) / (60 * 1000),
    );
    this.resize(newDuration, ResizeReason.Active);
  }
}
