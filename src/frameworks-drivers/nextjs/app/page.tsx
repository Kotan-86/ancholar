// 仕様: docs/spec/presentation-uc1.md / Task 5 Server Component 統合
import Link from "next/link";
import { createDailyTimelineUseCase } from "@frameworks-drivers/nextjs/composition/createDailyTimeline";
import { DailyTimeline } from "@presentation/components/DailyTimeline";
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

  return (
    <>
      <nav
        aria-label="表示日の切り替え"
        className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-8"
      >
        <Link
          href={`/?date=${previousDate}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          前日
        </Link>
        <p className="text-sm font-medium text-slate-600">
          {formatDateParam(targetDate)}
        </p>
        <Link
          href={`/?date=${nextDate}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          翌日
        </Link>
      </nav>

      <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
        <h1 className="sr-only">ancholar</h1>
        {result.isOk ? (
          <DailyTimeline timeline={result.value} />
        ) : (
          <section
            role="alert"
            aria-labelledby="timeline-error-heading"
            className="rounded-lg border border-red-300 bg-red-50 p-5 text-red-950"
          >
            <h2 id="timeline-error-heading" className="font-semibold">
              タイムラインを読み込めませんでした
            </h2>
            <p className="mt-2 text-sm">{result.error.message}</p>
          </section>
        )}
      </main>
    </>
  );
}
