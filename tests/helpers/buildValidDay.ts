// 仕様: docs/application/usecase.md#UC-2
import { type ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";

export function buildValidDay(
  anchor: Date = new Date("2026-06-21T21:00:00"),
): ChronologicalDay {
  return TimelineCalculator.buildDay(anchor, DEFAULT_LIFESTYLE_SETTINGS);
}
