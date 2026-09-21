// 仕様: docs/spec/presentation-uc1.md#4-受入基準 (AC-2② / AC-5 配置 / AC-6② / AC-7① / AC-11 / AC-14 / AC-15 / AC-17)
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DailyTimeline } from "@presentation/components/DailyTimeline.js";
import type { BlockDTO, TimelineDTO } from "@interface/response/TimelineDTO.js";

const ANCHOR = new Date("2026-06-21T20:30:00+09:00");
const at = (min: number) => new Date(ANCHOR.getTime() + min * 60 * 1000);

function block(blockId: string, s: number, e: number, tasks: BlockDTO["tasks"] = []): BlockDTO {
  return { blockId, startTime: at(s), endTime: at(e), durationMinutes: e - s, isDurationFixed: false, tasks };
}

/**
 * 既定シナリオ相当(標準の1日)。AC-7① のため、タイトル・メッセージに日付表記を含めない。
 */
function createTimeline(overrides: Partial<TimelineDTO> = {}): TimelineDTO {
  return {
    anchorDate: ANCHOR,
    totalDurationMinutes: 1440,
    blocks: [
      block("DOWN_TIME", 0, 90),
      block("SLEEP_TIME", 90, 540),
      block("WALK_TIME", 540, 630),
      block("FOCUS_TIME", 630, 720),
      block("WORK_TIME", 720, 1290, [
        {
          id: "work-task",
          title: "表示する仕事タスク",
          description: "",
          accountKind: "Work",
          startTime: at(720),
          endTime: at(780),
          shouldPlotOnGrid: true,
        },
      ]),
      block("GRADATION_TIME", 1290, 1350),
      block("FREE_TIME", 1350, 1440, [
        {
          id: "private-task",
          title: "表示しないプライベートタスク",
          description: "",
          accountKind: "Private",
          startTime: at(1380),
          endTime: null,
          shouldPlotOnGrid: false,
        },
      ]),
    ],
    socialJetLagWarning: true,
    violations: [
      {
        targetId: "invalid-task",
        targetTitle: "マッピング不正",
        violationType: "INVALID_MAPPING",
        message: "タスクリストとブロックが一致しません。",
      },
    ],
    ...overrides,
  };
}

function render(timeline: TimelineDTO): string {
  return renderToStaticMarkup(createElement(DailyTimeline, { timeline }));
}

describe("DailyTimeline 警告の表示 (AC-5 / AC-6)", () => {
  it("違反の targetTitle / message と、社会的時差ぼけの警告を同時に表示する", () => {
    const markup = render(createTimeline());

    expect(markup).toContain("マッピング不正");
    expect(markup).toContain("タスクリストとブロックが一致しません。");
    expect(markup).toContain("社会的時差ぼけ");
  });

  it("AC-5 / AC-6②: 警告領域はグリッドより前に現れ、バナーは警告領域の内側にある", () => {
    const markup = render(createTimeline());
    const warningStart = markup.search(/\sdata-warning-area[\s=>]/);
    const gridStart = markup.search(/\sdata-timeline-grid[\s=>]/);

    expect(warningStart).toBeGreaterThanOrEqual(0);
    expect(gridStart).toBeGreaterThan(warningStart);
    expect(elementHtml(markup, "data-warning-area")!).toContain("data-social-jetlag-banner");
    expect(elementHtml(markup, "data-warning-area")!).toContain("data-violation-list");
  });
});

