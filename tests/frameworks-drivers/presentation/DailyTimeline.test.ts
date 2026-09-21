// 仕様: docs/spec/presentation-uc1.md#AC-3〜AC-6 / スタイリング方針
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DailyTimeline } from "@presentation/components/DailyTimeline.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import type {
  BlockDTO,
  TimelineDTO,
} from "@interface/response/TimelineDTO.js";

describe("DailyTimeline", () => {
  it("違反警告と社会的時差ぼけ警告を同時に表示する", () => {
    const markup = renderTimeline(createTimeline());

    expect(markup).toContain("ルール違反があります");
    expect(markup).toContain("マッピング不正");
    expect(markup).toContain("社会的時差ぼけの警告");
  });

  it("shouldPlotOnGrid が true のタスクだけをグリッドへ描画する", () => {
    const markup = renderTimeline(createTimeline());

    expect(markup).toContain("表示する仕事タスク");
    expect(markup).not.toContain("表示しないプライベートタスク");
  });

  it("動的インラインstyleはタスク面の top と height だけに使う", () => {
    const markup = renderTimeline(createTimeline());
    const styleAttributes = [...markup.matchAll(/style="([^"]*)"/g)].map(
      (match) => match[1],
    );

    expect(styleAttributes).toHaveLength(1);
    expect(styleAttributes[0]).toMatch(/^top:[^;]+%;height:[^;]+%$/);
    expect(styleAttributes[0]).not.toMatch(
      /(?:left|right|width|position|inset|margin|padding):/,
    );
  });
});

function renderTimeline(timeline: TimelineDTO): string {
  return renderToStaticMarkup(createElement(DailyTimeline, { timeline }));
}

function createTimeline(): TimelineDTO {
  const anchorDate = new Date("2026-06-21T12:00:00.000Z");
  const workBlock = createBlock({
    blockId: BlockId.WORK_TIME,
    startTime: new Date("2026-06-22T00:00:00.000Z"),
    endTime: new Date("2026-06-22T08:00:00.000Z"),
  });

  workBlock.tasks = [
    {
      id: "work-task",
      title: "表示する仕事タスク",
      description: "",
      accountKind: "Work",
      startTime: new Date("2026-06-22T00:00:00.000Z"),
      endTime: new Date("2026-06-22T01:00:00.000Z"),
      shouldPlotOnGrid: true,
    },
    {
      id: "private-task",
      title: "表示しないプライベートタスク",
      description: "",
      accountKind: "Private",
      startTime: new Date("2026-06-22T00:30:00.000Z"),
      endTime: null,
      shouldPlotOnGrid: false,
    },
  ];

  return {
    anchorDate,
    totalDurationMinutes: 23 * 60,
    blocks: [workBlock],
    socialJetLagWarning: true,
    violations: [
      {
        targetId: "invalid-task",
        targetTitle: "マッピング不正",
        violationType: "INVALID_MAPPING",
        message: "タスクリストとブロックが一致しません。",
      },
    ],
  };
}

function createBlock({
  blockId,
  startTime,
  endTime,
}: {
  blockId: string;
  startTime: Date;
  endTime: Date;
}): BlockDTO {
  return {
    blockId,
    startTime,
    endTime,
    durationMinutes: (endTime.getTime() - startTime.getTime()) / (60 * 1000),
    isDurationFixed: false,
    tasks: [],
  };
}
