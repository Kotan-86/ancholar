// 仕様: docs/spec/presentation-uc1.md#4-受入基準 (AC-5 / AC-6 / AC-17) と #2-5-警告表示
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineWarnings } from "@presentation/components/TimelineWarnings.js";
import type { ViolationAlert } from "@interface/response/ViolationAlert.js";

function violation(n: number): ViolationAlert {
  return {
    targetId: `v-${n}`,
    targetTitle: `対象タスク番号${n}`,
    violationType: "INVALID_MAPPING",
    message: `マッピング不正メッセージ${n}`,
  };
}

function render(violations: ViolationAlert[] | undefined, socialJetLagWarning: boolean): string {
  return renderToStaticMarkup(
    createElement(TimelineWarnings, { violations, socialJetLagWarning }),
  );
}

describe("TimelineWarnings (AC-5 / AC-6)", () => {
  it("AC-5①: 違反1件 + 時差ぼけ true で、警告領域が1つ・max-h-[30vh] と overflow-y-auto を持つ", () => {
    const markup = render([violation(1)], true);
    const tags = openingTags(markup, "data-warning-area");

    expect(tags).toHaveLength(1);
    const tokens = classTokens(tags[0]!);
    expect(tokens).toContain("max-h-[30vh]");
    expect(tokens).toContain("overflow-y-auto");
  });

  it("AC-5②: data-violation-list の各項目に targetTitle と message", () => {
    const markup = render([violation(1), violation(2)], false);
    const list = elementHtml(markup, "data-violation-list")!;

    expect(list).not.toBeNull();
    expect(list).toContain("対象タスク番号1");
    expect(list).toContain("マッピング不正メッセージ1");
    expect(list).toContain("対象タスク番号2");
    expect(list).toContain("マッピング不正メッセージ2");
  });

  it("AC-5③: 違反25件でも全件がマークアップに含まれる(件数で打ち切らない)", () => {
    const markup = render(Array.from({ length: 25 }, (_, i) => violation(i + 1)), true);
    for (let i = 1; i <= 25; i++) {
      expect(markup).toMatch(new RegExp(`対象タスク番号${i}(?!\\d)`));
      expect(markup).toMatch(new RegExp(`マッピング不正メッセージ${i}(?!\\d)`));
    }
  });

  it("AC-6①: 時差ぼけ true でバナーが1つあり「社会的時差ぼけ」を含む。警告領域の内側にある", () => {
    const markup = render(undefined, true);
    const area = elementHtml(markup, "data-warning-area")!;

    expect(countAttr(markup, "data-social-jetlag-banner")).toBe(1);
    expect(textOf(elementHtml(markup, "data-social-jetlag-banner")!)).toContain("社会的時差ぼけ");
    expect(area).toContain("data-social-jetlag-banner");
  });

  it("AC-6③: 時差ぼけ false ならバナーが無い(違反があっても)", () => {
    const markup = render([violation(1)], false);
    expect(markup).not.toContain("data-social-jetlag-banner");
    expect(markup).not.toContain("社会的時差ぼけ");
  });

  it("違反が無く時差ぼけ true のとき、違反リストは出ない", () => {
    expect(render([], true)).not.toContain("data-violation-list");
  });

  it("警告領域の中に、違反リストとバナーの両方が入る", () => {
    const area = elementHtml(render([violation(1)], true), "data-warning-area")!;
    expect(area).toContain("data-violation-list");
    expect(area).toContain("data-social-jetlag-banner");
  });

  it("インライン style を使わない (§3-2)", () => {
    expect(render([violation(1)], true)).not.toContain("style=");
  });
});

describe("TimelineWarnings 警告なし (AC-17)", () => {
  it.each([
    ["violations が undefined", undefined],
    ["violations が空配列", [] as ViolationAlert[]],
  ])("%s かつ時差ぼけ false: 3つの目印も警告のテキストも出ない", (_n, violations) => {
    const markup = render(violations, false);

    expect(markup).not.toContain("data-warning-area");
    expect(markup).not.toContain("data-violation-list");
    expect(markup).not.toContain("data-social-jetlag-banner");
    expect(markup).not.toContain("社会的時差ぼけ");
    expect(markup).not.toContain("ルール違反");
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
