# ancholar ユースケース仕様書（初期開発検証フェーズ）

## 1. ユースケース一覧

| ID | ユースケース名 | 概要 | 関連するビジネスルール |
| :--- | :--- | :--- | :--- |
| **UC-1** | 当日のタイムライン表示<br>(GetDailyTimeline) | アプリ起動時や日付選択時に、DOWN TIMEをアンカーとした動的タイムラインとタスク群を統合表示する。 | ルール①、ルール②、ルール③、ルール④ |
| **UC-2** | タイムボックス変更<br>(ChangeTimeBoxDuration) | ユーザーによるタスクやタイムブロックの時間変更操作をバリデーションし、反映・連動スライドを行う。 | ルール②、ルール④ |
| **UC-3** | 外部変更の同期・検証<br>(ValidateExternalChanges) | GoogleカレンダーやToDoリスト側で直接行われた変更データを検知した際、ドメインルールに違反していないか総チェックする。 | ルール②、ルール④ |
| **UC-4** | 翌日の社会的時差ぼけ評価<br>(ValidateNextDaySocialJetLag) | 当日のFOCUS TIME開始（スマホ確認ルーティン）をトリガーに、当日と翌日の睡眠中央時刻のズレを評価し、翌日の調整を促す。 | ルール⑤ |
| **UC-5** | タスク・予定の新規追加<br>(CreateTaskOrEvent) | アンカラー上でタスクや予定を新規追加する際、最初からルール違反を起こさないか検証して仮生成・登録を行う。 | ルール③、ルール④ |

---

## 2. 各ユースケースの個別仕様

### UC-1: 当日のタイムライン表示 (GetDailyTimeline)

* **アクター:** ユーザー
* **事前条件:** ユーザーの設定（LifestyleSettings）が存在し、Googleアカウントの連携が完了していること。
* **事後条件:** 対象日のタイムブロックおよび紐づくタスクが、DOWN TIMEを起点とした時系列順に並んだ状態で取得される。
* **基本フロー:**
    1. 本ユースケースは、画面の起動または日付選択（対象日: `targetDate`）をトリガーに開始する。
    2. アプリケーション層は、外部ゲートウェイを介して対象日の `LifestyleSettings` を取得する。
    3. 外部ゲートウェイを介して、対象日のGoogleカレンダーの予定（イベント）およびGoogle Tasksのタスク（仕事用/プライベート用双方）を取得する。
    4. `TimelineCalculator.buildDay(downTimeStart, settings)` を呼び出し、DOWN TIMEを起点とした動的タイムライン（`ChronologicalDay`）の枠組みを組み立てる。
    5. 取得したタスク群をループさせ、各タスクを `ChronologicalDay.addTask(task)` によって適切なタイムブロックにマッピングする。
        * この際、ドメインモデル内部で「リスト名とBlockIdの一致（ルール③）」および「プライベートタスクの枠内制限（ルール④）」が自動的に検証される。
    6. 構築された `ChronologicalDay` を画面描画に最適なデータ構造（`TimelineDTO`）に変換して返却する。
* **例外フロー:**
    * **枠外タスク・不整合の検知:**
        * 手順5のタスクマッピング中に、すでに外部でルールを破るような変更がなされていた場合、ドメイン例外（`DomainError`）が発生する。この場合は、例外をキャッチして「UC-3（外部変更の同期・検証）」へ処理を委譲、またはエラー情報を内包したDTOを返却して画面に警告を表示する。

---

### UC-2: タイムボックス変更 (ChangeTimeBoxDuration)

