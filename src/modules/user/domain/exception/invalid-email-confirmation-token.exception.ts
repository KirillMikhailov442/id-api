import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidEmailConfirmationTokenException extends DomainException {
  readonly code = "INVALID_EMAIL_CONFIRMATION_TOKEN";
  readonly status = HttpStatus.BadRequest;

  constructor(message = "Email confirmation token is invalid or expired") {
    super(message);
    this.name = "InvalidEmailConfirmationTokenException";
  }
}
