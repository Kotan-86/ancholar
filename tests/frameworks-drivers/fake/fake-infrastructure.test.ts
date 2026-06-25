// 仕様: Phase 6 Fake Infrastructure
import { describe, expect, it } from "vitest";
import { AccountKind } from "@domain/value-objects/AccountKind.js";
import { BlockId } from "@domain/value-objects/BlockId.js";
import { DEFAULT_LIFESTYLE_SETTINGS } from "@domain/value-objects/LifestyleSettings.js";
import { FakeTimelineRepository } from "@frameworks-drivers/fake/FakeTimelineRepository.js";
import { FakeGoogleGateway } from "@frameworks-drivers/fake/FakeGoogleGateway.js";
import {
  FakeExternalChangeRepository,
  type FakeExternalChange,
} from "@frameworks-drivers/fake/FakeExternalChangeRepository.js";
import { buildValidDay } from "../../helpers/buildValidDay.js";
import { buildWorkTask } from "../../helpers/buildWorkTask.js";

describe("FakeTimelineRepository", () => {
  const targetDate = new Date("2026-06-21T21:00:00");

  it("固定 settings / downTimeStart / 空タスクを返す", async () => {
    const repo = new FakeTimelineRepository({ targetDate });

    const settings = await repo.getLifestyleSettings(targetDate);
    const downTime = await repo.getDownTimeStart(targetDate);
    const tasks = await repo.getTasksForDay(targetDate);
    const events = await repo.getEventsForDay(targetDate);

    expect(settings.isOk).toBe(true);
    if (settings.isOk) {
      expect(settings.value).toEqual(DEFAULT_LIFESTYLE_SETTINGS);
    }
    expect(downTime.isOk).toBe(true);
    if (downTime.isOk) {
      expect(downTime.value).toEqual(targetDate);
    }
    expect(tasks.isOk).toBe(true);
    if (tasks.isOk) {
      expect(tasks.value).toEqual([]);
    }
    expect(events.isOk).toBe(true);
    if (events.isOk) {
      expect(events.value).toEqual([]);
    }
  });

  it("シナリオ別タスクを日付ごとに返す", async () => {
    const workTask = buildWorkTask({ id: "task-1" });
    const repo = new FakeTimelineRepository({
      targetDate,
      tasks: [
        {
          id: workTask.id,
          title: workTask.title,
          description: workTask.description,
          blockId: BlockId.WORK_TIME,
          accountKind: AccountKind.Work,
          startTime: workTask.startTime,
          endTime: workTask.endTime!,
          listName: workTask.listName,
        },
      ],
    });

    const result = await repo.getTasksForDay(targetDate);

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.id).toBe("task-1");
    }
  });

  it("getChronologicalDay は組み立て済み day または buildDay 結果を返す", async () => {
    const builtDay = buildValidDay();
    const repoWithPreset = new FakeTimelineRepository({
      targetDate,
      chronologicalDay: builtDay,
    });
    const presetResult = await repoWithPreset.getChronologicalDay(targetDate);
    expect(presetResult.isOk).toBe(true);
    if (presetResult.isOk) {
      expect(presetResult.value).toBe(builtDay);
    }

    const repoDefault = new FakeTimelineRepository({ targetDate });
    const defaultResult = await repoDefault.getChronologicalDay(targetDate);
    expect(defaultResult.isOk).toBe(true);
    if (defaultResult.isOk) {
      expect(defaultResult.value.blocks).toHaveLength(7);
    }
  });

  it("設定したエラーを返す", async () => {
    const repo = new FakeTimelineRepository({
      errors: {
        getChronologicalDay: {
          type: "NotFound",
          resourceName: "ChronologicalDay",
          message: "not found",
        },
      },
    });

    const result = await repo.getChronologicalDay(targetDate);

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.type).toBe("NotFound");
    }
  });

  it("日付別シナリオを上書きできる", async () => {
    const repo = new FakeTimelineRepository({ targetDate });
    const nextDate = new Date("2026-06-22T21:00:00");
    const nextDownTime = new Date("2026-06-22T20:30:00");

    repo.setScenarioForDate(nextDate, { downTimeStart: nextDownTime });

    const result = await repo.getDownTimeStart(nextDate);
    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value).toEqual(nextDownTime);
    }
  });
});

