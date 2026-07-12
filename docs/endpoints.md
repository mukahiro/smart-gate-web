# API Endpoints

このドキュメントはHono APIのエンドポイント仕様をまとめる。

現時点の仕様は暫定であり、実装・ユーザー指示・要件確定に合わせて更新する。

## 共通仕様

- Base URL: `/api/v1`
- Request body: `application/json`
- Response body: `application/json`
- 日時文字列はISO 8601形式を使用する
- Python認証アプリ向けエンドポイントはBearer認証で保護する

### Bearer認証

Python認証アプリから呼び出すAPIでは、次のHTTP headerを付与する。

```http
Authorization: Bearer <AUTH_APP_BEARER_TOKEN>
```

`AUTH_APP_BEARER_TOKEN` はAPIプロセスの環境変数で設定する。

### エラー形式

現時点のエラー形式は次の通り。

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

validation errorの場合は `details` を含む。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": {}
  }
}
```

## GET /health

APIの稼働確認用エンドポイント。

<details>
<summary>詳細</summary>

### 認証

不要。

### Response

Status: `200 OK`

```json
{
  "ok": true,
  "service": "smart-gate-api"
}
```

</details>

## POST /attendance-events

顔認証・カード認証アプリから入退室イベントを受け取り、SQLiteへ永続化する。

同一 `eventId` の再送は二重登録せず、既存イベントとして扱う。

<details>
<summary>詳細</summary>

### 認証

必須。

```http
Authorization: Bearer <AUTH_APP_BEARER_TOKEN>
```

### Request

```json
{
  "eventId": "event-001",
  "personId": "person-001",
  "deviceId": "device-001",
  "method": "card",
  "eventType": "check_in",
  "authenticatedAt": "2026-07-12T08:45:12+09:00"
}
```

顔認証の場合は `confidence` が必須。

```json
{
  "eventId": "event-002",
  "personId": "person-001",
  "deviceId": "device-001",
  "method": "face",
  "eventType": "check_out",
  "authenticatedAt": "2026-07-12T18:32:10+09:00",
  "confidence": 0.92
}
```

### Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `eventId` | string | yes | 認証アプリ側で生成する一意なイベントID。再送時も同じ値を使う |
| `personId` | string | yes | 利用者ID |
| `deviceId` | string | yes | 認証端末ID |
| `method` | `"face"` \| `"card"` | yes | 認証方式 |
| `eventType` | `"check_in"` \| `"check_out"` | yes | 入室または退出 |
| `authenticatedAt` | string | yes | 認証日時。offset付きISO 8601形式 |
| `confidence` | number | faceのみyes | 顔認証の信頼度。`0` 以上 `1` 以下 |

### Created response

新規イベントとして保存した場合。

Status: `201 Created`

```json
{
  "eventId": "event-001",
  "status": "recorded",
  "resultCode": "RECORDED",
  "eventType": "check_in",
  "recordedAt": "2026-07-12T08:45:12+09:00",
  "receivedAt": "2026-07-12T08:45:13.000Z",
  "lcdDisplayName": "person-001"
}
```

### Duplicate response

同一 `eventId` がすでに保存済みの場合。

Status: `200 OK`

```json
{
  "eventId": "event-001",
  "status": "duplicate",
  "resultCode": "DUPLICATE_EVENT",
  "eventType": "check_in",
  "recordedAt": "2026-07-12T08:45:12+09:00",
  "receivedAt": "2026-07-12T08:45:13.000Z",
  "lcdDisplayName": "person-001"
}
```

### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `eventId` | string | 保存対象のイベントID |
| `status` | `"recorded"` \| `"duplicate"` | 処理結果 |
| `resultCode` | `"RECORDED"` \| `"DUPLICATE_EVENT"` | LCD表示や認証アプリ側の分岐に使う結果コード |
| `eventType` | `"check_in"` \| `"check_out"` | 入室または退出 |
| `recordedAt` | string | 認証アプリから送られた認証日時 |
| `receivedAt` | string | APIが受信した日時 |
| `lcdDisplayName` | string | LCD表示名。現時点では利用者テーブル未実装のため `personId` を返す |

### Error responses

#### 401 Unauthorized

Bearer tokenがない、または一致しない場合。

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

#### 400 Bad Request

request bodyがschemaに合わない場合。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": {}
  }
}
```

</details>

## 未実装エンドポイント候補

今後の実装候補。詳細仕様は実装前に確認する。

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /attendance-events/me`
- `GET /attendance-events/me/monthly`
- `GET /attendance-events/me/daily`
