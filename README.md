# ancholar

## プロジェクト概要

### コア・ドメイン思想
生産性の最大化ではなく、「前夜の回復（DOWN TIME / SLEEP TIME）を最優先で防衛し、明日のパフォーマンスを最大化する」ための、睡眠中心型ライフサイクル管理システム（Sleep-Centric Life Cycle System）。

### アーキテクチャ方針
Google APIの仕様変更やライフスタイルの変化（院生から社会人への移行等）に耐えるため、外部依存（UI・API）とコアロジックを完全に分離した「ライト版クリーンアーキテクチャ」を採用する。


## 2. ユビキタス言語 ＆ ドメインモデル定義

### ① 7つの時間ブロック（Time Blocks）
1日のタイムラインは、以下の特性・制約を持つ7つの時間ブロックの数珠繋ぎ（依存関係）で構成される。

| ブロック名 (Block ID) | 標準時間 (Default) | 最小保証時間 (Floor) | 防衛レベル・システム特性 |
| :--- | :--- | :--- | :--- |
| **DOWN TIME** | 1.5時間 | **1.5時間 (固定)** | **【絶対死守・アンカー】** 1日の起点。短縮・時間枠の変更は一切不可 |
| **SLEEP TIME** | 7.00時間 | **可変 (能動のみ)** | **【原則死守】** 夜更かし等の受動的短縮は禁止。娯楽等の能動的理由のみ短縮可 |
| **WALK TIME** | 1.0時間 | **1.0時間 (固定)** | **【絶対死守】** 起床・身支度。短縮不可、時間枠固定 |
| **FOCUS TIME** | 1.5時間 | **10分** | **【可変・クッション】** 朝の調整弁。どれだけ圧迫されても10分は必ず死守 |
| **WORK TIME** | 可変 | **なし (0分も可)** | **【可変】** 仕事・研究。タスク削減によりどれだけでも縮小・前倒し終了可能 |
| **GRADATION TIME** | 1.0時間 | **10分** | **【可変】** オンオフ切り替え。柔軟に変更可能だが最低10分は確保 |
| **FREE TIME** | 2.0時間 | **30分** | **【可変・最大バッファ】** DOWN TIME直前。柔軟に変更可能だが最低30分は確保 |

### ② タスク（Allocated Task）と可視化ルール
Google ToDoリストから取得され、特定の「時間ブロック」に割り当てられるタスク。アカウントの属性（プライベート/仕事用）によってデータ構造が異なり、システム上の表示ルールが厳密に区別される。

* **仕事用タスク（WORK TIMEタスク）：**
  * 所属リスト: 仕事用アカウントの `WORK_TIME` リスト
  * 保持属性: タイトル、説明、開始時刻、**終了時刻**
  * **表示ルール（面表示）：** カレンダーの時間軸（グリッド）上に、時間を面で占有する「タイムボックス」として**明示的に表示（プロット）する**。
* **プライベートタスク（WORK TIME以外のタスク）：**
  * 所属リスト: プライベートアカウントの各TIME名（`DOWN_TIME`, `FREE_TIME` など）に対応するタスクリスト
  * 保持属性: タイトル、説明、開始時刻（※終了時刻は持たない）
  * **表示ルール（非表示原則）：** カレンダーの時間軸（グリッド）上には**直接表示しない**（ただし、将来的に載せたくなる可能性を考慮し、ドメインモデルやデータ構造としては各TIMEブロックに紐づけて保持する設計にする）。

---

## 3. ビジネスルール ＆ 不変条件（Invariants）

### ルール①：DOWN TIME起点の動的タイムライン ＆ 土曜始まり（Time Anchor）
* **1日の再定義:** 1日の始まり（カレンダーの最上部）は「0:00」ではなく、**「当日のDOWN TIME開始時刻」**とする。1日の区切り（`ChronologicalDay`）は、「当日のDOWN TIME開始」から「翌日のDOWN TIME開始」までとし、ライフスタイルや計算結果に応じて動的に伸縮する。
* **週始まりの固定（土曜開始）:**
アプリケーションにおける週次ビュー（Weekly View）およびデータ処理・集計の単位は、**必ず「土曜日」を起点（週の始まり）**として描画・計算する。
* **時間軸のスライド:** 設定（始業時間など）が変更された場合、コードを修正することなく、カレンダー全体の時間軸の目盛りが自動でスライドする。

### ルール②：FOCUS TIMEをクッションとする朝の動的スライド
1日の起点（DOWN TIME開始）から順方向に時間を計算し、固定された外部要因（WORK TIME開始時刻）との帳尻合わせを `FOCUS TIME` が担う。
1. `WALK TIME` 終了時刻から `WORK TIME` 開始時刻までの隙間に応じて、`FOCUS TIME` が自動伸縮する。
2. `WORK TIME` の開始が早く、`FOCUS TIME` が最小保証時間（10分）を下回りそうになった場合に限り、**10分を死守するために連動して1日の起点（DOWN TIMEの開始時刻）を自動的に前倒し（シフト）**する。

### ルール③：マルチアカウント・タスクリストのマッピング
* アプリケーションは、ログインしている「プライベート」「仕事用」の2つのGoogleアカウントから同時にタスクリスト（Google Tasks）を走査する。
* 取得したタスクは、**「所属しているリスト名」と「TimeBlockのID」を完全一致**させてドメイン内にマッピングする。
  * 例：プライベートアカウントの「FREE TIME」という名前のリストにあるタスク ➔ ドメインモデル上では `blockId: 'FREE_TIME'` として扱う。
  * 例：仕事用アカウントの「WORK TIME」という名前のリストにあるタスク ➔ ドメインモデル上では `blockId: 'WORK_TIME'` として扱う。

