// 仕様: README.md ルール①② DOWN TIME起点 / FOCUS TIME クッション
import { ChronologicalDay } from "../entities/ChronologicalDay.js";
import { ScheduledTimeBlock } from "../entities/ScheduledTimeBlock.js";
import { BlockId } from "../value-objects/BlockId.js";
import { DayAnchor } from "../value-objects/DayAnchor.js";
import { Duration } from "../value-objects/Duration.js";
import {
  DEFAULT_LIFESTYLE_SETTINGS,
  type LifestyleSettings,
} from "../value-objects/LifestyleSettings.js";
import { getTimeBlockSpec } from "../value-objects/TimeBlockSpec.js";
import { TimeRange } from "../value-objects/TimeRange.js";
import { DomainError } from "../DomainError.js";

const FOCUS_FLOOR_MINUTES = 10;
const DAY_TARGET_MINUTES = 23 * 60;

export class TimelineCalculator {
  static buildDay(
    downTimeStart: Date,
    settings: LifestyleSettings = DEFAULT_LIFESTYLE_SETTINGS,
  ): ChronologicalDay {
    const anchor = DayAnchor.of(
      this.resolveAnchorWithFocusCushion(downTimeStart, settings),
    );
    const blocks = this.buildBlocksFromAnchor(anchor, settings);
    return ChronologicalDay.create(anchor, blocks);
  }

  static resolveAnchorWithFocusCushion(
    downTimeStart: Date,
    settings: LifestyleSettings,
  ): Date {
    let anchor = DayAnchor.of(downTimeStart);
    const focusMinutes = this.computeFocusMinutes(anchor, settings);
    if (focusMinutes < FOCUS_FLOOR_MINUTES) {
      anchor = anchor.shiftByMinutes(focusMinutes - FOCUS_FLOOR_MINUTES);
    }
    return anchor.value;
  }

  private static computeFocusMinutes(
    anchor: DayAnchor,
    settings: LifestyleSettings,
  ): number {
    const downSpec = getTimeBlockSpec(BlockId.DOWN_TIME);
    const sleepSpec = getTimeBlockSpec(BlockId.SLEEP_TIME);
    const walkSpec = getTimeBlockSpec(BlockId.WALK_TIME);

    const walkEnd = addMinutes(
      anchor.value,
      downSpec.defaultDuration!.minutes +
        sleepSpec.defaultDuration!.minutes +
        walkSpec.defaultDuration!.minutes,
    );
    const workStart = resolveWorkStart(walkEnd, settings);
    return (workStart.getTime() - walkEnd.getTime()) / (60 * 1000);
  }

  static getWeekStart(date: Date): Date {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayOfWeek = result.getDay();
    const daysSinceSaturday = (dayOfWeek + 1) % 7;
    result.setDate(result.getDate() - daysSinceSaturday);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private static buildBlocksFromAnchor(
    anchor: DayAnchor,
    settings: LifestyleSettings,
  ): ScheduledTimeBlock[] {
    const downSpec = getTimeBlockSpec(BlockId.DOWN_TIME);
    const sleepSpec = getTimeBlockSpec(BlockId.SLEEP_TIME);
    const walkSpec = getTimeBlockSpec(BlockId.WALK_TIME);
    const gradationSpec = getTimeBlockSpec(BlockId.GRADATION_TIME);

    let cursor = anchor.value;

    const downEnd = addMinutes(cursor, downSpec.defaultDuration!.minutes);
    const down = ScheduledTimeBlock.create(
      BlockId.DOWN_TIME,
      TimeRange.of(cursor, downEnd),
    );
    cursor = downEnd;

    const sleepEnd = addMinutes(cursor, sleepSpec.defaultDuration!.minutes);
    const sleep = ScheduledTimeBlock.create(
      BlockId.SLEEP_TIME,
      TimeRange.of(cursor, sleepEnd),
    );
    cursor = sleepEnd;

    const walkEnd = addMinutes(cursor, walkSpec.defaultDuration!.minutes);
    const walk = ScheduledTimeBlock.create(
      BlockId.WALK_TIME,
      TimeRange.of(cursor, walkEnd),
    );
    cursor = walkEnd;

    const workStart = resolveWorkStart(cursor, settings);
    const focusEnd = workStart;
    const focus = ScheduledTimeBlock.create(
      BlockId.FOCUS_TIME,
      TimeRange.of(cursor, focusEnd),
    );
    cursor = focusEnd;

    const workEnd = addMinutes(cursor, settings.workDurationMinutes);
    const work = ScheduledTimeBlock.create(
      BlockId.WORK_TIME,
      TimeRange.of(cursor, workEnd),
    );
    cursor = workEnd;

    const gradationEnd = addMinutes(cursor, gradationSpec.defaultDuration!.minutes);
    const gradation = ScheduledTimeBlock.create(
      BlockId.GRADATION_TIME,
      TimeRange.of(cursor, gradationEnd),
    );
    cursor = gradationEnd;

    const dayEnd = addMinutes(anchor.value, DAY_TARGET_MINUTES);
    const freeEnd = dayEnd;
    const freeDurationMinutes = (freeEnd.getTime() - cursor.getTime()) / (60 * 1000);
    if (freeDurationMinutes < 30) {
      throw new DomainError(
        `FREE_TIME duration ${freeDurationMinutes} is below floor after timeline calculation`,
      );
    }
    const free = ScheduledTimeBlock.create(
      BlockId.FREE_TIME,
      TimeRange.of(cursor, freeEnd),
    );

    return [down, sleep, walk, focus, work, gradation, free];
  }
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function resolveWorkStart(afterWalkEnd: Date, settings: LifestyleSettings): Date {
  const candidate = new Date(afterWalkEnd);
  candidate.setHours(settings.workStartHour, settings.workStartMinute, 0, 0);
  if (candidate.getTime() < afterWalkEnd.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}
