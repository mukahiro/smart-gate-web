# バックエンド設計

## 責務

- APIルーティング
- 入力検証
- 認証・認可
- 在室状態の更新
- 重複排除
- DB操作
- 監査ログ
- 入退室履歴CSV生成

## ディレクトリ例

```text
src/
  routes/
  middleware/
  features/
    access-events/
      access-events.route.ts
      access-events.service.ts
      access-events.repository.ts
      access-events.schema.ts
    occupancy/
    people/
    auth/
  infrastructure/
    database/
  app.ts
  index.ts
```

## レイヤー方針

- route：HTTP入出力
- service：業務ロジック
- repository：DB操作
- schema：入力・出力スキーマ
- middleware：認証、ログ、エラー処理

## 入退室処理

- 入退室イベントを最初に保存する
- 入室イベントで在室状態にする
- 退室イベントで不在状態にする
- 重複イベントは無視または既存結果を返す