* **アクター:** ユーザー
* **事前条件:** 画面上に当日のタイムライン（UC-1）が正しく描画されていること。
* **事後条件:** 変更内容がドメインルールを満たしている場合のみ、Google APIへ反映（CRUD）され、カレンダー表示が連動して更新される。
* **基本フロー:**
    1. ユーザーが画面上のドラッグ＆ドロップ等の操作により、特定のタイムボックス（タスクまたはタイムブロック）の時間を変更する（入力: `id`, `type`, `newStart`, `newEnd`）。
    2. 現在の `ChronologicalDay` インスタンスを取得する。
    3. **【変更対象が「仕事用タスク」の場合】**
        * `TaskPlacementValidator.validateWorkTaskMove` を呼び出し、変更後の時間枠が `WORK_TIME` の終了境界線（Hard Ceiling）を突破していないかを検証する。
    4. **【変更対象が「タイムブロック」の場合】**
        * `TaskPlacementValidator.validateBlockResize` を呼び出し、変更後の Duration が各ブロックの最小保証時間（Floor制約、例: FREE TIME 30分）を下回っていないか、また受動的短縮の禁止に触れていないかを検証する。
    5. バリデーションがすべて正常に通過した場合、アプリケーション層は外部ゲートウェイを呼び出し、Google Calendar または Google Tasks への更新リクエスト（PATCH/PUT）を発行する。
    6. 最新の状態に更新された `TimelineDTO` を再生成してフロントエンドに返却する。
* **例外フロー:**
    * **ルール違反（Hard Ceiling違反 / Floor割れ）:**
        * 手順3または手順4の検証で `DomainError` がスローされた場合、外部への更新リクエスト（手順5）は一切行わず、変更操作を拒否（ロールバック）し、画面にエラーメッセージ（「仕事の天井を超えています」等）を表示して終了する。

---

### UC-3: 外部変更の同期・検証 (ValidateExternalChanges)

* **アクター:** システム（トリガー: FOCUS TIME開始時、またはFOCUS TIME中のアプリ起動・フォーカス時）
* **事前条件:** アプリケーションがFOCUS TIME中にアクティブになったこと。
* **事後条件:** DOWN TIME〜WALK TIMEの間にGoogle側で直接行われていたルール違反操作を検知し、FOCUS TIMEの画面上でユーザーに即座に警告を提示する。
* **基本フロー:**
    1. ユーザーがスマホを見られるようになった `FOCUS_TIME` 中にアプリがアクティブになる、またはバックグラウンド処理がこれを検知して起動する。
    2. インフラ層（外部ゲートウェイ）が、前回のFOCUS TIME以降（DOWN TIME〜WALK TIMEの間など）にGoogleカレンダー・Tasks側で直接行われた変更差分データを収集する。
    3. 最新の外部データを用いて `ChronologicalDay` を再構成し、タスクのバリデーションを実行する。
    4. 「Googleカレンダー側で夜間に変更された予定が、今日の仕事の天井（Hard Ceiling）を突破しています」といったルール違反（`ViolationAlert`）が検出された場合、それを `ViolationAlert[]` の配列（空であれば正常）として返却する。フロントエンドはこの結果を受け取り、FOCUS TIMEの画面上部に警告として固定表示し、ユーザーへ強烈に引き戻しを促す。

---

### UC-4: 翌日の社会的時差ぼけ評価 (ValidateNextDaySocialJetLag)

* **アクター:** システム（トリガー: 当日の FOCUS TIME の開始、またはFOCUS TIME中のアプリ起動）
* **事前条件:** 当日の `DOWN_TIME`, `SLEEP_TIME`, `WALK_TIME` の枠が決定・経過中であり、当日の睡眠実績（中央時刻）が算出可能であること。
* **事後条件:** 当日と翌日の睡眠中央時刻のズレが評価され、1時間以上の場合は翌日に対する警告ステータスが返却され、ユーザーがFOCUS TIME中に予定を調整する材料となる。
* **基本フロー:**
    1. 当日の `FOCUS_TIME` の開始時刻、あるいはユーザーが朝のルーティンとしてFOCUS TIME中にアプリを開いたタイミングで本ユースケースが起動する。
    2. 当日のタイムライン（`CurrentDay`）から `SLEEP_TIME` ブロックを特定し、当日の睡眠中央時刻（$M_1$）を算出する。
    3. 外部ゲートウェイから翌日の `LifestyleSettings`、カレンダー予定、タスクを取得する。
    4. 翌日の予測タイムライン（`NextDay`）を仮ビルドし、その `SLEEP_TIME` ブロックから翌日の仮の睡眠中央時刻（$M_2$）を算出する。
    5. ドメインサービス `SocialJetLagDiagnostic.diagnose` 相当のロジックを呼び出し、$M_1$ と $M_2$ の差分（`deltaMinutes`）を計算する。
    6. 差分が60分（1時間）以上である場合、`hasWarning: true` としたアラート情報を生成し、返却する。
    7. ユーザーは、これから始まる `WORK_TIME` や今日のタスクを確認しつつ、「明日予定されている社会的時差ぼけ」を防ぐために、翌日のスケジュールをこのFOCUS TIME中に修正・防衛する。

