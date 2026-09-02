import { type FormEvent, useState } from "react";
import { ApiError, type User, login } from "../../api/client";

type LoginPageProps = {
  initialMessage?: string;
  onLogin: (user: User) => void;
};

export function LoginPage({ initialMessage, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialMessage ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      onLogin(await login(email, password));
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 401
          ? "メールアドレスまたはパスワードが正しくありません。"
          : "ログインできませんでした。しばらくしてからお試しください。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <header className="brand-block">
          <h1 id="login-title">
            <img
              className="login-logo"
              src="/assets/images/smart-gate-logo.png"
              alt="Smart Gate"
            />
          </h1>
        </header>
        <form className="login-form" onSubmit={submit}>
          <span>
            メールアドレスやパスワードを忘れた場合は、管理者に問い合わせてください。
          </span>
          <label>
            メールアドレス
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "ログイン中…" : "ログイン"}
          </button>
        </form>
      </section>
    </main>
  );
}
