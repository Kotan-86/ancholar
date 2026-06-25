// 仕様: docs/application/usecase.md#3-アプリケーション層の入出力データ定義（dto）
export type ExternalChangeDTO = {
  id: string;
  type: "TASK" | "EVENT";
  action: "CREATED" | "UPDATED" | "DELETED";
  accountKind: "Private" | "Work";
  listName?: string;
  newStart?: Date;
  newEnd?: Date;
};
