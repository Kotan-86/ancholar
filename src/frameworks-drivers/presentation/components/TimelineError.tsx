// 仕様: docs/spec/presentation-uc1.md#5-制約関連機能 (TimelineError の契約) / #3-4-検証のための目印 (AC-18)
import type { UseCaseError } from "@interface/errors/UseCaseError.js";
import { TIMELINE_ERROR_CLASS_NAME } from "../styles/timelineTheme";

export type TimelineErrorProps = {
  readonly error: UseCaseError;
};

/**
 * ユースケースのエラー表示。見出し要素をちょうど1つと error.message を描く。
 * 配色は timelineTheme の単一の定数(TIMELINE_ERROR_CLASS_NAME)を使う。
 */
export function TimelineError({ error }: TimelineErrorProps) {
  return (
    <section
      data-timeline-error=""
      role="alert"
      className={`rounded-lg p-5 ${TIMELINE_ERROR_CLASS_NAME}`}
    >
      <h2 className="font-semibold">タイムラインを読み込めませんでした</h2>
      <p className="mt-2 text-sm">{error.message}</p>
    </section>
  );
}
