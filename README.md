# 研究室入退室記録システム 設計ドキュメント

Raspberry Pi上で動作する、ローカルネットワーク向け研究室入退室記録システムの設計資料です。

このリポジトリでは、Web管理画面とバックエンドAPIを扱います。Python認証アプリは別リポジトリで管理します。

## ドキュメント一覧

- `tech-stack.md`：技術スタック
- `requirements.md`：要件定義
- `endpoints.md`：APIエンドポイント仕様
- `web-authentication.md`：Web利用者認証・セッション・学籍番号の設計

## 想定構成

```text
ブラウザ
  └─ React
       └─ Hono API
            └─ SQLite

Python認証アプリ
  └─ 別リポジトリからHono APIへ認証イベントを送信
```

## ディレクトリ構成

```text
.
├─ apps/
│  ├─ api/                 # Hono + Node.js のバックエンドAPI
│  │  ├─ drizzle/          # Drizzle Kitが生成するmigration
│  │  ├─ scripts/          # 保守者向けCLI
│  │  ├─ tests/            # APIのテスト
│  │  └─ src/
│  │     ├─ db/            # DB接続、Drizzle schemaなどDB基盤
│  │     ├─ middleware/    # Hono middleware
│  │     ├─ repositories/  # 永続化のinterfaceと実装
│  │     ├─ routes/        # HTTPルーティングとリクエスト検証
│  │     ├─ schemas/       # Zod schemaと入出力型
│  │     └─ services/      # ユースケース・業務ロジック
│  └─ web/                 # React + Vite のWebアプリ
│     └─ src/              # 画面、コンポーネント、フロントエンド実装
├─ docs/                   # 暫定の要件・技術スタック資料
├─ AGENTS.md               # AIエージェント用の指示書
├─ README.md               # このREADMEファイル
└─ TASKS.md                # 今後の実装タスク一覧
```

### 配置ルール

- APIの起動処理は `apps/api/src/index.ts` に置く。
- Honoアプリの組み立ては `apps/api/src/app.ts` に置く。
- HTTPエンドポイントごとのルーティングは `apps/api/src/routes/` に置く。
- Bearer認証など、複数routeで再利用できるHono middlewareは `apps/api/src/middleware/` に置く。
- Zodによるリクエスト・レスポンスのschemaは `apps/api/src/schemas/` に置く。
- DB接続、Drizzle schema、migration実行などDB基盤は `apps/api/src/db/` に置く。
- 永続化のinterfaceと実装は `apps/api/src/repositories/` に置く。Drizzleを使う実装もここに置き、`db/` には置かない。
- 業務ロジックやユースケース処理は `apps/api/src/services/` に置く。HTTPやDrizzleに直接依存させない。
- Drizzle Kitが生成するmigrationは `apps/api/drizzle/` に置く。
- `dist/`、`node_modules/`、`.vite/` などの生成物・依存物は編集対象の構成として扱わない。
- Python認証アプリは別リポジトリで管理する。このリポジトリには実装しない。

## 開発環境

```sh
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm build
```

`pnpm` が未インストールの場合は、次のように一時実行できます。

```sh
npm exec pnpm@9.15.4 -- install
npm exec pnpm@9.15.4 -- dev
```

## 環境変数

| Name | Description |
| --- | --- |
| `AUTH_APP_BEARER_TOKEN` | Python認証アプリ用Bearerトークン。未設定時はAPIを起動しない |
| `DATABASE_PATH` | SQLiteファイルのパス。既定値は `./data/smart-gate.sqlite3` |
| `DATABASE_MIGRATIONS_PATH` | migrationディレクトリ。既定値は `./drizzle` |
| `API_PORT` | APIの待受ポート。既定値は `3000` |
| `SESSION_COOKIE_SECURE` | HTTPS運用時は `true`。現在の既定値は `false` |

`SESSION_COOKIE_SECURE=false` では起動時に警告する。HTTPSの本番方針はデプロイ設計時に確定する。

## Web認証API

Web認証APIは同一オリジンから呼び出す。次の例はCookieを一時ファイルへ保存して、ログイン中利用者を取得する。

```sh
curl --request POST http://localhost:3000/api/v1/auth/login \
  --header 'Origin: http://localhost:3000' \
  --header 'Content-Type: application/json' \
  --cookie-jar /tmp/smart-gate-cookie.txt \
  --data '{"email":"user@example.com","password":"example-password"}'

curl http://localhost:3000/api/v1/auth/me \
  --cookie /tmp/smart-gate-cookie.txt

curl --request POST http://localhost:3000/api/v1/auth/logout \
  --header 'Origin: http://localhost:3000' \
  --cookie /tmp/smart-gate-cookie.txt
```

