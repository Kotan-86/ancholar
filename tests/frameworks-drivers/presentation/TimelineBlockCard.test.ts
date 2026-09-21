// 仕様: docs/spec/presentation-uc1.md#4-受入基準 (AC-2 / AC-8② / AC-10 / AC-11 / AC-12 / AC-19①)
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineBlockCard } from "@presentation/components/TimelineBlockCard.js";
import type { BlockDTO } from "@interface/response/TimelineDTO.js";

const ANCHOR = new Date("2026-06-21T20:30:00+09:00");
const at = (min: number) => new Date(ANCHOR.getTime() + min * 60 * 1000);

function block(blockId: string, startMin: number, endMin: number): BlockDTO {
  return {
    blockId,
    startTime: at(startMin),
    endTime: at(endMin),
    durationMinutes: endMin - startMin,
    isDurationFixed: false,
    tasks: [],
  };
}

function render(b: BlockDTO, total = 1440): string {
  return renderToStaticMarkup(
    createElement(TimelineBlockCard, {
      block: b,
      anchorDate: ANCHOR,
      totalDurationMinutes: total,
    }),
  );
}

function card(markup: string): string {
  const html = elementHtml(markup, "data-block-card");
  expect(html, "data-block-card の要素が1つ描かれる").not.toBeNull();
  return html!;
}

describe("TimelineBlockCard 3段階表示 (AC-2①)", () => {
  it("48px(60分): ブロック名と 開始〜終了 の2行", () => {
    const html = card(render(block("DOWN_TIME", 0, 60)));
    const text = textOf(html);
    expect(text).toContain("DOWN TIME");
    expect(text).toContain("20:30〜21:30");
    expect(text).not.toContain("DOWN_TIME");
  });

  it("24px(30分): ブロック名のみ。時刻表記は出ない", () => {
    const html = card(render(block("FREE_TIME", 0, 30)));
    const text = textOf(html);
    expect(text).toContain("FREE TIME");
    expect(text).not.toContain("〜");
    expect(text).not.toMatch(/\d{2}:\d{2}/);
  });

  it("8px(10分): 文字なしの色帯で、ブロック名は aria-label に残る (AC-19①)", () => {
    const markup = render(block("FOCUS_TIME", 630, 640));
    const html = card(markup);
    const tag = openingTags(markup, "data-block-card")[0]!;

    expect(textOf(html)).toBe("");
    expect(attrValue(tag, "aria-label")).toContain("FOCUS TIME");
  });

  it.each([
    ["48px", block("DOWN_TIME", 0, 60)],
    ["24px", block("DOWN_TIME", 0, 30)],
    ["8px", block("DOWN_TIME", 0, 10)],
  ])("%s でも durationMinutes(○○分)を表示しない (AC-2①)", (_n, b) => {
    const markup = render(b);
    expect(markup).not.toMatch(/\d+\s*分/);
  });
});

describe("TimelineBlockCard 余白・切り取り (AC-2③)", () => {
  it.each([60, 30, 10])("%s 分でも overflow-hidden が付き、縦方向のパディング・マージンが無い", (min) => {
    const markup = render(block("SLEEP_TIME", 0, min));
    const tokens = classTokens(openingTags(markup, "data-block-card")[0]!);

    expect(tokens).toContain("overflow-hidden");
    for (const t of tokens) expect(t).not.toMatch(/^(py|pt|pb|my|mt|mb)-/);
  });
});

describe("TimelineBlockCard 縦位置・縦幅 (AC-8② / AC-12 / AC-19①)", () => {
  it.each([
    ["DOWN_TIME", 0, 90],
    ["SLEEP_TIME", 90, 540],
    ["WALK_TIME", 540, 630],
    ["FOCUS_TIME", 630, 720],
    ["GRADATION_TIME", 1290, 1350],
    ["FREE_TIME", 1350, 1440],
  ])("%s (%s–%s 分) の top / height が算出式と一致し、を丸めない", (id, s, e) => {
    const tag = openingTags(render(block(id, s, e)), "data-block-card")[0]!;
    expect(attrValue(tag, "data-block-card")).toBe(id);
    expect(percent(tag, "top")).toBeCloseTo((s / 1440) * 100, 9);
    expect(percent(tag, "height")).toBeCloseTo(((e - s) / 1440) * 100, 9);
  });

  it("FOCUS 10分: height = (10/1440)*100 % (AC-19①)", () => {
    const tag = openingTags(render(block("FOCUS_TIME", 630, 640)), "data-block-card")[0]!;
    expect(percent(tag, "top")).toBeCloseTo((630 / 1440) * 100, 9);
    expect(percent(tag, "height")).toBeCloseTo((10 / 1440) * 100, 9);
  });

  it("総時間が変わっても割合の算出式に従う (1500分)", () => {
    const tag = openingTags(render(block("DOWN_TIME", 90, 180), 1500), "data-block-card")[0]!;
    expect(percent(tag, "top")).toBeCloseTo((90 / 1500) * 100, 9);
    expect(percent(tag, "height")).toBeCloseTo((90 / 1500) * 100, 9);
  });

  it("style は top と height だけ (§3-2)", () => {
    const tag = openingTags(render(block("DOWN_TIME", 0, 90)), "data-block-card")[0]!;
    expect(Object.keys(styleProps(tag)).sort()).toEqual(["height", "top"]);
  });
});

describe("TimelineBlockCard 配色 (AC-10 / AC-11)", () => {
  it.each([
    ["DOWN_TIME", "bg-indigo-300", "text-slate-900"],
    ["SLEEP_TIME", "bg-purple-700", "text-white"],
    ["WALK_TIME", "bg-amber-800", "text-white"],
    ["FOCUS_TIME", "bg-red-800", "text-white"],
    ["GRADATION_TIME", "bg-emerald-700", "text-white"],
    ["FREE_TIME", "bg-blue-700", "text-white"],
    ["MYSTERY_BLOCK", "bg-slate-600", "text-white"],
  ])("%s は %s と %s", (id, bg, text) => {
    const tokens = classTokens(openingTags(render(block(id, 0, 60)), "data-block-card")[0]!);
    expect(tokens).toContain(bg);
    expect(tokens).toContain(text);
  });

  it("DOWN_TIME だけ暗色文字で、明色文字クラスを持たない。角丸である", () => {
    const tokens = classTokens(openingTags(render(block("DOWN_TIME", 0, 60)), "data-block-card")[0]!);
    expect(tokens).not.toContain("text-white");
    expect(tokens.some((t) => /^rounded/.test(t))).toBe(true);
  });

  it("色をインライン style で指定しない (§3-3)", () => {
    const tag = openingTags(render(block("SLEEP_TIME", 0, 60)), "data-block-card")[0]!;
    expect(attrValue(tag, "style")).not.toMatch(/color|background/);
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
