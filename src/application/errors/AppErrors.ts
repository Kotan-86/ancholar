// 仕様: docs/error.md#3-アプリケーションエラーの型定義
export type RuleViolationError = {
  readonly type: "HardCeilingExceeded" | "FloorConstraintBroken" | "InvalidTaskMapping";
  readonly message: string;
  readonly context?: unknown;
};

export type ExternalApiError = {
  readonly type: "ExternalApiError";
  readonly service: "GoogleCalendar" | "GoogleTasks";
  readonly message: string;
};

export type NotFoundError = {
  readonly type: "NotFound";
  readonly resourceName: string;
  readonly message: string;
};

export type UseCaseError = RuleViolationError | ExternalApiError | NotFoundError;
