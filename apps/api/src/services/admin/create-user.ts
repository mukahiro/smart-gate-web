import { randomUUID } from "node:crypto";
import type { AdminRepository } from "../../repositories/admin-repository";
import { hashPassword } from "../auth/password";
import { resolveAdminMutation } from "./resolve-admin-mutation";
import { generateTemporaryPassword } from "./temporary-password";

type CreateUserInput = {
  userType: "student" | "teacher";
  studentNumber: string | null;
  name: string;
  lcdDisplayName: string | null;
  email: string;
};

type CreateUserOptions = {
  now?: () => Date;
  createId?: () => string;
  createTemporaryPassword?: () => string;
  createPasswordHash?: (password: string) => Promise<string>;
};

export class CreateUserUseCase {
  constructor(
    private readonly repository: AdminRepository,
    private readonly options: CreateUserOptions = {},
  ) {}

  async execute(actorUserId: string, input: CreateUserInput) {
    const temporaryPassword = (
      this.options.createTemporaryPassword ?? generateTemporaryPassword
    )();
    const passwordHash = await (
      this.options.createPasswordHash ?? hashPassword
    )(temporaryPassword);
    const createId = this.options.createId ?? randomUUID;
    const occurredAt = (this.options.now ?? (() => new Date()))().toISOString();
    const result = this.repository.createUser({
      auditId: createId(),
      actorUserId,
      occurredAt,
      userId: createId(),
      userType: input.userType,
      studentNumber: input.studentNumber,
      name: input.name,
      lcdDisplayName: input.lcdDisplayName,
      email: input.email,
      emailNormalized: input.email.trim().toLowerCase(),
      passwordHash,
    });
    const success = resolveAdminMutation(result);

    return {
      user: success.user,
      temporaryPassword,
      linkedEventCount: result.linkedEventCount ?? 0,
    };
  }
}
