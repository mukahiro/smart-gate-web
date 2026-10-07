# 管理者API設計

このドキュメントは、Phase 5で実装した管理者API、権限、一時パスワード、監査ログの仕様をまとめる。

## 対象範囲

管理者APIは利用者とWeb認証アカウントの保守に限定する。

- 利用者の一覧・詳細確認
- 一般利用者の作成
- 氏名、LCD表示名、メールアドレスの更新
- 有効化・無効化
- ロック解除
- 全セッション失効
- 一時パスワードによるパスワード再設定
- Python顔認証アプリへの顔認証用画像の登録・更新
- 管理操作監査ログの確認

管理者であっても、他の利用者の入退室履歴は閲覧できない。管理者による全利用者の履歴閲覧、利用者の物理削除、管理者APIからの役割変更は対象外とする。

## 役割と認可

利用者種別とシステム管理者権限は分離する。

| Field | Value | Description |
| --- | --- | --- |
| `userType` | `student` | 生徒 |
| `userType` | `teacher` | 先生 |
| `isAdmin` | `true` | 管理者APIを利用できる |

- 既存利用者はmigrationで `student` とする
- 既存の `admin` は `isAdmin: true`、`member` は `isAdmin: false` とする
- 管理者アカウントの作成・昇格・降格はCLIでのみ行う
- 管理者APIから利用者を作成するときは `student` または `teacher` を指定する
- 管理者APIで作成する利用者は `isAdmin: false` とする
- 管理者APIから管理者権限を変更できない
- セッション認証時にDB上の現在の利用者種別と管理者権限を確認する
- 管理者APIはCookieセッション、管理者認可、Origin検証で保護する
- 自分自身と最後の有効な管理者は無効化できないようにする

権限不足は `ADMIN_PERMISSION_REQUIRED` として扱う。ログイン済みであっても `isAdmin` がfalseなら管理者APIを利用できない。

## API案

