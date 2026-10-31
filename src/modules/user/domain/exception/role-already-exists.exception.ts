import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class RoleAlreadyExistsException extends DomainException {
  readonly code = "ROLE_ALREADY_EXISTS";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Role already exists") {
    super(message);
    this.name = "RoleAlreadyExistsException";
  }
}
