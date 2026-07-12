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
    ├─ 顔認証
    ├─ カード認証
    └─ Hono APIへイベント送信
```

## 配置方針

- ReactとHono APIは同一オリジンで公開する
- Python認証アプリとHono APIは同一Raspberry Pi上で動作させる
- DBはHono APIのみが操作する
- Python認証アプリからDBへ直接接続しない

## 責務分担

### React

- 管理画面
- 出欠一覧表示
- 利用者・端末管理
- API呼び出し

### Hono API

- 入力検証
- 認証・認可
- 出欠判定
- 重複防止
- DB更新
- 監査ログ記録

### Python認証アプリ

- 顔・カードの読み取り
- 利用者の識別
- 認証結果のAPI送信
- 送信失敗時の再送

### SQLite

- 利用者情報
- 認証イベント
- 日別出欠情報
- 端末情報
- 操作履歴

## ディレクトリ例

```text
apps/
  web/
  api/
  auth-app/

packages/
  schemas/
  shared/

data/
  attendance.sqlite

docs/
```
