import { randomUUID } from "node:crypto";
import type { AdminRepository } from "../../repositories/admin-repository";
import { hashPassword } from "../auth/password";
import { resolveAdminMutation } from "./resolve-admin-mutation";
import { generateTemporaryPassword } from "./temporary-password";

export class ResetUserPasswordUseCase {
  constructor(private readonly repository: AdminRepository) {}

  async execute(actorUserId: string, targetUserId: string) {
    const temporaryPassword = generateTemporaryPassword();
    const result = this.repository.resetUserPassword({
      auditId: randomUUID(),
      actorUserId,
      occurredAt: new Date().toISOString(),
      targetUserId,
      passwordHash: await hashPassword(temporaryPassword),
    });
    resolveAdminMutation(result);
    return { temporaryPassword };
  }
}
