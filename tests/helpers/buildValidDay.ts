// 仕様: docs/application/usecase.md#UC-1 / Phase 0 テストヘルパー
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import type { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";

const DEFAULT_DOWN_TIME_START = new Date("2026-06-21T21:00:00");

export function buildValidDay(
  downTimeStart: Date = DEFAULT_DOWN_TIME_START,
): ChronologicalDay {
  return TimelineCalculator.buildDay(downTimeStart, DEFAULT_LIFESTYLE_SETTINGS);
}