describe("FakeGoogleGateway", () => {
  it("update/create 呼び出しを記録し成功を返す", async () => {
    const gateway = new FakeGoogleGateway();
    const start = new Date("2026-06-22T09:00:00");
    const end = new Date("2026-06-22T10:00:00");

    const updateTask = await gateway.updateTaskTime("task-1", start, end);
    const updateBlock = await gateway.updateBlockTime(BlockId.WORK_TIME, start, end);
    const createTask = await gateway.createTask({
      title: "New Task",
      description: "",
      blockId: BlockId.WORK_TIME,
      accountKind: AccountKind.Work,
      startTime: start,
      endTime: end,
      listName: "WORK TIME",
    });
    const createEvent = await gateway.createEvent({
      title: "New Event",
      description: "",
      blockId: BlockId.WORK_TIME,
      startTime: start,
      endTime: end,
    });

    expect(updateTask.isOk).toBe(true);
    expect(updateBlock.isOk).toBe(true);
    expect(createTask.isOk).toBe(true);
    expect(createEvent.isOk).toBe(true);
    expect(gateway.updateTaskTimeCalls).toHaveLength(1);
    expect(gateway.updateBlockTimeCalls).toHaveLength(1);
    expect(gateway.createTaskCalls).toHaveLength(1);
    expect(gateway.createEventCalls).toHaveLength(1);
    if (createTask.isOk) {
      expect(createTask.value.id).toBe("fake-task-1");
    }
    if (createEvent.isOk) {
      expect(createEvent.value.id).toBe("fake-event-1");
    }
  });

  it("setFailure で指定メソッドのみ失敗する", async () => {
    const gateway = new FakeGoogleGateway();
    gateway.setFailure("updateTaskTime", {
      type: "ExternalApiError",
      service: "GoogleTasks",
      message: "failed",
    });

    const failed = await gateway.updateTaskTime(
      "task-1",
      new Date("2026-06-22T09:00:00"),
      new Date("2026-06-22T10:00:00"),
    );
    const succeeded = await gateway.updateBlockTime(
      BlockId.WORK_TIME,
      new Date("2026-06-22T09:00:00"),
      new Date("2026-06-22T17:00:00"),
    );

    expect(failed.isOk).toBe(false);
    if (!failed.isOk) {
      expect(failed.error.type).toBe("ExternalApiError");
    }
    expect(succeeded.isOk).toBe(true);
  });
});

describe("FakeExternalChangeRepository", () => {
  const since = new Date("2026-06-21T21:00:00");
  const until = new Date("2026-06-22T12:00:00");

  const inRangeChange: FakeExternalChange = {
    id: "change-1",
    type: "TASK",
    action: "UPDATED",
    accountKind: "Work",
    listName: "WORK TIME",
    newStart: new Date("2026-06-22T09:00:00"),
    newEnd: new Date("2026-06-22T18:00:00"),
    occurredAt: new Date("2026-06-22T08:00:00"),
  };

  const outOfRangeChange: FakeExternalChange = {
    id: "change-2",
    type: "EVENT",
    action: "CREATED",
    accountKind: "Work",
    occurredAt: new Date("2026-06-20T08:00:00"),
  };

  it("occurredAt が since〜until 内の差分のみ返す", async () => {
    const repo = new FakeExternalChangeRepository({
      changes: [inRangeChange, outOfRangeChange],
    });

    const result = await repo.getChangesSince(since, until);

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.id).toBe("change-1");
      expect(result.value[0]).not.toHaveProperty("occurredAt");
    }
  });

  it("setChanges でシナリオを差し替えられる", async () => {
    const repo = new FakeExternalChangeRepository();
    repo.setChanges([inRangeChange]);

    const result = await repo.getChangesSince(since, until);

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value).toHaveLength(1);
    }
  });

  it("設定したエラーを返す", async () => {
    const repo = new FakeExternalChangeRepository({
      error: {
        type: "ExternalApiError",
        service: "GoogleCalendar",
        message: "sync failed",
      },
    });

    const result = await repo.getChangesSince(since, until);

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.type).toBe("ExternalApiError");
    }
  });
});

describe("Fake infrastructure wiring", () => {
  it("FakeTimelineRepository と DayAssemblyService を配線できる", async () => {
    const { DayAssemblyService } = await import(
      "@application/services/DayAssemblyService.js"
    );
    const targetDate = new Date("2026-06-21T21:00:00");
    const repo = new FakeTimelineRepository({ targetDate });
    const service = new DayAssemblyService(repo);

    const result = await service.assembleDay(targetDate);

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.blocks).toHaveLength(7);
    }
  });

  it("FakeGoogleGateway と ChangeTimeBoxDurationUseCase を配線できる", async () => {
    const { ChangeTimeBoxDurationUseCase } = await import(
      "@application/usecases/ChangeTimeBoxDurationUseCase.js"
    );
    const targetDate = new Date("2026-06-21T21:00:00");
    const day = buildValidDay();
    const task = buildWorkTask({ id: "task-1" });
    const repo = new FakeTimelineRepository({
      targetDate,
      chronologicalDay: day.addTask(task),
    });
    const gateway = new FakeGoogleGateway();

    const useCase = new ChangeTimeBoxDurationUseCase(repo, gateway);
    const result = await useCase.execute({
      targetId: "task-1",
      type: "TASK",
      newStart: new Date("2026-06-22T09:30:00"),
      newEnd: new Date("2026-06-22T10:30:00"),
      targetDate,
    });

    expect(result.isOk).toBe(true);
    expect(gateway.updateTaskTimeCalls).toHaveLength(1);
  });
});
