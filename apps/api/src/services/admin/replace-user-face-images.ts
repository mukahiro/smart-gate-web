import { randomUUID } from "node:crypto";
import type { FaceAuthClient, FaceImage } from "../../clients/face-auth-client";
import {
  UserNotFoundError,
  UserStudentNumberRequiredError,
} from "../../errors/admin-errors";
import type { AdminRepository } from "../../repositories/admin-repository";
import { resolveAdminMutation } from "./resolve-admin-mutation";

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
    if (user.studentNumber === null) {
      throw new UserStudentNumberRequiredError();
    }

    await this.faceAuthClient.replaceFaceImages(user.studentNumber, images);
    const result = this.repository.updateFaceImageCount({
      auditId: (this.options.createId ?? randomUUID)(),
      actorUserId,
      targetUserId,
      occurredAt: (this.options.now ?? (() => new Date()))().toISOString(),
      faceImageCount: images.length,
    });
    return resolveAdminMutation(result).user;
  }
}
