import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class RoleAlreadyExistsException extends DomainException {
  readonly code = "ROLE_ALREADY_EXISTS";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Role already exists") {
    super(message);
    this.name = "RoleAlreadyExistsException";
  }
}
