import {
  CannotDisableSelfError,
  LastAdminRequiredError,
  UserEmailAlreadyExistsError,
  UserNotFoundError,
  UserStudentNumberAlreadyExistsError,
} from "../../errors/admin-errors";
import type { AdminMutationResult } from "../../repositories/admin-repository";

export const resolveAdminMutation = (result: AdminMutationResult) => {
  switch (result.kind) {
    case "success":
      return result;
    case "not_found":
      throw new UserNotFoundError();
    case "email_exists":
      throw new UserEmailAlreadyExistsError();
    case "student_number_exists":
      throw new UserStudentNumberAlreadyExistsError();
    case "cannot_disable_self":
      throw new CannotDisableSelfError();
    case "last_admin":
      throw new LastAdminRequiredError();
  }
};
