# API設計

## 共通仕様

- ベースパス：`/api/v1`
- データ形式：JSON
- 日時形式：ISO 8601
- 文字コード：UTF-8
- Python認証端末はAPIキー認証
- 管理画面はCookieセッション認証

## 認証イベント登録

```http
POST /api/v1/attendance-events
```

```json
{
  "eventId": "01JXXXXXXXXXXXX",
  "personId": "person-001",
  "deviceId": "device-001",
  "method": "face",
  "eventType": "check_in",
  "authenticatedAt": "2026-07-12T08:45:12+09:00",
  "confidence": 0.91
}
```

## 主なエンドポイント

```text
POST   /auth/login
POST   /auth/logout
GET    /auth/session

GET    /attendance
GET    /attendance/:date
PATCH  /attendance/:id

GET    /attendance-events
POST   /attendance-events

GET    /people
POST   /people
GET    /people/:id
PATCH  /people/:id

GET    /devices
POST   /devices
PATCH  /devices/:id

GET    /audit-logs
GET    /exports/attendance.csv
```

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
