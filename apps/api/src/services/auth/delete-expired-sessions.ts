import type { AuthRepository } from "../../repositories/auth-repository";

type DeleteExpiredSessionsOptions = {
  now?: () => Date;
};

export class DeleteExpiredSessionsUseCase {
  private readonly now: () => Date;

  constructor(
    private readonly repository: AuthRepository,
    { now = () => new Date() }: DeleteExpiredSessionsOptions = {},
  ) {
    this.now = now;
  }

  execute() {
    this.repository.deleteExpiredSessions(this.now().toISOString());
  }
}
