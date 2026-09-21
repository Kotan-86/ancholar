## dev-team プロダクト設定

- 仕様の置き場: docs/spec/
- バグ仕様の置き場: docs/spec/bugs/
- 検査コマンド:
  - 静的解析: なし(未導入)
  - 型検査: npm run typecheck:web
  - ビルド: npm run build:web
  - テスト: pnpm test
- UI確認の準備: npm run dev:web でNext.jsを起動し、ブラウザで確認する。認証(Googleアカウント)の扱いは未定
- UI以外の実動作の確認方法: 未定(PBIごとに決める)
- Gitホストと提出手順: GitHub PR、ベースブランチ: develop
- 最新であるべきドキュメントの一覧: README.md、docs/(既定は、変更の影響を受けるもの)
- DoDの追加項目: なし
- レビュー観点の追加: なし
- プロダクトゴール: docs/product-goal.md
- ドメインの標準値(標準の1日の時刻・長さなど)の正: README.md。変更はPOの承認が必要(コードや仕様の現状の値を、POの意図として扱わない)
- スプリントのブランチ: スプリントの成果は、専用ブランチ `feature/sprint-<連番>-<slug>`(例: feature/sprint-001-calendar-ui)で commit する。develop から切る。他スプリントの未承認の変更が混ざるのを避けるため
- `.work/` の扱い: git管理しない(`.gitignore`)

## コンパクション時の指示

圧縮するときは、スプリントの状態(ゴール、PBIの状態、未解決の判断依頼、障害物)を優先して残す。
