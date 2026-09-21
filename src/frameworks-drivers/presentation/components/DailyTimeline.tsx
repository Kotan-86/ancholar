// 仕様: docs/spec/presentation-uc1.md#2-6-スクロール / #2-5-警告表示 / #3-2-分担ルール
import type { TimelineDTO } from "@interface/response/TimelineDTO.js";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineWarnings } from "./TimelineWarnings";

export type DailyTimelineProps = {
  readonly timeline: TimelineDTO;
};

/**
 * 警告領域(固定)とグリッド領域(内部スクロール)を縦に並べるだけの構成。
 * 日付・総時間の分数は表示しない(日付はヘッダー=page.tsx が出す)。
 * 初期スクロール位置は上端のまま(自動スクロールしない)。
 */
export function DailyTimeline({ timeline }: DailyTimelineProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <TimelineWarnings
        violations={timeline.violations}
        socialJetLagWarning={timeline.socialJetLagWarning}
      />
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <TimelineGrid timeline={timeline} />
      </div>
    </div>
  );
}
