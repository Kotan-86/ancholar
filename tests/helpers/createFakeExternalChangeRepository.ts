// 仕様: Phase 6 Fake Infrastructure
import {
  FakeExternalChangeRepository,
  type FakeExternalChange,
  type FakeExternalChangeRepositoryOptions,
} from "@infrastructure/fake/FakeExternalChangeRepository.js";

export type { FakeExternalChange, FakeExternalChangeRepositoryOptions };

export function createFakeExternalChangeRepository(
  options: FakeExternalChangeRepositoryOptions = {},
): FakeExternalChangeRepository {
  return new FakeExternalChangeRepository(options);
}
