# UC-1 プレゼンテーション層仕様（日次タイムライン表示）

## 変更履歴

| 日付 | 変更理由 |
| :--- | :--- |
| 2026-06-29 | Phase 1 縦切り実装のため、UC-1 画面表示の Why/What と受入基準を初版定義する |

---

## 1. 背景（Why）

### 1-1. 解決する課題

`GetDailyTimelineUseCase`（UC-1）および `TimelineDTO` はアプリケーション層まで実装済みであるが、ユーザーがブラウザ上でタイムラインを確認する手段がない。Phase 1 では Google API / OAuth を使わず Fake リポジトリで UC-1 の出力を検証できる最小縦切りを完成させる。

### 1-2. 達成したい状態

- 指定日の `TimelineDTO` を画面に表示し、DOWN TIME 起点の 7 ブロック構造と WORK TIME タスクのグリッド表示ルールが視覚的に確認できる。
- ルール違反（`violations`）および社会的時差ぼけ警告（`socialJetLagWarning`）がユーザーに伝わる。
- プレゼンテーション層は `TimelineDTO`（interface 層）のみを入力とし、アプリケーション層や Next.js 固有の配線に依存しない。

### 1-3. Phase 1 のスコープ外

以下は本仕様の対象外とする。

- Google Calendar / Tasks API 連携および OAuth 認証
- 週次ビュー（土曜始まり）
- UC-2〜5 の操作 UI（ドラッグ＆ドロップ、タスク追加等）
- PWA 化

---

## 2. 機能要件（What）

### 2-1. 表示対象データ

画面は UC-1 の戻り値 `TimelineDTO` を唯一の表示データ源とする。主要フィールドと表示上の意味は次のとおり。

| フィールド | 表示上の意味 |
| :--- | :--- |
| `anchorDate` | 1 日の起点（DOWN TIME 開始時刻）。タイムグリッドの 0% 位置 |
| `totalDurationMinutes` | 1 日の総時間。グリッドの 100% 位置の算出基準 |
| `blocks[]` | 7 つの時間ブロック（DOWN TIME 起点の時系列順） |
| `blocks[].blockId` | ブロック識別子（例: `DOWN_TIME`, `WORK_TIME`） |
| `blocks[].startTime` / `endTime` | ブロックの開始・終了時刻 |
| `blocks[].durationMinutes` | ブロックの長さ（分） |
| `blocks[].tasks[]` | ブロックに紐づくタスク |
| `tasks[].shouldPlotOnGrid` | タイムグリッド上への面表示の要否 |
| `violations` | ルール違反アラート（任意。存在時のみ画面上部に一覧表示） |
| `socialJetLagWarning` | 社会的時差ぼけ警告フラグ（`true` 時に警告バナーを表示） |

7 ブロックの ID と表示順序は README の「7 つの時間ブロック」定義に従う。

```
DOWN_TIME → SLEEP_TIME → WALK_TIME → FOCUS_TIME → WORK_TIME → GRADATION_TIME → FREE_TIME
```

### 2-2. 日付の指定

- 表示対象日は URL クエリ `date=YYYY-MM-DD` で指定する。
- クエリ未指定時のデフォルト日付は `2026-06-21` とする（Fake リポジトリの既定シナリオ日）。
- 日付切り替えは Server Component によるページ遷移（`<Link>` 等）で行う。クライアント側の状態管理や Client Component による日付取得は Phase 1 では行わない。

### 2-3. タイムブロック一覧

各ブロックについて、少なくとも次の情報を画面に表示する。

- `blockId`
- 開始時刻（`startTime`）
- 終了時刻（`endTime`）
- `durationMinutes`

ブロックは `TimelineDTO.blocks` の配列順（DOWN TIME 起点の時系列順）で上から下に並べる。

### 2-4. WORK TIME タイムグリッドとタスク面

- WORK TIME ブロック内に、1 日全体（`anchorDate` 〜 `anchorDate + totalDurationMinutes`）を縦軸とするタイムグリッドを設ける。
- `shouldPlotOnGrid: true` のタスク（仕事用 WORK TIME タスク）のみ、グリッド上に矩形（面）として表示する。
- `shouldPlotOnGrid: false` のタスク（プライベートタスク）は、グリッド上には一切表示しない。ブロックに紐づいていても面プロット対象としない。
- タスク面の縦位置（上端）および縦幅は、`anchorDate`・タスクの `startTime`・`endTime`（またはブロック終端）との関係に基づき、1 日全体に対する割合（%）として算出する。

### 2-5. 警告表示

