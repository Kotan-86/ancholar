// 仕様: docs/application/usecase.md#UC-5
export type CreatedTaskDTO = {
  id: string;
  title: string;
  description: string;
  accountKind: "Private" | "Work";
  startTime: Date;
  endTime: Date | null;
  blockId: string;
  listName: string;
};
