// 仕様: docs/application/usecase.md#3-アプリケーション層の入出力データ定義（dto）
export type ViolationAlert = {
  targetId: string;
  targetTitle: string;
  violationType: "HARD_CEILING_EXCEEDED" | "FLOOR_CONSTRAINT_BROKEN" | "INVALID_MAPPING";
  message: string;
};
