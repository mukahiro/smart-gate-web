import { randomUUID } from "node:crypto";
import type { FaceAuthClient, FaceImage } from "../../clients/face-auth-client";
import { UserNotFoundError } from "../../errors/admin-errors";
import type { AdminRepository } from "../../repositories/admin-repository";

type ReplaceUserFaceImagesOptions = {
  createId?: () => string;
  now?: () => Date;
};

export class ReplaceUserFaceImagesUseCase {
  constructor(
    private readonly repository: AdminRepository,
    private readonly faceAuthClient: FaceAuthClient,
    private readonly options: ReplaceUserFaceImagesOptions = {},
  ) {}

  async execute(
    actorUserId: string,
    targetUserId: string,
    images: FaceImage[],
  ) {
    const user = this.repository.findUser(targetUserId);
    if (!user) throw new UserNotFoundError();

    await this.faceAuthClient.replaceFaceImages(user.studentNumber, images);
    this.repository.recordAuditLog({
      auditId: (this.options.createId ?? randomUUID)(),
      actorUserId,
      action: "user_face_images_updated",
      targetUserId,
      occurredAt: (this.options.now ?? (() => new Date()))().toISOString(),
      changedFields: ["faceImages"],
    });
  }
}
