# フロントエンド設計

## 画面一覧

```text
/login
/dashboard
/occupancy
/access-events
/access-events/:date
/people
/people/:id
/settings
/audit-logs
```

## 状態管理

- APIデータ：TanStack Query
- フォーム：React Hook Form
- 入力検証：Zod
- 画面内状態：React標準機能
- 大規模なグローバル状態管理は当初導入しない

## 主な機能

- 現在の在室状況表示
- 日付別の入退室履歴
- 利用者検索
- 利用者登録・編集
- CSV出力
- エラー・成功通知

## 更新方式

- 当初は3〜5秒間隔のポーリング
- 必要に応じてSSEへ移行する

## UI方針

- LAN内端末で見やすいことを優先する
- スマートフォンとPCの両方に対応する
- 誤操作防止のため、削除・修正時に確認を入れる
