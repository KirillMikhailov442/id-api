import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class InvalidEmailConfirmationTokenException extends DomainException {
  readonly code = "INVALID_EMAIL_CONFIRMATION_TOKEN";
  readonly status = HttpStatus.BadRequest;

  constructor(message = "Email confirmation token is invalid or expired") {
    super(message);
    this.name = "InvalidEmailConfirmationTokenException";
  }
}