### ルール④：防衛的タイムボックスとタスクの伸縮制御
* **仕事用タスクのHard Ceiling（天井の固定）:** `WORK_TIME` 内のタスクを後ろに移動、あるいは長さを引き延ばす際、`WORK_TIME` 自体の終了時刻（＝GRADATION TIMEの開始境界線）を超えて後ろ倒しにすることをシステムレベルで禁止する。長さを維持したまま後ろ倒しになり、DOWN TIMEを押し潰す挙動はシステムレベルで禁止する。
* **プライベートタスクの制約:** カレンダーのグリッド上には表示しないが、タスクが所属するBlock IDの有効時間枠内（例：FREE TIMEの枠が19:00〜21:00ならその間）に開始時刻が収まるよう、データ更新・登録時にはシステムがバリデーションを行う。

### ルール⑤：社会的時差ぼけ（ソーシャルジェットラグ）警告システム
* 各日ごとに、就寝時刻（`SLEEP TIME` 開始）と起床時刻（`SLEEP TIME` 終了）の中間時刻（睡眠中央時刻）をシステムが自動計算する。

  $$
  \text{Mid-Sleep Time} = \text{Bedtime} + \frac{\text{Sleep Duration}}{2}
  $$
* 昨日の睡眠中央時刻と、当日の睡眠中央時刻のズレが**「1時間以上」**になる場合、システムは登録を禁止しないが、画面上に視覚的な警告を表示し、ユーザーへ警告を促す。

---

## 4. システムアーキテクチャ ＆ フォルダ構成方針

```PlainText
src/
├── domain/                 # 【ドメイン層】外部依存を持たないピュアな TypeScript
│   ├── value-objects/
│   │   ├── AccountKind.ts
│   │   ├── BlockId.ts
│   │   ├── DayAnchor.ts
│   │   ├── Duration.ts
│   │   ├── LifestyleSettings.ts
│   │   ├── TimeBlockSpec.ts
│   │   └── TimeRange.ts
│   ├── entities/
│   │   ├── ChronologicalDay.ts
│   │   ├── ScheduledTimeBlock.ts
│   │   └── Task.ts
│   └── services/
│       ├── SocialJetLagDiagnostic.ts
│       ├── TaskPlacementValidator.ts
│       ├── TimelineCalculator.ts
│       └── ViolationCollector.ts
│
├── application/            # 【アプリケーション層】ユースケースのオーケストレーション
│   ├── usecases/
│   │   ├── ChangeTimeBoxDurationUseCase.ts
│   │   ├── CreateTaskOrEventUseCase.ts
│   │   ├── GetDailyTimelineUseCase.ts
│   │   ├── ValidateExternalChangesUseCase.ts
│   │   └── ValidateNextDaySocialJetLagUseCase.ts
│   └── services/
│       ├── DayAssemblyService.ts
│       ├── SocialJetLagEvaluationService.ts
│       └── TimelineEnrichmentService.ts
│
├── interface/              # 【インターフェイス層】ユースケース境界の入出力と Port 契約
│   ├── request/            # ユースケース入力（Presentation → UseCase）
│   ├── response/           # ユースケース出力（UseCase → Presentation）
│   ├── records/            # Port 境界のデータ型（Frameworks & Drivers ↔ Application）
│   ├── ports/              # 外部リソースへの契約
│   ├── mappers/            # ドメイン ⇄ Response の変換
│   └── errors/
│       └── UseCaseError.ts
│
├── frameworks-drivers/   # 【フレームワーク&ドライバー層】Port の具象実装・外部 API 通信
│   ├── google/             # （未実装）Google API クライアント
│   │   ├── googleCalendarClient.ts
│   │   └── googleTasksClient.ts
│   ├── mappers/            # （未実装）Google API DTO ⇄ records の防腐層
│   └── fake/               # テスト・開発用 Fake 実装
│       ├── FakeExternalChangeRepository.ts
│       ├── FakeGoogleGateway.ts
│       └── FakeTimelineRepository.ts
│
├── presentation/           # 【UI 層】（未実装）Refine / React
│   ├── components/
│   └── hooks/
│
└── shared/                 # 【共有カーネル】層横断の汎用型
    └── Result.ts

tests/
├── domain/
├── application/
├── frameworks-drivers/
├── integration/
└── helpers/
```

### 依存方向

外側の層から内側の層へだけ依存する。例外は認めない。

```
presentation → interface → application → domain
frameworks-drivers → interface → domain
shared ← （domain / application / interface / frameworks-drivers / presentation）
```

- `domain` は他の層に依存しない
- `application` は `domain`・`interface`・`shared` のみに依存する
- `interface` は `domain`・`shared` のみに依存する
- `frameworks-drivers` は `interface`・`domain`・`shared` に依存する（Port を実装）
- 例外は `frameworks-drivers` 最外縁で `Result` に変換し、内側へ伝播しない（`docs/error.md` 参照）


## プラットフォーム ＆ 外部連携要件
* 動作環境:
  * macOS (PC) および Android (スマホ) の両方から同一URLでアクセスし、同一ロジックで動作する Webアプリ（PWA化を想定）。
* Google同期 (双方向CRUD):
  * Google Calendar API、Google Tasks APIと連携。OAuth2.0のスコープは編集権限（.../auth/calendar.events および .../auth/tasks）を取得。
  * 自作アプリ側でタイムボックスへのタスク配置や予定変更を行った場合、リアルタイムにGoogle側へ変更がAPI経由でPOST/PATCHされる。
