import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class RoleNotFoundException extends DomainException {
  readonly code = "ROLE_NOT_FOUND";
  readonly status = HttpStatus.NotFound;

  constructor(message = "Role not found") {
    super(message);
    this.name = "RoleNotFoundException";
  }
}
