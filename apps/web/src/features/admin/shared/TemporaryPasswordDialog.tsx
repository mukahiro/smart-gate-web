import { useState } from "react";

type TemporaryPasswordDialogProps = {
  password: string;
  title?: string;
  note?: string;
  onClose: () => void;
};

export function TemporaryPasswordDialog({
  password,
  title = "一時パスワードを発行しました",
  note,
  onClose,
}: TemporaryPasswordDialogProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <dialog
        open
        className="dialog-card temporary-password-card"
        aria-labelledby="temporary-password-title"
      >
        <h2 id="temporary-password-title">{title}</h2>
        <p>この画面を閉じると、同じ一時パスワードは再表示できません。</p>
        {note && <p className="dialog-note">{note}</p>}
        <div className="temporary-password">
          <code>{password}</code>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void copy()}
          >
            {copied ? "コピー済み" : "コピー"}
          </button>
        </div>
        <label className="confirmation-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          安全な方法で保存または本人へ伝達しました
        </label>
        <div className="dialog-actions">
          <button
            className="primary-button"
            type="button"
            disabled={!confirmed}
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </dialog>
    </div>
  );
}
