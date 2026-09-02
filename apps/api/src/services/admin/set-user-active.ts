import { randomUUID } from "node:crypto";
import type { AdminRepository } from "../../repositories/admin-repository";
import { resolveAdminMutation } from "./resolve-admin-mutation";

export class SetUserActiveUseCase {
  constructor(private readonly repository: AdminRepository) {}

  execute(actorUserId: string, targetUserId: string, isActive: boolean) {
    const result = this.repository.setUserActive({
      auditId: randomUUID(),
      actorUserId,
      occurredAt: new Date().toISOString(),
      targetUserId,
      isActive,
    });
    return resolveAdminMutation(result).user;
  }
}
