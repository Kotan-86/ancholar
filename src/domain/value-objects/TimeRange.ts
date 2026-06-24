// 仕様: README.md ルール④ 防衛的タイムボックスとタスクの伸縮制御
export type TimeRangeStatus = "START_AFTER_END";

export class TimeRange {
  private constructor(
    readonly start: Date,
    readonly end: Date,
  ) {}

  static tryOf(start: Date, end: Date): TimeRange | TimeRangeStatus {
    if (start.getTime() > end.getTime()) {
      return "START_AFTER_END";
    }
    return new TimeRange(new Date(start.getTime()), new Date(end.getTime()));
  }

  static of(start: Date, end: Date): TimeRange {
    const result = TimeRange.tryOf(start, end);
    return result as TimeRange;
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
