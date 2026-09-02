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

## Python認証アプリからのイベント送信

現在の実装では、Python認証アプリからBearerトークン付きで `POST /api/v1/attendance-events` を呼び出す。

```sh
curl --request POST http://localhost:3000/api/v1/attendance-events \
  --header 'Authorization: Bearer replace-with-a-long-random-token' \
  --header 'Content-Type: application/json' \
  --data '{
    "eventId": "event-001",
    "personId": "person-001",
    "deviceId": "raspberry-pi-001",
    "method": "card",
    "eventType": "check_in",
    "authenticatedAt": "2026-07-12T08:45:12+09:00"
  }'
```

`eventId` は認証アプリ側で認証イベントごとに生成し、通信失敗後の再送でも同じ値を使用する。`201 Created` と `200 OK` はどちらも保存済みとして扱い、再送を終了する。接続失敗と `5xx` は再送対象とし、`400` と `401` は入力または設定を修正するまで自動再送しない。

`personId` は現在の実装上のフィールドである。数字10桁の `studentNumber` へ変更し、未登録学籍番号も保存する目標仕様は `docs/endpoints.md` と `docs/web-authentication.md` を参照する。

## 入退室イベントのログ

APIは入退室イベントの保存結果を1行1JSONで標準出力へ記録する。ログには日時、イベントID、端末ID、認証方式、入退室種別、保存結果を含める。Bearerトークン、request body、`personId` は記録しない。運用時はsystemd/journaldで標準出力を収集する想定である。

## 認証端末の扱い

Phase 1では、イベント送信元を単一のRaspberry Piとし、Bearerトークンで保護する。`deviceId` は受信元の記録と調査に使用するが、端末ごとの許可・無効化は行わない。複数端末へ拡張するときに、端末ごとの認証情報と許可リストを導入する。
