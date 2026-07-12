# 研究室入退室記録システム 設計ドキュメント

Raspberry Pi上で動作する、ローカルネットワーク向け研究室入退室記録システムの設計資料です。

このリポジトリでは、Web管理画面とバックエンドAPIを扱います。Python認証アプリは別リポジトリで管理します。

## ドキュメント一覧

- `tech-stack.md`：技術スタック
- `requirements.md`：要件定義
- `endpoints.md`：APIエンドポイント仕様

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
