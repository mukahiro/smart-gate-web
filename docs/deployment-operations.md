# デプロイ・運用

## 実行環境

- Raspberry Pi OS
- Node.js LTS
- Python 3
- Caddyまたはnginx
- systemd
- SQLite

## プロセス

```text
attendance-api.service
attendance-auth.service
caddy.service または nginx.service
```

## 配信

- Reactは`npm run build`で静的ファイルを生成する
- Webサーバーから静的ファイルを配信する
- `/api/*`をHonoへリバースプロキシする

## 自動起動

- Hono APIとPython認証アプリをsystemdへ登録する
- 異常終了時に自動再起動する
- OS起動時に自動起動する

## データ保存

- SQLite DBはUSB SSDへの配置を推奨する
- microSDカードのみでの長期運用は避ける

## バックアップ

- 毎日SQLiteバックアップを取得する
- 外付けUSB、NAS、別端末のいずれかへ保存する
- 世代管理する
- 定期的に復元確認を行う

## 時刻

- NTP同期を有効にする
- タイムゾーンをAsia/Tokyoへ設定する

## ログ

- APIログ
- Python認証ログ
- systemdログ
- 監査ログ

を分けて管理する。

## 電源対策

- UPSを推奨する
- 強制電源断を避ける
- 正常シャットダウン手順を用意する
