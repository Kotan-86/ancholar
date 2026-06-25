// 仕様: docs/application/usecase.md#UC-2
export type ChangeTimeBoxDurationInput = {
  targetId: string;
  type: "TASK" | "BLOCK";
  newStart: Date;
  newEnd: Date;
  targetDate: Date;
};
