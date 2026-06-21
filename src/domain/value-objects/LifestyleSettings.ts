// 仕様: README.md ルール① 時間軸のスライド / ルール② FOCUS TIME
export type LifestyleSettings = {
  /** WORK TIME 開始時刻（時・分） */
  workStartHour: number;
  workStartMinute: number;
  /** SLEEP TIME の標準 duration（分） */
  sleepDurationMinutes: number;
  /** WORK TIME の標準 duration（分） */
  workDurationMinutes: number;
};

export const DEFAULT_LIFESTYLE_SETTINGS: LifestyleSettings = {
  workStartHour: 9,
  workStartMinute: 0,
  sleepDurationMinutes: 420,
  workDurationMinutes: 480,
};
