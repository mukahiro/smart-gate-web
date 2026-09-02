import { UserNotFoundError } from "../../errors/admin-errors";
import type { AdminRepository } from "../../repositories/admin-repository";

export class GetUserUseCase {
  constructor(private readonly repository: AdminRepository) {}

  execute(userId: string) {
    const user = this.repository.findUser(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }
}
