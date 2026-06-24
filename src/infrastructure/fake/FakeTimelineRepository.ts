// 仕様: docs/application/usecase.md#UC-1 / UC-3 / UC-4 / UC-5
import type { ChronologicalDay } from "@domain/entities/ChronologicalDay.js";
import { TimelineCalculator } from "@domain/services/TimelineCalculator.js";
import {
  DEFAULT_LIFESTYLE_SETTINGS,
  type LifestyleSettings,
} from "@domain/value-objects/LifestyleSettings.js";
import type {
  ExternalEventRecord,
  ExternalTaskRecord,
} from "@application/dto/ExternalRecords.js";
import type { TimelineRepository } from "@application/ports/TimelineRepository.js";
import type { UseCaseError } from "@application/errors/AppErrors.js";
import { err, ok, type Result } from "@shared/Result.js";

const DEFAULT_TARGET_DATE = new Date("2026-06-21T21:00:00");

export type FakeTimelineRepositoryOptions = {
  targetDate?: Date;
  downTimeStart?: Date;
  settings?: LifestyleSettings;
  tasks?: ExternalTaskRecord[];
  events?: ExternalEventRecord[];
  chronologicalDay?: ChronologicalDay;
  errors?: Partial<Record<keyof TimelineRepository, UseCaseError>>;
};

type DayScenario = {
  downTimeStart: Date;
  settings: LifestyleSettings;
  tasks: ExternalTaskRecord[];
  events: ExternalEventRecord[];
  chronologicalDay?: ChronologicalDay;
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class FakeTimelineRepository implements TimelineRepository {
  private readonly defaultScenario: DayScenario;
  private readonly perDateScenarios = new Map<string, Partial<DayScenario>>();
  private readonly errors: Partial<Record<keyof TimelineRepository, UseCaseError>>;

  constructor(options: FakeTimelineRepositoryOptions = {}) {
    const targetDate = options.targetDate ?? DEFAULT_TARGET_DATE;
    const downTimeStart = options.downTimeStart ?? targetDate;

    this.defaultScenario = {
      downTimeStart,
      settings: options.settings ?? DEFAULT_LIFESTYLE_SETTINGS,
      tasks: options.tasks ?? [],
      events: options.events ?? [],
      ...(options.chronologicalDay !== undefined
        ? { chronologicalDay: options.chronologicalDay }
        : {}),
    };
    this.errors = options.errors ?? {};
  }

  setScenarioForDate(targetDate: Date, scenario: Partial<DayScenario>): void {
    this.perDateScenarios.set(dateKey(targetDate), scenario);
  }

  setTasks(targetDate: Date, tasks: ExternalTaskRecord[]): void {
    this.setScenarioForDate(targetDate, { tasks });
  }

  setEvents(targetDate: Date, events: ExternalEventRecord[]): void {
    this.setScenarioForDate(targetDate, { events });
  }

  setChronologicalDay(targetDate: Date, chronologicalDay: ChronologicalDay): void {
    this.setScenarioForDate(targetDate, { chronologicalDay });
  }

  async getLifestyleSettings(targetDate: Date): Promise<Result<LifestyleSettings, UseCaseError>> {
    const error = this.errors.getLifestyleSettings;
    if (error) {
      return err(error);
    }
    return ok(this.resolveScenario(targetDate).settings);
  }

  async getDownTimeStart(targetDate: Date): Promise<Result<Date, UseCaseError>> {
    const error = this.errors.getDownTimeStart;
    if (error) {
      return err(error);
    }
    return ok(this.resolveScenario(targetDate).downTimeStart);
  }

  async getTasksForDay(targetDate: Date): Promise<Result<ExternalTaskRecord[], UseCaseError>> {
    const error = this.errors.getTasksForDay;
    if (error) {
      return err(error);
    }
    return ok([...this.resolveScenario(targetDate).tasks]);
  }

  async getEventsForDay(targetDate: Date): Promise<Result<ExternalEventRecord[], UseCaseError>> {
    const error = this.errors.getEventsForDay;
    if (error) {
      return err(error);
    }
    return ok([...this.resolveScenario(targetDate).events]);
  }

  async getChronologicalDay(targetDate: Date): Promise<Result<ChronologicalDay, UseCaseError>> {
    const error = this.errors.getChronologicalDay;
    if (error) {
      return err(error);
    }

    const scenario = this.resolveScenario(targetDate);
    if (scenario.chronologicalDay) {
      return ok(scenario.chronologicalDay);
    }

    return ok(
      TimelineCalculator.buildDay(scenario.downTimeStart, scenario.settings),
    );
  }

  private resolveScenario(targetDate: Date): DayScenario {
    const override = this.perDateScenarios.get(dateKey(targetDate));
    if (!override) {
      return this.defaultScenario;
    }

    return {
      downTimeStart: override.downTimeStart ?? this.defaultScenario.downTimeStart,
      settings: override.settings ?? this.defaultScenario.settings,
      tasks: override.tasks ?? this.defaultScenario.tasks,
      events: override.events ?? this.defaultScenario.events,
      ...(override.chronologicalDay !== undefined
        ? { chronologicalDay: override.chronologicalDay }
        : this.defaultScenario.chronologicalDay !== undefined
          ? { chronologicalDay: this.defaultScenario.chronologicalDay }
          : {}),
    };
  }
}
