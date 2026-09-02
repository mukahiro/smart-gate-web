# API Endpoints

このドキュメントはHono APIのエンドポイント仕様をまとめる。

現時点の仕様は暫定であり、実装・ユーザー指示・要件確定に合わせて更新する。

各エンドポイントの「実装状態」を確認すること。設計済み・未実装の仕様は、今後の実装が従う目標仕様を表す。

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

**実装状態:** 一部実装済み。現在のコードは `personId` を受け取る。以下は、`personId` を数字10桁の `studentNumber` へ変更し、未登録学籍番号も保存するための目標仕様である。

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
  "studentNumber": "1234567890",
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
  "studentNumber": "1234567890",
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
| `studentNumber` | string | yes | ハイフンなしのASCII数字10桁の学籍番号 |
| `deviceId` | string | yes | 認証端末ID |
| `method` | `"face"` \| `"card"` | yes | 認証方式 |
| `eventType` | `"check_in"` \| `"check_out"` | yes | 入室または退出 |
| `authenticatedAt` | string | yes | 認証日時。offset付きISO 8601形式 |
| `confidence` | number | faceのみyes | 顔認証の信頼度。`0` 以上 `1` 以下 |

### Created response: 利用者照合済み

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
  "lcdDisplayName": "ﾑｶｲﾊﾗ ﾋﾛﾄ"
}
```

### Created response: 利用者未登録

学籍番号に対応する利用者が未登録でも、イベントは未照合状態で保存する。Python認証アプリは保存成功として扱い、再送しない。

Status: `201 Created`

```json
{
  "eventId": "event-003",
  "status": "recorded",
  "resultCode": "RECORDED_UNMATCHED",
  "eventType": "check_in",
  "recordedAt": "2026-07-12T08:45:12+09:00",
  "receivedAt": "2026-07-12T08:45:13.000Z",
  "lcdDisplayName": null
}
```

DBには受信した学籍番号を `student_number_snapshot` として保存し、内部 `user_id` はNULLにする。保守者が同じ学籍番号の利用者を登録したときに、未照合イベントをその利用者へ紐付ける。

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
  "lcdDisplayName": "ﾑｶｲﾊﾗ ﾋﾛﾄ"
}
```

### Response fields

| Field | Type | Description |
| --- | --- | --- |
| `eventId` | string | 保存対象のイベントID |
| `status` | `"recorded"` \| `"duplicate"` | 処理結果 |
| `resultCode` | `"RECORDED"` \| `"RECORDED_UNMATCHED"` \| `"DUPLICATE_EVENT"` | LCD表示や認証アプリ側の分岐に使う結果コード |
| `eventType` | `"check_in"` \| `"check_out"` | 入室または退出 |
| `recordedAt` | string | 認証アプリから送られた認証日時 |
| `receivedAt` | string | APIが受信した日時 |
| `lcdDisplayName` | string \| null | 照合済み利用者のLCD表示名。未照合時は `null` |

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

## POST /auth/login

メールアドレスとパスワードでWeb利用者を認証し、サーバー管理型セッションを作成する。

**実装状態:** 設計済み・未実装。

<details>
<summary>詳細</summary>

### 認証

不要。Cookie認証APIの共通方針に従い、Originを検証する。

### Request

```json
{
  "email": "user@example.com",
  "password": "example-password"
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | yes | メールアドレス。最大254文字 |
| `password` | string | yes | 1文字以上128文字以下。作成時の最小長判定はここでは行わない |

### Success response

Status: `200 OK`

```json
{
  "user": {
    "id": "019c0000-0000-7000-8000-000000000001",
    "studentNumber": "1234567890",
    "name": "向原 大翔",
    "lcdDisplayName": "ﾑｶｲﾊﾗ ﾋﾛﾄ",
    "email": "user@example.com"
  }
}
```

レスポンスでは `smart_gate_session` Cookieを設定する。Cookieとセッションの詳細は `docs/web-authentication.md` を参照する。

### Authentication failure

メール未登録、パスワード不一致、利用者無効、ロック中を区別せず、同じ応答を返す。

Status: `401 Unauthorized`

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "メールアドレスまたはパスワードが正しくありません"
  }
}
```

</details>

## POST /auth/logout

現在のWebセッションを失効させ、Cookieを削除する。

**実装状態:** 設計済み・未実装。

<details>
<summary>詳細</summary>

- セッションが存在すればSQLiteから削除する
- セッションがない場合も成功とする
- Originを検証する

Status: `204 No Content`

</details>

## GET /auth/me

Cookieセッションに紐づくログイン中利用者を返す。

**実装状態:** 設計済み・未実装。

<details>
<summary>詳細</summary>

### Success response

Status: `200 OK`

```json
{
  "user": {
    "id": "019c0000-0000-7000-8000-000000000001",
    "studentNumber": "1234567890",
    "name": "向原 大翔",
    "lcdDisplayName": "ﾑｶｲﾊﾗ ﾋﾛﾄ",
    "email": "user@example.com"
  }
}
```

### Unauthenticated response

Cookieなし、セッションなし、期限切れ、利用者無効は同じ応答とする。

Status: `401 Unauthorized`

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "ログインが必要です"
  }
}
```

</details>

## その他の未実装エンドポイント候補

今後の実装候補。詳細仕様は実装前に確認する。

- `GET /attendance-events/me`
- `GET /attendance-events/me/monthly`
- `GET /attendance-events/me/daily`
