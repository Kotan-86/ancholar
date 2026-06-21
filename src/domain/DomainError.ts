// 仕様: README.md §2 ドメインモデル定義
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
