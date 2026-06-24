// 仕様: Phase 0 テストヘルパー / Phase 6 Fake Infrastructure
import {
  FakeGoogleGateway,
  type FakeGoogleGatewayOptions,
} from "@infrastructure/fake/FakeGoogleGateway.js";

export type { FakeGoogleGatewayOptions };

export function createFakeGoogleGateway(
  options: FakeGoogleGatewayOptions = {},
): FakeGoogleGateway {
  return new FakeGoogleGateway(options);
}
