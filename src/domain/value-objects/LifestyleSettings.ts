// 仕様: README.md ルール① 時間軸のスライド / ルール② FOCUS TIME
// 仕様: docs/spec/day-duration.md#4-3-pbi-a先行のスコープ（既定の生活設定）
export type LifestyleSettings = {
  /** WORK TIME 開始時刻（時・分） */
  workStartHour: number;
  workStartMinute: number;
  /**
   * SLEEP TIME の標準 duration（分）。
   * 現在は未使用（TimelineCalculator は TimeBlockSpec を読む）。TimeBlockSpec と食い違わないよう値だけ揃えている。
   * 唯一の出所は PBI-C で決める。
   */
  sleepDurationMinutes: number;
  /** WORK TIME の標準 duration（分） */
  workDurationMinutes: number;
};

export const DEFAULT_LIFESTYLE_SETTINGS: LifestyleSettings = {
  workStartHour: 8,
  workStartMinute: 30,
  sleepDurationMinutes: 450,
  workDurationMinutes: 570,
};
