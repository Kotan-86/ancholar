// 仕様: docs/application/usecase.md#3-アプリケーション層の入出力データ定義（dto）
import type { ViolationAlert } from "./ViolationAlert.js";

export type TimelineDTO = {
  anchorDate: Date;
  totalDurationMinutes: number;
  blocks: BlockDTO[];
  socialJetLagWarning: boolean;
  violations?: ViolationAlert[];
};

export type BlockDTO = {
  blockId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  isDurationFixed: boolean;
  tasks: TaskDTO[];
};

export type TaskDTO = {
  id: string;
  title: string;
  description: string;
  accountKind: "Private" | "Work";
  startTime: Date;
  endTime: Date | null;
  shouldPlotOnGrid: boolean;
};
