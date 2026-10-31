import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class EmailAlreadyRegisteredException extends DomainException {
  readonly code = "EMAIL_ALREADY_REGISTERED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Email is already registered") {
    super(message);
    this.name = "EmailAlreadyRegisteredException";
  }
}
