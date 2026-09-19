import { X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { replaceAdminUserFaceImages } from "../client";
import { adminErrorMessage, handleAdminAuthorizationError } from "../errors";
import type { AdminUser } from "../types";
import { FaceImageField } from "./FaceImageField";
import { isUserLocked } from "./filter-users";

type FaceImageDialogProps = {
  user: AdminUser;
  onClose: () => void;
  onUpdated: (user: AdminUser) => void;
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
};

export function FaceImageDialog({
  user,
  onClose,
  onUpdated,
  onSessionExpired,
  onPermissionDenied,
}: FaceImageDialogProps) {
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = isUserLocked(user);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (images.length === 0) return;

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const updated = await replaceAdminUserFaceImages(user.id, images);
      setImages([]);
      setSuccess("顔認証用画像を更新しました。");
      onUpdated(updated);
    } catch (cause) {
      if (
        !handleAdminAuthorizationError(
          cause,
          onSessionExpired,
          onPermissionDenied,
        )
      ) {
        setError(adminErrorMessage(cause));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <dialog
        open
        className="dialog-card face-image-dialog"
        aria-labelledby="face-image-dialog-title"
        aria-modal="true"
      >
        <header className="admin-page-heading detail-title-row card-header">
          <div>
            <h1 id="face-image-dialog-title">{user.name}</h1>
            <div className="title-badges">
              <span className="role-badge">
                {user.userType === "teacher" ? "先生" : "生徒"}
              </span>
              {user.isAdmin && (
                <span className="role-badge" data-role="admin">
                  管理者
                </span>
              )}
              <span
                className="status-badge"
                data-state={user.isActive ? "active" : "inactive"}
              >
                {user.isActive ? "有効" : "無効"}
              </span>
              {locked && (
                <span className="status-badge" data-state="locked">
                  ロック中
                </span>
              )}
            </div>
          </div>
          <button
            className="icon-button close-button"
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="顔認証用画像の編集を閉じる"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        {error && (
          <div className="notice error-notice" role="alert">
            {error}
          </div>
        )}
        {success && (
          <output className="notice success-notice">{success}</output>
        )}

        <form
          className="face-image-form"
          onSubmit={(event) => void save(event)}
        >
          <h2>顔登録</h2>
          <span
            className="face-registration-status"
            data-registered={user.faceImageCount > 0}
          >
            {user.faceImageCount > 0
              ? `登録済み（${user.faceImageCount}枚）`
              : "未登録"}
          </span>
          <p>
            選択した画像でPython顔認証アプリの登録内容を置き換えます。顔画像は特徴量として保存され、元画像はサーバ上に残りません。
          </p>
          <FaceImageField
            required
            images={images}
            onChange={setImages}
            disabled={busy}
          />
          <div className="dialog-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={onClose}
            >
              閉じる
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={busy || images.length === 0}
            >
              顔画像を更新
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
