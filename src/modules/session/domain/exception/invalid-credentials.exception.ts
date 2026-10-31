import { DomainException } from "@shared/exception/base/domain.exception";
import { HttpStatus } from "@shared/http/http-status.enum";

export class InvalidCredentialsException extends DomainException {
  readonly code = "INVALID_CREDENTIALS";
  readonly status = HttpStatus.Unauthorized;

  constructor(message = "Invalid credentials") {
    super(message);
    this.name = "InvalidCredentialsException";
  }
}
