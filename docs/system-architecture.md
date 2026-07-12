# システム構成

## 全体構成

```text
LAN内ブラウザ
    │
    ▼
Caddy / nginx
    ├─ React静的ファイル
    └─ /api/* → Hono API
                    │
                    ▼
                  SQLite

Python認証アプリ
    └─ 別リポジトリからHono APIへイベント送信
```

## 配置方針

- ReactとHono APIは同一オリジンで公開する
- Python認証アプリは別リポジトリで管理する
- DBはHono APIのみが操作する
- Python認証アプリからDBへ直接接続しない

## 責務分担

### React

- 管理画面
- 在室状況表示
- 入退室履歴表示
- 利用者管理
- API呼び出し

### Hono API

- 入力検証
- 認証・認可
- 在室状態の更新
- 重複防止
- DB更新
- 監査ログ記録

### Python認証アプリ

- このリポジトリの実装対象外
- Hono APIへ入退室イベントを送信する外部クライアントとして扱う

### SQLite

- 利用者情報
- 入退室イベント
- 現在の在室状態
- 操作履歴

## ディレクトリ例

```text
apps/
  web/
  api/

data/
  lab-access.sqlite

docs/
```
