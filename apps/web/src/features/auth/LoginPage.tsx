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
          <span className="brand-mark" aria-hidden="true">
            SG
          </span>
          <div>
            <p className="eyebrow">Smart Gate</p>
            <h1 id="login-title">入退室履歴</h1>
          </div>
        </header>
        <p className="login-intro">研究室での入室・退出記録を確認できます。</p>
        <form className="login-form" onSubmit={submit}>
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
      <p className="login-footnote">Smart Gate · Laboratory access history</p>
    </main>
  );
}
