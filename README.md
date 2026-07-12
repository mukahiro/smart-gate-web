# 研究室入退室記録システム 設計ドキュメント

Raspberry Pi上で動作する、ローカルネットワーク向け研究室入退室記録システムの設計資料です。

このリポジトリでは、Web管理画面とバックエンドAPIを扱います。Python認証アプリは別リポジトリで管理します。

## ドキュメント一覧

- `tech-stack.md`：技術スタック
- `requirements.md`：要件定義

## 想定構成

```text
ブラウザ
  └─ React
       └─ Hono API
            └─ SQLite

Python認証アプリ
  └─ 別リポジトリからHono APIへ認証イベントを送信
```

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
