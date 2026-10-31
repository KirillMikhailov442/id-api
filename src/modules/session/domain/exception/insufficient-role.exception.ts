import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InsufficientRoleException extends DomainException {
  readonly code = "INSUFFICIENT_ROLE";
  readonly status = HttpStatus.Forbidden;

  constructor(message = "Insufficient role") {
    super(message);
    this.name = "InsufficientRoleException";
  }
}
