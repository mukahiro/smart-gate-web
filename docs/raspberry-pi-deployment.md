# Raspberry PiでのLAN配信・自動起動

Raspberry Pi 5（8GB）、Raspberry Pi OS **64-bit**で、nginxによるLAN内HTTP配信とsystemdによるAPI自動起動を設定する手順。Python認証アプリは別途設定する。

```text
LAN内ブラウザ → http://PiのIPアドレス:80 → nginx
                                         ├─ Web: /var/www/smart-gate
                                         └─ /api/ → 127.0.0.1:3000 → Hono + SQLite
```

APIは既存のtsxを使い、TypeScriptのソースを直接実行する。Viteの開発サーバーやpreviewサーバーは運用に使用しない。HTTPではパスワード・Cookie・画像などの通信が暗号化されないため、この設定は信頼できるLAN内で使用する。ルーターのポート転送は設定しない。

以下は**Raspberry Pi上で実行**する。現在の開発環境にサービスをインストールする手順ではない。既存DBやnginxサイトがある場合は、初期導入の手順で上書きせず、後述の移行・更新手順を使う。

## 1. OS・Node.js・依存ツール

```sh
uname -m
getconf LONG_BIT
sudo apt update
sudo apt install -y nginx git rsync sqlite3 python3 make g++ ca-certificates curl xz-utils openssl
```

`aarch64` / `64` を確認する。32-bit OSではこの手順のARM64バイナリは使用できない。

