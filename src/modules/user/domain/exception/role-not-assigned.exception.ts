import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class RoleNotAssignedException extends DomainException {
  constructor(
    message = "Role is not assigned to user"
  ) {
    super(
      message,
      "ROLE_NOT_ASSIGNED",
      HttpStatus.Conflict
    );
  }
}
