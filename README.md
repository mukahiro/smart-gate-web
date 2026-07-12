# 出欠確認システム 設計ドキュメント

Raspberry Pi上で動作する、ローカルネットワーク向け出欠確認システムの設計資料です。

## ドキュメント一覧

- `tech-stack.md`：技術スタック
- `requirements.md`：要件定義
- `system-architecture.md`：システム構成
- `api-design.md`：API設計
- `database-design.md`：データベース設計
- `authentication-security.md`：認証・セキュリティ
- `frontend-design.md`：フロントエンド設計
- `backend-design.md`：バックエンド設計
- `python-auth-app.md`：Python認証アプリ設計
- `deployment-operations.md`：デプロイ・運用
- `testing.md`：テスト方針
- `implementation-plan.md`：実装計画

## 想定構成

```text
ブラウザ
  └─ React
       └─ Hono API
            └─ SQLite

Python認証アプリ
  ├─ 顔認証
  ├─ カード認証
  └─ Hono APIへ認証結果を送信
```
