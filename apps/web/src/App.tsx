import { useEffect, useState } from "react";

type ApiState = "checking" | "online" | "offline";

export function App() {
  const [apiState, setApiState] = useState<ApiState>("checking");

  useEffect(() => {
    let active = true;

    fetch("/api/v1/health")
      .then((response) => {
        if (active) {
          setApiState(response.ok ? "online" : "offline");
        }
      })
      .catch(() => {
        if (active) {
          setApiState("offline");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="panel" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Smart Gate</p>
          <h1 id="page-title">出欠確認システム</h1>
          <p className="lead">
            LAN内で出欠イベントを受け取り、管理画面から状態を確認するための開発環境です。
          </p>
        </div>

        <dl className="status-list">
          <div>
            <dt>API</dt>
            <dd data-state={apiState}>
              {apiState === "checking"
                ? "確認中"
                : apiState === "online"
                  ? "接続済み"
                  : "未接続"}
            </dd>
          </div>
          <div>
            <dt>対象</dt>
            <dd>Web / API</dd>
          </div>
          <div>
            <dt>認証アプリ</dt>
            <dd>別リポジトリ</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
