// 仕様: docs/spec/presentation-uc1.md#4-受入基準 (AC-3 / AC-4 / AC-8② / AC-20 / AC-21 / AC-22①)
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineTaskSurface } from "@presentation/components/TimelineTaskSurface.js";
import type { TaskDTO } from "@interface/response/TimelineDTO.js";

const ANCHOR = new Date("2026-06-21T20:30:00+09:00");
const at = (min: number) => new Date(ANCHOR.getTime() + min * 60 * 1000);
const WORK_END = at(1290); // WORK 08:30–18:00 の終端 18:00

function task(startMin: number, endMin: number | null, title = "集中作業"): TaskDTO {
  return {
    id: "t-1",
    title,
    description: "",
    accountKind: "Work",
    startTime: at(startMin),
    endTime: endMin === null ? null : at(endMin),
    shouldPlotOnGrid: true,
  };
}

function render(t: TaskDTO, total = 1440, blockEnd = WORK_END): string {
  return renderToStaticMarkup(
    createElement(TimelineTaskSurface, {
      task: t,
      blockEndTime: blockEnd,
      anchorDate: ANCHOR,
      totalDurationMinutes: total,
    }),
  );
}

describe("TimelineTaskSurface 位置 (AC-3① / AC-8②)", () => {
  it("08:30–09:30 / 1440: top = (720/1440)*100、height = (60/1440)*100。タイトルと時刻が読める", () => {
    const markup = render(task(720, 780));
    const tag = openingTags(markup, "data-task-surface")[0]!;

    expect(countAttr(markup, "data-task-surface")).toBe(1);
    expect(percent(tag, "top")).toBeCloseTo((720 / 1440) * 100, 9);
    expect(percent(tag, "height")).toBeCloseTo((60 / 1440) * 100, 9);
    const text = textOf(elementHtml(markup, "data-task-surface")!);
    expect(text).toContain("集中作業");
    expect(text).toContain("08:30〜09:30");
  });

  it("style は top と height だけ。色は #6e72c3 の静的クラスで角丸 (AC-3 / AC-10)", () => {
    const tag = openingTags(render(task(720, 780)), "data-task-surface")[0]!;
    const tokens = classTokens(tag);

    expect(Object.keys(styleProps(tag)).sort()).toEqual(["height", "top"]);
    expect(tokens).toContain("bg-[#6e72c3]");
    expect(tokens).toContain("text-white");
    expect(tokens.some((t) => /^rounded/.test(t))).toBe(true);
  });

  it("AC-3③ WORK 区間の外(18:00 を超える 17:00–20:00)でもクリップせず時刻どおり", () => {
    const tag = openingTags(render(task(1230, 1410)), "data-task-surface")[0]!;
    expect(percent(tag, "top")).toBeCloseTo((1230 / 1440) * 100, 9);
    expect(percent(tag, "height")).toBeCloseTo((180 / 1440) * 100, 9);
  });

  it("AC-3③ WORK 開始前(08:00 = 690分)にかかるタスクもクリップしない", () => {
    const tag = openingTags(render(task(690, 750)), "data-task-surface")[0]!;
    expect(percent(tag, "top")).toBeCloseTo((690 / 1440) * 100, 9);
    expect(percent(tag, "height")).toBeCloseTo((60 / 1440) * 100, 9);
  });
});

describe("TimelineTaskSurface endTime なし (AC-21)", () => {
  it("endTime が null で開始 08:30・ブロック終端 18:00 なら height = (570/1440)*100", () => {
    const markup = render(task(720, null));
    const tag = openingTags(markup, "data-task-surface")[0]!;

    expect(countAttr(markup, "data-task-surface")).toBe(1);
    expect(percent(tag, "top")).toBeCloseTo((720 / 1440) * 100, 9);
    expect(percent(tag, "height")).toBeCloseTo((570 / 1440) * 100, 9);
  });
});

describe("TimelineTaskSurface 算出不能 (AC-22①)", () => {
  it.each([
    ["終了 = 開始", task(720, 720)],
    ["終了 < 開始", task(720, 700)],
  ])("%s のタスクは面を描かない(例外も出さない)", (_n, t) => {
    let markup = "x";
    expect(() => {
      markup = render(t);
    }).not.toThrow();
    expect(countAttr(markup, "data-task-surface")).toBe(0);
    expect(markup).not.toContain("集中作業");
  });

  it("endTime が null でブロック終端が開始以前でも描かない", () => {
    expect(countAttr(render(task(1300, null)), "data-task-surface")).toBe(0);
  });

  it("総時間 0 では描かない(例外を出さない)", () => {
    expect(() => render(task(720, 780), 0)).not.toThrow();
    expect(countAttr(render(task(720, 780), 0), "data-task-surface")).toBe(0);
  });
});

describe("TimelineTaskSurface 3段階表示 (AC-20)", () => {
  it("48px(60分): タイトルと 開始〜終了 の2行", () => {
    const text = textOf(elementHtml(render(task(720, 780)), "data-task-surface")!);
    expect(text).toContain("集中作業");
    expect(text).toContain("08:30〜09:30");
  });

  it("24px(30分): タイトルのみ1行。時刻表記は出ない", () => {
    const text = textOf(elementHtml(render(task(720, 750)), "data-task-surface")!);
    expect(text).toContain("集中作業");
    expect(text).not.toContain("〜");
  });

  it("8px(10分): 文字なしの色帯。タイトルは aria-label に残る", () => {
    const markup = render(task(720, 730));
    const tag = openingTags(markup, "data-task-surface")[0]!;

    expect(textOf(elementHtml(markup, "data-task-surface")!)).toBe("");
    expect(attrValue(tag, "aria-label")).toContain("集中作業");
  });

  it.each([60, 30, 10])("%s 分でも overflow-hidden が付き、縦方向のパディング・マージンが無い", (min) => {
    const tokens = classTokens(openingTags(render(task(720, 720 + min)), "data-task-surface")[0]!);

    expect(tokens).toContain("overflow-hidden");
    for (const t of tokens) expect(t).not.toMatch(/^(py|pt|pb|my|mt|mb)-/);
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
