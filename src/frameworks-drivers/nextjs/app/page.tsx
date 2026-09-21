// 仕様: docs/spec/presentation-uc1.md#2-2-ヘッダーと日付ナビゲーション / #2-6-スクロール / #3-1-テーマ
import Link from "next/link";
import { createDailyTimelineUseCase } from "@frameworks-drivers/nextjs/composition/createDailyTimeline";
import { DailyTimeline } from "@presentation/components/DailyTimeline";
import { TimelineError } from "@presentation/components/TimelineError";
import {
  formatDateParam,
  parseTargetDate,
  shiftTargetDate,
} from "./dateQuery";

type HomePageProps = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// process.env.TZ を利用できない Edge Runtime ではなく、Node.js で実行する。
export const runtime = "nodejs";

export default async function HomePage({ searchParams }: HomePageProps) {
  const { date } = await searchParams;
  const targetDate = parseTargetDate(date);
  const result = await createDailyTimelineUseCase(targetDate).execute({
    targetDate,
  });

  const previousDate = formatDateParam(shiftTargetDate(targetDate, -1));
  const nextDate = formatDateParam(shiftTargetDate(targetDate, 1));

  const linkClassName =
    "rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700";

  return (
    <div className="mx-auto flex h-screen max-w-5xl flex-col overflow-hidden px-4">
      <header className="shrink-0 py-4">
        <nav
          aria-label="表示日の切り替え"
          className="flex items-center justify-between"
        >
          <Link href={`/?date=${previousDate}`} className={linkClassName}>
            前日
          </Link>
          <p className="text-sm font-medium text-slate-300">
            {formatDateParam(targetDate)}
          </p>
          <Link href={`/?date=${nextDate}`} className={linkClassName}>
            翌日
          </Link>
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <h1 className="sr-only">ancholar</h1>
        {result.isOk ? (
          <DailyTimeline timeline={result.value} />
        ) : (
          <TimelineError error={result.error} />
        )}
      </main>
    </div>
  );
}
