import {
  InvalidCurrentPasswordError,
  PasswordMustDifferError,
} from "../../errors/auth-errors";
import type { AuthRepository } from "../../repositories/auth-repository";
import { hashPassword, verifyPassword } from "./password";

export class ChangePasswordUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    userId: string,
    email: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const record = this.authRepository.findUserAuthentication(
      email.trim().toLowerCase(),
    );
    if (
      !record ||
      record.id !== userId ||
      !(await verifyPassword(record.passwordHash, currentPassword))
    ) {
      throw new InvalidCurrentPasswordError();
    }
    if (await verifyPassword(record.passwordHash, newPassword)) {
      throw new PasswordMustDifferError();
    }

    this.authRepository.changePassword({
      userId,
      passwordHash: await hashPassword(newPassword),
      changedAt: new Date().toISOString(),
    });
  }
}
