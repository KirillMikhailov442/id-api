import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class RoleAlreadyAssignedException extends DomainException {
  readonly code = "ROLE_ALREADY_ASSIGNED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Role is already assigned to user") {
    super(message);
    this.name = "RoleAlreadyAssignedException";
  }
}
