// 仕様: README.md §② タスク（Allocated Task）と可視化ルール
export const AccountKind = {
  Private: "Private",
  Work: "Work",
} as const;

export type AccountKind = (typeof AccountKind)[keyof typeof AccountKind];
