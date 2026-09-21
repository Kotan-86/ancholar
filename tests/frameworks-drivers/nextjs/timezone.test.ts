// 仕様: 業務タイムゾーン Asia/Tokyo のサーバー起動時適用
// 仕様: docs/spec/day-duration.md#受入基準 (A-11: 起点 20:30、始業 08:30 = UTC 23:30)
import { afterEach, describe, expect, it } from "vitest";
import { register } from "@frameworks-drivers/nextjs/instrumentation.js";
import { createDailyTimelineUseCase } from "@frameworks-drivers/nextjs/composition/createDailyTimeline.js";
import {
  formatDateParam,
  parseTargetDate,
  shiftTargetDate,
} from "@frameworks-drivers/nextjs/app/dateQuery.js";
import { BlockId } from "@domain/value-objects/BlockId.js";

describe("Next.js business timezone", () => {
  const originalRuntime = process.env.NEXT_RUNTIME;
  const originalTimezone = process.env.TZ;

  afterEach(() => {
    if (originalRuntime === undefined) {
      delete process.env.NEXT_RUNTIME;
    } else {
      process.env.NEXT_RUNTIME = originalRuntime;
    }

    if (originalTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimezone;
    }
  });

  it("Node.js server 初期化時に外部の TZ 設定を Asia/Tokyo で上書きする", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    process.env.TZ = "UTC";

    await register();

    expect(process.env.TZ).toBe("Asia/Tokyo");
    expect(new Date(2026, 5, 21, 21).toISOString()).toBe(
      "2026-06-21T12:00:00.000Z",
    );
  });

  // 仕様: docs/spec/day-duration.md#受入基準 A-11（ホストTZに依存しない 20:30）
  it("UTC で起動しても UC-1 の対象日・起点・WORK TIME・日付リンクを維持する", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    process.env.TZ = "UTC";

    // URL 境界は instrumentation 実行前でもホストTZに依存しない。
    const targetDate = parseTargetDate("2026-06-21");
    expect(targetDate.toISOString()).toBe("2026-06-21T11:30:00.000Z");

    await register();

    const result = await createDailyTimelineUseCase(targetDate).execute({
      targetDate,
    });

    expect(result.isOk).toBe(true);
    if (!result.isOk) return;

    const workBlock = result.value.blocks.find(
      (block) => block.blockId === BlockId.WORK_TIME,
    );
    expect(formatDateParam(result.value.anchorDate)).toBe("2026-06-21");
    expect(result.value.anchorDate.toISOString()).toBe(
      "2026-06-21T11:30:00.000Z",
    );
    expect(workBlock?.startTime.toISOString()).toBe(
      "2026-06-21T23:30:00.000Z",
    );
    expect(formatDateParam(shiftTargetDate(targetDate, -1))).toBe("2026-06-20");
    expect(formatDateParam(shiftTargetDate(targetDate, 1))).toBe("2026-06-22");
  });
});
