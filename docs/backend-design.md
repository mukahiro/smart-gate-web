# バックエンド設計

## 責務

- APIルーティング
- 入力検証
- 認証・認可
- 出欠判定
- 重複排除
- DB操作
- 監査ログ
- CSV生成

## ディレクトリ例

```text
src/
  routes/
  middleware/
  features/
    attendance/
      attendance.route.ts
      attendance.service.ts
      attendance.repository.ts
      attendance.schema.ts
    people/
    devices/
    auth/
  infrastructure/
    database/
  shared/
  app.ts
  index.ts
```

## レイヤー方針

- route：HTTP入出力
- service：業務ロジック
- repository：DB操作
- schema：入力・出力スキーマ
- middleware：認証、ログ、エラー処理

## 出欠判定

- 認証イベントを最初に保存する
- 初回入室時刻を出席時刻として扱う
- 基準時刻以降は遅刻として判定する
- 重複イベントは無視または既存結果を返す
- 手動修正時は監査ログを残す
