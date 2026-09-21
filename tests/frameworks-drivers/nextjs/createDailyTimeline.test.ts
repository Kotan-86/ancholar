// 仕様: docs/spec/presentation-uc1.md / Task 2 Composition Root
// 仕様: docs/spec/day-duration.md#受入基準 (A-9: 既定シナリオの 1440 分・夕食の枠内・翌日の成立)
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import type { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { createDailyTimelineUseCase } from "@frameworks-drivers/nextjs/composition/createDailyTimeline.js";
import { BlockId } from "@domain/value-objects/BlockId.js";

describe("createDailyTimelineUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("既定シナリオ: totalDurationMinutes が 1440 (A-9-1)", async () => {
    const targetDate = new Date("2026-06-21T20:30:00");

    const result = await createDailyTimelineUseCase(targetDate).execute({
      targetDate,
    });

    expect(result.isOk).toBe(true);
    if (!result.isOk) return;
    expect(result.value.totalDurationMinutes).toBe(1440);
  });

  it("違反は INVALID_MAPPING の1件だけで、夕食が FREE TIME(19:00–翌 20:30)の枠内に収まる (A-9-2)", async () => {
    const targetDate = new Date("2026-06-21T20:30:00");

    const result = await createDailyTimelineUseCase(targetDate).execute({
      targetDate,
    });

    expect(result.isOk).toBe(true);
    if (!result.isOk) return;
    expect(result.value.violations).toHaveLength(1);
    expect(result.value.violations?.[0]?.violationType).toBe("INVALID_MAPPING");

    const free = result.value.blocks.find((b) => b.blockId === BlockId.FREE_TIME)!;
    expect(free.startTime).toEqual(new Date("2026-06-22T19:00:00"));
    expect(free.endTime).toEqual(new Date("2026-06-22T20:30:00"));
    const dinner = free.tasks.find((t) => t.id === "private-2026-06-21")!;
    expect(dinner.startTime).toEqual(new Date("2026-06-22T19:30:00"));
    expect(dinner.startTime.getTime()).toBeGreaterThanOrEqual(free.startTime.getTime());
    expect(dinner.startTime.getTime()).toBeLessThan(free.endTime.getTime());
  });

  it("当日・翌日とも7ブロックが start <= end で連続する (A-9-4)", async () => {
    const targetDate = new Date("2026-06-21T20:30:00");
    const spy = vi.spyOn(TimelineCalculator, "buildDay");

    const result = await createDailyTimelineUseCase(targetDate).execute({
      targetDate,
    });

    expect(result.isOk).toBe(true);
    if (!result.isOk) return;
    expect(result.value.socialJetLagWarning).toBe(true); // A-9-3

    // 当日(DTO)
    expect(result.value.blocks).toHaveLength(7);
    result.value.blocks.forEach((block, i) => {
      expect(block.durationMinutes).toBeGreaterThan(0);
      expect(block.startTime.getTime()).toBeLessThanOrEqual(block.endTime.getTime());
      const next = result.value.blocks[i + 1];
      if (next) expect(block.endTime).toEqual(next.startTime);
    });

    // 当日・翌日(UC-1 の処理中に実際に組み立てられた日を捕捉する。
    // 翌日は SocialJetLagEvaluationService が getDownTimeStart から buildDay で組み立てる)
    const days: ChronologicalDay[] = spy.mock.results.map((r) => r.value);
    const nextAnchor = new Date("2026-06-22T21:45:00").getTime();
    const nextDay = days.find(
      (d) => d.blocks[0]!.timeRange.start.getTime() === nextAnchor,
    );
    expect(nextDay).toBeDefined();
    for (const day of days) {
      expect(day.blocks).toHaveLength(7);
      day.blocks.forEach((block, i) => {
        const { start, end } = block.timeRange;
        expect(start.getTime()).toBeLessThanOrEqual(end.getTime());
        const next = day.blocks[i + 1];
        if (next) expect(end).toEqual(next.timeRange.start);
      });
      expect(day.getBlock(BlockId.FOCUS_TIME).duration().minutes).toBeGreaterThanOrEqual(10);
    }
  });

  it("UC-1 の依存を組み立て、表示確認用の TimelineDTO を返す", async () => {
    const targetDate = new Date("2026-06-21T20:30:00");

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
    const firstDate = new Date("2026-06-21T20:30:00");
    const secondDate = new Date("2026-06-22T20:30:00");

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
