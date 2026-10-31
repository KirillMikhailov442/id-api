import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class EmailAlreadyRegisteredException extends DomainException {
  constructor(
    message = "Email is already registered"
  ) {
    super(
      message,
      "EMAIL_ALREADY_REGISTERED",
      HttpStatus.Conflict
    );
  }
}
