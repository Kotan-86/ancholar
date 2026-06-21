// 仕様: README.md ルール① DOWN TIME起点の動的タイムライン（Time Anchor）
import { DomainError } from "../DomainError.js";

export class DayAnchor {
  private constructor(readonly value: Date) {}

  static of(date: Date): DayAnchor {
    if (Number.isNaN(date.getTime())) {
      throw new DomainError("DayAnchor must be a valid date");
    }
    return new DayAnchor(new Date(date.getTime()));
  }

  equals(other: DayAnchor): boolean {
    return this.value.getTime() === other.value.getTime();
  }

  shiftByMinutes(minutes: number): DayAnchor {
    const shifted = new Date(this.value.getTime());
    shifted.setMinutes(shifted.getMinutes() + minutes);
    return DayAnchor.of(shifted);
  }

  addMinutes(minutes: number): Date {
    const result = new Date(this.value.getTime());
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }
}