Node.js **22.x** のLinux ARM64版を[公式ダウンロード](https://nodejs.org/en/download)から取得する。未導入の場合の例を示す。バージョンはNode.js 22の最新パッチ版を選び、`PI_NODE_VERSION` に設定する。

```sh
PI_NODE_VERSION=v22.23.3
PI_NODE_ARCHIVE="node-${PI_NODE_VERSION}-linux-arm64.tar.xz"
PI_NODE_TMP=$(mktemp -d)
cd "$PI_NODE_TMP"
curl -fSLO "https://nodejs.org/dist/${PI_NODE_VERSION}/${PI_NODE_ARCHIVE}"
curl -fSLO "https://nodejs.org/dist/${PI_NODE_VERSION}/SHASUMS256.txt"
awk -v archive="$PI_NODE_ARCHIVE" '$2 == archive' SHASUMS256.txt > node-checksum.txt
sha256sum --check node-checksum.txt
```

チェックに成功した場合のみインストールする。既存のシステム全体のNode.jsがある場合は、それを更新してよいか確認する。

```sh
sudo tar -xJf "$PI_NODE_ARCHIVE" --strip-components=1 -C /usr/local
/usr/local/bin/node --version
sudo npm install --global pnpm@9.15.4
pnpm --version
```

サービスは `/usr/local/bin` または `/usr/bin` のNode.jsを使う。nvm等でログインユーザーのホームにだけ置いたNode.jsは、`ProtectHome=true` のためサービスから使用できない。`better-sqlite3` と `argon2` はネイティブ依存を含むため、PCの `node_modules` をコピーせず、Pi上で依存をインストールする。

## 2. 専用ユーザーとアプリ配置

リポジトリをログインユーザーの作業ディレクトリへcloneするか、ソースを転送する。以下は `~/projects/smart-gate-web` に配置した例。未コミットの変更も必要な場合はそれを含めて転送する。

```sh
cd ~/projects/smart-gate-web
pnpm install --frozen-lockfile
pnpm build
sudo useradd --system --user-group --home-dir /var/lib/smart-gate --no-create-home --shell /usr/sbin/nologin smart-gate
sudo install -d -m 0755 /opt/smart-gate /var/www/smart-gate
sudo install -d -o smart-gate -g smart-gate -m 0700 /var/lib/smart-gate
sudo install -d -m 0700 /etc/smart-gate
sudo rsync -a --delete --exclude='.git/' --exclude='.env' --exclude='.env.*' --exclude='data/' --exclude='coverage/' ./ /opt/smart-gate/
sudo chown -R root:root /opt/smart-gate
sudo chmod -R a+rX /opt/smart-gate
sudo rsync -a --delete apps/web/dist/ /var/www/smart-gate/
sudo chown -R root:root /var/www/smart-gate
sudo chmod -R a+rX /var/www/smart-gate
```

`useradd` は初回だけ実行する。`rsync --delete` の宛先はこのアプリ専用とし、他のファイルを置かない。tsxがdevDependenciesにあるため `pnpm install --prod` や `pnpm prune --prod` は使用しない。ソースと `node_modules` の両方を `/opt/smart-gate` に配置する。

## 3. 本番環境変数と既存DB

```sh
sudo install -m 0600 deploy/raspberry-pi/api.env.example /etc/smart-gate/api.env
openssl rand -hex 32
openssl rand -hex 32
sudoedit /etc/smart-gate/api.env
```

ランダム生成した2つの異なるトークンでプレースホルダーを置き換える。

- `AUTH_APP_BEARER_TOKEN`: Pythonアプリから本APIへイベントを送るトークン。
- `FACE_AUTH_APP_BEARER_TOKEN`: 本APIからPythonアプリへ顔画像を送るトークン。
- `FACE_AUTH_APP_URL`: 別リポジトリのPythonアプリの実際の顔画像登録endpoint。
- `SESSION_COOKIE_SECURE=false`: 今回のHTTP配信に合わせる。`true` ではHTTP経由でログインCookieが送信されない。

systemdの環境ファイルには `export` を付けず `KEY=value` 形式で記述する。開発用 `.env` は本番へコピーしない。顔認証アプリはこの設定では自動起動されない。顔画像登録が必要なら、別リポジトリ側でも起動設定を行う。

既存の入退室履歴を引き継ぐ場合は、旧APIの書き込みを停止してSQLiteのバックアップを作成し、**初回起動前**に配置する。起動済みの新DBを上書きしない。

```sh
# /absolute/path/to/old.sqlite3 は実際の既存DBに置き換える。
sqlite3 /absolute/path/to/old.sqlite3 ".backup '/tmp/smart-gate-initial.sqlite3'"
sudo install -o smart-gate -g smart-gate -m 0600 /tmp/smart-gate-initial.sqlite3 /var/lib/smart-gate/smart-gate.sqlite3
```

新規運用ならDBは初回起動時に自動作成される。migrationも起動時に自動適用される。

## 4. APIの自動起動

```sh
cd ~/projects/smart-gate-web
sudo install -m 0644 deploy/raspberry-pi/smart-gate-api.service /etc/systemd/system/smart-gate-api.service
sudo systemd-analyze verify /etc/systemd/system/smart-gate-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now smart-gate-api
systemctl status smart-gate-api --no-pager
curl --fail http://127.0.0.1:3000/api/v1/health
```

`{"ok":true,"service":"smart-gate-api"}` が返ることを確認する。`Restart=on-failure` により異常終了時は5秒後に再起動する。`systemctl stop` では再起動しない。DBはアプリ配置先とは別の `/var/lib/smart-gate/smart-gate.sqlite3` に残る。

## 5. nginxでLANへ配信

```sh
sudo install -m 0644 deploy/raspberry-pi/nginx-http.conf /etc/nginx/sites-available/smart-gate
sudo ln -s /etc/nginx/sites-available/smart-gate /etc/nginx/sites-enabled/smart-gate
```

Piをこのアプリ専用で使い、既定サイトが未使用の場合は `/etc/nginx/sites-enabled/default` のシンボリックリンクを外す。既存サイトがある場合は、それを削除せず競合しない `server_name` / ポートへ調整する。80番以外のポートを使う場合でも `Host $http_host` を維持する。

```sh
# 既定サイトが未使用の場合だけ実行する。
sudo unlink /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
curl --fail http://127.0.0.1/api/v1/health
hostname -I
```

同じLANの別端末から `http://PiのLAN内IPアドレス/` を開く。APIも同じURLの `/api/v1/` にアクセスするため、Webビルドの `VITE_API_BASE_URL` は既定の `/api/v1` を使う。nginxの設定はWebの画面URLを直接開く場合にも対応する。

HTTPの80番ポートを使う。ファイアウォールが有効なら実際のLANサブネットから80番への接続を許可する。APIの3000番は `127.0.0.1` に限定しており、LANに開放しない。Pythonアプリが同じPi上なら `http://127.0.0.1:3000/api/v1/attendance-events`、別端末なら `http://PiのLAN内IPアドレス/api/v1/attendance-events` へ送信する。

Piのアドレスが変わらないよう、ルーターでDHCP予約を設定する。Wi-Fiのクライアント隔離が有効なネットワークでは別端末から接続できない場合がある。

## 6. 最初の管理者と再起動確認

実運用DBを明示して管理者を作成する。CLIは対話端末で実行する。

```sh
cd /opt/smart-gate/apps/api
sudo -u smart-gate env DATABASE_PATH=/var/lib/smart-gate/smart-gate.sqlite3 DATABASE_MIGRATIONS_PATH=/opt/smart-gate/apps/api/drizzle PATH=/usr/local/bin:/usr/bin:/bin node --import tsx scripts/manage-user.ts create-admin
```

ブラウザでログイン・履歴画面・ログアウトを確認し、イベント送信元との連携も確認する。再送時には同じ `eventId` を使う。`200` / `201` は保存済み、通信失敗 / `5xx` は再送対象とする。

```sh
sudo reboot
```

再接続後、以下を確認する。

```sh
systemctl is-enabled smart-gate-api nginx
systemctl is-active smart-gate-api nginx
curl --fail http://127.0.0.1/api/v1/health
sudo ss -ltnp
sudo journalctl -u smart-gate-api -b --no-pager -n 100
```

APIの待受は `127.0.0.1:3000`、nginxは80番になる。別端末からの表示・ログインと、再起動前の履歴が残っていることも確認する。

## 更新とバックアップ

Pi上の作業ディレクトリで更新版の依存をインストールし、ビルドが成功してから稼働中APIを停止する。停止中のイベントはPythonアプリ側で保持し、再送する必要がある。

```sh
cd ~/projects/smart-gate-web
pnpm install --frozen-lockfile
pnpm build
sudo systemctl stop smart-gate-api
sudo install -d -m 0700 /var/backups/smart-gate
PI_GATE_BACKUP="/var/backups/smart-gate/smart-gate-$(date +%Y%m%d-%H%M%S).sqlite3"
sudo sqlite3 /var/lib/smart-gate/smart-gate.sqlite3 ".backup '$PI_GATE_BACKUP'"
sudo chmod 0600 "$PI_GATE_BACKUP"
sudo rsync -a --delete --exclude='.git/' --exclude='.env' --exclude='.env.*' --exclude='data/' --exclude='coverage/' ./ /opt/smart-gate/
sudo chown -R root:root /opt/smart-gate
sudo chmod -R a+rX /opt/smart-gate
sudo rsync -a --delete apps/web/dist/ /var/www/smart-gate/
sudo chown -R root:root /var/www/smart-gate
sudo chmod -R a+rX /var/www/smart-gate
sudo systemctl start smart-gate-api
curl --fail http://127.0.0.1/api/v1/health
```

バックアップに失敗した場合は更新を進めず、旧版APIを再開する。サービス定義を変更した場合だけ再配置・`daemon-reload` を行う。nginx設定を変更した場合は `nginx -t` が成功してからreloadする。migration適用後の復元は、DBバックアップと対応する旧版アプリを揃え、APIを停止した状態で行う。DB単独を古い状態へ戻すと、バックアップ以降のイベントが失われる。

バックアップはSDカードと別の媒体にも保管する。プロセス再起動への対策だけでは、電源断・媒体故障によるデータ損失は防げない。

## 障害調査

```sh
sudo journalctl -u smart-gate-api -f
sudo tail -n 100 /var/log/nginx/error.log
sudo nginx -t
```

- APIが起動しない: `api.env` の必須値、Node.jsの場所、tsxの配置、DB権限、migrationパスを確認する。
- `502`: APIの起動と `127.0.0.1:3000` の待受を確認する。
- ログイン時のOriginエラー: nginxが元の `Host` を転送し、ブラウザが同じURLからAPIを呼んでいるか確認する。
- `413`: このnginx設定が選択されているか、顔画像の合計が105MiB以内か確認する。
- ログイン状態が維持されない: HTTP運用時に `SESSION_COOKIE_SECURE=false` になっているか確認する。

設定仕様の参照: [nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)、[systemd.service](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)、[systemd.exec](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)、[tsx Node.js CLI](https://tsx.is/dev-api/node-cli)。
