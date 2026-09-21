// 仕様: docs/spec/presentation-uc1.md#2-3-2-時刻ラベルと横罫線 (目印は #3-4-検証のための目印)
import { calculateHourMarks } from "../utils/timelineScale.js";

export type TimelineHourMarksProps = {
  readonly anchorDate: Date;
  readonly totalDurationMinutes: number;
};

/**
 * 正時ごとの横罫線と時刻ラベル。位置決めの基準はグリッドコンテナ(親の relative)。
 * インライン style は top(%)のみ。罫線は要素として1本ずつ描く。
 */
export function TimelineHourMarks({
  anchorDate,
  totalDurationMinutes,
}: TimelineHourMarksProps) {
  const marks = calculateHourMarks({ anchorDate, totalDurationMinutes });

  return (
    <>
      {marks.map((mark) => (
        <div key={mark.label}>
          <div
            data-hour-line={mark.label}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-t border-slate-300"
            style={{ top: `${mark.topPercent}%` }}
          />
          <span
            data-hour-label={mark.label}
            className="pointer-events-none absolute left-0 pl-1 text-xs leading-4 text-slate-500"
            style={{ top: `${mark.topPercent}%` }}
          >
            {mark.label}
          </span>
        </div>
      ))}
    </>
  );
}
