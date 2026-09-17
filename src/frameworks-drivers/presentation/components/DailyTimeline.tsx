// 仕様: docs/spec/presentation-uc1.md
import { BlockId } from "@domain/value-objects/BlockId.js";
import type {
  BlockDTO,
  TaskDTO,
  TimelineDTO,
} from "@interface/response/TimelineDTO.js";
import { calculateTimelineTaskLayout } from "../utils/timelineLayout.js";

export type DailyTimelineProps = {
  readonly timeline: TimelineDTO;
};

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function DailyTimeline({ timeline }: DailyTimelineProps) {
  return (
    <section aria-labelledby="daily-timeline-heading" className="space-y-6">
      <TimelineWarnings timeline={timeline} />

      <header className="space-y-1">
        <p className="text-sm font-medium text-slate-500">日次タイムライン</p>
        <h2
          id="daily-timeline-heading"
          className="text-2xl font-semibold tracking-tight text-slate-950"
        >
          {dateFormatter.format(timeline.anchorDate)}
        </h2>
        <p className="text-sm text-slate-600">
          DOWN TIME {formatTime(timeline.anchorDate)} 起点・全
          {timeline.totalDurationMinutes}分
        </p>
      </header>

      <div aria-label="時間ブロック一覧" className="space-y-4">
        {timeline.blocks.map((block) => (
          <TimeBlock
            key={block.blockId}
            block={block}
            timeline={timeline}
          />
        ))}
      </div>
    </section>
  );
}

function TimelineWarnings({ timeline }: DailyTimelineProps) {
  const violations = timeline.violations ?? [];

  if (!timeline.socialJetLagWarning && violations.length === 0) {
    return null;
  }

  return (
    <div aria-label="タイムラインの警告" className="space-y-3">
      {violations.length > 0 ? (
        <section
          aria-labelledby="violation-list-heading"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <h3 id="violation-list-heading" className="font-semibold">
            ルール違反があります
          </h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
            {violations.map((violation) => (
              <li key={`${violation.targetId}-${violation.violationType}`}>
                <span className="font-medium">{violation.targetTitle}</span>
                <span className="block">{violation.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {timeline.socialJetLagWarning ? (
        <aside
          role="status"
          className="rounded-lg border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950"
        >
          <span className="font-semibold">社会的時差ぼけの警告:</span>{" "}
          睡眠中央時刻が前日から1時間以上ずれています。
        </aside>
      ) : null}
    </div>
  );
}

function TimeBlock({
  block,
  timeline,
}: {
  readonly block: BlockDTO;
  readonly timeline: TimelineDTO;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-950">{block.blockId}</h3>
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <div className="flex gap-1">
            <dt className="sr-only">開始時刻</dt>
            <dd>{formatTime(block.startTime)}</dd>
          </div>
          <span aria-hidden="true">–</span>
          <div className="flex gap-1">
            <dt className="sr-only">終了時刻</dt>
            <dd>{formatTime(block.endTime)}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="sr-only">時間</dt>
            <dd>{block.durationMinutes}分</dd>
          </div>
        </dl>
      </header>

      {block.blockId === BlockId.WORK_TIME ? (
        <WorkTimeGrid block={block} timeline={timeline} />
      ) : null}
    </article>
  );
}

function WorkTimeGrid({
  block,
  timeline,
}: {
  readonly block: BlockDTO;
  readonly timeline: TimelineDTO;
}) {
  const plottedTasks = block.tasks.filter((task) => task.shouldPlotOnGrid);

  return (
    <div className="p-4">
      <div className="mb-2 flex justify-between text-xs text-slate-500">
        <span>{formatTime(timeline.anchorDate)}</span>
        <span>1日全体</span>
        <span>{formatTimelineEnd(timeline)}</span>
      </div>
      <div
        aria-label="WORK TIME タイムグリッド"
        className="relative h-[46rem] overflow-hidden rounded-lg border border-slate-300 bg-slate-50"
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/4 border-t border-dashed border-slate-200" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
        <div className="pointer-events-none absolute inset-x-0 top-3/4 border-t border-dashed border-slate-200" />

        {plottedTasks.map((task) => (
          <WorkTask
            key={task.id}
            task={task}
            blockEndTime={block.endTime}
            timeline={timeline}
          />
        ))}
      </div>
    </div>
  );
}

function WorkTask({
  task,
  blockEndTime,
  timeline,
}: {
  readonly task: TaskDTO;
  readonly blockEndTime: Date;
  readonly timeline: TimelineDTO;
}) {
  const layout = calculateTimelineTaskLayout({
    anchorDate: timeline.anchorDate,
    totalDurationMinutes: timeline.totalDurationMinutes,
    task,
    fallbackEndTime: blockEndTime,
  });

  if (!layout) {
    return null;
  }

  return (
    <article
      aria-label={`${task.title} ${formatTime(task.startTime)}から${formatTime(task.endTime ?? blockEndTime)}`}
      className="absolute inset-x-3 overflow-hidden rounded-md border border-sky-400 bg-sky-100 px-3 py-2 text-sky-950"
      style={{
        top: `${layout.topPercent}%`,
        height: `${layout.heightPercent}%`,
      }}
    >
      <p className="truncate text-sm font-semibold">{task.title}</p>
      <p className="truncate text-xs">
        {formatTime(task.startTime)}–{formatTime(task.endTime ?? blockEndTime)}
      </p>
    </article>
  );
}

function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

function formatTimelineEnd(timeline: TimelineDTO): string {
  const endTime = new Date(
    timeline.anchorDate.getTime() + timeline.totalDurationMinutes * 60 * 1000,
  );
  return formatTime(endTime);
}
