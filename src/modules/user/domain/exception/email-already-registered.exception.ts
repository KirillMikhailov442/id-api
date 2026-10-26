import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class EmailAlreadyRegisteredException extends DomainException {
  readonly code = "EMAIL_ALREADY_REGISTERED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Email is already registered") {
    super(message);
    this.name = "EmailAlreadyRegisteredException";
  }
}
