import { X } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";

export const MAX_FACE_IMAGE_COUNT = 10;
export const MAX_FACE_IMAGE_BYTES = 10 * 1024 * 1024;

type FaceImageFieldProps = {
  images: File[];
  onChange: (images: File[]) => void;
  disabled?: boolean;
  required?: boolean;
};

export function FaceImageField({
  images,
  onChange,
  disabled = false,
  required = false,
}: FaceImageFieldProps) {
  const [selectionError, setSelectionError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (images.length === 0 && inputRef.current) inputRef.current.value = "";
  }, [images.length]);

  const selectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? []);
    if (selected.length > MAX_FACE_IMAGE_COUNT) {
      setSelectionError(
        `顔写真は${MAX_FACE_IMAGE_COUNT}枚以下で選択してください。`,
      );
      event.currentTarget.value = "";
      return;
    }
    if (
      selected.some(
        (image) =>
          !image.type.startsWith("image/") ||
          image.size === 0 ||
          image.size > MAX_FACE_IMAGE_BYTES,
      )
    ) {
      setSelectionError(
        "画像ファイルを選択し、1枚あたり10MB以下にしてください。",
      );
      event.currentTarget.value = "";
      return;
    }
    setSelectionError("");
    onChange(selected);
  };

  return (
    <fieldset className="face-image-field">
      <legend>顔認証用画像</legend>
      <input
        ref={inputRef}
        required={required && images.length === 0}
        type="file"
        accept="image/*"
        multiple
        disabled={disabled}
        onChange={selectImages}
        aria-describedby="face-image-help"
      />
      <small id="face-image-help">
        ローカルの画像を1〜10枚選択してください（1枚あたり10MB以下）。
      </small>
      {selectionError && (
        <span className="field-error" role="alert">
          {selectionError}
        </span>
      )}
      {images.length > 0 && (
        <ul className="selected-image-list" aria-label="選択した顔写真">
          {images.map((image, index) => (
            <li key={`${image.name}-${image.lastModified}-${index}`}>
              <span>{image.name}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(
                    images.filter((_, imageIndex) => imageIndex !== index),
                  )
                }
                aria-label={`${image.name}を選択から外す`}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
