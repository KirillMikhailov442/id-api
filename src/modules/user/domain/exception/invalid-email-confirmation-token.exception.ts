import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidEmailConfirmationTokenException extends DomainException {
  constructor(
    message = "Email confirmation token is invalid or expired"
  ) {
    super(
      message,
      "INVALID_EMAIL_CONFIRMATION_TOKEN",
      HttpStatus.BadRequest
    );
  }
}
