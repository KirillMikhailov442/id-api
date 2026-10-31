import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class EmailAlreadyConfirmedException extends DomainException {
  constructor(
    message = "Email is already confirmed"
  ) {
    super(
      message,
      "EMAIL_ALREADY_CONFIRMED",
      HttpStatus.Conflict
    );
  }
}
