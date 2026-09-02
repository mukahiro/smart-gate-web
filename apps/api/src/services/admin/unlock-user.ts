import { randomUUID } from "node:crypto";
import type { AdminRepository } from "../../repositories/admin-repository";
import { resolveAdminMutation } from "./resolve-admin-mutation";

export class UnlockUserUseCase {
  constructor(private readonly repository: AdminRepository) {}

  execute(actorUserId: string, targetUserId: string) {
    return resolveAdminMutation(
      this.repository.unlockUser({
        auditId: randomUUID(),
        actorUserId,
        occurredAt: new Date().toISOString(),
        targetUserId,
      }),
    ).user;
  }
}
