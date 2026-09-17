// 仕様: docs/spec/presentation-uc1.md / Task 2 Composition Root
import { describe, expect, it } from "vitest";
import { createDailyTimelineUseCase } from "@frameworks-drivers/nextjs/composition/createDailyTimeline.js";
import { BlockId } from "@domain/value-objects/BlockId.js";

describe("createDailyTimelineUseCase", () => {
  it("UC-1 の依存を組み立て、表示確認用の TimelineDTO を返す", async () => {
    const targetDate = new Date("2026-06-21T21:00:00");

    const result = await createDailyTimelineUseCase(targetDate).execute({
      targetDate,
    });

    expect(result.isOk).toBe(true);
    if (!result.isOk) return;

    expect(result.value.blocks).toHaveLength(7);
    expect(result.value.socialJetLagWarning).toBe(true);
    expect(result.value.violations).toEqual([
      expect.objectContaining({
        targetId: "invalid-mapping-2026-06-21",
        violationType: "INVALID_MAPPING",
      }),
    ]);

    const workBlock = result.value.blocks.find(
      (block) => block.blockId === BlockId.WORK_TIME,
    );
    expect(workBlock?.tasks).toEqual([
      expect.objectContaining({
        id: "work-2026-06-21",
        shouldPlotOnGrid: true,
      }),
    ]);

    const freeBlock = result.value.blocks.find(
      (block) => block.blockId === BlockId.FREE_TIME,
    );
    expect(freeBlock?.tasks).toEqual([
      expect.objectContaining({
        id: "private-2026-06-21",
        shouldPlotOnGrid: false,
      }),
    ]);
  });

  it("対象日ごとに独立した日付相対シナリオを生成する", async () => {
    const firstDate = new Date("2026-06-21T21:00:00");
    const secondDate = new Date("2026-06-22T21:00:00");

    const [first, second] = await Promise.all([
      createDailyTimelineUseCase(firstDate).execute({ targetDate: firstDate }),
      createDailyTimelineUseCase(secondDate).execute({ targetDate: secondDate }),
    ]);

    expect(first.isOk).toBe(true);
    expect(second.isOk).toBe(true);
    if (!first.isOk || !second.isOk) return;

    expect(first.value.anchorDate).toEqual(firstDate);
    expect(second.value.anchorDate).toEqual(secondDate);
    expect(first.value.blocks.flatMap((block) => block.tasks)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "work-2026-06-21" }),
      ]),
    );
    expect(second.value.blocks.flatMap((block) => block.tasks)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "work-2026-06-22" }),
      ]),
    );
  });
});
