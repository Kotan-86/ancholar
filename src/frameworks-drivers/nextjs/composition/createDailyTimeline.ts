// 仕様: docs/spec/presentation-uc1.md / UC-1 Phase 1 Composition Root
import { DayAssemblyService } from "@application/services/DayAssemblyService.js";
import { SocialJetLagEvaluationService } from "@application/services/SocialJetLagEvaluationService.js";
import { TimelineEnrichmentService } from "@application/services/TimelineEnrichmentService.js";
import { GetDailyTimelineUseCase } from "@application/usecases/GetDailyTimelineUseCase.js";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId, listNameFromBlockId } from "@domain/value-objects/BlockId.js";
import type { ExternalTaskRecord } from "@interface/records/ExternalRecords.js";
import { FakeTimelineRepository } from "@frameworks-drivers/fake/FakeTimelineRepository.js";

const MINUTE_MS = 60 * 1000;

/**
 * UC-1 Phase 1 用の Composition Root。
 * リクエストごとに独立した Fake と UseCase グラフを生成する。
 */
export function createDailyTimelineUseCase(
  targetDate: Date,
): GetDailyTimelineUseCase {
  const timelineRepository = new FakeTimelineRepository({
    targetDate,
    downTimeStart: targetDate,
    tasks: createTasksForDate(targetDate),
  });

  // 翌日の DOWN TIME を2時間遅らせ、社会的時差ぼけ警告を再現する。
  const nextDate = addMinutes(targetDate, 24 * 60);
  timelineRepository.setScenarioForDate(nextDate, {
    downTimeStart: addMinutes(nextDate, 2 * 60),
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
      startTime: addMinutes(targetDate, 22 * 60),
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
  ];
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