Base pathは `/api/v1/admin` とする。以下はすべて実装済みである。

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/admin/users` | 利用者一覧の全件取得 |
| `POST` | `/admin/users` | 一般利用者の作成 |
| `GET` | `/admin/users/:userId` | 利用者詳細 |
| `PATCH` | `/admin/users/:userId` | 基本情報の更新 |
| `PUT` | `/admin/users/:userId/face-images` | 顔認証用画像の全置換 |
| `POST` | `/admin/users/:userId/enable` | 利用者の有効化 |
| `POST` | `/admin/users/:userId/disable` | 利用者の無効化と全セッション失効 |
| `POST` | `/admin/users/:userId/unlock` | ロックと連続失敗回数の解除 |
| `POST` | `/admin/users/:userId/revoke-sessions` | 全セッション失効 |
| `POST` | `/admin/users/:userId/reset-password` | 一時パスワードの発行 |
| `GET` | `/admin/audit-logs` | 管理操作監査ログ一覧 |

利用者は数十人程度を想定するため、利用者一覧にページング、検索、絞り込み用のquery parameterは設けず、全件を返す。学籍番号、氏名、メールアドレス、役割、有効状態による絞り込みはフロントエンドで行う。

学籍番号は作成後に変更できない。学籍番号変更が必要になった場合は、過去イベントとの関係を含めた専用手順を別途設計する。

利用者作成時は、パスワード再設定と同じ規則で一時パスワードを生成し、作成した利用者とともにレスポンスで一度だけ返す。生徒は学籍番号とLCD表示名を必須、先生は任意とし、未入力時はNULLを保存する。レスポンスを受け取れなかった場合は利用者を再作成せず、パスワード再設定APIで新しい一時パスワードを発行する。

`enable`、`disable`、`unlock`、`revoke-sessions`は冪等にする。すでに目的の状態でも成功とし、実際に状態が変わった場合だけ監査ログを保存する。パスワード再設定は呼び出すたびに新しい一時パスワードを発行する。

## 顔認証用画像

管理者画面は `PUT /api/v1/admin/users/:userId/face-images` に `multipart/form-data` で `images` fieldを1〜10個送る。各fileは空でない `image/*` とし、1枚あたり10MB以下とする。管理APIはURLやフォームから学籍番号を受け取らず、対象利用者のDBレコードから学籍番号を解決する。

管理APIは受信した画像をDBやファイルシステムへ保存せず、同じrequest中にPython顔認証アプリへ転送する。Pythonアプリへのrequestは次の契約とする。

```http
PUT <FACE_AUTH_APP_URL>
Authorization: Bearer <FACE_AUTH_APP_BEARER_TOKEN>
Content-Type: multipart/form-data; boundary=...
```

| Field | Type | Count | Description |
| --- | --- | --- | --- |
| `studentNumber` | string | 1 | ハイフンなしの数字10桁 |
| `images` | file | 1〜10 | 登録内容を置き換える顔写真 |

Pythonアプリは受け取った画像セットで該当学籍番号の顔画像を全置換し、成功時に任意の `2xx` を返す。管理APIからの接続失敗または30秒のtimeoutは `FACE_AUTH_APP_UNAVAILABLE`、Pythonアプリの非 `2xx` responseは `FACE_AUTH_APP_REJECTED` として、どちらも `502 Bad Gateway` を返す。Pythonアプリのresponse bodyは管理画面へ転送しない。

利用者作成APIは顔画像を受け取らず、利用者登録画面から顔画像登録APIを呼び出さない。顔画像は作成済み利用者の詳細画面から登録・置換する。

利用者テーブルには画像本体ではなく `face_image_count` だけを保存する。初期値は0とし、Pythonアプリへの全置換が成功した後、送信した枚数へ更新する。利用者一覧・詳細APIの `faceImageCount` で未登録（0枚）または登録枚数を確認できる。既存利用者はmigrationで0枚とするため、Pythonアプリへ画面外から登録済みのデータがある場合は、詳細画面から再登録して件数を同期する。

顔画像登録の成功は `user_face_images_updated` として件数更新と同じトランザクションで監査ログへ記録する。画像本体、ファイル名、学籍番号、PythonアプリのBearerトークンは監査ログやアプリケーションログへ記録しない。

## 一時パスワード

管理者によるパスワード再設定では、APIが暗号学的に安全な一時パスワードを生成する。

- 紛らわしい `I`、`L`、`O`、`0`、`1` を除いた英大文字と数字を使用する
- 英大文字・数字12文字を区切りなしで返す
- 約60ビットのエントロピーを確保し、暗号学的に安全な乱数生成器を使用する
- request bodyで新しいパスワードを受け取らない
- 一時パスワードはレスポンスで一度だけ返す
- `Cache-Control: no-store` を付ける
- 平文をDB、監査ログ、アプリケーションログへ保存しない
- パスワードハッシュ更新と全セッション失効を同じトランザクションで行う
- 紛失した場合は再表示せず、再度リセットする
- 管理者から利用者への伝達は運用で行う

一時パスワードと通常パスワードはDB上で区別しない。`mustChangePassword` カラムは追加せず、ログイン後の変更も強制しない。

## 本人によるパスワード変更

一般利用者と管理者が任意でパスワードを変更できる本人向けAPIを追加する。

```http
POST /api/v1/auth/change-password
```

```json
{
  "currentPassword": "現在のパスワード",
  "newPassword": "新しいパスワード"
}
```

- Cookieセッション認証とOrigin検証を必須とする
- 現在のパスワードをArgon2idで検証する
- 新しいパスワードは12文字以上128文字以下とする
- 現在と同じパスワードへの変更を拒否する
- 変更成功時にログイン失敗回数とロック状態を解除する
- 変更成功時に現在のセッションを含む全セッションを失効させる
- 現在のCookieを削除し、新しいパスワードでの再ログインを求める
- パスワードの平文をログへ保存しない

## 監査ログ

管理者による状態変更は、対象処理と同じDBトランザクションで監査ログへ保存する。

| Field | Description |
| --- | --- |
| `id` | 監査ログID |
| `actor_user_id` | 操作した管理者の内部利用者ID |
| `action` | 操作種別 |
| `resource_type` | 操作対象の種別。管理操作では `user` |
| `resource_id` | 対象利用者の内部利用者ID |
| `occurred_at` | 操作日時 |
| `changed_fields` | 変更した項目名の一覧 |

成功した変更操作を監査ログへ保存する。validation失敗、認証失敗、権限不足、想定外エラーは通常のアプリケーションログで扱う。

DBでは出席対象の操作履歴と共通の `audit_logs` テーブルを使う。既存の管理者向けAPI契約では互換性のため `targetUserId` を返し、検索時に `resource_type = 'user'` の履歴だけへ限定する。

監査ログにはパスワード、パスワードハッシュ、セッショントークン、一時パスワード、変更前後の機密値を保存しない。監査ログは削除期限を設けず無期限に保管する。

監査ログは継続的に増えるため、一覧APIにはカーソルページングを設ける。`occurred_at DESC, id DESC`で新しい順に並べ、`occurredAt + id`を複合cursorとして使用する。同じ日時のログが複数あっても、`id`をタイブレーカーにして重複と取りこぼしを防ぐ。

既定件数は50件、最大件数は100件とする。cursorのレスポンスとrequest queryでは、`occurredAt`と`id`をBase64URLなどでエンコードしたopaqueな文字列として扱い、内部構造をAPI利用者へ公開しない。

cursorは `occurredAt` と `id` を持つUTF-8 JSONをBase64URLへ変換する。復号後は余分なfieldを許可せず、日時形式とIDを厳密にvalidationする。cursorに機密情報は含まれないため、初期実装では署名しない。

## エラー方針

想定内のエラーは既存方針に従って `AppError` の派生例外とし、`app.onError` でJSONへ変換する。

想定する主なエラーコードは次の通り。

- `ADMIN_PERMISSION_REQUIRED`
- `USER_NOT_FOUND`
- `USER_EMAIL_ALREADY_EXISTS`
- `USER_STUDENT_NUMBER_ALREADY_EXISTS`
- `LAST_ADMIN_REQUIRED`
- `CANNOT_DISABLE_SELF`
- `INVALID_CURRENT_PASSWORD`
- `FACE_AUTH_APP_UNAVAILABLE`
- `FACE_AUTH_APP_REJECTED`

利用者の存在を一般利用者へ公開しない。管理者API内では管理業務に必要な範囲で、対象利用者が存在しないことを明示してよい。

メールアドレスまたは学籍番号が重複した場合は `409 Conflict` を返し、上記の個別エラーコードで区別する。利用者更新では許可したfieldだけを受け取り、`studentNumber`、`userType`、`isAdmin`、`password`などが含まれていた場合は無視せずvalidation errorにする。

## 状態変更時の管理者保護

管理者の無効化判定は状態更新と同じトランザクション内で行う。

- 管理者は自分自身を無効化できない
- 最後の有効な管理者を無効化できない
- 管理者の役割を管理者APIから変更できない
- 管理者自身が自分の全セッションを失効させることは許可する

## HTTPS

一時パスワードと管理者Cookieを扱うため、管理者画面の実運用ではHTTPSとSecure Cookieを使用する。具体的な証明書配布とリバースプロキシ構成はPhase 7のデプロイ設計で確定し、管理者画面の運用開始前に適用する。

## 未確定事項

現時点で、管理者APIの基本仕様に関する未確定事項はない。管理者Web画面の構成と操作フローは `docs/admin-web.md` に記載する。
