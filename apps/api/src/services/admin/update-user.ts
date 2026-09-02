import { randomUUID } from "node:crypto";
import type { AdminRepository } from "../../repositories/admin-repository";
import { resolveAdminMutation } from "./resolve-admin-mutation";

type UpdateUserInput = {
  name?: string;
  lcdDisplayName?: string;
  email?: string;
};

export class UpdateUserUseCase {
  constructor(private readonly repository: AdminRepository) {}

  execute(actorUserId: string, targetUserId: string, input: UpdateUserInput) {
    const result = this.repository.updateUser({
      auditId: randomUUID(),
      actorUserId,
      occurredAt: new Date().toISOString(),
      targetUserId,
      values: {
        ...input,
        ...(input.email
          ? { emailNormalized: input.email.trim().toLowerCase() }
          : {}),
      },
    });
    return resolveAdminMutation(result).user;
  }
}
