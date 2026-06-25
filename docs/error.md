# ancholar エラーハンドリング仕様書（Result型・アプリケーション層主導パターン）

## 1. エラーハンドリングの基本方針

本プロジェクトでは、ビジネスルールの違反や外部APIの失敗に対して **例外（try-catch / throw）を原則として使用しません**。
代わりに `Result` 型を利用し、成功時の値（Success）と失敗時のエラー（Failure）を明示的に戻り値の型として表現します。

### 【重要視点】ドメインエラーの検出と責務の分離
クリーンアーキテクチャの原則に基づき、以下の責務分担を徹底します。

1. **ドメイン層の純粋性（ルールの評価）**
   * ドメイン層（エンティティやドメインサービス）は、`Result` 型やエラークラスの定義を持ちません。
   * ビジネスルールの評価結果として、「真偽値（boolean）」や「状態を表すユニオン型（例: `'VALID' | 'EXCEEDS_CEILING'`）」などの純粋な値を返します。
2. **アプリケーション層の文脈（エラーの検出と構成）**
   * ユースケースは、ドメイン層から返された評価結果を受け取ります。
   * 「どのユースケースで」「どのような操作をして」そのルールに抵触したのかという文脈を付与し、`interface/errors/UseCaseError` として構築・返却します。

---

## 2. Result型の定義

TypeScriptで以下の直和型（Discriminated Union）を定義し、アプリケーション層以上の境界で共通利用します。

```typescript
// src/shared/Result.ts

export type Ok<T> = { readonly isOk: true; readonly value: T };
export type Err<E> = { readonly isOk: false; readonly error: E };

export type Result<T, E> = Ok<T> | Err<E>;

// ファクトリ関数
export const ok = <T>(value: T): Ok<T> => ({ isOk: true, value });
export const err = <E>(error: E): Err<E> => ({ isOk: false, error });
```

---

### 3. ユースケースエラーの型定義

システムで発生しうるすべてのエラーは、インターフェイス層で定義します。Port の戻り値型としても利用され、外側の層（`frameworks-drivers`）が内側へ依存する際の契約となります。ドメイン層は特定のエラーフォーマットに依存しません。

```typescript
// src/interface/errors/UseCaseError.ts

// ドメインルールの違反に起因するエラー
export type RuleViolationError = {
  readonly type: 'HardCeilingExceeded' | 'FloorConstraintBroken' | 'InvalidTaskMapping';
  readonly message: string;
  readonly context?: any; // ユースケース固有の補足情報
};

// 外部インフラに起因するエラー
export type ExternalApiError = {
  readonly type: 'ExternalApiError';
  readonly service: 'GoogleCalendar' | 'GoogleTasks';
  readonly message: string;
};

export type NotFoundError = {
  readonly type: 'NotFound';
  readonly resourceName: string;
  readonly message: string;
};

// ユースケースが返すエラーの総称
export type UseCaseError = RuleViolationError | ExternalApiError | NotFoundError;
```

---

## 4. 各層の実装例と連携フロー

### 4.1. ドメイン層（純粋な評価）

ドメインサービスは例外を投げず、純粋な評価結果（ステータス）を返します。

```typescript
// src/domain/services/TaskPlacementValidator.ts

export type WorkTaskMoveStatus = 'VALID' | 'EXCEEDS_HARD_CEILING' | 'CRUSHES_DOWN_TIME';

export class TaskPlacementValidator {
  // Result型やエラーを返さず、純粋なドメインの「状態」を評価して返す
  static evaluateWorkTaskMove(day: ChronologicalDay, proposal: TaskMoveProposal): WorkTaskMoveStatus {
    const workBlock = day.getBlock(BlockId.WORK_TIME);
    
    if (proposal.newEnd.getTime() > workBlock.timeRange.end.getTime()) {
      return 'EXCEEDS_HARD_CEILING';
    }

    const nextDownStart = day.getBlock(BlockId.FREE_TIME).timeRange.end.getTime();
    if (proposal.newEnd.getTime() > nextDownStart) {
      return 'CRUSHES_DOWN_TIME';
    }

    return 'VALID';
  }
}
```

## 4.2. アプリケーション層（エラーの検出とResultの返却）

ユースケースがドメインの評価結果を受け取り、ユースケースの文脈に合わせたエラーとして検出・返却します。

```typescript
// src/application/usecases/ChangeTimeBoxDurationUseCase.ts

import { Result, ok, err } from "../../shared/Result";
import { UseCaseError } from "@interface/errors/UseCaseError";

export class ChangeTimeBoxDurationUseCase {
  constructor(
    private readonly timelineRepo: TimelineRepository,
    private readonly googleGateway: GoogleGateway
  ) {}

  async execute(input: ChangeTimeBoxInput): Promise<Result<TimelineDTO, UseCaseError>> {
    const dayResult = await this.timelineRepo.getChronologicalDay(input.targetDate);
    if (!dayResult.isOk) return err(dayResult.error);
    const day = dayResult.value;

    if (input.type === 'TASK') {
      const proposal = { /* マッピング処理 */ };
      
      // 1. ドメインにルールの評価を依頼する
      const status = TaskPlacementValidator.evaluateWorkTaskMove(day, proposal);
      
      // 2. アプリケーション層がステータスを検出し、文脈に合わせてエラーを生成する
      if (status === 'EXCEEDS_HARD_CEILING') {
        return err({
          type: 'HardCeilingExceeded',
          message: '仕事用タスクがWORK TIMEの天井を超えています。前夜の防衛を優先してください。',
          context: { taskId: input.targetId }
        });
      }
      if (status === 'CRUSHES_DOWN_TIME') {
        // ※別のユースケースでは警告だけで通すなど、ここでユースケースごとの振る舞いを変えられる
        return err({
          type: 'HardCeilingExceeded', 
          message: 'DOWN TIMEを圧迫する操作は禁止されています。'
        });
      }
    }

    // 3. 外部APIへの更新処理
    const updateResult = await this.googleGateway.updateTaskTime(input.targetId, input.newStart, input.newEnd);
    if (!updateResult.isOk) return err(updateResult.error);

    // 4. 成功結果の返却
    const dto = TimelineMapper.toDTO(day);
    return ok(dto);
  }
}
```

### 4.3. プレゼンテーション層（エラーの描画）

フロントエンドは受け取った Result の isOk を検証し、型安全にUIを分岐させます。

```typescript
// UIコンポーネントでの呼び出しイメージ
const handleDragEnd = async (taskId, newStart, newEnd) => {
  const result = await changeTimeBoxDurationUseCase.execute({ taskId, newStart, newEnd });

  if (result.isOk) {
    setTimeline(result.value);
    showToast("時間を変更しました", "success");
  } else {
    // 失敗時は Result.error を参照して安全に分岐
    const error = result.error;
    switch (error.type) {
      case 'HardCeilingExceeded':
        showToast(error.message, "warning");
        revertTaskPosition(taskId);
        break;
      case 'FloorConstraintBroken':
        showToast("最小保証時間を下回っています", "warning");
        revertTaskPosition(taskId);
        break;
      case 'ExternalApiError':
        showToast("通信エラーが発生しました", "error");
        break;
      default:
        showToast("予期せぬエラーが発生しました", "error");
    }
  }
};
```

## 5. フレームワーク&ドライバー層における「例外の封じ込め」

サードパーティ製ライブラリ（googleapis など）が投げる例外は、`frameworks-drivers` 層の最境界（Gateway や Repository の実装内）で必ずキャッチし、直ちに `Result` 型（`Err<UseCaseError>`）に変換します。これにより、アプリケーションのコア部分へ例外が侵入することを防ぎます。