---

### UC-5: タスク・予定の新規追加 (CreateTaskOrEvent)

* **アクター:** ユーザー
* **事前条件:** 画面上で追加したい時間帯や所属させたいタイムブロック（BlockId）が指定されていること。
* **事後条件:** 追加データが最初からドメインルールをクリアしている場合のみ、Google APIへ新規登録（POST）される。
* **基本フロー:**
    1. ユーザーが画面上の特定の時間枠、またはリストに対してタスク/予定の新規追加を行う（入力: `title`, `startTime`, `endTime`, `targetBlockId`, `accountKind`）。
    2. 対象日の現在の `ChronologicalDay` を取得する。
    3. 入力パラメーターを基に、ドメインモデルの `Task` オブジェクトを仮生成する。
        * 仕事用であれば `Task.createWork`、プライベートであれば `Task.createPrivate` を呼び出す。
        * この段階で、アカウント種別とBlockIdの紐付けチェック（ルール③）、プライベートタスクがブロックの時間枠内に収まっているか（ルール④）のバリデーションが自動的に実行される。
    4. 仮生成したタスクオブジェクトを `ChronologicalDay.addTask(task)` に投入し、仕事用タスクの場合は `validateWithinWorkTimeBoundary` を呼び出して、`WORK_TIME` の天井（Hard Ceiling）を突破していないかを検証する。
    5. すべての不変条件をクリアした場合、アプリケーション層は外部ゲートウェイを呼び出し、Google APIへの新規登録（POST）を実行する。
    6. 登録に成功したタスク情報を内包する `CreatedTaskDTO` を返却する。

---

## 3. アプリケーション層の入出力データ定義（DTO）

```typescript
// UC-1, UC-2 用：画面描画のための統合タイムラインデータ
export type TimelineDTO = {
  anchorDate: Date;               // 1日の起点（DOWN TIME開始時刻）
  totalDurationMinutes: number;   // 1日の総時間（23h〜25h）
  blocks: BlockDTO[];             // 7つのタイムブロックの配列
  socialJetLagWarning: boolean;   // 社会的時差ぼけ警告フラグ（翌日評価の結果と連動）
};

export type BlockDTO = {
  blockId: string;                // 'DOWN_TIME', 'SLEEP_TIME' など
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  isDurationFixed: boolean;
  tasks: TaskDTO[];               // このブロックにマッピングされたタスク群
};

export type TaskDTO = {
  id: string;
  title: string;
  description: string;
  accountKind: 'Private' | 'Work';
  startTime: Date;
  endTime: Date | null;           // Privateの場合はnull
  shouldPlotOnGrid: boolean;      // グリッド上に面表示するか（Workのみtrue）
};

// UC-3 用：外部の変更をアプリケーション層へ伝える構造
export type ExternalChangeDTO = {
  id: string;
  type: 'TASK' | 'EVENT';
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  accountKind: 'Private' | 'Work';
  listName?: string;              // Tasksの場合のリスト名
  newStart?: Date;
  newEnd?: Date;
};

// UC-3 用：ルール違反検知時のアラート構造
export type ViolationAlert = {
  targetId: string;
  targetTitle: string;
  violationType: 'HARD_CEILING_EXCEEDED' | 'FLOOR_CONSTRAINT_BROKEN' | 'INVALID_MAPPING';
  message: string;
};
```
