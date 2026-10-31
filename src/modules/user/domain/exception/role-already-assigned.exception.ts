import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class RoleAlreadyAssignedException extends DomainException {
  constructor(
    message = "Role is already assigned to user"
  ) {
    super(
      message,
      "ROLE_ALREADY_ASSIGNED",
      HttpStatus.Conflict
    );
  }
}
