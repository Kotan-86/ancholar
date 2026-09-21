// 仕様: docs/spec/presentation-uc1.md#4-受入基準 (AC-9 / AC-13② / AC-16) と #3-4-検証のための目印
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineHourMarks } from "@presentation/components/TimelineHourMarks.js";

function render(anchor: string, total: number): string {
  return renderToStaticMarkup(
    createElement(TimelineHourMarks, {
      anchorDate: new Date(anchor),
      totalDurationMinutes: total,
    }),
  );
}

const ANCHOR_2030 = "2026-06-21T20:30:00+09:00";

describe("TimelineHourMarks", () => {
  it("AC-9: 既定(20:30 / 1440)でラベル24個・罫線24個、21:00〜20:00、上端20:30・下端には描かない", () => {
    const markup = render(ANCHOR_2030, 1440);
    const labels = openingTags(markup, "data-hour-label");
    const lines = openingTags(markup, "data-hour-line");

    expect(labels).toHaveLength(24);
    expect(lines).toHaveLength(24);
    const values = labels.map((t) => attrValue(t, "data-hour-label"));
    expect(values[0]).toBe("21:00");
    expect(values[23]).toBe("20:00");
    expect(values).not.toContain("20:30");
    expect(lines.map((t) => attrValue(t, "data-hour-line"))).toEqual(values);
  });

  it("AC-9: 表示文字列が属性値と一致し、23:00 の次は 00:00 (24:00 ではない)・TZ表記なし", () => {
    const markup = render(ANCHOR_2030, 1440);
    const shown = openingTags(markup, "data-hour-label").map((_, i) =>
      textOf(elementHtml(markup, "data-hour-label", i)!),
    );
    const attrs = openingTags(markup, "data-hour-label").map((t) =>
      attrValue(t, "data-hour-label"),
    );

    expect(shown).toEqual(attrs);
    expect(shown[shown.indexOf("23:00") + 1]).toBe("00:00");
    expect(markup).not.toContain("24:00");
    expect(markup).not.toMatch(/GMT|UTC|JST/);
  });

  it("AC-9: ラベルと罫線の top が ((30+60i)/1440)*100 % と一致する(丸めない)", () => {
    const markup = render(ANCHOR_2030, 1440);
    for (const attr of ["data-hour-label", "data-hour-line"]) {
      openingTags(markup, attr).forEach((tag, i) => {
        expect(percent(tag, "top")).toBeCloseTo(((30 + 60 * i) / 1440) * 100, 9);
      });
    }
  });

  it("AC-9: ラベルは対応する罫線の直下(ラベル上端 = 罫線の位置。同じ top)", () => {
    const markup = render(ANCHOR_2030, 1440);
    const labels = openingTags(markup, "data-hour-label");
    const lines = openingTags(markup, "data-hour-line");
    labels.forEach((l, i) => {
      expect(percent(l, "top")).toBeCloseTo(percent(lines[i]!, "top"), 12);
    });
  });

  it("AC-16: 上端20:35 / 1440 で先頭が 21:00 (top 25/1440*100)、24本", () => {
    const markup = render("2026-06-21T20:35:00+09:00", 1440);
    const labels = openingTags(markup, "data-hour-label");

    expect(labels).toHaveLength(24);
    expect(attrValue(labels[0]!, "data-hour-label")).toBe("21:00");
    expect(percent(labels[0]!, "top")).toBeCloseTo((25 / 1440) * 100, 9);
  });

  it.each([
    [1380, 23],
    [1500, 25],
  ])("AC-13②: 総時間 %s 分でラベル・罫線が %s 本、top が ((30+60i)/total)*100 パーセント", (total, count) => {
    const markup = render(ANCHOR_2030, total);
    const labels = openingTags(markup, "data-hour-label");

    expect(labels).toHaveLength(count);
    expect(openingTags(markup, "data-hour-line")).toHaveLength(count);
    labels.forEach((tag, i) => {
      expect(percent(tag, "top")).toBeCloseTo(((30 + 60 * i) / total) * 100, 9);
    });
  });

  it("§3-2 / §3-3: style は top のみ。罫線は要素で描き、背景グラデーションで描かない", () => {
    const markup = render(ANCHOR_2030, 1440);
    const styled = markup.match(/<[^>]*\sstyle="[^"]*"[^>]*>/g) ?? [];

    expect(styled.length).toBeGreaterThanOrEqual(48);
    for (const tag of styled) {
      expect(Object.keys(styleProps(tag))).toEqual(["top"]);
    }
    expect(markup).not.toMatch(/gradient/);
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