セッションの無操作期限は2時間、絶対期限は12時間である。ログインに5回連続で失敗すると15分間ロックされる。メール未登録、パスワード不一致、利用者無効、ロック中はすべて同じ認証エラーを返す。

## 履歴確認API

ログイン中の利用者は、Cookieを使って本人の履歴だけを取得できる。利用者IDや学籍番号を指定して他人の履歴を取得することはできない。

```sh
curl 'http://localhost:3000/api/v1/attendance-events/me/monthly?month=2026-07' \
  --cookie /tmp/smart-gate-cookie.txt

curl 'http://localhost:3000/api/v1/attendance-events/me/daily?date=2026-07-12' \
  --cookie /tmp/smart-gate-cookie.txt
```

日付境界と集計は日本時間（`Asia/Tokyo`）を使用する。入室の次に現れる退出を1組とし、日をまたぐ場合の参考滞在時間は入室日に計上する。不足した記録は補完しない。

## Python認証アプリからのイベント送信

Python認証アプリからBearerトークン付きで `POST /api/v1/attendance-events` を呼び出す。

```sh
curl --request POST http://localhost:3000/api/v1/attendance-events \
  --header 'Authorization: Bearer replace-with-a-long-random-token' \
  --header 'Content-Type: application/json' \
  --data '{
    "eventId": "event-001",
    "studentNumber": "1234567890",
    "deviceId": "raspberry-pi-001",
    "method": "card",
    "eventType": "check_in",
    "authenticatedAt": "2026-07-12T08:45:12+09:00"
  }'
```

`eventId` は認証アプリ側で認証イベントごとに生成し、通信失敗後の再送でも同じ値を使用する。`201 Created` と `200 OK` はどちらも保存済みとして扱い、再送を終了する。接続失敗と `5xx` は再送対象とし、`400` と `401` は入力または設定を修正するまで自動再送しない。

`studentNumber` はハイフンなしの数字10桁を指定する。利用者が未登録でもイベントは保存され、レスポンスの `resultCode` は `RECORDED_UNMATCHED` になる。利用者登録後、同じ学籍番号の未照合イベントは自動的にその利用者へ紐付く。

## 入退室イベントのログ

APIは入退室イベントの保存結果を1行1JSONで標準出力へ記録する。ログには日時、イベントID、端末ID、認証方式、入退室種別、保存結果を含める。Bearerトークン、request body、学籍番号は記録しない。運用時はsystemd/journaldで標準出力を収集する想定である。

## 認証端末の扱い

Phase 1では、イベント送信元を単一のRaspberry Piとし、Bearerトークンで保護する。`deviceId` は受信元の記録と調査に使用するが、端末ごとの許可・無効化は行わない。複数端末へ拡張するときに、端末ごとの認証情報と許可リストを導入する。

## 利用者の保守

利用者登録とパスワードなどの保守はAPIパッケージの対話式CLIで行う。パスワードは端末へ表示されず、コマンドライン引数にも残らない。

```sh
pnpm --filter @smart-gate/api user:create
pnpm --filter @smart-gate/api user:reset-password
pnpm --filter @smart-gate/api user:enable
pnpm --filter @smart-gate/api user:disable
pnpm --filter @smart-gate/api user:unlock
```

`user:create` は `12-3456-789-0` と `1234567890` の両形式を受け付け、DBにはハイフンなしの数字10桁を保存する。利用者作成と未照合イベントの紐付けは同一トランザクションで行う。パスワード再設定と利用者無効化では、その利用者の全セッションを削除する。

## migration運用

Drizzle schemaを変更したら、APIパッケージを作業ディレクトリとしてmigrationを生成する。

```sh
cd apps/api
pnpm exec drizzle-kit generate --config drizzle.config.ts
```

- 生成されたSQLとsnapshotをレビューする
- 適用済みmigrationは書き換えず、新しいmigrationを追加する
- migrationは空DBと現行migration適用済みDBの両方でテストする
- 既存データを削除・変換するmigrationは、バックアップ手順を決めてから実環境へ適用する
- API起動時に未適用migrationが自動適用されるため、実運用では起動前にSQLiteをバックアップする
