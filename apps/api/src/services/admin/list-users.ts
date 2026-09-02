import type { AdminRepository } from "../../repositories/admin-repository";

export class ListUsersUseCase {
  constructor(private readonly repository: AdminRepository) {}

  execute() {
    return this.repository.listUsers();
  }
}
