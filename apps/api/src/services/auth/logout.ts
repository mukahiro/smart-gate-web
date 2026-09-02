import type { AuthRepository } from "../../repositories/auth-repository";
import { hashSessionToken } from "./session-token";

export class LogoutUseCase {
  constructor(private readonly repository: AuthRepository) {}

  execute(token: string) {
    this.repository.deleteSession(hashSessionToken(token));
  }
}
