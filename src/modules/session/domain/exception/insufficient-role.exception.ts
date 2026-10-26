import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class InsufficientRoleException extends DomainException {
  readonly code = "INSUFFICIENT_ROLE";
  readonly status = HttpStatus.Forbidden;

  constructor(message = "Insufficient role") {
    super(message);
    this.name = "InsufficientRoleException";
  }
}
