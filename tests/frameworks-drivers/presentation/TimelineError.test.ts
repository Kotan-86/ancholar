// 仕様: docs/spec/presentation-uc1.md#4-受入基準 (AC-18) と #5-制約関連機能 (TimelineError の契約)
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineError } from "@presentation/components/TimelineError.js";
import type { UseCaseError } from "@interface/errors/UseCaseError.js";

const errors: Array<[string, UseCaseError]> = [
  ["NotFound", { type: "NotFound", resourceName: "Timeline", message: "タイムラインが見つかりません" }],
  [
    "ExternalApiError",
    { type: "ExternalApiError", service: "GoogleCalendar", message: "外部カレンダーの取得に失敗しました" },
  ],
  ["RuleViolation", { type: "HardCeilingExceeded", message: "上限を超えています" }],
];

function render(error: UseCaseError): string {
  return renderToStaticMarkup(createElement(TimelineError, { error }));
}

describe("TimelineError (AC-18)", () => {
  it.each(errors)("%s: data-timeline-error が1つあり、その中に error.message が含まれる (①③)", (_n, error) => {
    const markup = render(error);

    expect(countAttr(markup, "data-timeline-error")).toBe(1);
    expect(elementHtml(markup, "data-timeline-error")!).toContain(error.message);
  });

  it.each(errors)("%s: 見出し要素(h1〜h6)がちょうど1つで、data-timeline-error の中にある (②)", (_n, error) => {
    const markup = render(error);
    const inner = elementHtml(markup, "data-timeline-error")!;

    expect(inner.match(/<h[1-6][\s>]/g) ?? []).toHaveLength(1);
    expect(markup.match(/<h[1-6][\s>]/g) ?? []).toHaveLength(1);
    const heading = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/.exec(inner)![1]!;
    expect(textOf(heading)).not.toBe("");
  });

  it("暗色背景 bg-red-950 と明色文字 text-red-100 が付く。明るい背景 bg-red-50 は使わない (④)", () => {
    const markup = render(errors[0]![1]);
    const tokens = (markup.match(/\sclass="([^"]*)"/g) ?? []).flatMap((c) =>
      c.replace(/^\sclass="|"$/g, "").split(/\s+/),
    );

    expect(tokens).toContain("bg-red-950");
    expect(tokens).toContain("text-red-100");
    expect(tokens).not.toContain("bg-red-50");
  });

  it("グリッドは描かれない (⑤)", () => {
    const markup = render(errors[0]![1]);

    expect(markup).not.toContain("data-timeline-grid");
    expect(markup).not.toContain("data-hour-label");
    expect(markup).not.toContain("data-block-card");
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