#### ルール違反（violations）

- `TimelineDTO.violations` が存在し、1 件以上の要素を含む場合、画面の最上部（メインコンテンツより前）に警告リストを表示する。
- 各項目には少なくとも `targetTitle` と `message` を表示する。

#### 社会的時差ぼけ（socialJetLagWarning）

- `socialJetLagWarning` が `true` の場合、画面上部に警告バナーを表示する。
- バナーには社会的時差ぼけに関する警告であることがユーザーに伝わる文言を含める。

`violations` 警告リストと `socialJetLagWarning` バナーは両方存在しうる。両方ある場合、画面上部に両方を表示する。

### 2-6. 層依存の制約

プレゼンテーション層（`frameworks-drivers/presentation`）が import してよいのは `@interface`・`@domain`・`@shared` のみとする。`@application` および Next.js 配線（composition 等）への依存は禁止する。

---

## 3. スタイリング方針（What）

### 3-1. 分担ルール

| 担当領域 | Tailwind CSS | インライン `style` |
| :--- | :--- | :--- |
| ページ骨格（余白・最大幅・背景） | 使用する | 使用しない |
| 警告バナー・違反リスト（色・枠線・タイポ） | 使用する | 使用しない |
| ブロック見出し・時刻表示 | 使用する | 使用しない |
| タイムグリッドコンテナ（`relative`、固定高さ、罫線） | 使用する | 使用しない |
| WORK TIME タスク面（幅・角丸・背景色・`absolute` 配置） | 使用する | **`top` と `height` のみ**使用する |

### 3-2. 禁止事項

- 動的に算出した `%` 値を Tailwind の arbitrary value（例: `top-[${n}%]`）に埋め込まない。
- タスク面の `top` / `height` 以外のレイアウト属性をインライン `style` で指定しない。

---

## 4. 受入基準

| ID | 受入基準 | 確認方法 |
| :--- | :--- | :--- |
| **AC-1** | 指定日（デフォルト `2026-06-21`）で UC-1 を実行し、7 ブロックが **DOWN TIME 起点の時系列順** で表示される | `npm run dev:web` で起動し、デフォルト表示または `?date=2026-06-21` で 7 ブロックが上記順序で並ぶことを目視確認 |
| **AC-2** | 各ブロックに `blockId`・開始時刻・終了時刻・`durationMinutes` が表示される | 各ブロック行に 4 項目が欠けず表示されていることを目視確認 |
| **AC-3** | `shouldPlotOnGrid: true` のタスク（WORK TIME 仕事用タスク）のみ、タイムグリッド上に面（矩形）として表示される | Fake シナリオに WORK TIME タスクを含め、グリッド内に 1 件以上の矩形が表示されることを目視確認 |
| **AC-4** | `shouldPlotOnGrid: false` のプライベートタスクはタイムグリッド上に **表示されない** | Fake シナリオにプライベートタスクを含め、グリッド上に矩形が 0 件であることを目視確認 |
| **AC-5** | `violations` が 1 件以上ある場合、画面最上部に警告リストが表示される | INVALID_MAPPING 等で violations を発生させ、リストが表示されることを目視確認 |
| **AC-6** | `socialJetLagWarning: true` の場合、警告バナーが表示される | Fake シナリオでフラグを `true` にし、バナーが表示されることを目視確認 |
| **AC-7** | 日付は URL クエリ `?date=YYYY-MM-DD` で切り替え可能である（Server Component のみ） | `?date=2026-06-21` 以外の有効日付に遷移し、表示内容が切り替わることを目視確認。Client Component による日付取得がないことをコードレビューで確認 |
| **AC-8** | WORK TIME タスク面の縦位置・縦幅が `anchorDate` / `startTime` / `endTime` と一致する | 既知の Fake タスク時刻に対し、算出式 `(startTime - anchorDate) / totalDurationMinutes × 100` および `(endTime - startTime) / totalDurationMinutes × 100` と一致する `top`/`height`（%）がインライン style に設定されていることを、`timelineLayout` の単体テストおよび目視で確認 |

---

## 5. 関連仕様

- UC-1 ユースケース定義: [`docs/application/usecase.md`](../application/usecase.md#UC-1)
- `TimelineDTO` 型定義: [`docs/application/usecase.md`](../application/usecase.md#3-アプリケーション層の入出力データ定義dto)
- 7 ブロック定義・タスク表示ルール: [`README.md`](../../README.md#②-タスクallocated-taskと可視化ルール)
- エラー・警告の扱い: [`docs/error.md`](../error.md)
