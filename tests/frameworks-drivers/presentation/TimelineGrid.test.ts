// 仕様: docs/spec/presentation-uc1.md#4-受入基準 (AC-1 / AC-3 / AC-4 / AC-12 / AC-13① / AC-15 / AC-22②)
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineGrid } from "@presentation/components/TimelineGrid.js";
import type { BlockDTO, TaskDTO, TimelineDTO } from "@interface/response/TimelineDTO.js";

const ANCHOR = new Date("2026-06-21T20:30:00+09:00");
const at = (min: number) => new Date(ANCHOR.getTime() + min * 60 * 1000);

function task(
  id: string,
  startMin: number,
  endMin: number | null,
  opts: { title?: string; plot?: boolean } = {},
): TaskDTO {
  return {
    id,
    title: opts.title ?? `タスク${id}`,
    description: "",
    accountKind: opts.plot === false ? "Private" : "Work",
    startTime: at(startMin),
    endTime: endMin === null ? null : at(endMin),
    shouldPlotOnGrid: opts.plot !== false,
  };
}

function block(blockId: string, s: number, e: number, tasks: TaskDTO[] = []): BlockDTO {
  return {
    blockId,
    startTime: at(s),
    endTime: at(e),
    durationMinutes: e - s,
    isDurationFixed: false,
    tasks,
  };
}

// 標準の1日。FREE TIME が残余(終端 = total)を受け持つ
function timeline(
  o: { total?: number; work?: TaskDTO[]; free?: TaskDTO[] } = {},
): TimelineDTO {
  const total = o.total ?? 1440;
  return {
    anchorDate: ANCHOR,
    totalDurationMinutes: total,
    blocks: [
      block("DOWN_TIME", 0, 90),
      block("SLEEP_TIME", 90, 540),
      block("WALK_TIME", 540, 630),
      block("FOCUS_TIME", 630, 720),
      block("WORK_TIME", 720, 1290, o.work ?? [task("w1", 720, 780, { title: "集中作業" })]),
      block("GRADATION_TIME", 1290, 1350),
      block("FREE_TIME", 1350, total, o.free ?? []),
    ],
    socialJetLagWarning: false,
  };
}

function render(t: TimelineDTO): string {
  return renderToStaticMarkup(createElement(TimelineGrid, { timeline: t }));
}

const CARD_ORDER = ["DOWN_TIME", "SLEEP_TIME", "WALK_TIME", "FOCUS_TIME", "GRADATION_TIME", "FREE_TIME"];

describe("TimelineGrid ブロックカード (AC-1 / AC-12 / AC-15)", () => {
  const markup = render(timeline());
  const cards = openingTags(markup, "data-block-card");

  it("AC-1: data-block-card が6個で、DOWN→SLEEP→WALK→FOCUS→GRADATION→FREE の順。WORK_TIME は無い", () => {
    expect(cards.map((t) => attrValue(t, "data-block-card"))).toEqual(CARD_ORDER);
  });

  it("AC-12: 6枚の top / height が期待値の表(算出式)と一致する", () => {
    const spans: Array<[number, number]> = [
      [0, 90], [90, 540], [540, 630], [630, 720], [1290, 1350], [1350, 1440],
    ];
    cards.forEach((tag, i) => {
      const [s, e] = spans[i]!;
      expect(percent(tag, "top")).toBeCloseTo((s / 1440) * 100, 9);
      expect(percent(tag, "height")).toBeCloseTo(((e - s) / 1440) * 100, 9);
    });
  });

  it("AC-1: カードは隙間・重なりなく連続し、WORK 区間(50%〜89.58%)だけが空欄", () => {
    const top = (i: number) => percent(cards[i]!, "top");
    const bottom = (i: number) => top(i) + percent(cards[i]!, "height");
    for (const i of [0, 1, 2]) expect(bottom(i)).toBeCloseTo(top(i + 1), 9);
    expect(top(4) - bottom(3)).toBeCloseTo((570 / 1440) * 100, 9);
    expect(bottom(4)).toBeCloseTo(top(5), 9);
    expect(bottom(5)).toBeCloseTo(100, 9);
    expect(top(0)).toBe(0);
  });

  it("AC-15: WORK TIME / WORK_TIME がマークアップ全体のどこにも現れない", () => {
    expect(markup).not.toContain("WORK TIME");
    expect(markup).not.toContain("WORK_TIME");
  });
});

describe("TimelineGrid グリッドと目盛り (AC-9 / AC-13①)", () => {
  it.each([
    [1380, "1104px", 23],
    [1440, "1152px", 24],
    [1500, "1200px", 25],
  ])("総時間 %s 分: data-timeline-grid が1つで height %s、ラベルと罫線が %s 本", (total, height, count) => {
    const markup = render(timeline({ total }));
    const grid = openingTags(markup, "data-timeline-grid");

    expect(grid).toHaveLength(1);
    expect(styleProps(grid[0]!).height).toBe(height);
    expect(classTokens(grid[0]!)).toContain("relative");
    expect(countAttr(markup, "data-hour-label")).toBe(count);
    expect(countAttr(markup, "data-hour-line")).toBe(count);
  });

  it("目盛りは WORK_TIME 区間(09:00〜17:00)でも途切れない", () => {
    const markup = render(timeline());
    const lines = openingTags(markup, "data-hour-line").map((t) => attrValue(t, "data-hour-line"));
    for (const h of ["09:00", "10:00", "12:00", "15:00", "17:00", "18:00"]) {
      expect(lines).toContain(h);
    }
  });
});

