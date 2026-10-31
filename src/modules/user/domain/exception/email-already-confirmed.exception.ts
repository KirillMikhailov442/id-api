import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class EmailAlreadyConfirmedException extends DomainException {
  readonly code = "EMAIL_ALREADY_CONFIRMED";
  readonly status = HttpStatus.Conflict;

  constructor(message = "Email is already confirmed") {
    super(message);
    this.name = "EmailAlreadyConfirmedException";
  }
}