describe("DailyTimeline グリッドと表示内容", () => {
  it("shouldPlotOnGrid が true のタスクだけをグリッドへ描画する (AC-3 / AC-4)", () => {
    const markup = render(createTimeline());

    expect(markup).toContain("表示する仕事タスク");
    expect(markup).not.toContain("表示しないプライベートタスク");
    expect(countAttr(markup, "data-task-surface")).toBe(1);
  });

  it("グリッド領域に内部スクロール(overflow-y-auto)を持たせ、グリッドをその内側に置く (AC-14)", () => {
    const markup = render(createTimeline());
    const scrollAttr = 'class="[^"]*\\boverflow-y-auto\\b[^"]*"';
    const scrollAreas = [0, 1, 2, 3]
      .map((n) => elementHtml(markup, scrollAttr, n))
      .filter((h): h is string => h !== null);

    // 警告領域と、グリッドの内部スクロール領域の2つ(ページ全体はスクロールさせない)
    expect(scrollAreas.length).toBeGreaterThanOrEqual(2);
    // 警告領域自身も overflow-y-auto を持つ(§2-5)ので、「警告領域を含まない」ではなく
    // 「グリッドを含むスクロール領域が、警告領域を含まない(=警告・ヘッダーはグリッドと一緒に流れない)」で判定する。
    const gridScrollAreas = scrollAreas.filter((h) => h.includes("data-timeline-grid"));
    expect(gridScrollAreas.length).toBeGreaterThanOrEqual(1);
    expect(gridScrollAreas.some((h) => h.includes("data-warning-area"))).toBe(false);
    // 警告領域のスクロールは警告の内側だけで完結し、グリッドを内包しない
    expect(elementHtml(markup, "data-warning-area")!).not.toContain("data-timeline-grid");
  });

  it("AC-15: WORK TIME / WORK_TIME がマークアップ全体に現れない", () => {
    const markup = render(createTimeline());
    expect(markup).not.toContain("WORK TIME");
    expect(markup).not.toContain("WORK_TIME");
  });

  it("AC-2②: 分数表記(分を含む数値)が現れない。総時間の説明文も出さない", () => {
    const markup = render(createTimeline());
    expect(markup).not.toMatch(/\d+\s*分/);
    expect(markup).not.toContain("1440");
  });

  it("AC-7①: 日付を含まない DTO を描画したとき、日付表記が1度も現れない(日付は画面が出さない)", () => {
    const markup = render(createTimeline());
    expect(markup).not.toMatch(/\d{4}[-/年]\d{1,2}[-/月]\d{1,2}/);
  });

  it("§3-2: style は、グリッドの height、ラベル・罫線の top、カードとタスク面の top/height だけ", () => {
    const markup = render(createTimeline());
    const styled = markup.match(/<[^>]*\sstyle="[^"]*"[^>]*>/g) ?? [];

    expect(styled.length).toBeGreaterThan(1);
    for (const tag of styled) {
      const keys = Object.keys(styleProps(tag)).sort();
      if (/\sdata-timeline-grid[\s=>]/.test(tag)) expect(keys).toEqual(["height"]);
      else if (/\sdata-hour-(label|line)[\s=>]/.test(tag)) expect(keys).toEqual(["top"]);
      else if (/\sdata-(block-card|task-surface)[\s=>]/.test(tag)) expect(keys).toEqual(["height", "top"]);
      else throw new Error(`許可されていない要素に style がある: ${tag}`);
    }
  });
});

describe("DailyTimeline 警告なし (AC-17)", () => {
  it.each([
    ["violations が undefined", { violations: undefined }],
    ["violations が空配列", { violations: [] }],
  ])("%s かつ時差ぼけ false: 警告の目印もテキストも出ない。グリッドは描く", (_n, patch) => {
    const markup = render(createTimeline({ ...patch, socialJetLagWarning: false }));

    expect(markup).not.toContain("data-warning-area");
    expect(markup).not.toContain("data-violation-list");
    expect(markup).not.toContain("data-social-jetlag-banner");
    expect(markup).not.toContain("社会的時差ぼけ");
    expect(markup).toContain("data-timeline-grid");
  });
});

// ---- マークアップ走査の小さなヘルパー(このファイル内に閉じる) ----
function openingTags(markup: string, attr: string): string[] {
  const re = new RegExp(`<[a-zA-Z][^>]*?\\s${attr}(?=[\\s=>/])[^>]*>`, "g");
  return markup.match(re) ?? [];
}

function attrValue(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1]! : null;
}

function styleProps(tag: string): Record<string, string> {
  const style = attrValue(tag, "style") ?? "";
  const props: Record<string, string> = {};
  for (const part of style.split(";")) {
    const idx = part.indexOf(":");
    if (idx > 0) props[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return props;
}

function percent(tag: string, prop: "top" | "height"): number {
  const v = styleProps(tag)[prop];
  expect(v, `${prop} が % で出力されている`).toMatch(/^-?\d+(\.\d+)?(e-?\d+)?%$/);
  return Number.parseFloat(v!);
}

function classTokens(tag: string): string[] {
  return (attrValue(tag, "class") ?? "").split(/\s+/).filter(Boolean);
}

function elementHtml(markup: string, attr: string, nth = 0): string | null {
  const re = new RegExp(
    `<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*?\\s${attr}(?=[\\s=>/])[^>]*>`,
    "g",
  );
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(markup))) {
    if (i++ !== nth) continue;
    const tag = m[1]!;
    const scan = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
    scan.lastIndex = m.index + m[0].length;
    let depth = 1;
    let s: RegExpExecArray | null;
    while ((s = scan.exec(markup))) {
      depth += s[1] ? -1 : 1;
      if (depth === 0) return markup.slice(m.index, scan.lastIndex);
    }
    return markup.slice(m.index);
  }
  return null;
}

function textOf(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function countAttr(markup: string, attr: string): number {
  return openingTags(markup, attr).length;
}
