import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidCredentialsException extends DomainException {
  constructor(message = "Invalid credentials") {
    super(
      message,
      "INVALID_CREDENTIALS",
      HttpStatus.Unauthorized
    );
  }
}
