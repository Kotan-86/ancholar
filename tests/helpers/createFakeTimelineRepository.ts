// 仕様: Phase 0 テストヘルパー / Phase 6 Fake Infrastructure
import {
  FakeTimelineRepository,
  type FakeTimelineRepositoryOptions,
} from "@frameworks-drivers/fake/FakeTimelineRepository.js";

export type { FakeTimelineRepositoryOptions };

export function createFakeTimelineRepository(
  options: FakeTimelineRepositoryOptions = {},
): FakeTimelineRepository {
  return new FakeTimelineRepository(options);
}
