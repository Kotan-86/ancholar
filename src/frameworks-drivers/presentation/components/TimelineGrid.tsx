// 仕様: docs/spec/presentation-uc1.md#2-3-1 / #2-3-3 / #2-4 / #3-2 / #3-4 (AC-1 / AC-3 / AC-12 / AC-13① / AC-15 / AC-22②)
import type { TimelineDTO } from "@interface/response/TimelineDTO.js";
import { calculateGridHeightPx } from "../utils/timelineScale.js";
import { TimelineBlockCard } from "./TimelineBlockCard";
import { TimelineHourMarks } from "./TimelineHourMarks";
import { TimelineTaskSurface } from "./TimelineTaskSurface";

export type TimelineGridProps = {
  readonly timeline: TimelineDTO;
};

// WORK_TIME はカードを描かず空欄にする(タスク面だけが載る)。
const BLOCK_ID_WITHOUT_CARD = "WORK_TIME";

/**
 * 1日全体のグリッド。親(グリッド)が relative で、時刻ラベルと罫線は全体に、
 * イベント列(カードとタスク面)はラベル列の右に、同じ高さで重ねる。
 */
export function TimelineGrid({ timeline }: TimelineGridProps) {
  const { anchorDate, totalDurationMinutes, blocks } = timeline;

  return (
    <div
      data-timeline-grid=""
      className="relative w-full"
      style={{ height: `${calculateGridHeightPx(totalDurationMinutes)}px` }}
    >
      <TimelineHourMarks
        anchorDate={anchorDate}
        totalDurationMinutes={totalDurationMinutes}
      />
      <div className="absolute inset-y-0 left-14 right-0">
        {blocks
          .filter((block) => block.blockId !== BLOCK_ID_WITHOUT_CARD)
          .map((block) => (
            <TimelineBlockCard
              key={block.blockId}
              block={block}
              anchorDate={anchorDate}
              totalDurationMinutes={totalDurationMinutes}
            />
          ))}
        {blocks.flatMap((block) =>
          block.tasks
            .filter((task) => task.shouldPlotOnGrid)
            .map((task) => (
              <TimelineTaskSurface
                key={task.id}
                task={task}
                blockEndTime={block.endTime}
                anchorDate={anchorDate}
                totalDurationMinutes={totalDurationMinutes}
              />
            )),
        )}
      </div>
    </div>
  );
}
