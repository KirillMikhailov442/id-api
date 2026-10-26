import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class EmailAlreadyConfirmedException extends DomainException {
  readonly code = "EMAIL_ALREADY_CONFIRMED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Email is already confirmed") {
    super(message);
    this.name = "EmailAlreadyConfirmedException";
  }
}
