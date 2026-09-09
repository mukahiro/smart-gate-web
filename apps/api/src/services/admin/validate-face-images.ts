import type { FaceImage } from "../../clients/face-auth-client";
import { ValidationError } from "../../errors/request-errors";

export const MAX_FACE_IMAGE_COUNT = 10;
export const MAX_FACE_IMAGE_BYTES = 10 * 1024 * 1024;

export const validateFaceImages = (values: unknown[]): FaceImage[] => {
  if (values.length < 1 || values.length > MAX_FACE_IMAGE_COUNT) {
    throw new ValidationError({
      images: [
        `顔写真は1枚以上${MAX_FACE_IMAGE_COUNT}枚以下で選択してください`,
      ],
    });
  }

  return values.map((value) => {
    if (!(value instanceof File) || !value.type.startsWith("image/")) {
      throw new ValidationError({ images: ["画像ファイルを選択してください"] });
    }
    if (value.size === 0 || value.size > MAX_FACE_IMAGE_BYTES) {
      throw new ValidationError({
        images: ["画像は1枚あたり10MB以下にしてください"],
      });
    }
    return { name: value.name, type: value.type, data: value };
  });
};
