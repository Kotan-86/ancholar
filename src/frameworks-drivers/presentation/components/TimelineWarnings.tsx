// 仕様: docs/spec/presentation-uc1.md#2-5-警告表示 (目印は #3-4-検証のための目印)
import type { ViolationAlert } from "@interface/response/ViolationAlert.js";

export type TimelineWarningsProps = {
  readonly violations?: ViolationAlert[];
  readonly socialJetLagWarning: boolean;
};

/**
 * 警告領域。違反リストと社会的時差ぼけバナーを1つの領域に包み、
 * 最大高さ(画面高の30%)を超えたら領域内だけスクロールする。
 * どちらも無いときは領域ごと描かない。件数で打ち切らない。
 */
export function TimelineWarnings({ violations, socialJetLagWarning }: TimelineWarningsProps) {
  const hasViolations = violations !== undefined && violations.length > 0;
  if (!hasViolations && !socialJetLagWarning) return null;

  return (
    <div data-warning-area className="max-h-[30vh] overflow-y-auto space-y-2">
      {hasViolations && (
        <section
          data-violation-list
          className="rounded border border-amber-700 bg-amber-950 p-3 text-amber-100"
        >
          <h2 className="mb-1 text-sm font-semibold">ルール違反</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {violations.map((v, i) => (
              <li key={`${v.targetId}-${i}`}>
                <span className="font-medium">{v.targetTitle}</span>: {v.message}
              </li>
            ))}
          </ul>
        </section>
      )}
      {socialJetLagWarning && (
        <div
          data-social-jetlag-banner
          role="alert"
          className="rounded border border-orange-700 bg-orange-950 p-3 text-sm text-orange-100"
        >
          社会的時差ぼけの警告: 睡眠時間帯が普段の生活リズムから大きくずれています。
        </div>
      )}
    </div>
  );
}
