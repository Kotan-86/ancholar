// 仕様: docs/spec/presentation-uc1.md#2-4-work-time-区間のタスク面 (AC-3 / AC-4 / AC-8② / AC-20 / AC-21 / AC-22①)
import type { TaskDTO } from "@interface/response/TimelineDTO.js";
import { TASK_SURFACE_CLASS_NAME } from "../styles/timelineTheme.js";
import { calculateTimelineTaskLayout } from "../utils/timelineLayout.js";
import { calculateGridHeightPx, resolveTextTier } from "../utils/timelineScale.js";

export type TimelineTaskSurfaceProps = {
  readonly task: TaskDTO;
  readonly blockEndTime: Date;
  readonly anchorDate: Date;
  readonly totalDurationMinutes: number;
};

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatTime(date: Date): string {
  return TIME_FORMAT.format(date);
}

/**
 * shouldPlotOnGrid のタスク1件を、時刻どおりの面として描く(区間でクリップしない)。
 * 同時刻の複数は等分割せず、全幅で重ねる(後に描いたものが上)。算出できないときは描かない。
 */
export function TimelineTaskSurface({
  task,
  blockEndTime,
  anchorDate,
  totalDurationMinutes,
}: TimelineTaskSurfaceProps) {
  const layout = calculateTimelineTaskLayout({
    anchorDate,
    totalDurationMinutes,
    task,
    fallbackEndTime: blockEndTime,
  });
  if (layout === null) return null;

  const heightPx =
    (layout.heightPercent / 100) * calculateGridHeightPx(totalDurationMinutes);
  const tier = resolveTextTier(heightPx);
  const endTime = task.endTime ?? blockEndTime;

  return (
    <div
      data-task-surface=""
      aria-label={tier === "bandOnly" ? task.title : undefined}
      className={`absolute inset-x-0 overflow-hidden rounded-md px-2 text-xs leading-4 ${TASK_SURFACE_CLASS_NAME}`}
      style={{
        top: `${layout.topPercent}%`,
        height: `${layout.heightPercent}%`,
      }}
    >
      {tier === "bandOnly" ? null : (
        <div className="truncate">{task.title}</div>
      )}
      {tier === "twoLines" ? (
        <div className="truncate">{`${formatTime(task.startTime)}〜${formatTime(endTime)}`}</div>
      ) : null}
    </div>
  );
}
