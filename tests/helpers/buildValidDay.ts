// 仕様: docs/application/usecase.md#UC-1 / Phase 0 テストヘルパー
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import type { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";

// 仕様: docs/spec/day-duration.md#4-2 標準の1日(既定の起点 20:30)
const DEFAULT_DOWN_TIME_START = new Date("2026-06-21T20:30:00");

export function buildValidDay(
  downTimeStart: Date = DEFAULT_DOWN_TIME_START,
): ChronologicalDay {
  return TimelineCalculator.buildDay(downTimeStart, DEFAULT_LIFESTYLE_SETTINGS);
}
