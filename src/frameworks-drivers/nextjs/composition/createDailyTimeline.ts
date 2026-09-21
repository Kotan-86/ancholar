// 仕様: docs/spec/presentation-uc1.md / UC-1 Phase 1 Composition Root
import { DayAssemblyService } from "@application/services/DayAssemblyService.js";
import { SocialJetLagEvaluationService } from "@application/services/SocialJetLagEvaluationService.js";
import { TimelineEnrichmentService } from "@application/services/TimelineEnrichmentService.js";
import { GetDailyTimelineUseCase } from "@application/usecases/GetDailyTimelineUseCase.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId, listNameFromBlockId } from "@domain/value-objects/BlockId.js";
import {
  DEFAULT_LIFESTYLE_SETTINGS,
  type LifestyleSettings,
} from "@domain/value-objects/LifestyleSettings.js";
import type { ExternalTaskRecord } from "@interface/records/ExternalRecords.js";
import { FakeTimelineRepository } from "@frameworks-drivers/fake/FakeTimelineRepository.js";

const MINUTE_MS = 60 * 1000;

// 仕様: docs/spec/presentation-uc1.md#2-8-表示確認用シナリオq-10--q-19-決定
// 表示確認用シナリオの日付キー(YYYY-MM-DD)。
const SMALL_CARD_DATE_KEY = "2026-06-28";
const MANY_WARNINGS_DATE_KEY = "2026-06-30";
// 06-28: FOCUS TIME が 10 分(= 8px)になる始業 07:10。
const SMALL_CARD_SETTINGS: LifestyleSettings = {
  ...DEFAULT_LIFESTYLE_SETTINGS,
  workStartHour: 7,
  workStartMinute: 10,
};
// 06-30: 警告領域の内部スクロールが起きる件数(既定1件 + 追加19件 = 20件。増やしてよい)。
const EXTRA_INVALID_MAPPING_COUNT = 19;

/**
 * UC-1 Phase 1 用の Composition Root。
 * リクエストごとに独立した Fake と UseCase グラフを生成する。
 */
export function createDailyTimelineUseCase(
  targetDate: Date,
): GetDailyTimelineUseCase {
  // setScenarioForDate は使わず、その日のリクエストで作る Fake のコンストラクタに渡す(O-22 の衝突の回避)。
  const dateKey = formatDateKey(targetDate);
  const timelineRepository = new FakeTimelineRepository({
    targetDate,
    downTimeStart: targetDate,
    tasks: createTasksForDate(targetDate),
    ...(dateKey === SMALL_CARD_DATE_KEY ? { settings: SMALL_CARD_SETTINGS } : {}),
  });

  // 仕様: docs/spec/day-duration.md §10（QD-13 の回避）
  // 翌日の DOWN TIME を1時間15分遅らせ、社会的時差ぼけ警告を再現する。
  // 2時間遅らせると WALK 終了が始業を追い越して日が破綻するため、成立する範囲に留める。
  const nextDate = addMinutes(targetDate, 24 * 60);
  timelineRepository.setScenarioForDate(nextDate, {
    downTimeStart: addMinutes(nextDate, 75),
  });

  const dayAssembly = new DayAssemblyService(timelineRepository);
  const socialJetLag = new SocialJetLagEvaluationService(timelineRepository);
  const timelineEnrichment = new TimelineEnrichmentService(
    dayAssembly,
    socialJetLag,
  );

  return new GetDailyTimelineUseCase(timelineEnrichment);
}

function createTasksForDate(targetDate: Date): ExternalTaskRecord[] {
  const dateLabel = formatDateKey(targetDate);

  const manyWarningTasks: ExternalTaskRecord[] =
    dateLabel === MANY_WARNINGS_DATE_KEY
      ? createExtraInvalidMappingTasks(targetDate, dateLabel)
      : [];

  return [
    {
      id: `work-${dateLabel}`,
      title: `集中作業 ${dateLabel}`,
      description: "WORK TIME のグリッド表示確認用タスク",
      blockId: BlockId.WORK_TIME,
      accountKind: AccountKind.Work,
      startTime: addMinutes(targetDate, 12 * 60),
      endTime: addMinutes(targetDate, 13 * 60),
      listName: listNameFromBlockId(BlockId.WORK_TIME),
    },
    {
      id: `private-${dateLabel}`,
      title: `夕食 ${dateLabel}`,
      description: "グリッドに面表示しないプライベートタスク",
      blockId: BlockId.FREE_TIME,
      accountKind: AccountKind.Private,
      // 起点 + 23時間 = 19:30（FREE TIME 19:00–翌 20:30 の枠内。仕様 A-9）
      startTime: addMinutes(targetDate, 23 * 60),
      listName: listNameFromBlockId(BlockId.FREE_TIME),
    },
    {
      id: `invalid-mapping-${dateLabel}`,
      title: `不正マッピング ${dateLabel}`,
      description: "ルール違反警告の表示確認用タスク",
      blockId: BlockId.WORK_TIME,
      accountKind: AccountKind.Work,
      startTime: addMinutes(targetDate, 14 * 60),
      endTime: addMinutes(targetDate, 15 * 60),
      listName: listNameFromBlockId(BlockId.FREE_TIME),
    },
    ...manyWarningTasks,
  ];
}

function createExtraInvalidMappingTasks(
  targetDate: Date,
  dateLabel: string,
): ExternalTaskRecord[] {
  return Array.from({ length: EXTRA_INVALID_MAPPING_COUNT }, (_, i) => {
    const n = i + 1;
    return {
      id: `invalid-mapping-${dateLabel}-${n}`,
      title: `不正マッピング ${dateLabel} #${n}`,
      description: "警告領域の内部スクロール確認用の追加タスク",
      blockId: BlockId.WORK_TIME,
      accountKind: AccountKind.Work,
      startTime: addMinutes(targetDate, 14 * 60),
      endTime: addMinutes(targetDate, 15 * 60),
      listName: listNameFromBlockId(BlockId.FREE_TIME),
    };
  });
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
