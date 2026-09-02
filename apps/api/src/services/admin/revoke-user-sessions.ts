import { randomUUID } from "node:crypto";
import type { AdminRepository } from "../../repositories/admin-repository";
import { resolveAdminMutation } from "./resolve-admin-mutation";

export class RevokeUserSessionsUseCase {
  constructor(private readonly repository: AdminRepository) {}

  execute(actorUserId: string, targetUserId: string) {
    const result = this.repository.revokeUserSessions({
      auditId: randomUUID(),
      actorUserId,
      occurredAt: new Date().toISOString(),
      targetUserId,
    });
    resolveAdminMutation(result);
    return { revokedSessionCount: result.revokedSessionCount ?? 0 };
  }
}
