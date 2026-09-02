type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  dangerous?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  dangerous = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="dialog-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <header className="dialog-header">
          <h2 id="confirm-title">{title}</h2>
        </header>
        <p id="confirm-description">{description}</p>
        <div className="dialog-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            className={dangerous ? "danger-button" : "primary-button"}
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "処理中…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
