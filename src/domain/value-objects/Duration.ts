// 仕様: README.md §① 7つの時間ブロック（Time Blocks）
export type DurationStatus = "NEGATIVE";

export class Duration {
  private constructor(readonly minutes: number) {}

  static tryFromMinutes(minutes: number): Duration | DurationStatus {
    if (minutes < 0) {
      return "NEGATIVE";
    }
    return new Duration(minutes);
  }

  static fromMinutes(minutes: number): Duration {
    return new Duration(minutes);
  }

  static fromHours(hours: number): Duration {
    return Duration.fromMinutes(Math.round(hours * 60));
  }

  add(other: Duration): Duration {
    return Duration.fromMinutes(this.minutes + other.minutes);
  }

  isLessThan(other: Duration): boolean {
    return this.minutes < other.minutes;
  }

  isGreaterThan(other: Duration): boolean {
    return this.minutes > other.minutes;
  }

  equals(other: Duration): boolean {
    return this.minutes === other.minutes;
  }
}
