// 仕様: docs/spec/presentation-uc1.md#2-3-3 / #2-3-4 / #3-2 / #3-4 (AC-2 / AC-8② / AC-10 / AC-11 / AC-12 / AC-19①)
import type { BlockDTO } from "@interface/response/TimelineDTO.js";
import { blockSurfaceClassName } from "../styles/timelineTheme.js";
import { calculateTimelineTaskLayout } from "../utils/timelineLayout.js";
import { PIXELS_PER_HOUR, resolveTextTier } from "../utils/timelineScale.js";

export type TimelineBlockCardProps = {
  readonly block: BlockDTO;
  readonly anchorDate: Date;
  readonly totalDurationMinutes: number;
};

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export function TimelineBlockCard({
  block,
  anchorDate,
  totalDurationMinutes,
}: TimelineBlockCardProps) {
  // 縦位置・縦幅は、タスク面と同じ規則(§5)で算出する。
  const layout = calculateTimelineTaskLayout({
    anchorDate,
    totalDurationMinutes,
    task: { startTime: block.startTime, endTime: block.endTime },
    fallbackEndTime: block.endTime,
  });

  if (!layout) {
    return null;
  }

  // 3段階の判定用の高さ(px)。区間の長さから直接求め、割合経由の丸め誤差を避ける。
  const heightPx =
    ((block.endTime.getTime() - block.startTime.getTime()) /
      MILLISECONDS_PER_HOUR) *
    PIXELS_PER_HOUR;
  const tier = resolveTextTier(heightPx);
  const name = block.blockId.replaceAll("_", " ");

  return (
    <div
      data-block-card={block.blockId}
      aria-label={tier === "bandOnly" ? name : undefined}
      className={`absolute inset-x-0 overflow-hidden rounded-md px-2 ${blockSurfaceClassName(block.blockId)}`}
      style={{
        top: `${layout.topPercent}%`,
        height: `${layout.heightPercent}%`,
      }}
    >
      {tier === "bandOnly" ? null : (
        <p className="truncate text-sm font-semibold leading-4">{name}</p>
      )}
      {tier === "twoLines" ? (
        <p className="truncate text-xs leading-4">
          {timeFormatter.format(block.startTime)}〜
          {timeFormatter.format(block.endTime)}
        </p>
      ) : null}
    </div>
  );
}
