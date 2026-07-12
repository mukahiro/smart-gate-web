# API設計

## 共通仕様

- ベースパス：`/api/v1`
- データ形式：JSON
- 日時形式：ISO 8601
- 文字コード：UTF-8
- 入退室イベント登録APIは簡易Bearerトークン認証
- 管理画面はCookieセッション認証

## 入退室イベント登録

```http
POST /api/v1/access-events
```

```json
{
  "eventId": "01JXXXXXXXXXXXX",
  "personId": "person-001",
  "method": "face",
  "eventType": "entry",
  "authenticatedAt": "2026-07-12T08:45:12+09:00",
  "confidence": 0.91
}
```

## 主なエンドポイント

```text
POST   /auth/login
POST   /auth/logout
GET    /auth/session

GET    /occupancy
GET    /access-events
GET    /access-events/:date
POST   /access-events

GET    /people
POST   /people
GET    /people/:id
PATCH  /people/:id

GET    /audit-logs
GET    /exports/access-events.csv
```

## 入退室イベントAPIの認証

入退室イベントは単一のRaspberry Piから送信される前提とし、端末登録や無効化は行わない。

```http
Authorization: Bearer <token>
```

トークンは環境変数などで管理し、DBで送信元を個別管理しない。

## エラー形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": {}
  }
}
```

## 冪等性

- `eventId`に一意制約を付ける
- 同一イベントの再送時は二重登録しない
- 正常登録済みの場合も成功扱いで応答できるようにする