describe("TimelineGrid タスク面 (AC-3 / AC-4 / AC-22)", () => {
  it("AC-3①: 既定相当で data-task-surface が1件、top = (720/1440)*100、height = (60/1440)*100", () => {
    const markup = render(timeline());
    const tags = openingTags(markup, "data-task-surface");

    expect(tags).toHaveLength(1);
    expect(percent(tags[0]!, "top")).toBeCloseTo((720 / 1440) * 100, 9);
    expect(percent(tags[0]!, "height")).toBeCloseTo((60 / 1440) * 100, 9);
    expect(markup).toContain("集中作業");
  });

  it("AC-3②: 同時刻の2件は、2件とも描かれ、同じ top / height で重なる。横に等分割しない", () => {
    const markup = render(
      timeline({ work: [task("a", 720, 780, { title: "重なるA" }), task("b", 720, 780, { title: "重なるB" })] }),
    );
    const tags = openingTags(markup, "data-task-surface");

    expect(tags).toHaveLength(2);
    expect(percent(tags[0]!, "top")).toBeCloseTo(percent(tags[1]!, "top"), 12);
    expect(percent(tags[0]!, "height")).toBeCloseTo(percent(tags[1]!, "height"), 12);
    for (const tag of tags) {
      expect(Object.keys(styleProps(tag)).sort()).toEqual(["height", "top"]);
      // 等分割・片寄せに使うクラスを持たない(全幅で重ねる)
      for (const t of classTokens(tag)) expect(t).not.toMatch(/^(w-(1\/|\[)|left-|right-|basis-|grid-cols-)/);
    }
    expect(markup).toContain("重なるA");
    expect(markup).toContain("重なるB");
  });

  it("AC-3③: WORK 区間(〜18:00)の外に及ぶタスクも時刻どおり(17:00–20:00)", () => {
    const markup = render(timeline({ work: [task("x", 1230, 1410)] }));
    const tag = openingTags(markup, "data-task-surface")[0]!;

    expect(percent(tag, "top")).toBeCloseTo((1230 / 1440) * 100, 9);
    expect(percent(tag, "height")).toBeCloseTo((180 / 1440) * 100, 9);
  });

  it("§2-4: 走査の対象は全ブロック。FREE_TIME にある shouldPlotOnGrid:true のタスクも描く", () => {
    const markup = render(timeline({ work: [], free: [task("f", 1380, 1410, { title: "FREE内の面" })] }));
    expect(countAttr(markup, "data-task-surface")).toBe(1);
  });

  it("AC-4: shouldPlotOnGrid:false のタスクはどのブロックにあっても描かない", () => {
    const markup = render(
      timeline({ free: [task("p", 1380, null, { title: "夕食プライベート", plot: false })] }),
    );
    expect(markup).not.toContain("夕食プライベート");
    expect(countAttr(markup, "data-task-surface")).toBe(1);
  });

  it("AC-22①: 終了 <= 開始 のタスクは描かず、同じブロックの正常なタスクとカード・目盛りは描く", () => {
    const markup = render(
      timeline({
        work: [task("bad", 720, 720, { title: "壊れたタスク" }), task("ok", 780, 840, { title: "正常タスク" })],
      }),
    );

    expect(countAttr(markup, "data-task-surface")).toBe(1);
    expect(markup).toContain("正常タスク");
    expect(markup).not.toContain("壊れたタスク");
    expect(countAttr(markup, "data-block-card")).toBe(6);
    expect(countAttr(markup, "data-hour-label")).toBe(24);
  });

  it("AC-22②: 総時間 0 でも例外を投げず、タスク面は1つも描かれない", () => {
    let markup = "";
    expect(() => {
      markup = render(timeline({ total: 0 }));
    }).not.toThrow();
    expect(countAttr(markup, "data-task-surface")).toBe(0);
  });
});

describe("TimelineGrid style の許可範囲 (§3-2)", () => {
  it("style を持つのは、グリッド(height)・ラベルと罫線(top)・カードとタスク面(top,height)だけ", () => {
    const markup = render(timeline());
    const styled = markup.match(/<[^>]*\sstyle="[^"]*"[^>]*>/g) ?? [];

    expect(styled.length).toBeGreaterThan(0);
    for (const tag of styled) {
      const keys = Object.keys(styleProps(tag)).sort();
      if (/\sdata-timeline-grid[\s=>]/.test(tag)) expect(keys).toEqual(["height"]);
      else if (/\sdata-hour-(label|line)[\s=>]/.test(tag)) expect(keys).toEqual(["top"]);
      else if (/\sdata-(block-card|task-surface)[\s=>]/.test(tag)) expect(keys).toEqual(["height", "top"]);
      else throw new Error(`許可されていない要素に style がある: ${tag}`);
    }
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
