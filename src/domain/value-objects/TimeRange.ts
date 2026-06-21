// 仕様: README.md ルール④ 防衛的タイムボックスとタスクの伸縮制御
import { DomainError } from "../DomainError.js";

export class TimeRange {
  private constructor(
    readonly start: Date,
    readonly end: Date,
  ) {}

  static of(start: Date, end: Date): TimeRange {
    if (start.getTime() > end.getTime()) {
      throw new DomainError("TimeRange start must be before or equal to end");
    }
    return new TimeRange(new Date(start.getTime()), new Date(end.getTime()));
  }

  contains(instant: Date): boolean {
    const time = instant.getTime();
    return time >= this.start.getTime() && time <= this.end.getTime();
  }

  durationMinutes(): number {
    return (this.end.getTime() - this.start.getTime()) / (60 * 1000);
  }

  withEnd(newEnd: Date): TimeRange {
    return TimeRange.of(this.start, newEnd);
  }

  withStart(newStart: Date): TimeRange {
    return TimeRange.of(newStart, this.end);
  }
}
