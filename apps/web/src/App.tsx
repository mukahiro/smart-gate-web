import { useCallback, useEffect, useState } from "react";
import { ApiError, type User, getCurrentUser, logout } from "./api/client";
import { LoginPage } from "./features/auth/LoginPage";
import { HistoryPage } from "./features/history/HistoryPage";

type AuthState =
  | { status: "checking" }
  | { status: "anonymous"; message?: string }
  | { status: "authenticated"; user: User };

export function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "checking" });

  const expireSession = useCallback(() => {
    setAuth({
      status: "anonymous",
      message:
        "セッションの有効期限が切れました。もう一度ログインしてください。",
    });
  }, []);

  const finishPasswordChange = useCallback(() => {
    setAuth({
      status: "anonymous",
      message:
        "パスワードを変更しました。新しいパスワードでログインしてください。",
    });
  }, []);

  const finishSelfSessionRevocation = useCallback(() => {
    setAuth({
      status: "anonymous",
      message:
        "すべてのセッションを失効しました。もう一度ログインしてください。",
    });
  }, []);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((user) => {
        if (active) setAuth({ status: "authenticated", user });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuth({
          status: "anonymous",
          message:
            error instanceof ApiError && error.status !== 401
              ? "サーバーに接続できませんでした。しばらくしてからお試しください。"
              : undefined,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  if (auth.status === "checking") {
    return (
      <main className="centered-page" aria-busy="true">
        <div className="loading-mark" aria-label="ログイン状態を確認中" />
      </main>
    );
  }

  if (auth.status === "anonymous") {
    return (
      <LoginPage
        initialMessage={auth.message}
        onLogin={(user) => setAuth({ status: "authenticated", user })}
      />
    );
  }

  return (
    <HistoryPage
      user={auth.user}
      onSessionExpired={expireSession}
      onPasswordChanged={finishPasswordChange}
      onSelfSessionsRevoked={finishSelfSessionRevocation}
      onLogout={async () => {
        await logout().catch(() => undefined);
        setAuth({ status: "anonymous" });
      }}
    />
  );
}
